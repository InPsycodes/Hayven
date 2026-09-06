/**
 * The intake form's shape and section model, shared by the parent editor
 * (src/components/parent/intake-form.tsx), the therapist read view, and the
 * completeness calc the dashboards show. Client-safe -- no server imports.
 *
 * `IntakeDetails` is the whole editable payload; it is stored as-is in
 * intake_forms.details (jsonb). Consent lives separately (intake_consents,
 * append-only) so a changed decision keeps its history.
 */

export type CommunicationLevel =
  | "not_much"
  | "sounds_gestures"
  | "single_words"
  | "short_phrases"
  | "sentences"
  | "aac";

export type HearingVision = "both_fine" | "flagged" | "not_checked";
export type SchoolStatus = "attends" | "not_yet";

export interface IntakeDetails {
  // 1. About
  preferredName?: string;
  homeLanguages?: string;
  communicationLevel?: CommunicationLevel;
  household?: string;
  // 2. What brings you here
  therapyGoal?: string;
  concernOnset?: string;
  concernAreas?: string[];
  // 3. Sensory profile
  sensoryTriggers?: string[];
  sensoryCalming?: string;
  sensorySeeking?: string;
  // 4. Health
  diagnoses?: string;
  medications?: string;
  allergies?: string;
  hearingVision?: HearingVision;
  pediatrician?: string;
  pediatricianPhone?: string;
  // 5. Therapy so far
  therapiesTried?: string[];
  therapyDetails?: string;
  // 6. A day at home
  routineSleep?: string;
  routineNaps?: string;
  routineMeals?: string;
  routineScreen?: string;
  routineHardest?: string;
  // 7. School or daycare
  schoolStatus?: SchoolStatus;
  schoolName?: string;
  schoolNotes?: string;
  schoolSupport?: string;
}

