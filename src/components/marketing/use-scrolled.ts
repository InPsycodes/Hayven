"use client";

import { useEffect, useState } from "react";

/** True once the page has scrolled past `thresholdRatio` of the viewport height. */
export function useScrolled(thresholdRatio = 0.75) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function check() {
      setScrolled(window.scrollY > window.innerHeight * thresholdRatio);
    }
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [thresholdRatio]);

  return scrolled;
}
