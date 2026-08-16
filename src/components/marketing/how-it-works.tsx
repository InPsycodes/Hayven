import { HOW_IT_WORKS_STEPS } from "@/content/marketing/steps";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/reveal";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-terracotta px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <span className="eyebrow text-canvas-white/95">How it works</span>
        <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight text-canvas-white sm:text-4xl lg:text-[2.75rem]">
          Four calm steps, start to finish.
        </h2>

        <div className="mt-16 grid gap-x-10 gap-y-14 md:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const isLast = index === HOW_IT_WORKS_STEPS.length - 1;
            return (
              <Reveal key={step.title} delayMs={index * 80}>
                <div className={cn("flex flex-col gap-3", isLast && "md:-m-5 md:rounded-lg md:border md:border-white/20 md:p-5")}>
                  <span className="font-serif text-4xl leading-none text-canvas-white/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 font-serif text-lg text-canvas-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-canvas-white/95">{step.body}</p>
                  {isLast && (
                    <span className="mt-1 text-xs font-medium tracking-wide text-canvas-white/95">
                      Where you&apos;ll spend most of your time
                    </span>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
