"use client";

import { useEffect, useRef, useState } from "react";

interface TocEntry {
  id: string;
  text: string;
}

/**
 * Left-aligned reading column with a sticky "On this page" list beside it,
 * matching the Learning Center article grid. The list is built from the
 * section <h2>s after mount, so the legal pages only have to write their
 * headings once.
 */
export function LegalDocument({ children }: { children: React.ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocEntry[]>([]);

  useEffect(() => {
    const headings = Array.from(bodyRef.current?.querySelectorAll("h2") ?? []);
    setToc(
      headings.map((h, i) => {
        const id = `section-${i + 1}`;
        h.id = id;
        h.classList.add("scroll-mt-24");
        return { id, text: h.textContent ?? "" };
      })
    );
  }, []);

  return (
    <div className="bg-canvas-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-10 md:py-24 lg:px-12 xl:px-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-14 xl:grid-cols-[1fr_300px] xl:gap-20">
          <div ref={bodyRef} className="min-w-0 lg:max-w-[680px] xl:max-w-[720px]">
            {children}
          </div>
          {toc.length > 0 && (
            <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
              <div className="border-l-2 border-terracotta/40 pl-6">
                <p className="label-micro text-rust-dark">On this page</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="text-sm leading-snug text-ink-soft hover:text-charcoal hover:underline">
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
