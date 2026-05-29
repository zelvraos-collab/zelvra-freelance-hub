import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "How does Zelvra protect me from scope creep?", a: "You define the scope when you create a project. Our AI watches client messages and requests, flags anything out-of-scope, suggests a fair price, and lets you append it to the contract in one click." },
  { q: "Do clients need to create an account?", a: "No. Each project has a unique secure link. Clients view, sign, pay, and download without signing up — branded with your name." },
  { q: "How is my work kept safe before payment?", a: "Files are stored privately and shown as watermarked previews with right-click and devtools guards. Downloads unlock the moment the payment clears." },
  { q: "Can I use my own payment processor?", a: "Zelvra ships with built-in global payments. If you have an existing Stripe or other processor, you can connect it in Settings." },
  { q: "Is there a free plan?", a: "Yes — two active projects, basic watermark, manual invoices, forever. Upgrade when Zelvra starts earning more than it costs." },
];

export function Faq() {
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-3xl sm:text-5xl font-semibold text-center">Questions, <span className="text-gradient">answered.</span></h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border">
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
