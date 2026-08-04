/**
 * concern_type -> specialty mapping for the needs-assessment quiz
 * (rules-based, no ML, per PRD). Keyed by specialty *name* rather than ID,
 * since mock and real specialties live in different ID spaces but share the
 * same canonical names -- see src/lib/therapist/discovery.ts.
 */
export const CONCERN_OPTIONS = [
  { value: "speech", label: "Speech or communication difficulties", specialtyName: "Speech Therapy" },
  { value: "focus", label: "Learning or focus/attention difficulties", specialtyName: "Special-Needs Education" },
  { value: "emotional", label: "Anxiety, worry, or mood changes", specialtyName: "Clinical Psychology" },
  { value: "behavioral", label: "Behavioral challenges (tantrums, defiance, aggression)", specialtyName: "Clinical Psychology" },
  { value: "social", label: "Social difficulties or difficulty making friends", specialtyName: "Developmental Psychology" },
  { value: "developmental_delay", label: "Developmental delay or milestones concern", specialtyName: "Developmental Psychology" },
  { value: "trauma", label: "Trauma, grief, or a difficult life event", specialtyName: "Counselling" },
  { value: "autism_sensory", label: "Autism spectrum or sensory-related concerns", specialtyName: "Occupational Therapy" },
  { value: "unsure", label: "Not sure -- I just know something feels off", specialtyName: "Developmental Psychology" },
] as const;
