/**
 * Mock-data types, shaped to mirror the real Postgres data model 1:1 (see
 * Hayven_Build_Plan.md Part 1) but in idiomatic camelCase rather than raw
 * snake_case DB columns. When a real API/ORM layer is wired in, a single
 * `adaptRow()` per entity bridges snake_case rows to these types -- the
 * fixtures below already speak the app's native shape, so call sites in
 * components never need to change.
 */

export type UserRole = "parent" | "therapist" | "admin";
export type UserStatus = "active" | "suspended";

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  parentId: string;
  firstName: string;
  dateOfBirth: string;
  presentingConcern?: string;
  createdAt: string;
}

export type VerificationStatus = "pending" | "verified" | "rejected" | "flagged";
export type SessionType = "in_person" | "virtual";

export interface TherapistProfile {
  id: string;
  userId: string;
  displayName: string;
  photoUrl?: string;
  bio: string;
  specialtyIds: string[];
  location: string;
  sessionTypes: SessionType[];
  pricePerSession: number;
  yearsPracticing: number;
  ageGroupsServed: string[];
  languages: string[];
  verificationStatus: VerificationStatus;
  verifiedBadgeLabel?: string;
  professionalBody: string;
  membershipNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface Specialty {
  id: string;
  name: string;
  governingBody?: string;
}

export interface TherapistSpecialty {
  therapistId: string;
  specialtyId: string;
}

export type CredentialDocumentType = "certificate" | "membership_id" | "degree";

export interface Credential {
  id: string;
  therapistId: string;
  documentType: CredentialDocumentType;
  fileUrl: string;
  fileName: string;
  issuingBody: string;
  membershipNumber?: string;
  uploadedAt: string;
}

export type VerificationRequestStatus =
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "needs_more_info";

export type VerificationMethod =
  | "phone_confirmation"
  | "email_confirmation"
  | "membership_number_lookup";

export interface VerificationRequest {
  id: string;
  therapistId: string;
  adminId?: string;
  status: VerificationRequestStatus;
  verificationMethod?: VerificationMethod;
  reviewerNotes?: string;
  parentFacingReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface AvailabilitySlot {
  id: string;
  therapistId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  sessionType: SessionType;
}

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Booking {
  id: string;
  parentId: string;
  childId: string;
  therapistId: string;
  availabilitySlotId: string;
  status: BookingStatus;
  sessionType: SessionType;
  meetingLink?: string;
  location?: string;
  createdAt: string;
}

export type PaymentType = "session_commission" | "listing_fee" | "parent_subscription";
export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

export interface Payment {
  id: string;
  bookingId?: string;
  payerId: string;
  payeeId?: string;
  amount: number;
  type: PaymentType;
  gatewayReference: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  sentAt: string;
  flagged: boolean;
  attachment?: { fileName: string; fileUrl: string };
}

export interface SessionNote {
  id: string;
  bookingId: string;
  therapistId: string;
  summary: string;
  goalsAddressed: string[];
  recommendations: string;
  visibleToParent: boolean;
  createdAt: string;
}

export type ProgressGoalStatus = "set" | "in_progress" | "achieved";

export interface ProgressGoal {
  id: string;
  childId: string;
  therapistId: string;
  title: string;
  status: ProgressGoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = "monthly" | "annual";
export type SubscriptionStatus = "active" | "cancelled" | "past_due";

export interface Subscription {
  id: string;
  parentId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewsAt: string;
}

export type NotificationType =
  | "booking_confirmed"
  | "new_message"
  | "note_added"
  | "payment_receipt"
  | "verification_update"
  | "meeting_link_ready";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
