import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { STATUS_META, STATUS_ORDER, formatMoney, type Project, type ProjectStatus } from "@/lib/projects";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, LayoutGrid, List, KanbanSquare, Search, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — Zelvra" }] }),
  component: ProjectsPage,
});

type View = "grid" | "list" | "kanban";

function ProjectsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search && !`${p.title} ${p.client_name ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">All your client work in one place.</p>
        </div>
        <NewProjectDialog />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="pl-9 bg-card/40" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 p-1">
            <button onClick={() => setStatusFilter("all")} className={`px-3 py-1 text-xs rounded-md ${statusFilter === "all" ? "bg-primary/15 text-foreground" : "text-muted-foreground"}`}>All</button>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${statusFilter === s ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="grid"><LayoutGrid className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="list"><List className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="kanban"><KanbanSquare className="w-4 h-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">Loading projects…</div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">No projects match your filters.</div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : view === "list" ? (
        <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-accent/40">
                  <TableCell>
                    <Link to="/projects/$id" params={{ id: p.id }} className="flex items-center gap-2 font-medium hover:text-primary">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.client_name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell>{formatMoney(p.rate_amount ? Number(p.rate_amount) : null, p.currency)}{p.rate_type === "hourly" && p.rate_amount ? "/h" : ""}</TableCell>
                  <TableCell className="text-muted-foreground">{p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <KanbanBoard projects={filtered} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
        <Briefcase className="w-6 h-6 text-primary-foreground" />
      </div>
      <h2 className="font-display text-xl font-semibold mt-5">Start your first project</h2>
      <p className="text-muted-foreground mt-1.5 text-sm max-w-md mx-auto">
        Define the scope, set your rate, and protect your work from creep — all in one place.
      </p>
      <div className="mt-6">
        <NewProjectDialog trigger={
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Plus className="w-4 h-4 mr-1.5" /> Create project
          </Button>
        } />
      </div>
    </div>
  );
}
