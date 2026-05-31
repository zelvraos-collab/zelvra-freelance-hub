import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { CURRENCIES } from "@/lib/projects";
import { toast } from "sonner";

export function NewInvoiceDialog({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [escrow, setEscrow] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(projectId);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, client_name, client_email, currency")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !projectId,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      // Compute next invoice number client-side
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const num = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const due = new Date();
      due.setDate(due.getDate() + 14);

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          project_id: selectedProject ?? null,
          number: num,
          client_name: clientName || null,
          client_email: clientEmail || null,
          currency,
          is_escrow: escrow,
          status: "draft",
          due_date: due.toISOString().slice(0, 10),
          line_items: [],
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
      setOpen(false);
      navigate({ to: "/invoices/$id", params: { id: inv.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pickProject = (id: string) => {
    setSelectedProject(id);
    const p = projects.find((p) => p.id === id);
    if (p) {
      if (p.client_name) setClientName(p.client_name);
      if (p.client_email) setClientEmail(p.client_email);
      if (p.currency) setCurrency(p.currency);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow">
          <Plus className="w-4 h-4 mr-1.5" /> New invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!projectId && (
            <div>
              <Label>Project (optional)</Label>
              <Select value={selectedProject} onValueChange={pickProject}>
                <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Client name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <Label>Client email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-end gap-3 cursor-pointer">
              <Switch checked={escrow} onCheckedChange={setEscrow} />
              <div>
                <div className="text-sm font-medium">Escrow protection</div>
                <div className="text-xs text-muted-foreground">Hold funds until delivery</div>
              </div>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
