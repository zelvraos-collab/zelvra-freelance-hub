import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login", search: { redirect: location }, replace: true });
    }
  }, [loading, session, navigate, location]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary shadow-glow animate-pulse">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
