import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  body: string;
  sender_name: string;
  sender_role: string;
  sender_id: string | null;
  created_at: string;
};

export function ChatPanel({ projectId, ownerId }: { projectId: string; ownerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, sender_name, sender_role, sender_id, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", projectId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const body = text.trim();
    setText("");
    const senderName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "You";
    const { error } = await supabase.from("messages").insert({
      project_id: projectId,
      user_id: ownerId,
      sender_id: user.id,
      sender_name: senderName,
      sender_role: "owner",
      body,
    });
    if (error) {
      toast.error(error.message);
      setText(body);
    }
  };

  return (
    <Card className="bg-card/40 border-border/60 flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="font-display font-semibold">Project chat</span>
        <span className="ml-auto text-xs text-muted-foreground">Realtime</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-16">
            No messages yet. Say hello to your client.
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_role === "owner";
          const initials = m.sender_name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className={isMe ? "bg-gradient-primary text-primary-foreground text-[10px]" : "bg-muted text-[10px]"}>
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                <div className="text-[11px] text-muted-foreground mb-0.5">
                  {m.sender_name} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-border/60 flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write a message…"
          className="min-h-[40px] max-h-32 resize-none bg-background/60"
          rows={1}
        />
        <Button onClick={send} disabled={!text.trim()} size="icon" className="bg-gradient-primary shadow-glow shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
