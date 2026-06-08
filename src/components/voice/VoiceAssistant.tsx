import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, X, Sparkles, Loader2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSpeechRecognition, speak, type SpeechLang } from "@/hooks/use-speech";
import { Button } from "@/components/ui/button";

type VoiceAction = {
  action: string;
  parameters: Record<string, any>;
  response: string;
  needsMoreInfo?: boolean;
};

type Turn = { role: "user" | "assistant"; content: string; action?: VoiceAction };

const VALID_ROUTES = new Set([
  "/dashboard", "/projects", "/time-tracker", "/contracts",
  "/invoices", "/messages", "/analytics", "/assistant", "/settings",
]);

function detectLangFromText(text: string): SpeechLang {
  // crude: any Devanagari char → Hindi
  return /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-US";
}

export function VoiceAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<SpeechLang>("en-US");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [processing, setProcessing] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const history = useMemo(
    () => turns.map((t) => ({ role: t.role, content: t.content })),
    [turns],
  );

  const executeAction = useCallback(
    async (a: VoiceAction) => {
      try {
        switch (a.action) {
          case "navigate": {
            const route = String(a.parameters?.route ?? "");
            if (VALID_ROUTES.has(route)) {
              navigate({ to: route as any });
            }
            break;
          }
          case "create_project": {
            if (!user) break;
            const p = a.parameters ?? {};
            if (!p.title) break;
            const { error } = await supabase.from("projects").insert({
              user_id: user.id,
              title: String(p.title).slice(0, 200),
              client_name: p.client_name ? String(p.client_name) : null,
              deadline: p.deadline ? String(p.deadline) : null,
              rate_type: "fixed",
              rate_amount: typeof p.budget === "number" ? p.budget : (p.budget ? Number(p.budget) : null),
              currency: p.currency ? String(p.currency).toUpperCase() : "USD",
              color: "#7F77DD",
              status: "active",
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: ["projects"] });
            toast.success("Project created");
            break;
          }
          case "start_timer":
          case "stop_timer":
            navigate({ to: "/time-tracker" });
            break;
          case "create_invoice":
            navigate({ to: "/invoices" });
            break;
          case "create_client":
            navigate({ to: "/projects" });
            break;
          default:
            break;
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed");
      }
    },
    [navigate, qc, user],
  );

  const sendTranscript = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const detected = detectLangFromText(text);
      setLang(detected);
      const nextTurns: Turn[] = [...turns, { role: "user", content: text }];
      setTurns(nextTurns);
      setProcessing(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error("Not signed in");
        const resp = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            transcript: text,
            history: nextTurns.slice(-8).map((t) => ({ role: t.role, content: t.content })),
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error ?? "Voice request failed");
        const action: VoiceAction = {
          action: data.action ?? "none",
          parameters: data.parameters ?? {},
          response: data.response ?? "",
          needsMoreInfo: !!data.needsMoreInfo,
        };
        setTurns((prev) => [...prev, { role: "assistant", content: action.response, action }]);
        await executeAction(action);
        if (voiceOn && action.response) speak(action.response, detected);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Voice request failed";
        toast.error(msg);
        setTurns((prev) => [...prev, { role: "assistant", content: msg }]);
      } finally {
        setProcessing(false);
      }
    },
    [executeAction, history, turns, voiceOn],
  );

  const { listening, interim, supported, start, stop } = useSpeechRecognition({
    lang,
    onFinal: sendTranscript,
  });

  const toggleMic = () => {
    if (!supported) {
      toast.error("Voice recognition isn't supported in this browser. Try Chrome.");
      return;
    }
    setOpen(true);
    if (listening) stop();
    else start();
  };

  return (
    <>
      {/* Floating FAB */}
      <button
        onClick={toggleMic}
        aria-label="Voice assistant"
        className={`fixed z-40 top-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-glow transition-all
          bg-gradient-to-br from-primary to-purple-500 text-primary-foreground hover:scale-105
          ${listening ? "animate-pulse ring-4 ring-primary/40" : ""}`}
      >
        {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-40 bottom-24 right-4 sm:right-6 w-[min(380px,calc(100vw-2rem))] max-h-[70vh] rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Zelvra Voice</span>
              <span className="text-xs text-muted-foreground">{lang === "hi-IN" ? "हिन्दी" : "English"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setVoiceOn((v) => !v)} title="Toggle voice replies">
                {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {turns.length === 0 && (
              <div className="text-xs text-muted-foreground space-y-2">
                <p>Tap the mic and try:</p>
                <ul className="space-y-1 list-disc pl-4">
                  <li>"Create project for John, deadline next Friday, budget 50000"</li>
                  <li>"Go to invoices"</li>
                  <li>"Who hasn't paid yet?"</li>
                  <li>"Draft a follow-up email to Sarah"</li>
                </ul>
              </div>
            )}
            {turns.map((t, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
                  t.role === "user"
                    ? "ml-auto bg-primary/15 text-foreground"
                    : "mr-auto bg-accent/40 text-foreground"
                }`}
              >
                {t.content}
                {t.action && t.action.action !== "none" && t.action.action !== "query" && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-primary/80">
                    ✦ {t.action.action.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            ))}
            {(listening || interim) && (
              <div className="text-sm rounded-xl px-3 py-2 ml-auto bg-primary/10 border border-primary/30 max-w-[90%] italic text-muted-foreground">
                {interim || "Listening…"}
              </div>
            )}
            {processing && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/60 flex items-center gap-2">
            <Button
              onClick={toggleMic}
              className={`flex-1 ${listening ? "bg-destructive hover:bg-destructive/90" : "bg-gradient-primary"}`}
            >
              {listening ? (
                <><MicOff className="w-4 h-4 mr-2" /> Stop</>
              ) : (
                <><Mic className="w-4 h-4 mr-2" /> Speak</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "en-US" ? "hi-IN" : "en-US")}
              title="Toggle language"
            >
              {lang === "en-US" ? "EN" : "हि"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
