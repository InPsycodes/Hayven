/**
 * The 10 skill domains (plus functional_independence's 3 sub-slots) that
 * feed `domainSkillParentSentence` in generate.ts -- the only place admin
 * phrase variants and Direct/Warm tone apply. Shared between the admin form
 * (so it can only ever submit a valid domain/band pair) and the action that
 * writes to report_phrase_variants (so a mistyped key can't silently create
 * a dead entry nothing will ever read).
 */
export interface PhraseDomain {
  key: string;
  label: string;
  bands: { key: string; label: string }[] | null;
}

export const PHRASE_DOMAINS: PhraseDomain[] = [
  {
    key: "name_response",
    label: "Responding to Name",
    bands: [
      { key: "high", label: "High (70%+)" },
      { key: "mid", label: "Mid (40-69%)" },
      { key: "low", label: "Low (<40%)" },
    ],
  },
  { key: "functional_communication", label: "Communication", bands: null },
  { key: "speech_approximation", label: "Speech Practice (approximation)", bands: null },
  { key: "communicative_initiation", label: "Initiating Communication", bands: null },
  {
    key: "receptive_instructions",
    label: "Following Instructions",
    bands: [
      { key: "high", label: "High (70%+)" },
      { key: "mid", label: "Mid (40-69%)" },
      { key: "low", label: "Low (<40%)" },
    ],
  },
  { key: "object_identification", label: "Identifying Objects", bands: null },
  {
    key: "concept_understanding",
    label: "Understanding Concepts",
    bands: [
      { key: "high", label: "High (70%+)" },
      { key: "mid", label: "Mid (40-69%)" },
      { key: "low", label: "Low (<40%)" },
    ],
  },
  { key: "tacting_naming", label: "Naming Things", bands: null },
  { key: "mand_diversity", label: "Asking for Things", bands: null },
  { key: "motor_speech_dttc", label: "Speech Practice (motor)", bands: null },
  {
    key: "functional_independence",
    label: "Daily Living",
    bands: [
      { key: "lead", label: "Opening sentence" },
      { key: "independent", label: "Done independently" },
      { key: "supported", label: "Needed support" },
    ],
  },
];

export function isValidDomainBand(domainKey: string, band: string | null): boolean {
  const domain = PHRASE_DOMAINS.find((d) => d.key === domainKey);
  if (!domain) return false;
  if (!domain.bands) return band === null;
  return band !== null && domain.bands.some((b) => b.key === band);
}
