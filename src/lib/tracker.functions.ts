import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

type SessionRow = Database["public"]["Tables"]["tracked_sessions"]["Row"];
type SessionUpdate = Database["public"]["Tables"]["tracked_sessions"]["Update"];
type DisputeUpdate = Database["public"]["Tables"]["session_disputes"]["Update"];

// Plain-serializable session (INET → string)
type SerializableSession = Omit<SessionRow, "start_ip" | "end_ip" | "flags"> & {
  start_ip: string | null;
  end_ip: string | null;
  flags: string[];
};

function normalizeSession(s: SessionRow): SerializableSession {
  return {
    ...s,
    start_ip: s.start_ip == null ? null : String(s.start_ip),
    end_ip: s.end_ip == null ? null : String(s.end_ip),
    flags: Array.isArray(s.flags) ? (s.flags as string[]) : [],
  };
}

// SHA-256 of a canonical session string (Web Crypto, edge-safe)
async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalize(s: {
  id: string;
  user_id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  start_ip: string | null;
  end_ip: string | null;
}) {
  return [s.id, s.user_id, s.project_id, s.started_at, s.ended_at ?? "", s.duration_seconds, s.start_ip ?? "", s.end_ip ?? ""].join("|");
}

// ---- Acknowledge monitoring consent ----
export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ version: z.string().max(20).default("v1") }).parse(d))
  .handler(async ({ data, context }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const ua = getRequestHeader("user-agent") ?? null;
    const { error } = await context.supabase.from("monitoring_consent").insert({
      user_id: context.userId,
      version: data.version,
      ip,
      user_agent: ua,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getConsent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("monitoring_consent")
      .select("id, accepted_at, version")
      .eq("user_id", context.userId)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { accepted: !!data, latest: data };
  });

// ---- Start a tracked session ----
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        projectId: z.string().uuid(),
        timezone: z.string().max(64).optional(),
        deviceFingerprint: z.string().max(128).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Block if already running on ANY project
    const { data: running } = await supabase
      .from("tracked_sessions")
      .select("id, project_id")
      .eq("user_id", userId)
      .eq("status", "running")
      .maybeSingle();
    if (running) throw new Error("A session is already running on another project. Stop it first.");

    // Verify project ownership
    const { data: proj } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!proj || proj.user_id !== userId) throw new Error("Project not found");

    // 12h/day cap
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { data: today } = await supabase
      .from("tracked_sessions")
      .select("duration_seconds")
      .eq("user_id", userId)
      .gte("started_at", dayStart.toISOString());
    const todaySecs = (today ?? []).reduce((a, r) => a + (r.duration_seconds ?? 0), 0);
    if (todaySecs >= 12 * 3600) throw new Error("12-hour daily limit reached.");

    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const ua = getRequestHeader("user-agent") ?? null;

    const { data: session, error } = await supabase
      .from("tracked_sessions")
      .insert({
        user_id: userId,
        project_id: data.projectId,
        start_ip: ip,
        start_timezone: data.timezone ?? null,
        start_user_agent: ua,
        device_fingerprint: data.deviceFingerprint ?? null,
        status: "running",
      })
      .select()
      .single();
    if (error || !session) throw new Error(error?.message ?? "Failed to start");

    await supabase.from("session_audit").insert({
      session_id: session.id,
      actor_id: userId,
      action: "created",
      after: { started_at: session.started_at, start_ip: ip },
    });

    return { session };
  });

// ---- Heartbeat (1/min) ----
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        sessionId: z.string().uuid(),
        keys: z.number().int().min(0).max(20000),
        mouseMoves: z.number().int().min(0).max(20000),
        clicks: z.number().int().min(0).max(5000),
        scrolls: z.number().int().min(0).max(5000),
        focused: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: session } = await supabase
      .from("tracked_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");
    if (session.status !== "running") throw new Error("Session is not running");

    // Detect IP change
    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const ipChanged = ip && session.start_ip && ip !== session.start_ip;

    // Activity score 0-100 (weighted)
    const raw = data.keys * 1 + data.clicks * 3 + data.mouseMoves * 0.05 + data.scrolls * 0.5;
    const pct = Math.max(0, Math.min(100, Math.round((raw / 60) * 100)));
    const focusAdj = data.focused ? pct : Math.round(pct * 0.3);

    await supabase.from("activity_samples").insert({
      session_id: data.sessionId,
      user_id: userId,
      keys_count: data.keys,
      mouse_moves: data.mouseMoves,
      mouse_clicks: data.clicks,
      scrolls: data.scrolls,
      activity_pct: focusAdj,
      tab_focused: data.focused,
    });

    // Check last 5 samples for auto-pause
    const { data: recent } = await supabase
      .from("activity_samples")
      .select("activity_pct")
      .eq("session_id", data.sessionId)
      .order("sampled_at", { ascending: false })
      .limit(5);
    const lowStreak = (recent ?? []).length >= 5 && (recent ?? []).every((r) => r.activity_pct < 20);

    // Update session duration_seconds += 60, flags if needed
    const flags = Array.isArray(session.flags) ? [...(session.flags as string[])] : [];
    if (ipChanged && !flags.includes("ip_changed")) flags.push("ip_changed");
    if (lowStreak && !flags.includes("low_activity_pause")) flags.push("low_activity_pause");

    const update: SessionUpdate = {
      duration_seconds: (session.duration_seconds ?? 0) + 60,
      flags,
    };
    if (lowStreak) update.status = "paused";

    const { data: updated } = await supabase
      .from("tracked_sessions")
      .update(update)
      .eq("id", data.sessionId)
      .select()
      .single();

    if (ipChanged) {
      await supabase.from("session_audit").insert({
        session_id: data.sessionId,
        actor_id: userId,
        action: "flagged",
        reason: `IP changed from ${session.start_ip} to ${ip}`,
      });
    }

    return { autoPaused: lowStreak, ipChanged: !!ipChanged, session: updated };
  });