export const CONSENT_TYPES = ["therapist_access", "share_named", "session_media", "anon_data"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface ConsentState {
  type: ConsentType;
  granted: boolean;
  detail: string | null;
  recordedAt: string | null;
}

// --- option lists -----------------------------------------------------------

export const COMMUNICATION_LEVELS: { value: CommunicationLevel; label: string }[] = [
  { value: "not_much", label: "Not much yet" },
  { value: "sounds_gestures", label: "Sounds & gestures" },
  { value: "single_words", label: "Single words" },
  { value: "short_phrases", label: "Short phrases" },
  { value: "sentences", label: "Full sentences" },
  { value: "aac", label: "AAC / device" },
];

export const CONCERN_AREAS = [
  "Speech & talking",
  "Understanding others",
  "Social interaction",
  "Play skills",
  "Big feelings & behaviour",
  "Attention & focus",
  "Fine motor (hands)",
  "Gross motor (moving)",
  "Sensory sensitivities",
  "Feeding & eating",
  "Sleep",
  "Toileting",
];

export const SENSORY_TRIGGERS = [
  "Loud or sudden sounds",
  "Bright or flickering light",
  "Certain clothing textures",
  "Certain food textures",
  "Being touched unexpectedly",
  "Crowded or busy places",
  "Strong smells",
  "Messy hands",
  "Changes to the plan",
];

export const THERAPIES_TRIED = [
  "Speech & language",
  "Occupational therapy",
  "Physiotherapy",
  "ABA",
  "Feeding therapy",
  "Other",
  "None yet",
];

export const HEARING_VISION_OPTIONS: { value: HearingVision; label: string }[] = [
  { value: "both_fine", label: "Yes, both fine" },
  { value: "flagged", label: "One or both flagged" },
  { value: "not_checked", label: "Not yet / not sure" },
];

export const SCHOOL_STATUS_OPTIONS: { value: SchoolStatus; label: string }[] = [
  { value: "attends", label: "Yes" },
  { value: "not_yet", label: "Not yet" },
];

export const CONSENT_COPY: Record<
  ConsentType,
  { title: string; sub?: string; required?: boolean; hasDetail?: boolean; detailPlaceholder?: string }
> = {
  therapist_access: {
    title: "The assigned therapist may read this form and the session records",
    sub: "Without this, a therapist can't provide care through Hayven. Only the therapist currently assigned, and Hayven's care team.",
    required: true,
  },
  share_named: {
    title: "Share session updates with the people I name",
    hasDetail: true,
    detailPlaceholder: "e.g. Grandmother, who does school pickup twice a week",
  },
  session_media: {
    title: "The therapist may take short photos or video during sessions",
    sub: "Kept on the child's file to track progress, never used anywhere else. You can withdraw this any time.",
  },
  anon_data: {
    title: "Use progress data, with the child's name removed, to improve Hayven",
    sub: "Optional. Nothing that could identify the child ever leaves their file.",
  },
};

// --- sections --------------------------------------------------------------

export type FieldKind = "text" | "textarea" | "chips" | "segmented";

export interface IntakeField {
  key: keyof IntakeDetails;
  kind: FieldKind;
  /** Filled in per child at render time; use {child} as a placeholder. */
  label: string;
  hint?: string;
  placeholder?: string;
  options?: readonly string[] | { value: string; label: string }[];
}

export interface IntakeSection {
  id: string;
  title: string;
  why: string;
  fields: IntakeField[];
  /** Keys that must all be answered for the section to count as "complete". */
  primaryKeys: (keyof IntakeDetails)[];
  /** The consent section is special-cased -- no fields, driven by consent state. */
  consent?: boolean;
}

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    id: "about",
    title: "About {child}",
    why: "The basics beyond a name and birthday: how {child} communicates and who's around them day to day.",
    primaryKeys: ["homeLanguages", "communicationLevel", "household"],
    fields: [
      { key: "preferredName", kind: "text", label: "What {child} likes to be called" },
      { key: "homeLanguages", kind: "text", label: "Languages spoken at home", placeholder: "e.g. Yoruba and English" },
      { key: "communicationLevel", kind: "segmented", label: "How {child} mainly communicates right now", options: COMMUNICATION_LEVELS },
      { key: "household", kind: "text", label: "Who lives at home with {child}" },
    ],
  },
  {
    id: "concern",
    title: "What brings you here",
    why: "Your words on the concern, and which areas you'd like the therapist to look at.",
    primaryKeys: ["therapyGoal", "concernAreas"],
    fields: [
      { key: "therapyGoal", kind: "textarea", label: "What are you hoping therapy will help with?" },
      { key: "concernOnset", kind: "text", label: "When did you first notice it?" },
      { key: "concernAreas", kind: "chips", label: "Areas of concern", hint: "pick any that apply", options: CONCERN_AREAS },
    ],
  },
  {
    id: "sensory",
    title: "Sensory profile",
    why: "What overwhelms {child}, and what helps them settle. This shapes how the therapist sets up the room.",
    primaryKeys: ["sensoryTriggers", "sensoryCalming"],
    fields: [
      { key: "sensoryTriggers", kind: "chips", label: "Common triggers", options: SENSORY_TRIGGERS },
      { key: "sensoryCalming", kind: "textarea", label: "What helps them calm down" },
      { key: "sensorySeeking", kind: "textarea", label: "Things they actively seek out", placeholder: "e.g. spinning, jumping, deep pressure, mouthing objects" },
    ],
  },
  {
    id: "health",
    title: "Health",
    why: "Diagnoses, medicines, allergies, and whether hearing and vision have been checked, which matters a lot for speech and OT work.",
    primaryKeys: ["diagnoses", "hearingVision"],
    fields: [
      { key: "diagnoses", kind: "textarea", label: "Diagnoses or past assessments", placeholder: "Leave blank if none" },
      { key: "medications", kind: "text", label: "Current medications", placeholder: "Name and what it's for, or leave blank" },
      { key: "allergies", kind: "text", label: "Allergies", placeholder: "e.g. No known allergies" },
      { key: "hearingVision", kind: "segmented", label: "Hearing & vision checked?", options: HEARING_VISION_OPTIONS },
      { key: "pediatrician", kind: "text", label: "Paediatrician or clinic" },
      { key: "pediatricianPhone", kind: "text", label: "Their phone (optional)", placeholder: "+234 …" },
    ],
  },
  {
    id: "therapy",
    title: "Therapy so far",
    why: "Anything {child} has already tried, so the new therapist can build on it rather than start over.",
    primaryKeys: ["therapiesTried"],
    fields: [
      { key: "therapiesTried", kind: "chips", label: "Types of therapy tried", options: THERAPIES_TRIED },
      { key: "therapyDetails", kind: "textarea", label: "Where, and with whom", placeholder: "e.g. Six speech sessions at a centre in Lekki last year, stopped when we moved" },
    ],
  },
  {
    id: "routine",
    title: "A day at home",
    why: "The rhythm of {child}'s day. It helps the therapist suggest practice that fits real life, not extra homework.",
    primaryKeys: ["routineSleep", "routineMeals", "routineHardest"],
    fields: [
      { key: "routineSleep", kind: "text", label: "Usually wakes / sleeps", placeholder: "e.g. up at 7, bed by 8:30" },
      { key: "routineNaps", kind: "text", label: "Naps?", placeholder: "e.g. one after lunch, ~1 hour" },
      { key: "routineMeals", kind: "text", label: "Mealtimes: any difficulty?" },
      { key: "routineScreen", kind: "text", label: "Screen time on a normal day" },
      { key: "routineHardest", kind: "textarea", label: "The hardest part of the day" },
    ],
  },
  {
    id: "school",
    title: "School or daycare",
    why: "If {child} spends time somewhere with other children, what the staff there have noticed.",
    primaryKeys: ["schoolStatus"],
    fields: [
      { key: "schoolStatus", kind: "segmented", label: "Does {child} attend school or daycare?", options: SCHOOL_STATUS_OPTIONS },
      { key: "schoolName", kind: "text", label: "Name of the school / centre" },
      { key: "schoolNotes", kind: "textarea", label: "Anything teachers or carers have raised" },
      { key: "schoolSupport", kind: "text", label: "Support already in place there" },
    ],
  },
  {
    id: "consent",
    title: "Consent & sharing",
    why: "What you're agreeing to, spelled out. We record the date you agree to each, and keep a history if you change them.",
    primaryKeys: [],
    fields: [],
    consent: true,
  },
];

