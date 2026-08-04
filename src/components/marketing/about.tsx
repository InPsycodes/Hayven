import { IconHeart, IconShieldCheck } from "@tabler/icons-react";

const VALUES = [
  {
    icon: IconHeart,
    title: "Family-first design",
    body: "Every screen is built around what a worried parent actually needs to see first.",
  },
  {
    icon: IconShieldCheck,
    title: "Verified, always",
    body: "No profile goes live until credentials are confirmed directly with the therapist's professional body.",
  },
];

export function About() {
  return (
    <section id="about" className="bg-canvas-white px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div
          className="aspect-4/3 min-w-0 rounded-[2rem] shadow-xl"
          style={{
            background: "linear-gradient(135deg, #dcd3be 0%, #9c5934 60%, #1a1a1a 100%)",
          }}
          role="img"
          aria-label="A parent and child laughing together at home"
        />

        <div className="min-w-0">
          <span className="eyebrow text-terracotta">About Hayven</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Built by people who understand the search for the right care.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
            Hayven started with a simple frustration: there was no reliable way for Nigerian
            parents to know whether a therapist was actually who they said they were. We built
            the verification-first platform we wished existed.
          </p>

          <div className="mt-8 border-t border-charcoal/10 pt-8">
            <div className="grid gap-6 sm:grid-cols-2">
              {VALUES.map((value) => (
                <div key={value.title} className="flex flex-col gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-terracotta/12 text-terracotta">
                    <value.icon size={20} stroke={1.75} />
                  </span>
                  <p className="text-[15px] font-medium text-charcoal">{value.title}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">{value.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
