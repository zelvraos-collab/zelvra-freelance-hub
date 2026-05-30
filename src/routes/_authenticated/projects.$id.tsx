import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_ORDER, STATUS_META, formatMoney, type Project, type ProjectStatus } from "@/lib/projects";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { ScopeItems } from "@/components/projects/ScopeItems";
import { TimeTracker } from "@/components/projects/TimeTracker";
import { FileManager } from "@/components/projects/FileManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Mail, Calendar, User, Link2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Project — Zelvra" }] }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ProjectStatus) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      navigate({ to: "/projects" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center text-muted-foreground py-16">Loading…</div>;
  if (!project) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Project not found.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/projects">Back to projects</Link></Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 lg:pb-0">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> All projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-2 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight truncate">{project.title}</h1>
            {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={project.status} onValueChange={(v) => updateStatus.mutate(v as ProjectStatus)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue>
                <StatusBadge status={project.status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes the project and all its scope items and time entries. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <InfoTile icon={User} label="Client" value={project.client_name ?? "—"} />
        <InfoTile icon={Mail} label="Email" value={project.client_email ?? "—"} />
        <InfoTile icon={Calendar} label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString() : "—"} />
        <InfoTile
          icon={Calendar}
          label={project.rate_type === "hourly" ? "Hourly rate" : "Fixed price"}
          value={`${formatMoney(project.rate_amount ? Number(project.rate_amount) : null, project.currency)}${project.rate_type === "hourly" && project.rate_amount ? "/h" : ""}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/40 border-border/60">
          <CardHeader><CardTitle className="font-display text-lg">Scope</CardTitle></CardHeader>
          <CardContent><ScopeItems projectId={project.id} /></CardContent>
        </Card>
        <Card className="bg-card/40 border-border/60">
          <CardHeader><CardTitle className="font-display text-lg">Time</CardTitle></CardHeader>
          <CardContent><TimeTracker projectId={project.id} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium truncate">{value}</div>
    </div>
  );
}
