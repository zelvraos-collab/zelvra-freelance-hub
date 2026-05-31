import type { Invoice } from "@/lib/invoices";
import { formatDate, formatMoney, INVOICE_STATUS_META, type LineItem } from "@/lib/invoices";

export function InvoicePreview({
  invoice,
  freelancerName,
}: {
  invoice: Invoice;
  freelancerName?: string | null;
}) {
  const items = (invoice.line_items as unknown as LineItem[]) ?? [];
  const meta = INVOICE_STATUS_META[invoice.status];

  return (
    <div
      id="invoice-print"
      className="bg-white text-slate-900 rounded-xl shadow-elegant p-8 sm:p-12 print:p-10 print:shadow-none"
      style={{ colorScheme: "light" }}
    >
      <div className="flex items-start justify-between gap-6 pb-8 border-b border-slate-200">
        <div>
          <div className="text-3xl font-display font-semibold tracking-tight">Invoice</div>
          <div className="mt-1 text-sm text-slate-500">{invoice.number}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-400">From</div>
          <div className="font-medium">{invoice.freelancer_name || freelancerName || "Freelancer"}</div>
          {invoice.freelancer_email && <div className="text-sm text-slate-500">{invoice.freelancer_email}</div>}
          {invoice.freelancer_address && (
            <div className="text-sm text-slate-500 whitespace-pre-line">{invoice.freelancer_address}</div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 py-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Billed to</div>
          <div className="mt-1 font-medium">{invoice.client_name || "—"}</div>
          {invoice.client_email && <div className="text-sm text-slate-500">{invoice.client_email}</div>}
          {invoice.client_address && (
            <div className="text-sm text-slate-500 whitespace-pre-line">{invoice.client_address}</div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Issue date</div>
          <div className="mt-1">{formatDate(invoice.issue_date)}</div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mt-3">Due date</div>
          <div className="mt-1">{formatDate(invoice.due_date)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Status</div>
          <div className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-xs ${meta.color}`}>{meta.label}</div>
          {invoice.is_escrow && (
            <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs border border-primary/20">
              Escrow protected
            </div>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
            <th className="py-2">Description</th>
            <th className="py-2 text-right w-20">Qty</th>
            <th className="py-2 text-right w-28">Rate</th>
            <th className="py-2 text-right w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-100">
              <td className="py-3">{it.description || "—"}</td>
              <td className="py-3 text-right tabular-nums">{it.quantity}</td>
              <td className="py-3 text-right tabular-nums">{formatMoney(it.rate, invoice.currency)}</td>
              <td className="py-3 text-right tabular-nums">
                {formatMoney((Number(it.quantity) || 0) * (Number(it.rate) || 0), invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <div className="w-full sm:w-72 space-y-2 text-sm">
          <Row label="Subtotal" value={formatMoney(invoice.subtotal, invoice.currency)} />
          {Number(invoice.discount) > 0 && (
            <Row label="Discount" value={`- ${formatMoney(invoice.discount, invoice.currency)}`} />
          )}
          {Number(invoice.tax_rate) > 0 && (
            <Row
              label={`Tax (${Number(invoice.tax_rate)}%)`}
              value={formatMoney(invoice.tax_amount, invoice.currency)}
            />
          )}
          <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(invoice.total, invoice.currency)}</span>
          </div>
          {Number(invoice.amount_paid) > 0 && (
            <>
              <Row label="Paid" value={formatMoney(invoice.amount_paid, invoice.currency)} />
              <Row
                label="Balance"
                value={formatMoney(Number(invoice.total) - Number(invoice.amount_paid), invoice.currency)}
              />
            </>
          )}
        </div>
      </div>

      {(invoice.notes || invoice.terms) && (
        <div className="mt-8 pt-6 border-t border-slate-200 grid sm:grid-cols-2 gap-6 text-sm">
          {invoice.notes && (
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">Notes</div>
              <p className="mt-1 whitespace-pre-line text-slate-600">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400">Terms</div>
              <p className="mt-1 whitespace-pre-line text-slate-600">{invoice.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
