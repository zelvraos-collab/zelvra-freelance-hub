import type { Database } from "@/integrations/supabase/types";

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-border" },
  sent: { label: "Sent", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  viewed: { label: "Viewed", color: "bg-primary/15 text-primary border-primary/30" },
  partially_paid: { label: "Partial", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  paid: { label: "Paid", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  overdue: { label: "Overdue", color: "bg-destructive/15 text-destructive border-destructive/30" },
  void: { label: "Void", color: "bg-muted text-muted-foreground border-border" },
};

export function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 };
}

export function calcTotals(items: LineItem[], taxRate: number, discount: number) {
  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const afterDiscount = Math.max(0, subtotal - (discount || 0));
  const tax = afterDiscount * ((taxRate || 0) / 100);
  const total = afterDiscount + tax;
  return { subtotal, tax, total };
}

export function formatMoney(amount: number | null | undefined, currency: string = "USD") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
