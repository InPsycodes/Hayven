"use client";

import { useEffect, useRef } from "react";

/**
 * Adds the `.reveal` class (see globals.css `rise` keyframes) once the
 * element scrolls into view, instead of firing every entrance animation on
 * page load. Elements are visible by default with no class applied, so
 * nothing depends on JS running -- this only adds a rise-in flourish on top.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("reveal");
            observer.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
