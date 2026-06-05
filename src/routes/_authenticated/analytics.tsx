import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  Clock,
  FolderKanban,
  FileText,
  Download,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Flame,
} from "lucide-react";
import { formatMoney } from "@/lib/invoices";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Zelvra" }] }),
  component: AnalyticsPage,
});

// Brand palette
const C = {
  purple: "#7F77DD",
  teal: "#00C9A7",
  amber: "#F59E0B",
  rose: "#F43F5E",
  blue: "#3B82F6",
  muted: "hsl(var(--muted-foreground))",
};

type Invoice = {
  id: string; total: number | string; amount_paid: number | string; currency: string;
  status: string; issue_date: string; due_date: string | null; paid_at: string | null;
  sent_at: string | null; project_id: string | null; client_name: string | null;
};
type ChangeOrder = {
  id: string; status: "proposed" | "accepted" | "rejected" | "converted";
  suggested_price: number | string; currency: string; created_at: string; project_id: string;
};
type Project = {
  id: string; title: string; currency: string; status: string;
  client_name: string | null; deadline: string | null;
  created_at: string; updated_at: string;
};
type TimeEntry = {
  id: string; project_id: string; duration_minutes: number;
  entry_date: string; created_at: string; description: string | null;
};
type ScopeItem = { id: string; project_id: string; estimated_hours: number | null; status: string };
type Msg = { id: string; project_id: string; sender_role: string; created_at: string };

type Range = "today" | "week" | "month" | "year" | "all" | "custom";

