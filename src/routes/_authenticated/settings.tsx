import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Zelvra" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { signOut } = useAuth();
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Workspace, security, billing.</p>
      </div>
      <Card className="bg-card/40 border-border/60">
        <CardHeader><CardTitle className="font-display text-lg">Account</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Edit your public profile on the <Link to="/profile" className="text-primary hover:underline">Profile</Link> page.</p>
          <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
