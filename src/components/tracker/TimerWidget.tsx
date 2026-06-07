import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  startSession,
  stopSession,
  heartbeat,
  recordConsent,
  getConsent,
} from "@/lib/tracker.functions";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useScreenCapture } from "@/hooks/use-screen-capture";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Square, Camera, Shield, AlertTriangle, Activity, Pause } from "lucide-react";
import { toast } from "sonner";

type Project = { id: string; title: string };

const ACTIVE_KEY = "zelvra.activeSession";

function loadActive(): { id: string; projectId: string; startedAt: string } | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); } catch { return null; }
}
function saveActive(v: { id: string; projectId: string; startedAt: string } | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(ACTIVE_KEY, JSON.stringify(v));
  else localStorage.removeItem(ACTIVE_KEY);
}

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerWidget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [active, setActive] = useState(loadActive());
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [enableScreenshots, setEnableScreenshots] = useState(true);
  const [blurScreenshots, setBlurScreenshots] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lastActivityPct, setLastActivityPct] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [shotCount, setShotCount] = useState(0);

  const tracker = useActivityTracker(!!active && !paused);
  const screen = useScreenCapture();

  const consentQ = useQuery({
    queryKey: ["consent", user?.id],
    queryFn: () => getConsent(),
    enabled: !!user,
  });

  const projectsQ = useQuery({
    queryKey: ["my-projects-min", user?.id],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
    enabled: !!user,
  });

  const recordConsentFn = useServerFn(recordConsent);
  const startFn = useServerFn(startSession);
  const stopFn = useServerFn(stopSession);
  const beat = useServerFn(heartbeat);

  // Elapsed counter
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const start = new Date(active.startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [active]);

  // Heartbeat every 60s
  useEffect(() => {
    if (!active || paused) return;
    const id = setInterval(async () => {
      const snap = tracker.snapshot();
      try {
        const res = await beat({
          data: {
            sessionId: active.id,
            keys: snap.keys,
            mouseMoves: snap.mouseMoves,
            clicks: snap.clicks,
            scrolls: snap.scrolls,
            focused: snap.focused,
          },
        });
        // Activity rough pct
        const raw = snap.keys + snap.clicks * 3 + snap.mouseMoves * 0.05 + snap.scrolls * 0.5;
        setLastActivityPct(Math.max(0, Math.min(100, Math.round((raw / 60) * 100))));
        if (res.autoPaused) {
          setPaused(true);
          toast.warning("Timer auto-paused — low activity for 5+ minutes");
        }
        if (res.ipChanged) toast.warning("IP address changed mid-session — flagged");
      } catch (e) {
        console.error("heartbeat failed", e);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [active, paused, tracker, beat]);

  // Random screenshot scheduler (10-15 min)
  useEffect(() => {
    if (!active || paused || !screen.active) return;
    let cancelled = false;
    const schedule = () => {
      const delay = (10 + Math.random() * 5) * 60_000;
      const id = setTimeout(async () => {
        if (cancelled || !active) return;
        const blob = await screen.capture(blurScreenshots);
        if (blob && user) {
          const path = `${user.id}/${active.id}/${Date.now()}.jpg`;
          const { error } = await supabase.storage.from("session-screenshots").upload(path, blob, {
            contentType: "image/jpeg",
            upsert: false,
          });
          if (!error) {
            const pct = lastActivityPct ?? 0;
            await supabase.from("session_screenshots").insert({
              session_id: active.id,
              user_id: user.id,
              storage_path: path,
              activity_pct: pct,
              suspicious: pct < 10,
              blurred: blurScreenshots,
            });
            setShotCount((n) => n + 1);
            toast.info("Screenshot captured", { duration: 2000 });
          }
        }
        schedule();
      }, delay);
      return id;
    };
    const id = schedule();
    return () => { cancelled = true; clearTimeout(id); };
  }, [active, paused, screen, blurScreenshots, user, lastActivityPct]);

  // Auto-stop at midnight
  useEffect(() => {
    if (!active) return;
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => handleStop(), midnight.getTime() - now.getTime());
    return () => clearTimeout(id);
  }, [active]);

  // 2h break reminder
  useEffect(() => {
    if (!active || paused) return;
    const id = setInterval(() => {
      toast("Time for a break? You've been working for 2 hours.", { icon: "☕" });
    }, 2 * 3600 * 1000);
    return () => clearInterval(id);
  }, [active, paused]);

  const start = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Pick a project");
      if (!consentQ.data?.accepted && !consentChecked) throw new Error("You must accept the monitoring notice");
      if (!consentQ.data?.accepted) {
        await recordConsentFn({ data: { version: "v1" } });
        qc.invalidateQueries({ queryKey: ["consent"] });
      }
      if (enableScreenshots) {
        const ok = await screen.request();
        if (!ok) throw new Error(screen.error ?? "Screen share permission denied");
      }
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { session } = await startFn({ data: { projectId, timezone: tz } });
      saveActive({ id: session.id, projectId: session.project_id, startedAt: session.started_at });
      setActive({ id: session.id, projectId: session.project_id, startedAt: session.started_at });
      setShotCount(0);
      setPaused(false);
      setOpen(false);
      toast.success("Timer started");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStop = async () => {
    if (!active) return;
    try {
      await stopFn({ data: { sessionId: active.id } });
      screen.stop();
      saveActive(null);
      setActive(null);
      setPaused(false);
      qc.invalidateQueries({ queryKey: ["tracked_sessions"] });
      toast.success("Session stopped & hashed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!user) return null;

  const lowActivity = lastActivityPct !== null && lastActivityPct < 20;
  const projects = projectsQ.data ?? [];

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        {active ? (
          <div className={`rounded-2xl shadow-2xl border backdrop-blur-md px-4 py-3 flex items-center gap-3 min-w-[260px] ${
            paused ? "bg-yellow-500/10 border-yellow-500/40"
            : lowActivity ? "bg-destructive/10 border-destructive/40"
            : "bg-card/90 border-primary/40"
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${paused ? "bg-yellow-400" : lowActivity ? "bg-destructive animate-pulse" : "bg-success animate-pulse"}`} />
            <div className="flex-1">
              <div className="font-mono text-lg font-semibold tabular-nums">{fmt(elapsed)}</div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Activity className="w-3 h-3" />
                {lastActivityPct === null ? "tracking…" : `${lastActivityPct}% active`}
                {screen.active && <span className="inline-flex items-center gap-1"><Camera className="w-3 h-3" /> {shotCount}</span>}
              </div>
            </div>
            {paused && (
              <Button size="sm" variant="ghost" onClick={() => setPaused(false)} title="Resume">
                <Play className="w-4 h-4" />
              </Button>
            )}
            {!paused && (
              <Button size="sm" variant="ghost" onClick={() => setPaused(true)} title="Pause">
                <Pause className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleStop} title="Stop">
              <Square className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="rounded-full shadow-2xl bg-gradient-primary text-primary-foreground hover:opacity-90 h-14 px-6"
            onClick={() => setOpen(true)}
          >
            <Play className="w-5 h-5 mr-2" /> Start timer
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Start monitored session
            </DialogTitle>
            <DialogDescription>
              Zelvra's anti-fraud tracker creates a tamper-proof timesheet your client can verify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Pick a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div className="text-sm">
                <div className="font-medium">Random screenshots</div>
                <div className="text-xs text-muted-foreground">Every 10–15 min while timer runs</div>
              </div>
              <Switch checked={enableScreenshots} onCheckedChange={setEnableScreenshots} />
            </div>
            {enableScreenshots && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">Blur sensitive content</div>
                  <div className="text-xs text-muted-foreground">Screenshots stored with blur filter</div>
                </div>
                <Switch checked={blurScreenshots} onCheckedChange={setBlurScreenshots} />
              </div>
            )}

            <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Privacy notice</div>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Counts (not content) of keystrokes, clicks, scrolls in this browser tab</li>
                <li>IP address & timezone logged at start/stop</li>
                <li>Optional screen captures every 10–15 min (you approve sharing)</li>
                <li>Auto-pause after 5 min of low activity</li>
                <li>Screenshots auto-delete after 90 days · GDPR compliant</li>
              </ul>
            </div>

            {!consentQ.data?.accepted && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5" />
                <span>I agree to activity monitoring during this session.</span>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => start.mutate()}
              disabled={start.isPending || !projectId || (!consentQ.data?.accepted && !consentChecked)}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Play className="w-4 h-4 mr-2" /> Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
