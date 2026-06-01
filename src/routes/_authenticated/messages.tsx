import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { Card } from "@/components/ui/card";
import { MessageSquare, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — Zelvra" }] }),
  component: MessagesPage,
});

type ProjectRow = { id: string; title: string; color: string; client_name: string | null };

function MessagesPage() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-with-msgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, color, client_name")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const active = projects.find((p) => p.id === activeId) ?? projects[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1 text-sm">Realtime chat with every client, scoped per project.</p>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-card/40 border-border/60 p-12 text-center">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-display text-lg font-semibold">No projects yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Create a project to start messaging your client.</p>
          <Link to="/projects" className="text-primary text-sm font-medium mt-3 inline-block">Go to projects →</Link>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          <Card className="bg-card/40 border-border/60 p-2 h-fit max-h-[520px] overflow-y-auto">
            {projects.map((p) => {
              const isActive = active?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                    isActive ? "bg-primary/10" : "hover:bg-accent/40"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {p.client_name ?? "No client"}
                    </div>
                  </div>
                </button>
              );
            })}
          </Card>
          {active && user && <ChatPanel projectId={active.id} ownerId={user.id} />}
        </div>
      )}
    </div>
  );
}
