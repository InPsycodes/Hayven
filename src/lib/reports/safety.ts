/**
 * Free-text safety net for the parent-facing report. Session notes are the
 * one place a therapist's own free text gets quoted verbatim into what a
 * parent sees (buildGreeting in generate.ts) -- everything else in the
 * parent report is composed from structured fields. Two separate concerns:
 *
 * - applyParentFriendlyLanguage: swaps clinical terms for the parent-facing
 *   language the therapist already set (per-behaviour parentLabel), plus a
 *   small built-in dictionary limited to jargon actually raised in practice.
 *   This never rewrites tone or meaning, only vocabulary already established
 *   as the therapist's own preferred parent-facing wording.
 *
 * - detectFlaggedPhrases: never rewrites anything -- flags content back to
 *   the therapist so *they* decide whether it belongs in the confidential
 *   note instead, before publishing. Warn-and-let-them-decide, not
 *   silent-auto-edit, since the platform must never surprise a therapist
 *   with a report that doesn't match what they meant to send.
 */

// Values are bare noun phrases, no leading article -- replaceTerm fixes
// "a"/"an" agreement itself based on the replacement's first letter, since
// baking an article into the dictionary breaks whenever the source text
// used the other article ("an extinction burst" needs "a temporary...").
const BUILT_IN_TERM_SUBSTITUTIONS: [term: string, parentFriendly: string][] = [
  ["extinction burst", "temporary increase in the behavior we're working on"],
  ["elopement", "leaving the activity area"],
  ["tantrum", "emotional outburst"],
  ["non-compliance", "difficulty following the request"],
  ["noncompliance", "difficulty following the request"],
];

const FLAGGED_PHRASES = [
  "suspected seizure",
  "seizure",
  "lack of sleep",
  "didn't sleep",
  "parent argument",
  "parents arguing",
  "self-harm",
  "self harm",
  "suicid",
  "abuse",
  "police",
  "child protective",
  "cps",
  "bruise",
  "injury at home",
];

/**
 * Case-insensitive whole-word-ish replace -- avoids matching inside an
 * unrelated longer word. Also fixes "a"/"an" immediately before the matched
 * term, based on the replacement's own leading sound, so "an elopement"
 * becomes "a leaving the activity area" rather than the grammatically wrong
 * "an leaving...". Bare occurrences (no leading article) are left as-is --
 * this only touches the article, never other surrounding words.
 */
function replaceTerm(text: string, term: string, replacement: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const useAn = /^[aeiou]/i.test(replacement.trim());

  let result = text.replace(new RegExp(`\\b(a|an)(\\s+)${escaped}\\b`, "gi"), (_match, article: string) => {
    const fixed = useAn ? "an" : "a";
    const capitalized = article[0] === article[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
    return `${capitalized} ${replacement}`;
  });
  result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), (match) =>
    match[0] === match[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
  );
  return result;
}

export function applyParentFriendlyLanguage(
  text: string,
  behaviours: { label: string; parentLabel: string | null }[]
): string {
  let result = text;
  for (const behaviour of behaviours) {
    if (behaviour.parentLabel && behaviour.parentLabel.trim()) {
      result = replaceTerm(result, behaviour.label, behaviour.parentLabel.trim());
    }
  }
  for (const [term, replacement] of BUILT_IN_TERM_SUBSTITUTIONS) {
    result = replaceTerm(result, term, replacement);
  }
  return result;
}

/** Returns which flagged phrases (if any) appear in the given free text, for a therapist-facing warning -- never blocks or rewrites, just surfaces it before publish. */
export function detectFlaggedPhrases(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return FLAGGED_PHRASES.filter((phrase) => lower.includes(phrase));
}

/**
 * The subset of FLAGGED_PHRASES that point at a child's safety rather than
 * a clinical observation -- these, found in a published report's session,
 * alert the safeguarding leads automatically (src/lib/safeguarding/alerts.ts).
 * "seizure"/"lack of sleep" stay therapist-warning-only: alerting the DSL on
 * every clinical mention would bury the real signal.
 */
const SAFEGUARDING_PHRASES = [
  "parent argument",
  "parents arguing",
  "self-harm",
  "self harm",
  "suicid",
  "abuse",
  "police",
  "child protective",
  "cps",
  "bruise",
  "injury at home",
];

export function detectSafeguardingPhrases(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SAFEGUARDING_PHRASES.filter((phrase) => lower.includes(phrase));
}

/**
 * Pulls out exactly the free-text sub-fields of a domain-typed skill's
 * structured_data that actually reach the parent report (see the matching
 * field list in generate.ts's domainSkillParentSentence) -- so the
 * flagged-phrase warning on the review page covers the same surface the
 * parent-friendly filter covers, not just session-level notes. Domains that
 * only ever surface percentages or fixed enum labels (name_response,
 * communicative_initiation, functional_independence) return nothing here,
 * since there's no free text on that path to warn about. Defensively typed
 * -- an unexpected shape in the jsonb column is just skipped, never thrown.
 */
export function extractDomainFreeText(
  domainType: string | null,
  structuredData: Record<string, unknown> | null
): string[] {
  if (!domainType || !structuredData) return [];
  const texts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) texts.push(v);
  };
  const pushAll = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(push);
  };

  switch (domainType) {
    case "functional_communication":
      pushAll(structuredData.requestsObserved);
      break;
    case "speech_approximation":
      push(structuredData.wordOrSound);
      push(structuredData.approximation);
      break;
    case "receptive_instructions":
      push(structuredData.instruction);
      break;
    case "object_identification":
      push(structuredData.itemsCorrectlyIdentified);
      break;
    case "concept_understanding":
      push(structuredData.concept);
      break;
    case "tacting_naming":
      pushAll(structuredData.itemsLabelled);
      break;
    case "mand_diversity":
      pushAll(structuredData.newRequestWords);
      break;
    case "motor_speech_dttc":
      pushAll(structuredData.soundsWordsPractised);
      break;
    default:
      break;
  }
  return texts;
}

/**
 * Every piece of free text in a report body (paragraphs, quotes, bullet
 * items), joined. Report text is editable by the therapist, so the phrase
 * checks above must look at what the report actually says, not only at the
 * session notes it was generated from.
 */
export function reportBodyText(body: { sections: { blocks: { text?: string; items?: string[] }[] }[] } | null | undefined): string {
  if (!body?.sections) return "";
  return body.sections
    .flatMap((s) => s.blocks.flatMap((b) => [b.text ?? "", ...(b.items ?? [])]))
    .filter(Boolean)
    .join("\n");
}
