import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { ScopeItem, ScopeStatus } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Circle, CircleDot, CircleCheck } from "lucide-react";
import { toast } from "sonner";

const NEXT: Record<ScopeStatus, ScopeStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

const ICONS = {
  pending: Circle,
  in_progress: CircleDot,
  done: CircleCheck,
};

export function ScopeItems({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["scope_items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scope_items")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScopeItem[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user || !title.trim()) return;
      const { error } = await supabase.from("scope_items").insert({
        project_id: projectId,
        user_id: user.id,
        title: title.trim(),
        position: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); qc.invalidateQueries({ queryKey: ["scope_items", projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (item: ScopeItem) => {
      const { error } = await supabase.from("scope_items")
        .update({ status: NEXT[item.status as ScopeStatus] })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scope_items", projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scope_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scope_items", projectId] }),
  });

  const done = items.filter((i) => i.status === "done").length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{done} of {items.length} done</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        {items.map((item) => {
          const status = item.status as ScopeStatus;
          const Icon = ICONS[status];
          return (
            <div key={item.id} className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
              <button onClick={() => toggle.mutate(item)} className="text-muted-foreground hover:text-primary">
                <Icon className={`w-4 h-4 ${status === "done" ? "text-emerald-400" : status === "in_progress" ? "text-amber-400" : ""}`} />
              </button>
              <span className={`flex-1 text-sm ${status === "done" ? "line-through text-muted-foreground" : ""}`}>
                {item.title}
              </span>
              <button onClick={() => remove.mutate(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No deliverables yet. Add the first one below.</p>
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        className="flex gap-2"
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a deliverable…" />
        <Button type="submit" disabled={!title.trim() || add.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
