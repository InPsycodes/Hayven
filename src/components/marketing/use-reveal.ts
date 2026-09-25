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

    // Already on screen when the page loads: leave it alone. Adding the class
    // now would snap the section to invisible and fade it back in -- a flash
    // on the content people are already looking at.
    if (el.getBoundingClientRect().top < window.innerHeight - 80) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("reveal");
            observer.unobserve(el);
          }
        }
      },
      // Fire as soon as the top edge comes into view (minus a small margin),
      // not partway through the section -- keeps the fade calm and one-shot.
      { rootMargin: "0px 0px -80px 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
