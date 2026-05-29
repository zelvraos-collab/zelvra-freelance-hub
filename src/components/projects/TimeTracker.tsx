import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDuration, type TimeEntry } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function TimeTracker({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [desc, setDesc] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["time_entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TimeEntry[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
      if (total <= 0) throw new Error("Enter some time");
      const { error } = await supabase.from("time_entries").insert({
        project_id: projectId,
        user_id: user.id,
        description: desc.trim() || null,
        duration_minutes: total,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDesc(""); setHours(""); setMinutes("");
      qc.invalidateQueries({ queryKey: ["time_entries", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["time_entries", projectId] }),
  });

  const total = entries.reduce((acc, e) => acc + e.duration_minutes, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Clock className="w-4 h-4" /> Total tracked
        </span>
        <span className="font-display text-lg font-semibold">{formatDuration(total)}</span>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
        className="grid grid-cols-[1fr_auto_auto_auto] gap-2"
      >
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" />
        <Input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="h" className="w-16" />
        <Input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="m" className="w-16" />
        <Button type="submit" disabled={add.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="w-4 h-4" />
        </Button>
      </form>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-sm">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{new Date(e.entry_date).toLocaleDateString()}</span>
            <span className="flex-1 truncate">{e.description || <span className="text-muted-foreground italic">No note</span>}</span>
            <span className="font-medium">{formatDuration(e.duration_minutes)}</span>
            <button onClick={() => remove.mutate(e.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No time logged yet.</p>
        )}
      </div>
    </div>
  );
}
