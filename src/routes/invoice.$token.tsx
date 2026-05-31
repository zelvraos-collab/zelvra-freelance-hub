import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { getPublicInvoice, recordManualPayment } from "@/lib/invoice.functions";
import { formatMoney, type Invoice } from "@/lib/invoices";
import { Shield, Lock, CheckCircle2, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invoice/$token")({
  head: () => ({ meta: [{ title: "Invoice — Zelvra" }, { name: "robots", content: "noindex" }] }),
  component: PublicInvoice,
});

function PublicInvoice() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const fetchInvoice = useServerFn(getPublicInvoice);
  const payFn = useServerFn(recordManualPayment);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => fetchInvoice({ data: { token } }),
  });

  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "card" | "other">("bank_transfer");
  const [reference, setReference] = useState("");

  const pay = useMutation({
    mutationFn: () => payFn({ data: { token, payerName, payerEmail, method, reference } }),
    onSuccess: () => {
      toast.success("Payment recorded. The freelancer has been notified.");
      qc.invalidateQueries({ queryKey: ["public-invoice", token] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Invoice not found</h1>
          <p className="text-muted-foreground mt-1">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const invoice = data.invoice as Invoice;
  const isPaid = invoice.status === "paid";
  const balance = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-primary shadow-glow">
              <Shield className="w-3.5 h-3.5 text-primary-foreground" />
            </span>
            <span className="font-display font-semibold">Zelvra</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">• secure invoice</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Download PDF
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 print:p-0">
        {invoice.is_escrow && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3 print:hidden">
            <Lock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium">Escrow protected</div>
              <div className="text-sm text-muted-foreground">
                Your payment is held securely and only released to the freelancer when the agreed work is delivered.
              </div>
            </div>
          </div>
        )}

        <InvoicePreview invoice={invoice} freelancerName={data.freelancer.display_name} />

        {!isPaid && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-6 print:hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Pay invoice</h2>
                <p className="text-sm text-muted-foreground">Balance due: <span className="text-foreground font-medium tabular-nums">{formatMoney(balance, invoice.currency)}</span></p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Your name</Label>
                <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Your email</Label>
                <Input type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Reference (optional)</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID" />
              </div>
            </div>

            <Button
              className="w-full mt-5 bg-gradient-primary shadow-glow"
              size="lg"
              onClick={() => pay.mutate()}
              disabled={pay.isPending || !payerName || !payerEmail}
            >
              {pay.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><Lock className="w-4 h-4 mr-2" /> Submit payment of {formatMoney(balance, invoice.currency)}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Card payments via Stripe escrow available once the freelancer connects Stripe.
            </p>
          </div>
        )}

        {isPaid && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex items-center gap-3 print:hidden">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="font-medium">Invoice paid</div>
              <div className="text-sm text-muted-foreground">Thanks — this invoice has been settled in full.</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