// --- completeness ---------------------------------------------------------

export type SectionState = "complete" | "in_progress" | "not_started";

function fieldAnswered(details: IntakeDetails, key: keyof IntakeDetails): boolean {
  const v = details[key];
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
}

export function sectionState(
  section: IntakeSection,
  details: IntakeDetails,
  consents: ConsentState[]
): SectionState {
  if (section.consent) {
    const access = consents.find((c) => c.type === "therapist_access");
    if (access?.granted) return "complete";
    const anyOther = consents.some((c) => c.granted);
    return anyOther ? "in_progress" : "not_started";
  }
  const answeredAny = section.fields.some((f) => fieldAnswered(details, f.key));
  if (!answeredAny) return "not_started";
  const allPrimary = section.primaryKeys.every((k) => fieldAnswered(details, k));
  return allPrimary ? "complete" : "in_progress";
}

export interface IntakeProgress {
  sections: { id: string; title: string; state: SectionState }[];
  started: number;
  complete: number;
  total: number;
}

export function intakeProgress(
  details: IntakeDetails,
  consents: ConsentState[],
  childName = "your child"
): IntakeProgress {
  const sections = INTAKE_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title.replace(/\{child\}/g, childName),
    state: sectionState(s, details, consents),
  }));
  return {
    sections,
    started: sections.filter((s) => s.state !== "not_started").length,
    complete: sections.filter((s) => s.state === "complete").length,
    total: sections.length,
  };
}

/** The therapist is worth notifying once the form carries real context. */
export function intakeIsSubstantial(details: IntakeDetails, consents: ConsentState[]): boolean {
  const p = intakeProgress(details, consents);
  const hasAccessConsent = consents.some((c) => c.type === "therapist_access" && c.granted);
  return hasAccessConsent && p.complete >= 4;
}
