import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  DollarSign,
  ShieldAlert,
  TrendingUp,
  Wallet,
  Sparkles,
} from "lucide-react";
import { formatMoney } from "@/lib/invoices";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Zelvra" }] }),
  component: AnalyticsPage,
});

type Invoice = {
  id: string;
  total: number | string;
  amount_paid: number | string;
  currency: string;
  status: string;
  issue_date: string;
  paid_at: string | null;
  project_id: string | null;
};

type ChangeOrder = {
  id: string;
  status: "proposed" | "accepted" | "rejected" | "converted";
  suggested_price: number | string;
  currency: string;
  created_at: string;
  project_id: string;
};

type Project = { id: string; title: string; currency: string };

function AnalyticsPage() {
  const { data: invoices = [], isLoading: li } = useQuery({
    queryKey: ["analytics-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, total, amount_paid, currency, status, issue_date, paid_at, project_id")
        .order("issue_date", { ascending: true });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const { data: orders = [], isLoading: lo } = useQuery({
    queryKey: ["analytics-change-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders")
        .select("id, status, suggested_price, currency, created_at, project_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChangeOrder[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["analytics-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, title, currency");
      if (error) throw error;
      return data as Project[];
    },
  });

  const baseCurrency = projects[0]?.currency ?? invoices[0]?.currency ?? "USD";

  const stats = useMemo(() => {
    const totalEarned = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    const outstanding = invoices.reduce(
      (s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.amount_paid || 0)),
      0,
    );
    const recoveredOrders = orders.filter((o) => o.status === "converted");
    const recovered = recoveredOrders.reduce((s, o) => s + Number(o.suggested_price || 0), 0);
    const flagged = orders.length;
    return {
      totalEarned,
      outstanding,
      recovered,
      flagged,
      recoveredCount: recoveredOrders.length,
      acceptRate: flagged ? Math.round((recoveredOrders.length / flagged) * 100) : 0,
    };
  }, [invoices, orders]);

  // Monthly earnings trend (12 months)
  const earningsTrend = useMemo(() => {
    const months = lastNMonths(12);
    const map = new Map(months.map((m) => [m.key, { month: m.label, paid: 0, billed: 0 }]));
    for (const inv of invoices) {
      const key = inv.issue_date?.slice(0, 7);
      const slot = key && map.get(key);
      if (!slot) continue;
      slot.billed += Number(inv.total || 0);
      slot.paid += Number(inv.amount_paid || 0);
    }
    return Array.from(map.values());
  }, [invoices]);

  // Scope creep trend (per month — flagged vs converted)
  const creepTrend = useMemo(() => {
    const months = lastNMonths(12);
    const map = new Map(
      months.map((m) => [m.key, { month: m.label, flagged: 0, converted: 0, value: 0 }]),
    );
    for (const o of orders) {
      const key = o.created_at?.slice(0, 7);
      const slot = key && map.get(key);
      if (!slot) continue;
      slot.flagged += 1;
      if (o.status === "converted") {
        slot.converted += 1;
        slot.value += Number(o.suggested_price || 0);
      }
    }
    return Array.from(map.values());
  }, [orders]);

  // Change-order status breakdown
  const orderBreakdown = useMemo(() => {
    const counts = { proposed: 0, converted: 0, rejected: 0, accepted: 0 };
    for (const o of orders) counts[o.status] += 1;
    return [
      { name: "Converted", value: counts.converted, color: "hsl(160 84% 45%)" },
      { name: "Proposed", value: counts.proposed, color: "hsl(38 92% 60%)" },
      { name: "Accepted", value: counts.accepted, color: "hsl(217 91% 60%)" },
      { name: "Dismissed", value: counts.rejected, color: "hsl(0 0% 45%)" },
    ].filter((s) => s.value > 0);
  }, [orders]);

  // Top projects by earnings
  const topProjects = useMemo(() => {
    const byProject = new Map<string, number>();
    for (const inv of invoices) {
      if (!inv.project_id) continue;
      byProject.set(inv.project_id, (byProject.get(inv.project_id) ?? 0) + Number(inv.amount_paid || 0));
    }
    return Array.from(byProject.entries())
      .map(([id, total]) => ({
        id,
        title: projects.find((p) => p.id === id)?.title ?? "Untitled",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices, projects]);

  const loading = li || lo;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Earnings, scope-creep trends, and change-order impact.
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          Base currency: {baseCurrency}
        </Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Wallet}
          label="Total earned"
          value={formatMoney(stats.totalEarned, baseCurrency)}
          tone="emerald"
        />
        <StatTile
          icon={DollarSign}
          label="Outstanding"
          value={formatMoney(stats.outstanding, baseCurrency)}
          tone="amber"
        />
        <StatTile
          icon={ShieldAlert}
          label="Recovered (scope)"
          value={formatMoney(stats.recovered, baseCurrency)}
          tone="primary"
          sub={`${stats.recoveredCount} converted`}
        />
        <StatTile
          icon={Sparkles}
          label="Flagged total"
          value={String(stats.flagged)}
          tone="default"
          sub={`${stats.acceptRate}% accept rate`}
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">Crunching numbers…</div>
      ) : (
        <>
          <Card className="bg-card/40 border-border/60">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Earnings — last 12 months
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {invoices.length === 0 ? (
                <EmptyChart label="No invoices yet" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earningsTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160 84% 45%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(160 84% 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(252 70% 65%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(252 70% 65%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => fmtShort(v)} />
                    <Tooltip content={<ChartTip currency={baseCurrency} />} />
                    <Area type="monotone" dataKey="billed" stroke="hsl(252 70% 65%)" strokeWidth={2} fill="url(#billedGrad)" />
                    <Area type="monotone" dataKey="paid" stroke="hsl(160 84% 45%)" strokeWidth={2} fill="url(#paidGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-card/40 border-border/60 lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Scope-creep trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                {orders.length === 0 ? (
                  <EmptyChart label="No scope creep flagged yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={creepTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <Tooltip content={<CreepTip />} />
                      <Bar dataKey="flagged" fill="hsl(38 92% 60%)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="converted" fill="hsl(160 84% 45%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-border/60">
              <CardHeader>
                <CardTitle className="font-display text-lg">Change-order status</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px]">
                {orderBreakdown.length === 0 ? (
                  <EmptyChart label="Nothing flagged yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {orderBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
                  {orderBreakdown.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                      {s.name} ({s.value})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/40 border-border/60">
            <CardHeader>
              <CardTitle className="font-display text-lg">Top projects by revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {topProjects.length === 0 ? (
                <EmptyChart label="No payments recorded yet" />
              ) : (
                <div className="space-y-3">
                  {topProjects.map((p, i) => {
                    const max = topProjects[0].total || 1;
                    const pct = (p.total / max) * 100;
                    return (
                      <div key={p.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="truncate">
                            <span className="text-muted-foreground tabular-nums mr-2">#{i + 1}</span>
                            {p.title}
                          </span>
                          <span className="font-semibold tabular-nums">{formatMoney(p.total, baseCurrency)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "amber" | "primary" | "default";
}) {
  const tones = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    primary: "text-primary bg-primary/10 border-primary/20",
    default: "text-foreground bg-muted/40 border-border",
  } as const;
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center border ${tones[tone]}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="mt-2 text-xl font-display font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg">
      {label}
    </div>
  );
}

function ChartTip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 capitalize">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span>{p.dataKey}</span>
          <span className="ml-auto font-semibold tabular-nums">{formatMoney(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

function CreepTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 capitalize">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span>{p.dataKey}</span>
          <span className="ml-auto font-semibold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function lastNMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return out;
}

function fmtShort(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return String(v);
}
