import { motion } from "framer-motion";
import {
  FileSignature, ShieldCheck, Wallet, Sparkles, Video, Bell,
  FileText, BarChart3, Lock,
} from "lucide-react";

const features = [
  { icon: FileSignature, title: "Micro-SOW contracts", body: "AI drafts a clean, enforceable contract. Client e-signs inside the app." },
  { icon: ShieldCheck, title: "Scope creep shield", body: "Out-of-scope requests are detected, logged, and quoted automatically." },
  { icon: Lock, title: "Secure file delivery", body: "Watermarked previews. Download unlocks only after payment lands." },
  { icon: Wallet, title: "Milestone escrow", body: "Client funds a vault. You ship knowing the money is already safe." },
  { icon: FileText, title: "Smart invoicing", body: "Multi-currency, GST/VAT, auto reminders, late-fee automation." },
  { icon: Sparkles, title: "AI assistant", body: "Draft contracts, price scopes, write follow-ups — with project context." },
  { icon: Video, title: "Built-in video calls", body: "HD calls, screen share, recordings, AI meeting notes — no Zoom needed." },
  { icon: Bell, title: "Real-time signals", body: "Know the moment a client views, signs, pays, or downloads." },
  { icon: BarChart3, title: "Analytics that matter", body: "See revenue, recovered scope, top clients, and what's next." },
];

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl font-semibold"
          >
            Everything you need.<br/><span className="text-gradient">Nothing you don't.</span>
          </motion.h2>
          <p className="mt-4 text-muted-foreground">
            One workspace for the full client lifecycle — from first message to final invoice.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="group rounded-2xl border border-border bg-card/40 hover:bg-card/70 p-6 transition-colors shadow-card"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-primary/20 flex items-center justify-center text-primary group-hover:shadow-glow transition-shadow">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
