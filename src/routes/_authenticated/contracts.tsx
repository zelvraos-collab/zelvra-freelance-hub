import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONTRACT_STATUS_META, type Contract } from "@/lib/contracts";
import { Plus, FileText, ChevronRight, ShieldCheck } from "lucide-react";
import { CURRENCIES } from "@/lib/projects";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({ meta: [{ title: "Contracts — Zelvra" }] }),
  component: ContractsPage,
});

function ContractsPage() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 lg:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Get paid on your terms. AI-drafted, e-signed, scope-protected.</p>
        </div>
        <NewContractDialog />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">Loading…</div>
      ) : contracts.length === 0 ? (
        <Card className="bg-card/40 border-border/60 border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">No contracts yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Draft your first contract to lock in scope, price, and terms.</p>
            <div className="mt-4"><NewContractDialog /></div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contracts.map((c) => {
            const meta = CONTRACT_STATUS_META[c.status];
            return (
              <Link
                key={c.id}
                to="/contracts/$id"
                params={{ id: c.id }}
                className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card/40 hover:bg-card/60 transition-colors p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{c.title}</h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {c.client_name ?? "No client"} · {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewContractDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-min"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, title, client_name, client_email, currency, rate_amount").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!projectId) throw new Error("Pick a project");
      const { DEFAULT_CONTRACT_BODY } = await import("@/lib/contracts");
      const project = projects.find((p) => p.id === projectId);
      const body = DEFAULT_CONTRACT_BODY
        .replace("{{project}}", project?.title ?? "")
        .replace("{{client}}", clientName || project?.client_name || "Client")
        .replace("{{freelancer}}", user.email ?? "Freelancer")
        .replace("{{date}}", new Date().toLocaleDateString())
        .replace("{{deadline}}", "TBD")
        .replace("{{amount}}", amount ? `${currency} ${amount}` : "TBD");
      const { data, error } = await supabase.from("contracts").insert({
        user_id: user.id,
        project_id: projectId,
        title: title.trim() || `Contract — ${project?.title ?? "Project"}`,
        body,
        total_amount: amount ? Number(amount) : null,
        currency,
        client_name: clientName || project?.client_name || null,
        client_email: clientEmail || project?.client_email || null,
        status: "draft",
      }).select().single();
      if (error) throw error;
      return data as Contract;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      setOpen(false);
      toast.success("Contract created");
      navigate({ to: "/contracts/$id", params: { id: c.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          <Plus className="w-4 h-4 mr-1.5" /> New contract
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">New contract</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(v) => {
              setProjectId(v);
              const p = projects.find((x) => x.id === v);
              if (p) {
                setClientName(p.client_name ?? "");
                setClientEmail(p.client_email ?? "");
                setCurrency(p.currency ?? "USD");
                if (p.rate_amount) setAmount(String(p.rate_amount));
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Master Services Agreement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Client name</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Client email</Label><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Total amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" /></div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={!projectId || create.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
