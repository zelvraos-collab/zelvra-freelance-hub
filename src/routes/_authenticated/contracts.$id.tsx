import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { CONTRACT_STATUS_META, type Contract } from "@/lib/contracts";
import { ArrowLeft, Send, Trash2, Download, Save, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contracts/$id")({
  head: () => ({ meta: [{ title: "Contract — Zelvra" }] }),
  component: ContractDetailPage,
});

function ContractDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Contract | null;
    },
  });

  const { data: project } = useQuery({
    queryKey: ["project-share", contract?.project_id],
    enabled: !!contract?.project_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, title, share_token").eq("id", contract!.project_id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (contract) {
      setBody(contract.body);
      setTitle(contract.title);
      setSignature(contract.freelancer_signature);
    }
  }, [contract]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Contract>) => {
      const { error } = await supabase.from("contracts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contract deleted");
      navigate({ to: "/contracts" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center text-muted-foreground py-16">Loading…</div>;
  if (!contract) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Contract not found.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/contracts">Back to contracts</Link></Button>
    </div>
  );

  const meta = CONTRACT_STATUS_META[contract.status];
  const portalUrl = project?.share_token ? `${window.location.origin}/portal/${project.share_token}` : "";

  const copyPortal = () => {
    navigator.clipboard.writeText(portalUrl);
    toast.success("Client portal link copied");
  };

  const handleSaveSignature = async () => {
    if (!signature) return toast.error("Please sign first");
    await save.mutateAsync({
      freelancer_signature: signature,
      freelancer_signed_at: new Date().toISOString(),
    });
    toast.success("Signature saved");
  };

  const handleSend = async () => {
    if (!contract.freelancer_signature) return toast.error("Sign the contract first");
    await save.mutateAsync({ status: "sent", sent_at: new Date().toISOString() });
    toast.success("Contract marked as sent. Share the portal link with your client.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <Link to="/contracts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> All contracts
        </Link>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== contract.title && save.mutate({ title })}
            className="font-display text-2xl font-semibold h-auto border-0 bg-transparent px-0 focus-visible:ring-0"
          />
          {project && (
            <Link to="/projects/$id" params={{ id: project.id }} className="text-sm text-muted-foreground hover:text-foreground">
              {project.title}
            </Link>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {portalUrl && (
            <Button variant="outline" size="sm" onClick={copyPortal}>
              <Link2 className="w-4 h-4 mr-1.5" /> Copy client link
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-1.5" /> Print / PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="bg-card/40 border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Contract body</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => save.mutate({ body })}
            disabled={save.isPending || body === contract.body}
          >
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            className="font-mono text-sm bg-background/40"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/40 border-border/60">
          <CardHeader><CardTitle className="font-display text-lg">Your signature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contract.freelancer_signature && contract.freelancer_signed_at ? (
              <div className="space-y-2">
                <img src={contract.freelancer_signature} alt="Signature" className="h-24 bg-card/40 border border-border/60 rounded-lg p-2" />
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Signed {new Date(contract.freelancer_signed_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <>
                <SignaturePad value={signature} onChange={setSignature} />
                <Button onClick={handleSaveSignature} disabled={!signature || save.isPending} className="w-full">
                  <Save className="w-4 h-4 mr-1.5" /> Save my signature
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/60">
          <CardHeader><CardTitle className="font-display text-lg">Client signature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contract.client_signature && contract.client_signed_at ? (
              <div className="space-y-2">
                <img src={contract.client_signature} alt="Client signature" className="h-24 bg-card/40 border border-border/60 rounded-lg p-2" />
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Signed by {contract.client_name ?? "client"} on {new Date(contract.client_signed_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-3">
                <p>Awaiting client signature. Share the secure portal link with your client to collect their signature.</p>
                {portalUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Client portal</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={portalUrl} className="text-xs" />
                      <Button variant="outline" size="sm" onClick={copyPortal}>Copy</Button>
                    </div>
                  </div>
                )}
                {contract.status === "draft" && (
                  <Button onClick={handleSend} className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                    <Send className="w-4 h-4 mr-1.5" /> Mark as sent
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
