import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Copy,
  Printer,
  Send,
  Trash2,
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { InvoiceLineItems } from "@/components/invoices/InvoiceLineItems";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import {
  calcTotals,
  formatMoney,
  INVOICE_STATUS_META,
  type Invoice,
  type LineItem,
} from "@/lib/invoices";
import { CURRENCIES } from "@/lib/projects";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  head: () => ({ meta: [{ title: "Invoice — Zelvra" }] }),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Invoice;
    },
  });

  const [form, setForm] = useState<Partial<Invoice> | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    if (invoice && form === null) {
      setForm(invoice);
      setItems((invoice.line_items as unknown as LineItem[]) ?? []);
    }
  }, [invoice, form]);

  const totals = useMemo(
    () => calcTotals(items, Number(form?.tax_rate ?? 0), Number(form?.discount ?? 0)),
    [items, form?.tax_rate, form?.discount],
  );

  const save = useMutation({
    mutationFn: async (patch: Partial<Invoice>) => {
      const { error } = await supabase.from("invoices").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const persist = () => {
    if (!form) return;
    save.mutate({
      client_name: form.client_name,
      client_email: form.client_email,
      client_address: form.client_address,
      freelancer_name: form.freelancer_name,
      freelancer_email: form.freelancer_email,
      freelancer_address: form.freelancer_address,
      currency: form.currency,
      tax_rate: Number(form.tax_rate) || 0,
      discount: Number(form.discount) || 0,
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      total: totals.total,
      due_date: form.due_date,
      issue_date: form.issue_date,
      notes: form.notes,
      terms: form.terms,
      is_escrow: form.is_escrow,
      line_items: items as never,
    });
    toast.success("Invoice saved");
  };

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Invoice marked as sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async () => {
      if (!invoice) return;
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          amount_paid: Number(totals.total || invoice.total),
          paid_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Marked as paid");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      navigate({ to: "/invoices" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = () => {
    if (!invoice?.share_token) return;
    const url = `${window.location.origin}/invoice/${invoice.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  if (isLoading || !invoice || !form) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const meta = INVOICE_STATUS_META[invoice.status];

  return (
    <div className="max-w-6xl mx-auto space-y-6 print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link to="/invoices" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> All invoices
        </Link>
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-0.5 rounded-md border text-xs ${meta.color}`}>{meta.label}</span>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Copy client link
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
          {invoice.status === "draft" && (
            <Button size="sm" onClick={() => send.mutate()} className="bg-gradient-primary">
              <Send className="w-3.5 h-3.5 mr-1.5" /> Send
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "draft" && (
            <Button size="sm" variant="outline" onClick={() => markPaid.mutate()}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark paid
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => confirm("Delete invoice?") && remove.mutate()}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 print:block">
        <div className="space-y-5 print:hidden">
          <Section title="From">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Your name">
                <Input value={form.freelancer_name ?? ""} onChange={(e) => setForm({ ...form, freelancer_name: e.target.value })} />
              </Field>
              <Field label="Your email">
                <Input value={form.freelancer_email ?? ""} onChange={(e) => setForm({ ...form, freelancer_email: e.target.value })} />
              </Field>
            </div>
            <Field label="Address">
              <Textarea rows={2} value={form.freelancer_address ?? ""} onChange={(e) => setForm({ ...form, freelancer_address: e.target.value })} />
            </Field>
          </Section>

          <Section title="Billed to">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Client name">
                <Input value={form.client_name ?? ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              </Field>
              <Field label="Client email">
                <Input value={form.client_email ?? ""} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
              </Field>
            </div>
            <Field label="Address">
              <Textarea rows={2} value={form.client_address ?? ""} onChange={(e) => setForm({ ...form, client_address: e.target.value })} />
            </Field>
          </Section>

          <Section title="Details">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Issue date">
                <Input type="date" value={form.issue_date ?? ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
              </Field>
              <Field label="Due date">
                <Input type="date" value={form.due_date ?? ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </Field>
              <Field label="Currency">
                <Select value={form.currency ?? "USD"} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-2">
              <Switch checked={!!form.is_escrow} onCheckedChange={(v) => setForm({ ...form, is_escrow: v })} />
              <div>
                <div className="text-sm font-medium">Escrow protection</div>
                <div className="text-xs text-muted-foreground">Funds held securely until you deliver the work.</div>
              </div>
            </label>
          </Section>

          <Section title="Line items">
            <InvoiceLineItems items={items} onChange={setItems} currency={form.currency ?? "USD"} />
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <Field label="Tax rate (%)">
                <Input type="number" min={0} step="0.01" value={form.tax_rate ?? 0} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) as never })} />
              </Field>
              <Field label="Discount">
                <Input type="number" min={0} step="0.01" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) as never })} />
              </Field>
            </div>
            <div className="mt-4 pt-4 border-t border-border/40 space-y-1 text-sm">
              <RowKV label="Subtotal" value={formatMoney(totals.subtotal, form.currency ?? "USD")} />
              <RowKV label="Tax" value={formatMoney(totals.tax, form.currency ?? "USD")} />
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(totals.total, form.currency ?? "USD")}</span>
              </div>
            </div>
          </Section>

          <Section title="Notes & terms">
            <Field label="Notes">
              <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Thanks for the trust!" />
            </Field>
            <Field label="Terms">
              <Textarea rows={3} value={form.terms ?? ""} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Net 14. Late fee of 2% applies after due date." />
            </Field>
          </Section>

          <div className="flex justify-end gap-2 pb-12">
            <Button variant="outline" onClick={() => { setForm(invoice); setItems((invoice.line_items as unknown as LineItem[]) ?? []); }}>
              Reset
            </Button>
            <Button onClick={persist} disabled={save.isPending} className="bg-gradient-primary">
              <Copy className="w-4 h-4 mr-1.5" /> Save changes
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start print:static">
          <InvoicePreview
            invoice={{ ...invoice, ...form, line_items: items as never, subtotal: totals.subtotal, tax_amount: totals.tax, total: totals.total } as Invoice}
          />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-3">
      <h3 className="font-medium">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function RowKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
