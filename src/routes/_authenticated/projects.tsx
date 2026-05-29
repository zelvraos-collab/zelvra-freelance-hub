import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — Zelvra" }] }),
  component: () => <ComingSoon icon={Briefcase} title="Projects" description="Create, track, and ship work with scope protection. Landing in Phase 3." />,
});
