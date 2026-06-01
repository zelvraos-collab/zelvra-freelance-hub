import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortalMessages, sendPortalMessage } from "@/lib/messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function PortalChat({ token, projectId, defaultName }: { token: string; projectId: string; defaultName?: string | null }) {
  const fetchMsgs = useServerFn(getPortalMessages);
  const sendMsg = useServerFn(sendPortalMessage);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["portal-messages", token],
    queryFn: () => fetchMsgs({ data: { token } }),
  });
  const messages = data?.messages ?? [];

  useEffect(() => {
    const channel = supabase
      .channel(`portal-messages:${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["portal-messages", token] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, token, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!text.trim()) return;
      if (!name.trim()) throw new Error("Please enter your name first");
      await sendMsg({ data: { token, body: text.trim(), senderName: name.trim() } });
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["portal-messages", token] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="bg-card/40 border-border/60 flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold">Chat with your freelancer</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-16">
            No messages yet. Start the conversation.
          </div>
        )}
        {messages.map((m) => {
          const isClient = m.sender_role === "client";
          const initials = m.sender_name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div key={m.id} className={`flex gap-2 ${isClient ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className={isClient ? "bg-gradient-primary text-primary-foreground text-[10px]" : "bg-muted text-[10px]"}>
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${isClient ? "items-end" : "items-start"} flex flex-col`}>
                <div className="text-[11px] text-muted-foreground mb-0.5">
                  {m.sender_name} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${isClient ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-border/60 space-y-2">
        {!defaultName && (
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-background/60" />
        )}
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send.mutate();
              }
            }}
            placeholder="Write a message…"
            className="min-h-[40px] max-h-32 resize-none bg-background/60"
            rows={1}
          />
          <Button
            onClick={() => send.mutate()}
            disabled={!text.trim() || send.isPending}
            size="icon"
            className="bg-gradient-primary shadow-glow shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
