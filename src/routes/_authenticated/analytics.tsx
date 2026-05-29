import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Zelvra" }] }),
  component: () => <ComingSoon icon={BarChart3} title="Analytics" description="Earnings, scope-creep savings, and client insights." />,
});
