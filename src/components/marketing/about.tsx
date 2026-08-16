import Image from "next/image";
import Link from "next/link";
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
    <section id="about" className="bg-ivory px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="relative aspect-4/3 min-w-0 overflow-hidden rounded-[2rem] shadow-xl">
          <Image
            src="/images/about-family-session.png"
            alt="A father, mother, and daughter playing together during a therapy session"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="photo-treatment object-cover"
          />
        </div>

        <div className="min-w-0">
          <span className="eyebrow text-rust-dark">About Hayven</span>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-charcoal sm:text-4xl lg:text-[2.75rem]">
            Helping families understand, connect, and feel supported.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
            Hayven was born from a personal experience: seeing firsthand how overwhelming it can
            be for parents facing a new diagnosis, often without clear information or anyone they
            can trust. We built the platform we wished existed: one that helps parents understand
            their child and stay connected to their care, from the first questions through therapy
            and beyond.
          </p>
          <Link
            href="/about"
            className="mt-3 inline-block text-sm font-medium text-rust-dark hover:underline"
          >
            Read our story →
          </Link>

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
