import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortalProject, signContractAsClient } from "@/lib/portal.functions";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { PortalChat } from "@/components/messages/PortalChat";
import { CONTRACT_STATUS_META, formatBytes } from "@/lib/contracts";
import { STATUS_META } from "@/lib/projects";
import { Shield, FileText, Download, Lock, CheckCircle2, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/$token")({
  head: () => ({ meta: [{ title: "Client portal — Zelvra" }] }),
  component: PortalPage,
});

function PortalPage() {
  const { token } = Route.useParams();
  const fetchPortal = useServerFn(getPortalProject);
  const signContract = useServerFn(signContractAsClient);
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal", token],
    queryFn: () => fetchPortal({ data: { token } }),
  });

  const [signing, setSigning] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");

  const sign = useMutation({
    mutationFn: async (contractId: string) => {
      if (!signature) throw new Error("Please sign first");
      if (!clientName.trim()) throw new Error("Please enter your name");
      await signContract({ data: { token, contractId, signature, clientName: clientName.trim() } });
    },
    onSuccess: () => {
      toast.success("Contract signed");
      setSigning(null);
      setSignature(null);
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading project…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="font-display text-2xl font-semibold">Invalid link</h1>
          <p className="text-muted-foreground mt-2">This portal link is invalid or has been revoked.</p>
          <Button onClick={() => navigate({ to: "/" })} variant="outline" className="mt-4">Go home</Button>
        </div>
      </div>
    );
  }

  const { project, freelancer, contracts, files, scope } = data;
  const status = STATUS_META[project.status];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/30 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-primary shadow-glow">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold">Zelvra</span>
          </div>
          <div className="text-xs text-muted-foreground">Secure client portal</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            <span>Project from {freelancer.display_name ?? "your freelancer"}</span>
          </div>
          <div className="mt-2 flex items-start gap-3">
            <span className="mt-2 w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{project.title}</h1>
              {project.description && <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>}
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
          </div>
        </section>

        {scope.length > 0 && (
          <Card className="bg-card/40 border-border/60">
            <CardHeader><CardTitle className="font-display text-lg">Deliverables</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {scope.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${s.status === "done" ? "text-emerald-400" : "text-muted-foreground"}`} />
                    <div>
                      <div className={s.status === "done" ? "line-through text-muted-foreground" : ""}>{s.title}</div>
                      {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {contracts.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Contracts</h2>
            {contracts.map((c) => {
              const meta = CONTRACT_STATUS_META[c.status];
              const isSigning = signing === c.id;
              return (
                <Card key={c.id} className="bg-card/40 border-border/60">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-lg">{c.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.total_amount ? `${c.currency} ${Number(c.total_amount).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="prose prose-sm prose-invert max-w-none rounded-lg border border-border/60 bg-background/40 p-4 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {c.body}
                    </div>

                    {c.client_signature && c.client_signed_at ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Signed by {c.client_name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(c.client_signed_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ) : c.status === "sent" || c.status === "draft" ? (
                      isSigning ? (
                        <div className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-4">
                          <div className="space-y-1.5">
                            <Label>Your full name</Label>
                            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Jane Doe" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Signature</Label>
                            <SignaturePad value={signature} onChange={setSignature} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => { setSigning(null); setSignature(null); }}>Cancel</Button>
                            <Button
                              onClick={() => sign.mutate(c.id)}
                              disabled={!signature || !clientName.trim() || sign.isPending}
                              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                            >
                              {sign.isPending ? "Signing…" : "Sign contract"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => { setSigning(c.id); setClientName(c.client_name ?? ""); }}
                          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                        >
                          Review & sign
                        </Button>
                      )
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {files.length > 0 && (
          <Card className="bg-card/40 border-border/60">
            <CardHeader><CardTitle className="font-display text-lg">Files</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{formatBytes(f.size_bytes)}</div>
                    </div>
                    {f.payment_required ? (
                      <span className="text-xs text-amber-400 inline-flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    ) : f.url ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <Download className="w-4 h-4 mr-1.5" /> Download
                        </a>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <section>
          <h2 className="font-display text-xl font-semibold mb-3">Messages</h2>
          <PortalChat token={token} projectId={project.id} defaultName={project.client_name} />
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4 border-t border-border/60">
          Powered by <span className="font-display font-semibold text-foreground">Zelvra</span> — freelance without fear.
        </footer>
      </main>
    </div>
  );
}
