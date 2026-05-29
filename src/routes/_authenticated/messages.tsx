import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — Zelvra" }] }),
  component: () => <ComingSoon icon={MessageSquare} title="Messages" description="Realtime chat with clients, scoped to each project." />,
});
