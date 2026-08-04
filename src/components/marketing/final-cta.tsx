import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-terracotta px-6 py-20 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <h2 className="font-serif text-4xl leading-tight text-canvas-white lg:text-[2.75rem]">
          Ready to find the right support for your child?
        </h2>
        <p className="text-lg text-canvas-white/85">
          Join families and therapists already using Hayven.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-charcoal px-6 py-3.5 text-sm font-semibold text-canvas-white transition-colors hover:bg-charcoal/85"
          >
            Get started as a parent
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-canvas-white px-6 py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-canvas-white/85"
          >
            Join as a therapist
          </Link>
        </div>
      </div>
    </section>
  );
}
