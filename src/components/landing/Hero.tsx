import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import heroOrb from "@/assets/hero-orb.jpg";

export function Hero() {
  return (
    <section className="relative pt-32 pb-24 sm:pt-40 sm:pb-32 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{ background: "var(--gradient-hero)" }}
      />
      <img
        src={heroOrb}
        alt=""
        aria-hidden
        width={1920}
        height={1080}
        className="pointer-events-none select-none absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] max-w-none opacity-40 mix-blend-screen -z-10"
      />

      <div className="mx-auto max-w-7xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          The operating system for freelancers
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mt-6 text-5xl sm:text-7xl font-semibold leading-[1.05] tracking-tight"
        >
          Freelance <span className="text-gradient">without fear.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground"
        >
          Contracts, secure delivery, payments, scope protection, invoicing, AI assistant
          and real-time client portals — in one calm, beautiful workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-9 flex flex-wrap gap-3 justify-center"
        >
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/login">
              Start free today <ArrowRight className="ml-1.5 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border">
            <a href="#features">See features</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-14 text-xs text-muted-foreground"
        >
          Trusted by independent designers, developers, writers, video editors & producers.
        </motion.div>
      </div>
    </section>
  );
}
