import type { Database } from "@/integrations/supabase/types";

export type ProjectStatus = "draft" | "active" | "in_review" | "completed" | "archived";
export type RateType = "hourly" | "fixed";
export type ScopeStatus = "pending" | "in_progress" | "done";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ScopeItem = Database["public"]["Tables"]["scope_items"]["Row"];
export type TimeEntry = Database["public"]["Tables"]["time_entries"]["Row"];

export const STATUS_META: Record<ProjectStatus, { label: string; color: string; dot: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  active: { label: "Active", color: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  in_review: { label: "In review", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export const STATUS_ORDER: ProjectStatus[] = ["draft", "active", "in_review", "completed", "archived"];

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD", "AED", "JPY"] as const;

export const PROJECT_COLORS = [
  "#7F77DD", "#22C5A8", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#A855F7", "#10B981",
];

export function formatMoney(amount: number | null | undefined, currency: string = "USD") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
