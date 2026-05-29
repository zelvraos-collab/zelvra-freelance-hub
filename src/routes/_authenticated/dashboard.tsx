import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Receipt, TrendingUp, Plus, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Zelvra" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile && !profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profile, navigate]);

  const firstName = (profile?.display_name ?? user?.email ?? "").split(" ")[0].split("@")[0];

  const stats = [
    { label: "Active projects", value: "0", icon: Briefcase, hint: "Create your first" },
    { label: "Open invoices", value: "$0", icon: Receipt, hint: "Nothing pending" },
    { label: "Signed contracts", value: "0", icon: FileText, hint: "Protected & sealed" },
    { label: "This month", value: "$0", icon: TrendingUp, hint: "Earnings tracker" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
            {firstName ? `Hey, ${firstName}` : "Hey there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your freelance command center.</p>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Link to="/projects"><Plus className="w-4 h-4 mr-1.5" /> New project</Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card/40 border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3 font-display text-2xl font-semibold">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle className="font-display">Get started with Zelvra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: "Create your first project", desc: "Define scope, milestones, and rate.", to: "/projects" },
              { title: "Draft a contract", desc: "AI-assisted clauses your clients will love.", to: "/contracts" },
              { title: "Send an invoice", desc: "Multi-currency, GST/VAT, auto reminders.", to: "/invoices" },
              { title: "Try the AI assistant", desc: "Ask anything — scope, pricing, negotiation.", to: "/assistant" },
            ].map((step) => (
              <Link
                key={step.to}
                to={step.to}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 px-4 py-3 hover:border-primary/60 hover:bg-primary/5 transition-colors group"
              >
                <div>
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-primary/10 border-primary/30">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Pro tip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Lock down your scope before kickoff. Zelvra's AI flags every request that drifts beyond your contract.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/contracts">Build a contract</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
