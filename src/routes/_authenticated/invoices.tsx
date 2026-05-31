import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NewInvoiceDialog } from "@/components/invoices/NewInvoiceDialog";
import { INVOICE_STATUS_META, formatDate, formatMoney, type Invoice } from "@/lib/invoices";
import { Receipt, ArrowUpRight, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Zelvra" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "void" && i.status !== "draft")
    .reduce((sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" && i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth())
    .reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Multi-currency invoices with escrow protection.</p>
        </div>
        <NewInvoiceDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Outstanding" value={formatMoney(outstanding, "USD")} hint="across active invoices" />
        <Stat label="Paid this month" value={formatMoney(paidThisMonth, "USD")} hint="received" />
        <Stat label="Total invoices" value={String(invoices.length)} hint="all time" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <div className="font-medium">No invoices yet</div>
            <p className="text-sm text-muted-foreground mt-1">Create your first invoice to get paid faster.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Number</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Issued</th>
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const meta = INVOICE_STATUS_META[inv.status];
                return (
                  <tr key={inv.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link to="/invoices/$id" params={{ id: inv.id }} className="font-medium hover:text-primary inline-flex items-center gap-1.5">
                        {inv.number}
                        {inv.is_escrow && <Lock className="w-3 h-3 text-primary" />}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.client_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatMoney(inv.total, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md border text-xs ${meta.color}`}>{meta.label}</span>
                    </td>
                    <td className="pr-4">
                      <Link to="/invoices/$id" params={{ id: inv.id }} className="text-muted-foreground hover:text-foreground">
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
