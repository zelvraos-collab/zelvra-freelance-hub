import { motion } from "framer-motion";
import { AlertTriangle, Clock, DollarSign } from "lucide-react";

const pains = [
  { icon: Clock, title: "Endless revisions", body: "Clients keep asking for 'just one more tweak' until your margin disappears." },
  { icon: DollarSign, title: "Chasing payments", body: "Files delivered, invoice sent, then weeks of awkward follow-ups." },
  { icon: AlertTriangle, title: "No proof, no protection", body: "Scope changes happen on WhatsApp. Disputes happen in your inbox." },
];

export function Problem() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-5xl font-semibold"
        >
          Freelancing shouldn't feel like<br /><span className="text-gradient">a leap of faith.</span>
        </motion.h2>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
          Every freelancer knows the pattern. Zelvra breaks it.
        </p>

        <div className="mt-12 grid sm:grid-cols-3 gap-5">
          {pains.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card/50 p-6 text-left shadow-card"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center text-primary">
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
