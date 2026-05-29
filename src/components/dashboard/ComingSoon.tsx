import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="max-w-2xl mx-auto py-12 pb-20 lg:pb-0">
      <Card className="bg-card/40 border-border/60">
        <CardContent className="p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight mt-5">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{description}</p>
          <p className="text-xs text-muted-foreground mt-6">Shipping in an upcoming phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
