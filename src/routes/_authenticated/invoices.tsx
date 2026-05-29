import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Zelvra" }] }),
  component: () => <ComingSoon icon={Receipt} title="Invoices" description="Multi-currency invoicing, escrow, and automated reminders." />,
});
