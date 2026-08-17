import Image from "next/image";

import quoteImage from "../../../public/images/quote-breather-mother-child.png";

// The photo IS the section background (no boxed frame) -- a warm scrim,
// using the same gradient this section always had, sits over it and fades
// out toward the right so the photo takes over everywhere the quote isn't.
export function QuoteBreather() {
  return (
    <section className="relative overflow-hidden py-20 lg:min-h-[65vh] lg:py-0">
      <Image
        src={quoteImage}
        alt="A mother and her son sitting on the floor together, building a tower out of wooden blocks"
        fill
        placeholder="blur"
        sizes="100vw"
        className="photo-treatment object-cover object-[58%_40%] lg:object-[72%_38%]"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #1a1a1a 0%, #1a1a1a 36%, #2a2118 48%, rgba(42,33,24,0.75) 58%, rgba(58,42,28,0.35) 70%, rgba(74,50,34,0) 84%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-6 lg:min-h-[65vh] lg:px-10">
        <div className="max-w-2xl">
          <span
            aria-hidden
            className="block font-serif text-7xl leading-none text-rust-light/70"
          >
            &ldquo;
          </span>
          <p className="mt-2 font-serif text-3xl leading-snug text-canvas-white sm:text-4xl lg:text-[2.75rem]">
            Every child deserves a therapist who is not just qualified, but genuinely{" "}
            <em className="font-normal italic text-rust-light">known and trusted</em>{" "}
            by their family.
          </p>
          <p className="mt-6 text-sm text-canvas-white/70">The idea behind Hayven</p>
        </div>
      </div>
    </section>
  );
}
