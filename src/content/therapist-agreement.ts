/**
 * The Therapist Agreement therapists accept at verification.
 *
 * Deliberately null until the agreement is adopted: the draft in
 * docs/therapist-agreement.md still has open items for counsel, and asking
 * therapists to accept a draft would bind them to terms that will change.
 * While this is null, the acceptance checkbox, the /therapist-agreement
 * page and the dashboard re-accept prompt are all switched off.
 *
 * To adopt: put the final text here with a version string. To make a
 * material change later: update the text AND bump the version. Every
 * therapist is then asked to accept the new version, and each acceptance
 * is recorded per version (migration 0105).
 */
export interface TherapistAgreement {
  version: string;
  /** ISO date the version takes effect, e.g. "2026-11-01". */
  effectiveDate: string;
  sections: { heading: string; paragraphs: string[] }[];
}

export const THERAPIST_AGREEMENT: TherapistAgreement | null = null;
