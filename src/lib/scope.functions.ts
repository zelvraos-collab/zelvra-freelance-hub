import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You are a scope-creep detector for freelancers. Given a project's agreed scope and the recent client conversation, identify any client requests that are OUT-OF-SCOPE (not covered by the existing scope items).

Return ONLY new out-of-scope work. Do NOT flag clarifications, questions, or things already in scope. Be conservative — if unsure, do not flag.

For each flagged request, propose a short title, 1-3 deliverable line items the freelancer should bill for, and a fair suggested price based on the project's rate. Return a brief rationale citing the specific client request.`;

const ResultSchema = z.object({
  findings: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
      items: z.array(z.object({ description: z.string(), quantity: z.number(), rate: z.number() })).min(1),
      suggested_price: z.number(),
    }),
  ),
});

export const scanScopeCreep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, user_id, title, description, rate_amount, rate_type, currency, client_name")
      .eq("id", data.projectId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!project || project.user_id !== userId) throw new Error("Not found");

    const [{ data: scope }, { data: msgs }] = await Promise.all([
      supabase.from("scope_items").select("title, description, status").eq("project_id", data.projectId).limit(100),
      supabase
        .from("messages")
        .select("id, sender_role, sender_name, body, created_at")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const recent = (msgs ?? []).slice().reverse();
    const clientMsgs = recent.filter((m) => m.sender_role === "client");
    if (clientMsgs.length === 0) {
      return { findings: [], reason: "No client messages yet." as const };
    }

    const scopeStr = (scope ?? [])
      .map((s) => `- ${s.title}${s.description ? `: ${s.description}` : ""}`)
      .join("\n") || "(no scope items defined)";

    const convo = recent
      .map((m) => `[${m.sender_role}] ${m.sender_name}: ${m.body}`)
      .join("\n");

    const rate = project.rate_amount != null
      ? `${project.currency} ${project.rate_amount} (${project.rate_type})`
      : `${project.currency} — rate not set; pick a reasonable price`;

    const user = `Project: ${project.title}
Description: ${project.description ?? "—"}
Rate: ${rate}

Agreed scope:
${scopeStr}

Recent conversation (oldest → newest):
${convo}

Identify out-of-scope client requests and return JSON.`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
        tools: [
          {
            type: "function",
            function: {
              name: "report_scope_creep",
              description: "Report out-of-scope client requests",
              parameters: {
                type: "object",
                properties: {
                  findings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short title for the change order" },
                        rationale: { type: "string", description: "Why this is out-of-scope, citing client's words" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              description: { type: "string" },
                              quantity: { type: "number" },
                              rate: { type: "number" },
                            },
                            required: ["description", "quantity", "rate"],
                          },
                        },
                        suggested_price: { type: "number" },
                      },
                      required: ["title", "rationale", "items", "suggested_price"],
                    },
                  },
                },
                required: ["findings"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_scope_creep" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("Rate limit exceeded. Try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add funds in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error (${resp.status})`);
    }

    const json = await resp.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = call?.function?.arguments;
    if (!argsRaw) return { findings: [], reason: "No findings." as const };

    let parsed: z.infer<typeof ResultSchema>;
    try {
      parsed = ResultSchema.parse(typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw);
    } catch {
      return { findings: [], reason: "Could not parse AI response." as const };
    }

    if (parsed.findings.length === 0) {
      return { findings: [], reason: "No scope creep detected." as const };
    }

    // Persist findings as proposed change orders
    const sourceMsgId = clientMsgs[clientMsgs.length - 1]?.id ?? null;
    const rows = parsed.findings.map((f) => ({
      user_id: userId,
      project_id: project.id,
      source_message_id: sourceMsgId,
      title: f.title,
      rationale: f.rationale,
      items: f.items,
      suggested_price: f.suggested_price,
      currency: project.currency,
      status: "proposed" as const,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("change_orders")
      .insert(rows)
      .select("id");
    if (insErr) throw new Error(insErr.message);

    return { findings: parsed.findings, inserted_ids: inserted.map((r) => r.id) };
  });
