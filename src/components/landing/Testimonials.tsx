import { motion } from "framer-motion";

const quotes = [
  { name: "Aanya R.", role: "Brand designer", body: "I stopped doing 'just one more tweak' for free. Zelvra quoted it, the client paid it. Magic." },
  { name: "Marcus L.", role: "Full-stack dev", body: "The escrow vault changed how I price. I ship faster because I'm not anxious about getting paid." },
  { name: "Sofia K.", role: "Video editor", body: "Watermarked previews + payment-locked downloads = zero chargebacks this year." },
  { name: "Devon P.", role: "Copywriter", body: "The AI follow-up emails alone saved my last quarter. Calm, professional, on-brand." },
];

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-semibold">
            Loved by people who <span className="text-gradient">ship for a living.</span>
          </h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {quotes.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card/50 p-7 shadow-card"
            >
              <blockquote className="text-lg leading-relaxed">"{q.body}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {q.name.charAt(0)}
                </div>
                <div className="text-sm">
                  <div className="font-medium">{q.name}</div>
                  <div className="text-muted-foreground">{q.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
