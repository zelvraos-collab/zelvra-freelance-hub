import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/60 p-12 sm:p-16 text-center shadow-glow"
        >
          <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "var(--gradient-radial)" }} />
          <h2 className="text-3xl sm:text-5xl font-semibold">
            Start freelancing <span className="text-gradient">without fear.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Free forever for your first two projects. No card required.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Link to="/login">
                Create your free account <ArrowRight className="ml-1.5 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