// ---- Stop session ----
export const stopSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("tracked_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    const ip = getRequestIP({ xForwardedFor: true }) ?? null;
    const endedAt = new Date().toISOString();

    // Avg activity from samples
    const { data: samples } = await supabase
      .from("activity_samples")
      .select("activity_pct, tab_focused")
      .eq("session_id", data.sessionId);
    const avgActivity = samples?.length ? Math.round(samples.reduce((a, s) => a + s.activity_pct, 0) / samples.length) : 0;
    const focusedRatio = samples?.length ? samples.filter((s) => s.tab_focused).length / samples.length : 1;

    const flagsArr = Array.isArray(session.flags) ? (session.flags as string[]) : [];
    const suspiciousPause = flagsArr.includes("low_activity_pause") ? 0 : 100;
    const consistency = samples && samples.length >= 5 ? 100 : Math.max(0, (samples?.length ?? 0) * 20);
    // Productivity: 50% activity + 30% focus + 20% no-suspicious-pause + small consistency bonus already baked in
    const productivity = Math.round(avgActivity * 0.5 + focusedRatio * 100 * 0.3 + suspiciousPause * 0.15 + consistency * 0.05);

    const hash = await sha256(
      canonicalize({
        id: session.id,
        user_id: session.user_id,
        project_id: session.project_id,
        started_at: session.started_at,
        ended_at: endedAt,
        duration_seconds: session.duration_seconds,
        start_ip: session.start_ip as string | null,
        end_ip: ip,
      }),
    );

    const { data: updated, error } = await supabase
      .from("tracked_sessions")
      .update({
        status: "stopped",
        ended_at: endedAt,
        end_ip: ip,
        activity_score: avgActivity,
        productivity_score: productivity,
        entry_hash: hash,
      })
      .eq("id", data.sessionId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("session_audit").insert({
      session_id: data.sessionId,
      actor_id: userId,
      action: "stopped",
      after: { ended_at: endedAt, end_ip: ip, hash },
    });

    return { session: updated };
  });

// ---- Mark session viewed by client (locks it) ----
export const markViewedByClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify client owns project
    const { data: row } = await supabase
      .from("tracked_sessions")
      .select("project_id, client_viewed_at, projects!inner(user_id)")
      .eq("id", data.sessionId)
      .maybeSingle();
    // RLS already filters; if the client is project owner, allow
    if (!row) throw new Error("Not found");
    if (row.client_viewed_at) return { ok: true };
    await supabase
      .from("tracked_sessions")
      .update({ client_viewed_at: new Date().toISOString() })
      .eq("id", data.sessionId);
    await supabase.from("session_audit").insert({
      session_id: data.sessionId,
      actor_id: userId,
      action: "edited",
      reason: "client viewed; session locked",
    });
    return { ok: true };
  });

// ---- Raise a dispute ----
export const raiseDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ sessionId: z.string().uuid(), reason: z.string().min(3).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("session_disputes").insert({
      session_id: data.sessionId,
      raised_by: userId,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("tracked_sessions")
      .update({ status: "disputed" })
      .eq("id", data.sessionId);
    await supabase.from("session_audit").insert({
      session_id: data.sessionId,
      actor_id: userId,
      action: "disputed",
      reason: data.reason,
    });
    return { ok: true };
  });

// ---- Respond / resolve dispute ----
export const updateDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        disputeId: z.string().uuid(),
        response: z.string().max(2000).optional(),
        status: z.enum(["open", "resolved", "escalated"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.response !== undefined) patch.freelancer_response = data.response;
    if (data.status) {
      patch.status = data.status;
      if (data.status === "resolved") patch.resolved_at = new Date().toISOString();
    }
    const { error } = await context.supabase.from("session_disputes").update(patch).eq("id", data.disputeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Fraud risk score for a freelancer ----
export const getFraudRisk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: sessions } = await supabase
      .from("tracked_sessions")
      .select("id, productivity_score, activity_score, flags, duration_seconds, started_at")
      .eq("user_id", userId)
      .gte("started_at", since);

    if (!sessions || sessions.length === 0) return { risk: 0, flagged: 0, total: 0 };

    const total = sessions.length;
    let bad = 0;
    for (const s of sessions) {
      const f = Array.isArray(s.flags) ? (s.flags as string[]) : [];
      if (s.productivity_score < 50) bad++;
      if (f.length > 0) bad++;
    }
    const risk = Math.min(100, Math.round((bad / Math.max(1, total * 2)) * 100));
    return { risk, flagged: bad, total };
  });
