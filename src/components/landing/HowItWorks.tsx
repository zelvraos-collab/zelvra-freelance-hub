import { motion } from "framer-motion";

const steps = [
  { n: "01", title: "Define the scope", body: "Create a project, list deliverables, and let AI draft a Micro-SOW your client e-signs in minutes." },
  { n: "02", title: "Deliver securely", body: "Share watermarked previews. Files stay locked until the client funds the milestone." },
  { n: "03", title: "Get paid, instantly", body: "Payment releases the file. Invoice, receipt, and analytics update in real time." },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-semibold">
            Three steps. <span className="text-gradient">Zero anxiety.</span>
          </h2>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-5 relative">
          <div aria-hidden className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative rounded-2xl glass p-7"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary text-primary-foreground font-display font-semibold flex items-center justify-center shadow-glow">
                {s.n}
              </div>
              <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
