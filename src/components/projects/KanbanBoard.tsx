import { Link } from "@tanstack/react-router";
import { STATUS_META, STATUS_ORDER, type Project, type ProjectStatus, formatMoney } from "@/lib/projects";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, type DragEvent } from "react";

export function KanbanBoard({ projects }: { projects: Project[] }) {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState<ProjectStatus | null>(null);

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const onDrop = (e: DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) move.mutate({ id, status });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATUS_ORDER.map((status) => {
        const items = projects.filter((p) => p.status === status);
        const meta = STATUS_META[status];
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(e, status)}
            className={`rounded-xl border bg-card/30 p-3 min-h-[200px] transition-colors ${
              dragOver === status ? "border-primary bg-primary/5" : "border-border/60"
            }`}
          >
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                <span className="text-xs font-medium">{meta.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$id"
                  params={{ id: p.id }}
                  draggable
                  onDragStart={(e) => onDragStart(e, p.id)}
                  className="block rounded-lg border border-border/60 bg-background/60 p-3 hover:border-primary/60 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium truncate">{p.title}</span>
                  </div>
                  {p.client_name && (
                    <div className="mt-1 text-xs text-muted-foreground truncate">{p.client_name}</div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatMoney(p.rate_amount ? Number(p.rate_amount) : null, p.currency)}
                  </div>
                </Link>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">Drop here</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
