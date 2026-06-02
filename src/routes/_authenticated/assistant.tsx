import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { streamAssistant } from "@/lib/ai-assistant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send, Plus, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — Zelvra" }] }),
  component: AssistantPage,
});

type Conv = { id: string; title: string; project_id: string | null; updated_at: string };
type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Project = { id: string; title: string };

const QUICK_ACTIONS = [
  { label: "Draft a contract", prompt: "Draft a freelance contract for a website redesign project. Include scope, payment terms, revisions, and IP." },
  { label: "Suggest a price", prompt: "Suggest a fair price range for a 2-week landing page project including design + dev. Justify briefly." },
  { label: "Follow-up email", prompt: "Write a polite follow-up email to a client who hasn't responded in 5 days about an outstanding invoice." },
  { label: "Detect scope creep", prompt: "Help me identify scope creep. I'll paste the client's latest message — flag anything outside the original scope and suggest change-order wording." },
  { label: "Summarize thread", prompt: "Summarize the key decisions and open questions from a long client conversation I'll paste next." },
];

function AssistantPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [projectId, setProjectId] = useState<string>("none");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: convs = [] } = useQuery({
    queryKey: ["ai-convs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_conversations")
        .select("id, title, project_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Conv[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["ai-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("ai_chat_history")
        .select("id, role, content")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      if (error) {
        toast.error(error.message);
        return;
      }
      setMessages(
        (data ?? [])
          .filter((m) => m.role !== "system")
          .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })),
      );
    })();
  }, [activeConvId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const activeConv = useMemo(() => convs.find((c) => c.id === activeConvId), [convs, activeConvId]);

  useEffect(() => {
    setProjectId(activeConv?.project_id ?? "none");
  }, [activeConv?.id, activeConv?.project_id]);

  const newChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
    setProjectId("none");
  };

  const buildProjectContext = async (): Promise<string | undefined> => {
    if (projectId === "none") return undefined;
    const { data: p } = await supabase
      .from("projects")
      .select("title, client_name, status, priority, deadline, hourly_rate, description")
      .eq("id", projectId)
      .maybeSingle();
    if (!p) return undefined;
    const { data: scope } = await supabase
      .from("scope_items")
      .select("title, done")
      .eq("project_id", projectId)
      .limit(50);
    const scopeStr = (scope ?? []).map((s) => `- [${s.done ? "x" : " "}] ${s.title}`).join("\n");
    return `Project: ${p.title}\nClient: ${p.client_name ?? "—"}\nStatus: ${p.status} (${p.priority})\nDeadline: ${p.deadline ?? "—"}\nRate: ${p.hourly_rate ?? "—"}\nDescription: ${p.description ?? "—"}\nScope:\n${scopeStr || "(no scope items)"}`;
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !user) return;

    setInput("");
    setStreaming(true);

    let convId = activeConvId;
    try {
      // Create conversation if first message
      if (!convId) {
        const { data, error } = await supabase
          .from("ai_chat_conversations")
          .insert({
            user_id: user.id,
            project_id: projectId === "none" ? null : projectId,
            title: text.slice(0, 60),
          })
          .select("id")
          .single();
        if (error) throw error;
        convId = data.id;
        setActiveConvId(convId);
        qc.invalidateQueries({ queryKey: ["ai-convs"] });
      }

      // Persist user message
      await supabase.from("ai_chat_history").insert({
        conversation_id: convId,
        user_id: user.id,
        role: "user",
        content: text,
      });

      const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      const projectContext = await buildProjectContext();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let acc = "";
      await streamAssistant({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        projectContext,
        signal: ctrl.signal,
        onDelta: (chunk) => {
          acc += chunk;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        },
      });

      // Persist assistant message
      if (acc.trim()) {
        await supabase.from("ai_chat_history").insert({
          conversation_id: convId,
          user_id: user.id,
          role: "assistant",
          content: acc,
        });
        await supabase
          .from("ai_chat_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
        qc.invalidateQueries({ queryKey: ["ai-convs"] });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(msg);
      setMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.content === "")));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const deleteConv = async (id: string) => {
    const { error } = await supabase.from("ai_chat_conversations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (activeConvId === id) newChat();
    qc.invalidateQueries({ queryKey: ["ai-convs"] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your freelance copilot — drafts, pricing, follow-ups, scope-creep detection.
          </p>
        </div>
        <Button onClick={newChat} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> New chat
        </Button>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <Card className="bg-card/40 border-border/60 p-2 h-fit max-h-[600px] overflow-y-auto">
          {convs.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 text-center">No chats yet</div>
          ) : (
            convs.map((c) => {
              const active = c.id === activeConvId;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer ${
                    active ? "bg-primary/10" : "hover:bg-accent/40"
                  }`}
                  onClick={() => setActiveConvId(c.id)}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConv(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </Card>

        <Card className="bg-card/40 border-border/60 flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Project context:</span>
            <Select value={projectId} onValueChange={setProjectId} disabled={streaming}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-[11px] text-muted-foreground">Powered by Lovable AI</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">How can I help?</h3>
                  <p className="text-xs text-muted-foreground mt-1">Pick a quick action or just ask.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => send(a.prompt)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-background/60 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 border border-border/60"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:mt-3 prose-headings:mb-2">
                        {m.content ? (
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-border/60 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything — drafts, pricing, emails…"
              className="min-h-[44px] max-h-40 resize-none bg-background/60"
              rows={1}
              disabled={streaming}
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              size="icon"
              className="bg-gradient-primary shadow-glow shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
