export const PROFESSIONAL_BODIES = [
  { value: "npa", label: "Nigerian Psychological Association" },
  { value: "nacp", label: "Nigerian Association of Clinical Psychologists" },
  { value: "anep", label: "Association of Nigerian Educational Psychologists" },
  { value: "other", label: "Other (specialty-equivalent body)" },
] as const;

export function professionalBodyLabel(value: string): string {
  return PROFESSIONAL_BODIES.find((b) => b.value === value)?.label ?? value;
}
