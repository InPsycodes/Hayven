import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-terracotta px-6 py-16 sm:py-20 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <h2 className="font-serif text-[1.7rem] leading-tight text-canvas-white sm:text-4xl lg:text-[2.75rem]">
          Ready to find the right support for your child?
        </h2>
        <p className="text-lg text-canvas-white/95">
          Join families and therapists already using Hayven.
        </p>
        <div className="mt-2 flex flex-nowrap items-center justify-center gap-2.5 sm:gap-4">
          <Link
            href="/signup?role=parent"
            className="whitespace-nowrap rounded-full bg-charcoal px-3.5 py-2.5 text-[11px] font-semibold text-canvas-white transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-charcoal/85 sm:px-6 sm:py-3.5 sm:text-sm"
          >
            Get started as a parent
          </Link>
          <Link
            href="/signup?role=therapist"
            className="whitespace-nowrap rounded-full bg-canvas-white px-3.5 py-2.5 text-[11px] font-semibold text-charcoal transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-canvas-white/85 sm:px-6 sm:py-3.5 sm:text-sm"
          >
            Join as a therapist
          </Link>
        </div>
      </div>
    </section>
  );
}
