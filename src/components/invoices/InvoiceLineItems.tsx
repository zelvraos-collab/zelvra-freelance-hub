import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { newLineItem, type LineItem } from "@/lib/invoices";

export function InvoiceLineItems({
  items,
  onChange,
  currency,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency: string;
}) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const add = () => onChange([...items, newLineItem()]);

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
        <div className="col-span-6">Description</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-2 text-right">Rate ({currency})</div>
        <div className="col-span-2 text-right">Amount</div>
      </div>
      {items.map((it) => {
        const amount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
        return (
          <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-12 sm:col-span-6"
              placeholder="Description"
              value={it.description}
              onChange={(e) => update(it.id, { description: e.target.value })}
            />
            <Input
              className="col-span-4 sm:col-span-2 text-right"
              type="number"
              min={0}
              step="0.01"
              value={it.quantity}
              onChange={(e) => update(it.id, { quantity: Number(e.target.value) })}
            />
            <Input
              className="col-span-4 sm:col-span-2 text-right"
              type="number"
              min={0}
              step="0.01"
              value={it.rate}
              onChange={(e) => update(it.id, { rate: Number(e.target.value) })}
            />
            <div className="col-span-3 sm:col-span-2 text-right tabular-nums text-sm">{amount.toFixed(2)}</div>
            <Button
              variant="ghost"
              size="icon"
              className="col-span-1 text-muted-foreground hover:text-destructive"
              onClick={() => remove(it.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add} className="border-dashed">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add line item
      </Button>
    </div>
  );
}
