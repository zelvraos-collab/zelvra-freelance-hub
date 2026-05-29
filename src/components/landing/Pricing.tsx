import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    blurb: "For trying Zelvra on a couple of projects.",
    features: ["2 active projects", "Basic watermark", "Manual invoices", "Email support"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    blurb: "For full-time freelancers who want every safeguard.",
    features: [
      "Unlimited projects",
      "AI scope detection",
      "Auto-estimate engine",
      "Milestone escrow",
      "Video calls (5h/mo)",
      "Analytics dashboard",
      "AI assistant",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$29",
    blurb: "For small studios running multiple clients.",
    features: [
      "Everything in Pro",
      "5 team members",
      "White-label portal",
      "Unlimited video calls",
      "Priority support",
    ],
    cta: "Start Agency",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-semibold">
            Simple, honest <span className="text-gradient">pricing.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade only when Zelvra is earning you back its cost.</p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`relative rounded-2xl p-7 shadow-card border ${
                t.highlight
                  ? "border-primary/40 bg-card shadow-glow"
                  : "border-border bg-card/50"
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground font-medium">
                  Most popular
                </div>
              )}
              <h3 className="font-display text-lg">{t.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-semibold font-display">{t.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.blurb}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-7 w-full ${
                  t.highlight
                    ? "bg-gradient-primary text-primary-foreground hover:opacity-90"
                    : ""
                }`}
                variant={t.highlight ? "default" : "outline"}
              >
                <Link to="/login">{t.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
