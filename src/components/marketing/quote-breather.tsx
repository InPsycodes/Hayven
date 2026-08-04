// No quote-band photograph exists yet -- a dark gradient wash stands in for
// the photo + scrim treatment in the reference, keeping the same mood/depth.
export function QuoteBreather() {
  return (
    <section
      className="relative flex min-h-[60vh] items-center overflow-hidden px-6 lg:px-10"
      style={{
        background:
          "linear-gradient(100deg, #1a1a1a 0%, #2a2118 45%, #3a2a1c 70%, #4a3222 100%)",
      }}
    >
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="max-w-2xl">
          <span
            aria-hidden
            className="block font-serif text-7xl leading-none text-rust-light/70"
          >
            &ldquo;
          </span>
          <p className="mt-2 font-serif text-3xl leading-snug text-canvas-white sm:text-4xl lg:text-[2.75rem]">
            Every child deserves a therapist who is not just qualified -- but genuinely{" "}
            <em className="font-normal italic text-rust-light">known and trusted</em>{" "}
            by their family.
          </p>
          <p className="mt-6 text-sm text-canvas-white/70">The idea behind Hayven</p>
        </div>
      </div>
    </section>
  );
}
