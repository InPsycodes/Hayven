import type { Specialty } from "../types";

export const specialties: Specialty[] = [
  { id: "spc_dev_psych", name: "Developmental Psychology", governingBody: "Nigerian Psychological Association" },
  { id: "spc_clinical_psych", name: "Clinical Psychology", governingBody: "Nigerian Psychological Association" },
  { id: "spc_speech", name: "Speech Therapy", governingBody: "Nigerian Association of Speech-Language Pathologists" },
  { id: "spc_ot", name: "Occupational Therapy", governingBody: "Association of Occupational Therapists of Nigeria" },
  { id: "spc_psychiatry", name: "Psychiatry", governingBody: "Medical and Dental Council of Nigeria" },
  { id: "spc_special_needs", name: "Special-Needs Education", governingBody: undefined },
  { id: "spc_counselling", name: "Counselling", governingBody: "Counselling Association of Nigeria" },
];
