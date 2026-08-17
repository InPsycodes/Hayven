import Image from "next/image";

import { MARKETING_FAQS } from "@/content/marketing/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ICON_MASK = {
  WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 100%)",
  maskImage: "radial-gradient(circle, black 55%, transparent 100%)",
};

/** A small floating accent, cropped from the same illustration set as the FAQ photo -- vignette-masked instead of background-removed, since the icon and background tones in that render are too close for a clean cutout. */
function FloatingIcon({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <div className={`absolute drop-shadow-lg ${className}`} style={ICON_MASK}>
      <Image src={src} alt="" fill sizes="112px" className="object-cover" />
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
        <div>
          <span className="eyebrow text-rust-dark">Questions</span>
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

        <div className="relative mx-auto mt-20 w-full max-w-md lg:mt-0 lg:w-[540px]">
          <div className="relative aspect-square w-full">
            <Image
              src="/images/faq-consultation.png"
              alt=""
              fill
              sizes="(min-width: 1024px) 540px, 448px"
              className="object-contain"
            />
          </div>

          <FloatingIcon
            src="/images/faq-icon-bubble.png"
            className="-top-10 -left-8 size-24 -rotate-6 lg:size-28"
          />
          <FloatingIcon
            src="/images/faq-icon-question.png"
            className="top-1/4 -right-6 size-20 rotate-6 lg:size-24"
          />
          <FloatingIcon
            src="/images/faq-icon-heart.png"
            className="-bottom-8 left-6 size-20 rotate-3 lg:size-24"
          />
        </div>
      </div>
    </section>
  );
}
