import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoAsset from "@/assets/zelvra-logo.jpg.asset.json";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <img src={logoAsset.url} alt="Zelvra" className="w-9 h-9 rounded-lg object-cover" />
          <span className="font-display text-xl font-semibold tracking-tight">Zelvra</span>
        </Link>
          <span className="font-display text-xl font-semibold tracking-tight">Zelvra</span>
        </Link>
        <div className="glass rounded-2xl p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