function AnalyticsPage() {
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const { from, to } = useMemo(() => computeRange(range, customFrom, customTo), [range, customFrom, customTo]);

  const { data: invoices = [] } = useQuery({
    queryKey: ["an-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, total, amount_paid, currency, status, issue_date, due_date, paid_at, sent_at, project_id, client_name")
        .order("issue_date", { ascending: true });
      if (error) throw error;
      return data as Invoice[];
    },
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["an-orders"],
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
    queryKey: ["an-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, currency, status, client_name, deadline, created_at, updated_at");
      if (error) throw error;
      return data as Project[];
    },
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["an-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("id, project_id, duration_minutes, entry_date, created_at, description")
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return data as TimeEntry[];
    },
  });
  const { data: scope = [] } = useQuery({
    queryKey: ["an-scope"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scope_items")
        .select("id, project_id, estimated_hours, status");
      if (error) throw error;
      return data as ScopeItem[];
    },
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["an-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, project_id, sender_role, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const baseCurrency = projects[0]?.currency ?? invoices[0]?.currency ?? "USD";

  // Filter by date range + project
  const inRange = (iso: string | null | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t <= to.getTime();
  };
  const matchProj = (pid: string | null | undefined) =>
    projectFilter === "all" || pid === projectFilter;

  const fInvoices = invoices.filter((i) => inRange(i.issue_date) && matchProj(i.project_id));
  const fOrders = orders.filter((o) => inRange(o.created_at) && matchProj(o.project_id));
  const fEntries = entries.filter((e) => inRange(e.entry_date) && matchProj(e.project_id));
  const fProjects = projects.filter((p) => projectFilter === "all" || p.id === projectFilter);

  // KPI
  const kpi = useMemo(() => {
    const revenue = fInvoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    const hours = fEntries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
    const active = fProjects.filter((p) => p.status === "active").length;
    const pending = fInvoices.filter((i) => i.status !== "paid" && i.status !== "void" && i.status !== "draft").length;
    return { revenue, hours, active, pending };
  }, [fInvoices, fEntries, fProjects]);

  // Time per day bar chart
  const timeByDay = useMemo(() => {
    const map = new Map<string, number>();
    const days = bucketDays(from, to);
    days.forEach((d) => map.set(d.key, 0));
    fEntries.forEach((e) => {
      const k = e.entry_date.slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) || 0) + e.duration_minutes / 60);
    });
    return days.map((d) => ({ day: d.label, hours: +(map.get(d.key) || 0).toFixed(2) }));
  }, [fEntries, from, to]);

  // Productivity heatmap: weekday x hour (uses created_at as proxy for time-of-day logged)
  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    fEntries.forEach((e) => {
      const d = new Date(e.created_at);
      grid[d.getDay()][d.getHours()] += e.duration_minutes / 60;
    });
    return grid;
  }, [fEntries]);
  const heatMax = Math.max(1, ...heatmap.flat());
  const peakHour = useMemo(() => {
    let best = { day: 0, hour: 0, val: 0 };
    heatmap.forEach((row, d) =>
      row.forEach((v, h) => { if (v > best.val) best = { day: d, hour: h, val: v }; }),
    );
    return best;
  }, [heatmap]);

  // Estimated vs actual per project
  const estVsActual = useMemo(() => {
    return fProjects.map((p) => {
      const est = scope.filter((s) => s.project_id === p.id).reduce((s, x) => s + Number(x.estimated_hours || 0), 0);
      const act = entries.filter((e) => e.project_id === p.id).reduce((s, e) => s + e.duration_minutes / 60, 0);
      return { id: p.id, title: p.title, estimated: +est.toFixed(1), actual: +act.toFixed(1), over: est > 0 && act > est };
    }).filter((r) => r.estimated > 0 || r.actual > 0).slice(0, 8);
  }, [fProjects, scope, entries]);

  const overBudget = estVsActual.filter((r) => r.over);

  // Project status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    fProjects.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    const colors: Record<string, string> = {
      active: C.teal, completed: C.purple, in_review: C.amber,
      draft: "#6B7280", archived: "#374151",
    };
    return Object.entries(map).map(([name, value]) => ({ name, value, color: colors[name] || C.blue }));
  }, [fProjects]);

  // Project metrics
  const projectMetrics = useMemo(() => {
    const total = fProjects.length;
    const completed = fProjects.filter((p) => p.status === "completed").length;
    const overdue = fProjects.filter((p) => p.deadline && new Date(p.deadline) < new Date() && p.status !== "completed").length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const onTime = fInvoices.filter((i) => i.status === "paid" && i.paid_at && i.due_date && new Date(i.paid_at) <= new Date(i.due_date)).length;
    const paidTotal = fInvoices.filter((i) => i.status === "paid").length;
    const onTimeRate = paidTotal ? Math.round((onTime / paidTotal) * 100) : 0;
    const durations = fProjects.filter((p) => p.status === "completed")
      .map((p) => (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    return { total, completed, overdue, completionRate, onTimeRate, avgDuration };
  }, [fProjects, fInvoices]);

  // Client analytics
  const clientStats = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; projects: Set<string>; orders: number; payDays: number[]; overdue: number }>();
    const ensure = (n: string) => {
      if (!map.has(n)) map.set(n, { name: n, revenue: 0, projects: new Set(), orders: 0, payDays: [], overdue: 0 });
      return map.get(n)!;
    };
    fInvoices.forEach((i) => {
      const n = i.client_name || "Unknown";
      const c = ensure(n);
      c.revenue += Number(i.amount_paid || 0);
      if (i.project_id) c.projects.add(i.project_id);
      if (i.status === "paid" && i.paid_at && i.sent_at) {
        c.payDays.push((new Date(i.paid_at).getTime() - new Date(i.sent_at).getTime()) / 86400000);
      }
      if (i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date()) c.overdue += 1;
    });
    fProjects.forEach((p) => { if (p.client_name) ensure(p.client_name).projects.add(p.id); });
    fOrders.forEach((o) => {
      const p = projects.find((x) => x.id === o.project_id);
      if (p?.client_name) ensure(p.client_name).orders += 1;
    });
    return Array.from(map.values()).map((c) => ({
      name: c.name,
      revenue: c.revenue,
      projectCount: c.projects.size,
      avgPayDays: c.payDays.length ? +(c.payDays.reduce((a, b) => a + b, 0) / c.payDays.length).toFixed(1) : null,
      orders: c.orders,
      overdue: c.overdue,
    }));
  }, [fInvoices, fProjects, fOrders, projects]);

  const topByRevenue = [...clientStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topByProjects = [...clientStats].sort((a, b) => b.projectCount - a.projectCount).slice(0, 5);
  const latePayers = [...clientStats].filter((c) => c.avgPayDays != null).sort((a, b) => (b.avgPayDays || 0) - (a.avgPayDays || 0)).slice(0, 5);
  const creepy = [...clientStats].filter((c) => c.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 5);

  // Financial
  const fin = useMemo(() => {
    const totalRev = fInvoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    const billed = fInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const avgInv = fInvoices.length ? totalRev / fInvoices.length : 0;
    const paidCount = fInvoices.filter((i) => i.status === "paid").length;
    const payRate = fInvoices.length ? Math.round((paidCount / fInvoices.length) * 100) : 0;
    const overdueAmt = fInvoices.filter((i) => i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date())
      .reduce((s, i) => s + (Number(i.total || 0) - Number(i.amount_paid || 0)), 0);
    // Forecast: outstanding from active projects' invoices
    const forecast = fInvoices.filter((i) => i.status !== "paid" && i.status !== "void")
      .reduce((s, i) => s + (Number(i.total || 0) - Number(i.amount_paid || 0)), 0);
    return { totalRev, billed, avgInv, payRate, overdueAmt, forecast };
  }, [fInvoices]);

  // Monthly trend (12 months) — ignores range filter to show context
  const monthlyTrend = useMemo(() => {
    const months = lastNMonths(12);
    const map = new Map(months.map((m) => [m.key, { month: m.label, billed: 0, paid: 0 }]));
    invoices.forEach((i) => {
      const k = i.issue_date?.slice(0, 7);
      const slot = k && map.get(k);
      if (!slot) return;
      slot.billed += Number(i.total || 0);
      slot.paid += Number(i.amount_paid || 0);
    });
    return Array.from(map.values());
  }, [invoices]);

  // Productivity
  const prod = useMemo(() => {
    const billableHrs = fEntries.reduce((s, e) => s + e.duration_minutes, 0) / 60;
    // Capacity: 40h/week across range
    const weeks = Math.max(1, (to.getTime() - from.getTime()) / (7 * 86400000));
    const capacity = 40 * weeks;
    const util = capacity > 0 ? Math.min(100, Math.round((billableHrs / capacity) * 100)) : 0;
    const dones = scope.filter((s) => s.status === "done").length;
    const daysSpan = Math.max(1, (to.getTime() - from.getTime()) / 86400000);
    const tasksPerDay = +(dones / daysSpan).toFixed(2);
    // Response time: avg minutes between client msg and next freelancer reply per project
    const byProj = new Map<string, Msg[]>();
    messages.forEach((m) => {
      if (!matchProj(m.project_id)) return;
      const arr = byProj.get(m.project_id) || [];
      arr.push(m); byProj.set(m.project_id, arr);
    });
    const replyDeltas: number[] = [];
    byProj.forEach((arr) => {
      arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (let i = 1; i < arr.length; i++) {
        if (arr[i - 1].sender_role === "client" && arr[i].sender_role !== "client") {
          replyDeltas.push((new Date(arr[i].created_at).getTime() - new Date(arr[i - 1].created_at).getTime()) / 60000);
        }
      }
    });
    const avgResponseMin = replyDeltas.length ? Math.round(replyDeltas.reduce((a, b) => a + b, 0) / replyDeltas.length) : 0;
    return { billableHrs: +billableHrs.toFixed(1), util, tasksPerDay, avgResponseMin };
  }, [fEntries, from, to, scope, messages, projectFilter]);

  // AI insights (rule-based)
  const insights = useMemo(() => {
    const list: { tone: "info" | "warn" | "success"; text: string }[] = [];
    const wkDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    list.push({
      tone: "success",
      text: `This range: ${kpi.hours.toFixed(1)}h logged, ${kpi.active} active projects, ${formatMoney(kpi.revenue, baseCurrency)} earned.`,
    });
    if (peakHour.val > 0) {
      list.push({ tone: "info", text: `You work best on ${wkDays[peakHour.day]} around ${peakHour.hour}:00.` });
    }
    overBudget.slice(0, 2).forEach((p) => {
      const over = Math.round(((p.actual - p.estimated) / p.estimated) * 100);
      list.push({ tone: "warn", text: `Project "${p.title}" is ${over}% over the time budget.` });
    });
    latePayers.slice(0, 1).forEach((c) => {
      if ((c.avgPayDays || 0) > 14) list.push({ tone: "warn", text: `${c.name} averages ${c.avgPayDays} days to pay — consider upfront payment.` });
    });
    if (prod.billableHrs / Math.max(1, (to.getTime() - from.getTime()) / (7 * 86400000)) > 50) {
      list.push({ tone: "warn", text: `Burnout alert: you're averaging over 50h/week. Take a break.` });
    }
    if (fin.overdueAmt > 0) list.push({ tone: "warn", text: `${formatMoney(fin.overdueAmt, baseCurrency)} in overdue invoices needs follow-up.` });
    return list;
  }, [kpi, peakHour, overBudget, latePayers, prod, fin, baseCurrency, from, to]);

  const exportCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Range", `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`],
      ["Total Revenue", String(kpi.revenue)],
      ["Hours Logged", kpi.hours.toFixed(2)],
      ["Active Projects", String(kpi.active)],
      ["Pending Invoices", String(kpi.pending)],
      ["Completion Rate %", String(projectMetrics.completionRate)],
      ["On-time Rate %", String(projectMetrics.onTimeRate)],
      ["Avg Project Duration (d)", String(projectMetrics.avgDuration)],
      ["Avg Invoice Value", fin.avgInv.toFixed(2)],
      ["Payment Rate %", String(fin.payRate)],
      ["Overdue Amount", String(fin.overdueAmt)],
      ["Forecast (outstanding)", String(fin.forecast)],
      ["Utilization %", String(prod.util)],
      ["Tasks/day", String(prod.tasksPerDay)],
      ["Avg Response (min)", String(prod.avgResponseMin)],
      [],
      ["Top Clients by Revenue"],
      ...topByRevenue.map((c) => [c.name, String(c.revenue)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `zelvra-analytics-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Comprehensive insights across time, projects, clients & finances.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {range === "custom" && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-[150px]" />
            </>
          )}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">{baseCurrency}</Badge>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} label="Total Revenue" value={formatMoney(kpi.revenue, baseCurrency)} tone="teal" />
        <Kpi icon={Clock} label="Hours Logged" value={`${kpi.hours.toFixed(1)}h`} tone="purple" />
        <Kpi icon={FolderKanban} label="Projects Active" value={String(kpi.active)} tone="blue" />
        <Kpi icon={FileText} label="Invoices Pending" value={String(kpi.pending)} tone="amber" />
      </div>

      {/* Time + Financial side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Time tracked" icon={Clock} subtitle="hours per day">
          {timeByDay.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke={C.muted} fontSize={10} />
                <YAxis stroke={C.muted} fontSize={11} />
                <Tooltip content={<Tip suffix="h" />} />
                <Bar dataKey="hours" fill={C.purple} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue trend" icon={TrendingUp} subtitle="last 12 months">
          {monthlyTrend.every((m) => m.billed === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.teal} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.purple} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke={C.muted} fontSize={11} />
                <YAxis stroke={C.muted} fontSize={11} tickFormatter={fmtShort} />
                <Tooltip content={<Tip currency={baseCurrency} />} />
                <Area type="monotone" dataKey="billed" stroke={C.purple} strokeWidth={2} fill="url(#g2)" />
                <Area type="monotone" dataKey="paid" stroke={C.teal} strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Productivity heatmap + estimated vs actual */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" /> Productivity heatmap
            </CardTitle>
            <p className="text-xs text-muted-foreground">When you're most active (hour × weekday)</p>
          </CardHeader>
          <CardContent>
            <Heatmap data={heatmap} max={heatMax} />
          </CardContent>
        </Card>

        <ChartCard title="Estimated vs actual" icon={Activity} subtitle="hours per project">
          {estVsActual.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={estVsActual} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke={C.muted} fontSize={11} />
                <YAxis type="category" dataKey="title" stroke={C.muted} fontSize={10} width={100} />
                <Tooltip content={<Tip suffix="h" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="estimated" fill={C.purple} radius={[0, 4, 4, 0]} />
                <Bar dataKey="actual" fill={C.teal} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {overBudget.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-amber-300">Over time-budget</div>
            <div className="text-muted-foreground mt-0.5">
              {overBudget.map((p) => p.title).join(", ")} exceeded estimated hours.
            </div>
          </div>
        </div>
      )}

      {/* Project + Client analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/40 border-border/60">
          <CardHeader><CardTitle className="font-display text-base">Projects by status</CardTitle></CardHeader>
          <CardContent className="h-[240px]">
            {statusBreakdown.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {statusBreakdown.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
              {statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground capitalize">
                  <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /> {s.name.replace("_", " ")} ({s.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/60 lg:col-span-2">
          <CardHeader><CardTitle className="font-display text-base">Project health</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Metric label="Completion rate" value={`${projectMetrics.completionRate}%`} />
            <Metric label="On-time delivery" value={`${projectMetrics.onTimeRate}%`} />
            <Metric label="Avg duration" value={`${projectMetrics.avgDuration}d`} />
            <Metric label="Completed" value={String(projectMetrics.completed)} />
            <Metric label="Overdue" value={String(projectMetrics.overdue)} tone={projectMetrics.overdue > 0 ? "warn" : undefined} />
            <Metric label="Scope-creep orders" value={String(fOrders.length)} />
          </CardContent>
        </Card>
      </div>

      {/* Client analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClientList title="Top clients by revenue" icon={DollarSign} items={topByRevenue.map((c) => ({
          name: c.name, primary: formatMoney(c.revenue, baseCurrency), secondary: `${c.projectCount} project${c.projectCount === 1 ? "" : "s"}`,
        }))} />
        <ClientList title="Most projects" icon={Users} items={topByProjects.map((c) => ({
          name: c.name, primary: `${c.projectCount}`, secondary: formatMoney(c.revenue, baseCurrency),
        }))} />
        <ClientList title="Slowest payers" icon={Clock} items={latePayers.map((c) => ({
          name: c.name, primary: `${c.avgPayDays}d avg`, secondary: c.overdue ? `${c.overdue} overdue` : "—",
          warn: (c.avgPayDays || 0) > 14,
        }))} empty="No payment data yet" />
        <ClientList title="Most scope-creep" icon={AlertTriangle} items={creepy.map((c) => ({
          name: c.name, primary: `${c.orders}`, secondary: "change orders",
        }))} empty="No scope creep flagged" />
      </div>

      {/* Financial detail */}
      <Card className="bg-card/40 border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Financial summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Metric label="Revenue" value={formatMoney(fin.totalRev, baseCurrency)} />
          <Metric label="Billed" value={formatMoney(fin.billed, baseCurrency)} />
          <Metric label="Avg invoice" value={formatMoney(Math.round(fin.avgInv), baseCurrency)} />
          <Metric label="Payment rate" value={`${fin.payRate}%`} />
          <Metric label="Overdue" value={formatMoney(fin.overdueAmt, baseCurrency)} tone={fin.overdueAmt > 0 ? "warn" : undefined} />
          <Metric label="Forecast" value={formatMoney(fin.forecast, baseCurrency)} tone="good" />
        </CardContent>
      </Card>

      {/* Productivity strip */}
      <Card className="bg-card/40 border-border/60">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Productivity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Billable hours" value={`${prod.billableHrs}h`} />
          <Metric label="Utilization" value={`${prod.util}%`} sub="vs 40h/week capacity" />
          <Metric label="Tasks/day" value={String(prod.tasksPerDay)} />
          <Metric label="Avg response" value={prod.avgResponseMin ? `${prod.avgResponseMin}m` : "—"} />
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-primary/10 via-card/40 to-card/40 border-primary/30">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AI insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
              ins.tone === "warn" ? "border-amber-500/30 bg-amber-500/5 text-amber-100" :
              ins.tone === "success" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100" :
              "border-border/60 bg-background/40"
            }`}>
              {ins.tone === "warn" ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" /> :
                ins.tone === "success" ? <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5" /> :
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5" />}
              <span>{ins.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- helpers ----------

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof BarChart3; label: string; value: string; tone: "purple" | "teal" | "blue" | "amber" }) {
  const tones = {
    purple: "from-purple-500/20 to-purple-500/5 text-purple-300",
    teal: "from-teal-500/20 to-teal-500/5 text-teal-300",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-300",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-300",
  };
  return (
    <div className={`rounded-xl border border-border/60 bg-gradient-to-br ${tones[tone]} p-4 transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 opacity-80" />
      </div>
      <div className="mt-2 text-2xl font-display font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <Card className="bg-card/40 border-border/60">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="h-[260px]">{children}</CardContent>
    </Card>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "good" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-semibold tabular-nums ${
        tone === "warn" ? "text-amber-300" : tone === "good" ? "text-emerald-300" : ""
      }`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ClientList({ title, icon: Icon, items, empty = "No data yet" }: {
  title: string; icon: typeof BarChart3;
  items: { name: string; primary: string; secondary: string; warn?: boolean }[];
  empty?: string;
}) {
  return (
    <Card className="bg-card/40 border-border/60">
      <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">{empty}</div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={`${it.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-medium truncate text-sm">{it.name}</div>
                  <div className="text-[11px] text-muted-foreground">{it.secondary}</div>
                </div>
                <div className={`font-display tabular-nums font-semibold ${it.warn ? "text-amber-300" : ""}`}>{it.primary}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Heatmap({ data, max }: { data: number[][]; max: number }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1 ml-6 text-[9px] text-muted-foreground mb-1">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="w-3 text-center">{h % 6 === 0 ? h : ""}</div>
          ))}
        </div>
        {data.map((row, d) => (
          <div key={d} className="flex items-center gap-1 mb-1">
            <div className="w-4 text-[10px] text-muted-foreground">{days[d]}</div>
            {row.map((v, h) => {
              const intensity = max > 0 ? v / max : 0;
              return (
                <div key={h} className="w-3 h-3 rounded-sm" style={{
                  background: intensity === 0 ? "hsl(var(--muted) / 0.3)" : `color-mix(in oklab, ${C.purple} ${intensity * 100}%, transparent)`,
                }} title={`${days[d]} ${h}:00 — ${v.toFixed(1)}h`} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() { return <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg">No data in this range</div>; }

const tipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 } as const;

function Tip({ active, payload, label, currency, suffix }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string; currency?: string; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <div className="text-muted-foreground mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 capitalize">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span>{p.dataKey}</span>
          <span className="ml-auto font-semibold tabular-nums">
            {currency ? formatMoney(p.value, currency) : `${p.value}${suffix || ""}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function computeRange(r: Range, from: string, to: string): { from: Date; to: Date } {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  switch (r) {
    case "today": return { from: start, to: end };
    case "week": { const s = new Date(start); s.setDate(s.getDate() - s.getDay()); return { from: s, to: end }; }
    case "month": return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
    case "year": return { from: new Date(now.getFullYear(), 0, 1), to: end };
    case "all": return { from: new Date(2000, 0, 1), to: end };
    case "custom": return {
      from: from ? new Date(from) : new Date(2000, 0, 1),
      to: to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : end,
    };
  }
}

function bucketDays(from: Date, to: Date) {
  const out: { key: string; label: string }[] = [];
  const days = Math.min(60, Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(from); d.setDate(d.getDate() + i);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  return out;
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
