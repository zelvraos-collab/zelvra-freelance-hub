import { Link } from "@tanstack/react-router";
import { formatMoney, type Project } from "@/lib/projects";
import { StatusBadge } from "./StatusBadge";
import { Calendar, User } from "lucide-react";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="group block rounded-xl border border-border/60 bg-card/40 p-5 hover:border-primary/60 hover:bg-card/60 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <h3 className="font-medium truncate group-hover:text-primary transition-colors">{project.title}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {project.client_name && (
            <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {project.client_name}</span>
          )}
          {project.deadline && (
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(project.deadline).toLocaleDateString()}</span>
          )}
        </div>
        <span className="font-medium text-foreground">
          {formatMoney(project.rate_amount ? Number(project.rate_amount) : null, project.currency)}
          {project.rate_type === "hourly" && project.rate_amount ? "/h" : ""}
        </span>
      </div>
    </Link>
  );
}
