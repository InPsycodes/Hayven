import Image, { type StaticImageData } from "next/image";

import { MARKETING_FAQS } from "@/content/marketing/faq";
import { getFaqSchema } from "@/lib/seo/faq-schema";
import { safeJsonLdStringify } from "@/lib/seo/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import faqConsultationImage from "../../../public/images/faq-consultation.jpg";
import faqIconBubbleImage from "../../../public/images/faq-icon-bubble.png";
import faqIconQuestionImage from "../../../public/images/faq-icon-question.png";
import faqIconHeartImage from "../../../public/images/faq-icon-heart.png";

const ICON_MASK = {
  WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 100%)",
  maskImage: "radial-gradient(circle, black 55%, transparent 100%)",
};

/** A small floating accent, cropped from the same illustration set as the FAQ photo -- vignette-masked instead of background-removed, since the icon and background tones in that render are too close for a clean cutout. */
function FloatingIcon({
  src,
  className,
}: {
  src: StaticImageData;
  className: string;
}) {
  return (
    <div className={`absolute drop-shadow-lg ${className}`} style={ICON_MASK}>
      <Image src={src} alt="" fill placeholder="blur" sizes="112px" className="object-cover" />
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="px-6 py-16 sm:py-20 lg:px-10 lg:py-36">
      {/* Static, developer-authored JSON from MARKETING_FAQS -- never user
          input. Still run through safeJsonLdStringify for consistency with
          the rest of this codebase's structured data. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(getFaqSchema(MARKETING_FAQS)) }}
      />
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
        <div>
          <span className="eyebrow text-rust-dark">Questions</span>
          <h2 className="mt-3 max-w-xl font-serif text-[1.02rem] leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Frequently asked questions.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
            The things most parents want to know before they book their first session.
          </p>

          <div className="mt-8 max-w-3xl sm:mt-12">
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
              src={faqConsultationImage}
              alt=""
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 540px, 448px"
              className="object-contain"
            />
          </div>

          <FloatingIcon
            src={faqIconBubbleImage}
            className="-top-6 -left-3 size-24 -rotate-6 lg:-top-10 lg:-left-8 lg:size-28"
          />
          <FloatingIcon
            src={faqIconQuestionImage}
            className="top-1/4 -right-3 size-20 rotate-6 lg:-right-6 lg:size-24"
          />
          <FloatingIcon
            src={faqIconHeartImage}
            className="-bottom-4 left-3 size-20 rotate-3 lg:-bottom-8 lg:left-6 lg:size-24"
          />
        </div>
      </div>
    </section>
  );
}
