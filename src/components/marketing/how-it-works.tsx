import { HOW_IT_WORKS_STEPS } from "@/content/marketing/steps";
import { cn } from "@/lib/utils";
import { SwipeRow } from "@/components/marketing/swipe-row";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-terracotta px-6 py-16 sm:py-20 lg:px-10 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <span className="eyebrow text-canvas-white/95">How it works</span>
        <h2 className="mt-3 max-w-xl font-serif text-[1.7rem] leading-tight text-canvas-white sm:text-4xl lg:text-[2.75rem]">
          Four calm steps, start to finish.
        </h2>

        <SwipeRow
          label="How it works"
          tone="dark"
          className="mt-10 sm:mt-16"
          gridClassName="sm:grid sm:gap-y-14 md:grid-cols-4 md:gap-x-10"
        >
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const isLast = index === HOW_IT_WORKS_STEPS.length - 1;
            return (
              <div key={step.title}>
                <div
                  className={cn(
                    "flex h-full flex-col gap-3 rounded-lg border border-white/20 p-5 sm:border-0 sm:p-0",
                    isLast && "md:-m-5 md:border md:p-5"
                  )}
                >
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
              </div>
            );
          })}
        </SwipeRow>
      </div>
    </section>
  );
}
