import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { scanScopeCreep } from "@/lib/scope.functions";
import { calcTotals, formatMoney } from "@/lib/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Sparkles, Loader2, CheckCircle2, XCircle, FileText, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type ChangeItem = { description: string; quantity: number; rate: number };
type ChangeOrder = {
  id: string;
  title: string;
  rationale: string | null;
  items: ChangeItem[];
  suggested_price: number;
  currency: string;
  status: "proposed" | "accepted" | "rejected" | "converted";
  invoice_id: string | null;
  created_at: string;
};

export function ScopeCreepPanel({
  projectId,
  clientName,
  clientEmail,
}: {
  projectId: string;
  clientName: string | null;
  clientEmail: string | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const scan = useServerFn(scanScopeCreep);
  const [scanning, setScanning] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["change-orders", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders")
        .select("id, title, rationale, items, suggested_price, currency, status, invoice_id, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ChangeOrder[];
    },
  });

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await scan({ data: { projectId } });
      if (!res.findings.length) {
        toast.success("reason" in res ? res.reason : "No scope creep detected.");
      } else {
        toast.success(`Found ${res.findings.length} potential issue${res.findings.length === 1 ? "" : "s"}`);
        qc.invalidateQueries({ queryKey: ["change-orders", projectId] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("change_orders").update({ status: "rejected" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["change-orders", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const accept = useMutation({
    mutationFn: async (order: ChangeOrder) => {
      if (!user) throw new Error("Not signed in");

      // 1. Add items to project scope
      const { data: maxPos } = await supabase
        .from("scope_items")
        .select("position")
        .eq("project_id", projectId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      const startPos = (maxPos?.position ?? 0) + 1;

      const scopeRows = order.items.map((it, i) => ({
        project_id: projectId,
        user_id: user.id,
        title: it.description,
        position: startPos + i,
        status: "pending" as const,
      }));
      if (scopeRows.length > 0) {
        const { error: sErr } = await supabase.from("scope_items").insert(scopeRows);
        if (sErr) throw sErr;
      }

      // 2. Create change-order invoice
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const num = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const lineItems = order.items.map((it) => ({
        id: crypto.randomUUID(),
        description: it.description,
        quantity: it.quantity,
        rate: it.rate,
      }));
      const { subtotal, tax, total } = calcTotals(lineItems, 0, 0);

      const due = new Date();
      due.setDate(due.getDate() + 14);

      const { data: inv, error: iErr } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          project_id: projectId,
          number: num,
          client_name: clientName,
          client_email: clientEmail,
          currency: order.currency,
          status: "draft",
          line_items: lineItems,
          subtotal,
          tax_amount: tax,
          total,
          due_date: due.toISOString().slice(0, 10),
          notes: `Change order: ${order.title}`,
        })
        .select("id")
        .single();
      if (iErr) throw iErr;

      // 3. Mark change order converted
      const { error: cErr } = await supabase
        .from("change_orders")
        .update({ status: "converted", invoice_id: inv.id })
        .eq("id", order.id);
      if (cErr) throw cErr;

      return inv.id;
    },
    onSuccess: (invoiceId) => {
      toast.success("Change order accepted — invoice created");
      qc.invalidateQueries({ queryKey: ["change-orders", projectId] });
      qc.invalidateQueries({ queryKey: ["scope-items", projectId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/invoices/$id", params: { id: invoiceId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposed = orders.filter((o) => o.status === "proposed");
  const history = orders.filter((o) => o.status !== "proposed");

  return (
    <Card className="bg-card/40 border-border/60">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" /> Scope creep
          </CardTitle>
          {proposed.length > 0 && (
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30">
              {proposed.length} flagged
            </Badge>
          )}
        </div>
        <Button onClick={runScan} disabled={scanning} size="sm" className="bg-gradient-primary shadow-glow gap-1.5">
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {scanning ? "Scanning…" : "Scan now"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          AI compares the client conversation against your agreed scope and flags out-of-scope requests. One click turns
          them into a change-order invoice.
        </p>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-lg">
            No scans yet. Press “Scan now” after some client conversation.
          </div>
        ) : (
          <>
            {proposed.map((o) => (
              <div key={o.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{o.title}</div>
                    {o.rationale && <p className="text-xs text-muted-foreground mt-1">{o.rationale}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">{formatMoney(o.suggested_price, o.currency)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">suggested</div>
                  </div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">• {it.description}</span>
                      <span className="shrink-0">
                        {it.quantity} × {formatMoney(it.rate, o.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => accept.mutate(o)}
                    disabled={accept.isPending}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Accept & invoice
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reject.mutate(o.id)}
                    disabled={reject.isPending}
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </Button>
                </div>
              </div>
            ))}

            {history.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">History</div>
                {history.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-lg border border-border/60 bg-background/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{o.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={
                          o.status === "converted"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {o.status}
                      </Badge>
                      {o.invoice_id && (
                        <Link
                          to="/invoices/$id"
                          params={{ id: o.invoice_id }}
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          Invoice <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
