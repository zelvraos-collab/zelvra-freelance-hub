import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Clock, Activity, Camera, AlertTriangle, FileDown, Globe, Hash, Eye, Lock, MessageSquareWarning, Pause, CheckCircle2 } from "lucide-react";
import { raiseDispute, getFraudRisk, markViewedByClient } from "@/lib/tracker.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/time-tracker")({
  component: TimeTrackerPage,
  errorComponent: ({ error }) => <DashboardShell><p className="text-destructive">{error.message}</p></DashboardShell>,
  notFoundComponent: () => <DashboardShell><p>Not found</p></DashboardShell>,
});

type Session = {
  id: string;
  user_id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  status: string;
  start_ip: string | null;
  end_ip: string | null;
  start_timezone: string | null;
  activity_score: number;
  productivity_score: number;
  screenshot_count: number;
  flags: string[];
  entry_hash: string | null;
  client_viewed_at: string | null;
  locked: boolean;
  notes: string | null;
  project?: { title: string; user_id: string };
};

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? "bg-success" : value >= 50 ? "bg-primary" : "bg-destructive";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TimeTrackerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Session | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged" | "disputed">("all");

  const sessionsQ = useQuery({
    queryKey: ["tracked_sessions", user?.id],
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from("tracked_sessions")
        .select("*, project:projects(title, user_id)")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        start_ip: r.start_ip == null ? null : String(r.start_ip),
        end_ip: r.end_ip == null ? null : String(r.end_ip),
        flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
      })) as Session[];
    },
    enabled: !!user,
  });

  const fraudQ = useQuery({
    queryKey: ["fraud-risk", user?.id],
    queryFn: () => getFraudRisk(),
    enabled: !!user,
  });

  const samplesQ = useQuery({
    queryKey: ["activity_samples", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase
        .from("activity_samples")
        .select("sampled_at, activity_pct")
        .eq("session_id", selected.id)
        .order("sampled_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!selected,
  });

  const screenshotsQ = useQuery({
    queryKey: ["session_screenshots", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase
        .from("session_screenshots")
        .select("id, storage_path, taken_at, activity_pct, suspicious, blurred")
        .eq("session_id", selected.id)
        .order("taken_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!selected,
  });

  const auditQ = useQuery({
    queryKey: ["session_audit", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase
        .from("session_audit")
        .select("*")
        .eq("session_id", selected.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!selected,
  });

  const disputesQ = useQuery({
    queryKey: ["session_disputes", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data } = await supabase
        .from("session_disputes")
        .select("*")
        .eq("session_id", selected.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!selected,
  });

  const raiseDisputeFn = useServerFn(raiseDispute);
  const markViewedFn = useServerFn(markViewedByClient);

  const dispute = useMutation({
    mutationFn: async () => raiseDisputeFn({ data: { sessionId: selected!.id, reason: disputeReason } }),
    onSuccess: () => {
      toast.success("Dispute raised");
      setDisputeOpen(false);
      setDisputeReason("");
      qc.invalidateQueries({ queryKey: ["session_disputes"] });
      qc.invalidateQueries({ queryKey: ["tracked_sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sessions = sessionsQ.data ?? [];
  const visible = useMemo(() => {
    if (filter === "flagged") return sessions.filter((s) => s.flags.length > 0 || s.productivity_score < 50);
    if (filter === "disputed") return sessions.filter((s) => s.status === "disputed");
    return sessions;
  }, [sessions, filter]);

  const totalSecs = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const flagged = sessions.filter((s) => s.flags.length > 0 || s.productivity_score < 50).length;
  const avgProd = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.productivity_score, 0) / sessions.length) : 0;

  // When client opens a session, lock it
  const openSession = async (s: Session) => {
    setSelected(s);
    if (user && s.project?.user_id === user.id && s.user_id !== user.id && !s.client_viewed_at) {
      try {
        await markViewedFn({ data: { sessionId: s.id } });
        qc.invalidateQueries({ queryKey: ["tracked_sessions"] });
      } catch { /* ignore */ }
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Anti-Fraud Time Tracker</h1>
          <p className="text-muted-foreground mt-1">Tamper-proof sessions with cryptographic verification.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Total tracked</div>
              <div className="font-display text-2xl font-bold mt-1">{fmtDuration(totalSecs)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="w-3.5 h-3.5" /> Avg productivity</div>
              <div className="font-display text-2xl font-bold mt-1">{avgProd}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5" /> Flagged sessions</div>
              <div className="font-display text-2xl font-bold mt-1">{flagged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="w-3.5 h-3.5" /> Fraud risk</div>
              <div className="font-display text-2xl font-bold mt-1">{fraudQ.data?.risk ?? 0}/100</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Sessions</CardTitle>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="flagged">Flagged</TabsTrigger>
                  <TabsTrigger value="disputed">Disputed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {visible.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No sessions yet. Click "Start timer" to begin.</p>
              )}
              {visible.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSession(s)}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-accent/30 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {s.project?.title ?? "—"}
                      {s.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                      {s.flags.length > 0 && <Badge variant="destructive" className="text-[10px]">{s.flags.length} flag</Badge>}
                      {s.status === "disputed" && <Badge variant="destructive" className="text-[10px]">disputed</Badge>}
                      {s.status === "running" && <Badge className="bg-success/20 text-success border-success/30 text-[10px]">running</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.started_at).toLocaleString()} · {s.start_timezone ?? "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{fmtDuration(s.duration_seconds)}</div>
                    <div className="text-[10px] text-muted-foreground">duration</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className={`text-sm font-semibold ${s.productivity_score >= 70 ? "text-success" : s.productivity_score >= 50 ? "text-foreground" : "text-destructive"}`}>{s.productivity_score}</div>
                    <div className="text-[10px] text-muted-foreground">score</div>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.project?.title}
                  {selected.locked && <Badge variant="secondary" className="text-[10px]"><Lock className="w-3 h-3 mr-1" /> locked</Badge>}
                </DialogTitle>
                <DialogDescription>{new Date(selected.started_at).toLocaleString()}</DialogDescription>
              </DialogHeader>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/60 p-3 space-y-2 text-sm">
                  <div className="font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Session</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-mono">{fmtDuration(selected.duration_seconds)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{selected.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ended</span><span>{selected.ended_at ? new Date(selected.ended_at).toLocaleTimeString() : "—"}</span></div>
                </div>
                <div className="rounded-lg border border-border/60 p-3 space-y-2 text-sm">
                  <div className="font-semibold flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Network</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Start IP</span><span className="font-mono text-xs">{selected.start_ip ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">End IP</span><span className="font-mono text-xs">{selected.end_ip ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Timezone</span><span>{selected.start_timezone ?? "—"}</span></div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="font-semibold text-sm flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Scores</div>
                <ScoreBar value={selected.activity_score} label="Activity" />
                <ScoreBar value={selected.productivity_score} label="Productivity" />
              </div>

              {selected.flags.length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="font-semibold flex items-center gap-1.5 text-destructive"><AlertTriangle className="w-3.5 h-3.5" /> Flags</div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {selected.flags.map((f) => <li key={f}>• {f.replaceAll("_", " ")}</li>)}
                  </ul>
                </div>
              )}

              {/* Activity sparkline */}
              {samplesQ.data && samplesQ.data.length > 0 && (
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="font-semibold text-sm mb-2">Activity over session</div>
                  <div className="flex items-end gap-0.5 h-16">
                    {samplesQ.data.map((p, i) => (
                      <div
                        key={i}
                        style={{ height: `${Math.max(2, p.activity_pct)}%` }}
                        className={`flex-1 rounded-sm ${p.activity_pct < 20 ? "bg-destructive/60" : p.activity_pct < 50 ? "bg-primary/50" : "bg-success/70"}`}
                        title={`${new Date(p.sampled_at).toLocaleTimeString()} — ${p.activity_pct}%`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {screenshotsQ.data && screenshotsQ.data.length > 0 && (
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Screenshots ({screenshotsQ.data.length})</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {screenshotsQ.data.map((s) => <ScreenshotThumb key={s.id} path={s.storage_path} suspicious={s.suspicious} takenAt={s.taken_at} />)}
                  </div>
                </div>
              )}

              {auditQ.data && auditQ.data.length > 0 && (
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="font-semibold text-sm mb-2">Audit log</div>
                  <ul className="space-y-1 text-xs">
                    {auditQ.data.map((a) => (
                      <li key={a.id} className="flex justify-between">
                        <span><Badge variant="secondary" className="text-[10px] mr-1">{a.action}</Badge>{a.reason ?? ""}</span>
                        <span className="text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {disputesQ.data && disputesQ.data.length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="font-semibold mb-2 flex items-center gap-1.5"><MessageSquareWarning className="w-3.5 h-3.5" /> Disputes</div>
                  {disputesQ.data.map((d) => (
                    <div key={d.id} className="text-xs space-y-1">
                      <div><strong>Reason:</strong> {d.reason}</div>
                      {d.freelancer_response && <div><strong>Response:</strong> {d.freelancer_response}</div>}
                      <div className="text-muted-foreground">Status: {d.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {selected.entry_hash && (
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs flex items-start gap-2">
                  <Hash className="w-3.5 h-3.5 mt-0.5 text-success" />
                  <div className="break-all">
                    <div className="font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> Tamper-proof hash</div>
                    <div className="font-mono mt-0.5">{selected.entry_hash}</div>
                  </div>
                </div>
              )}

              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => exportSessionPDF(selected, samplesQ.data ?? [], screenshotsQ.data ?? [])}>
                  <FileDown className="w-4 h-4 mr-2" /> Export PDF
                </Button>
                {user && selected.project?.user_id === user.id && selected.user_id !== user.id && (
                  <Button variant="destructive" onClick={() => setDisputeOpen(true)}>
                    <MessageSquareWarning className="w-4 h-4 mr-2" /> Dispute
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise dispute</DialogTitle>
            <DialogDescription>Explain why this session looks suspicious.</DialogDescription>
          </DialogHeader>
          <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} rows={5} placeholder="Reason…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button onClick={() => dispute.mutate()} disabled={!disputeReason.trim() || dispute.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function ScreenshotThumb({ path, suspicious, takenAt }: { path: string; suspicious: boolean; takenAt: string }) {
  const { data: url } = useQuery({
    queryKey: ["screenshot-url", path],
    queryFn: async () => {
      const { data } = await supabase.storage.from("session-screenshots").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
    staleTime: 30 * 60 * 1000,
  });
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" className={`relative block rounded-md overflow-hidden border ${suspicious ? "border-destructive/60" : "border-border/60"}`}>
      {url ? <img src={url} alt="screenshot" className="w-full aspect-video object-cover" loading="lazy" /> : <div className="w-full aspect-video bg-muted animate-pulse" />}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 flex justify-between">
        <span>{new Date(takenAt).toLocaleTimeString()}</span>
        {suspicious && <span>⚠</span>}
      </div>
    </a>
  );
}

function exportSessionPDF(s: Session, samples: { sampled_at: string; activity_pct: number }[], shots: { storage_path: string; taken_at: string }[]) {
  const lines = [
    `ZELVRA TAMPER-PROOF TIMESHEET`,
    `==============================`,
    ``,
    `Project: ${s.project?.title ?? "—"}`,
    `Session ID: ${s.id}`,
    `Started: ${new Date(s.started_at).toISOString()}`,
    `Ended: ${s.ended_at ? new Date(s.ended_at).toISOString() : "—"}`,
    `Duration: ${fmtDuration(s.duration_seconds)}`,
    `Start IP: ${s.start_ip ?? "—"}`,
    `End IP: ${s.end_ip ?? "—"}`,
    `Timezone: ${s.start_timezone ?? "—"}`,
    ``,
    `Activity score: ${s.activity_score}/100`,
    `Productivity score: ${s.productivity_score}/100`,
    `Flags: ${s.flags.length ? s.flags.join(", ") : "none"}`,
    `Screenshots captured: ${shots.length}`,
    `Activity samples: ${samples.length}`,
    ``,
    `Verification hash (SHA-256):`,
    s.entry_hash ?? "(session not finalized)",
    ``,
    `This document is cryptographically tied to the server-side session record.`,
    `Verify by re-hashing: id|user_id|project_id|started_at|ended_at|duration_seconds|start_ip|end_ip`,
  ].join("\n");
  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zelvra-session-${s.id.slice(0, 8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Timesheet exported");
}
