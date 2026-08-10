import { MARKETING_FAQS } from "@/content/marketing/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Faq() {
  return (
    <section id="faq" className="px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <span className="eyebrow text-terracotta">Questions</span>
        <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
          Frequently asked questions.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
          The things most parents want to know before they book their first session.
        </p>

        <div className="mt-12 max-w-3xl">
          <Accordion type="single" collapsible>
            {MARKETING_FAQS.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
