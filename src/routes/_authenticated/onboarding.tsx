import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Code2, Palette, PenTool, Megaphone, Camera, Music, Video, Briefcase, Languages, GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Zelvra" }] }),
  component: OnboardingPage,
});

const categories = [
  { key: "developer", label: "Developer", icon: Code2 },
  { key: "designer", label: "Designer", icon: Palette },
  { key: "writer", label: "Writer", icon: PenTool },
  { key: "marketer", label: "Marketer", icon: Megaphone },
  { key: "photographer", label: "Photographer", icon: Camera },
  { key: "musician", label: "Musician / Audio", icon: Music },
  { key: "video", label: "Video / Motion", icon: Video },
  { key: "consultant", label: "Consultant", icon: Briefcase },
  { key: "translator", label: "Translator", icon: Languages },
  { key: "coach", label: "Coach / Educator", icon: GraduationCap },
];

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName || null,
      category,
      bio: bio || null,
      country: country || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onboarded: true,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("You're all set!");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gradient-primary" : "bg-border"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">What do you do?</h1>
            <p className="text-muted-foreground mt-1">Pick the closest match — we'll tailor templates & AI prompts for you.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border/60 bg-card/40 hover:border-primary/50"
                  }`}
                >
                  <c.icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="mt-2 text-sm font-medium">{c.label}</div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={next} disabled={!category} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Tell us about yourself</h1>
            <p className="text-muted-foreground mt-1">This appears on contracts and client portals.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
            </div>
            <div className="space-y-1.5">
              <Label>Short bio</Label>
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Senior product designer helping SaaS startups ship faster." />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={back}>Back</Button>
            <Button onClick={next} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">You're ready 🎉</h1>
            <p className="text-muted-foreground mt-1">Zelvra is now tuned to your craft. Let's open your dashboard.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-5 text-sm space-y-2">
            <div><span className="text-muted-foreground">Craft:</span> <span className="font-medium">{categories.find(c => c.key === category)?.label}</span></div>
            {displayName && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{displayName}</span></div>}
            {country && <div><span className="text-muted-foreground">Country:</span> <span className="font-medium">{country}</span></div>}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={back}>Back</Button>
            <Button onClick={finish} disabled={loading} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              {loading ? "Saving…" : "Open dashboard"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
