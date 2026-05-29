import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — Zelvra" }] }),
  component: () => <ComingSoon icon={Sparkles} title="AI Assistant" description="Your freelance copilot — drafts, pricing, negotiation." />,
});
