import { HOW_IT_WORKS_STEPS } from "@/content/marketing/steps";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-terracotta px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <span className="eyebrow text-canvas-white/70">How it works</span>
        <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight text-canvas-white sm:text-4xl lg:text-[2.75rem]">
          Four calm steps, start to finish.
        </h2>

        <div className="relative mt-16 grid gap-10 md:grid-cols-4">
          <div className="absolute top-6 left-[12.5%] right-[12.5%] hidden h-px bg-white/25 md:block" />

          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const isLast = index === HOW_IT_WORKS_STEPS.length - 1;
            return (
              <div key={step.title} className="flex flex-col gap-4">
                <span
                  className={cn(
                    "relative z-10 flex size-12 items-center justify-center rounded-full font-serif text-lg",
                    isLast ? "bg-charcoal text-canvas-white" : "bg-canvas-white text-terracotta"
                  )}
                >
                  {index + 1}
                </span>
                <h3 className="font-serif text-lg text-canvas-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-canvas-white/75">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
