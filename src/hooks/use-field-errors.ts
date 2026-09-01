"use client";

import { useCallback, useState } from "react";

/**
 * Shared per-field validation state for forms. Keeps a name -> message map,
 * clears a field's error as the user edits it, and scrolls+focuses the
 * first invalid field (in the order the caller lists them, which is the
 * visual order -- not object-key order) after a failed submit.
 *
 * Correct inputs are never touched: this only tracks messages, the form's
 * own value state is left alone, so fixing one field and resubmitting keeps
 * everything else the user already typed.
 */
export type FieldErrors = Record<string, string | undefined>;

export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const setFieldError = useCallback((name: string, message: string | undefined) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const clearFieldError = useCallback((name: string) => {
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  /**
   * Applies a fresh set of messages and moves focus to the first field in
   * `order` that has one. Returns true if any error was set.
   */
  const showErrors = useCallback((next: FieldErrors, order: string[]) => {
    setErrors(next);
    const firstBad = order.find((name) => next[name]);
    if (firstBad && typeof document !== "undefined") {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstBad);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus({ preventScroll: true });
        }
      });
    }
    return Boolean(firstBad);
  }, []);

  return { errors, setErrors, setFieldError, clearFieldError, clearAll, showErrors };
}
