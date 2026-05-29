import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({ meta: [{ title: "Contracts — Zelvra" }] }),
  component: () => <ComingSoon icon={FileText} title="Contracts" description="AI-drafted, e-signed contracts with payment-gated delivery." />,
});
