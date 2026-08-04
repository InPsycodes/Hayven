import { users } from "./fixtures/users";
import { children } from "./fixtures/children";
import { specialties } from "./fixtures/specialties";
import { therapistProfiles } from "./fixtures/therapist-profiles";
import { credentials } from "./fixtures/credentials";
import { verificationRequests } from "./fixtures/verification-requests";
import { availabilitySlots } from "./fixtures/availability-slots";
import { bookings } from "./fixtures/bookings";
import { payments } from "./fixtures/payments";
import { messages } from "./fixtures/messages";
import { sessionNotes } from "./fixtures/session-notes";
import { progressGoals } from "./fixtures/progress-goals";
import { subscriptions } from "./fixtures/subscriptions";
import { notifications } from "./fixtures/notifications";
import type {
  AvailabilitySlot,
  Booking,
  BookingStatus,
  Child,
  Credential,
  Message,
  Notification,
  Payment,
  ProgressGoal,
  Specialty,
  TherapistProfile,
  User,
  VerificationRequest,
} from "./types";

// ---------------------------------------------------------------------------
// Composed (join-shaped) view types -- what real API responses would return.
// ---------------------------------------------------------------------------

export interface TherapistWithSpecialties extends TherapistProfile {
  specialties: Specialty[];
  nextAvailableSlot?: AvailabilitySlot;
}

export interface BookingWithDetails extends Booking {
  child: Child;
  therapist: TherapistWithSpecialties;
  slot: AvailabilitySlot;
}

export interface VerificationRequestWithTherapist extends VerificationRequest {
  therapist: TherapistWithSpecialties;
  credentials: Credential[];
}

export interface MessageThreadPreview {
  bookingId: string;
  counterpart: User;
  lastMessage: Message;
  unread: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((item) => item.id === id);
}

function resolveSpecialties(specialtyIds: string[]): Specialty[] {
  return specialtyIds
    .map((id) => byId(specialties, id))
    .filter((s): s is Specialty => Boolean(s));
}

function nextAvailableSlotFor(therapistId: string): AvailabilitySlot | undefined {
  return availabilitySlots
    .filter((slot) => slot.therapistId === therapistId && !slot.isBooked)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
}

function toTherapistWithSpecialties(profile: TherapistProfile): TherapistWithSpecialties {
  return {
    ...profile,
    specialties: resolveSpecialties(profile.specialtyIds),
    nextAvailableSlot: nextAvailableSlotFor(profile.id),
  };
}

function toBookingWithDetails(booking: Booking): BookingWithDetails | undefined {
  const child = byId(children, booking.childId);
  const therapist = byId(therapistProfiles, booking.therapistId);
  const slot = byId(availabilitySlots, booking.availabilitySlotId);
  if (!child || !therapist || !slot) return undefined;
  return {
    ...booking,
    child,
    therapist: toTherapistWithSpecialties(therapist),
    slot,
  };
}

// ---------------------------------------------------------------------------
// Users / children
// ---------------------------------------------------------------------------

export async function getUserById(id: string): Promise<User | undefined> {
  return byId(users, id);
}

export async function getChildrenForParent(parentId: string): Promise<Child[]> {
  return children.filter((c) => c.parentId === parentId);
}

export async function getChildById(id: string): Promise<Child | undefined> {
  return byId(children, id);
}

// ---------------------------------------------------------------------------
// Specialties / therapists / discovery
// ---------------------------------------------------------------------------

export async function getSpecialties(): Promise<Specialty[]> {
  return specialties;
}

export interface TherapistSearchFilters {
  specialtyId?: string;
  location?: string;
  sessionType?: "in_person" | "virtual";
  priceMax?: number;
  query?: string;
}

export async function getTherapists(
  filters: TherapistSearchFilters = {}
): Promise<TherapistWithSpecialties[]> {
  return therapistProfiles
    .filter((t) => t.verificationStatus === "verified")
    .map(toTherapistWithSpecialties)
    .filter((t) => {
      if (filters.specialtyId && !t.specialtyIds.includes(filters.specialtyId)) return false;
      if (filters.sessionType && !t.sessionTypes.includes(filters.sessionType)) return false;
      if (filters.priceMax && t.pricePerSession > filters.priceMax) return false;
      if (filters.location && !t.location.toLowerCase().includes(filters.location.toLowerCase()))
        return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const haystack = `${t.displayName} ${t.bio} ${t.specialties.map((s) => s.name).join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
}

export async function getTherapistById(id: string): Promise<TherapistWithSpecialties | undefined> {
  const profile = byId(therapistProfiles, id);
  return profile ? toTherapistWithSpecialties(profile) : undefined;
}

export async function getTherapistByUserId(
  userId: string
): Promise<TherapistWithSpecialties | undefined> {
  const profile = therapistProfiles.find((t) => t.userId === userId);
  return profile ? toTherapistWithSpecialties(profile) : undefined;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export async function getAvailabilityForTherapist(
  therapistId: string,
  range?: { from: string; to: string }
): Promise<AvailabilitySlot[]> {
  return availabilitySlots
    .filter((slot) => slot.therapistId === therapistId)
    .filter((slot) => {
      if (!range) return true;
      return slot.startTime >= range.from && slot.startTime <= range.to;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function getSlotById(id: string): Promise<AvailabilitySlot | undefined> {
  return byId(availabilitySlots, id);
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function getBookingsForParent(
  parentId: string,
  status?: BookingStatus
): Promise<BookingWithDetails[]> {
  return bookings
    .filter((b) => b.parentId === parentId && (!status || b.status === status))
    .map(toBookingWithDetails)
    .filter((b): b is BookingWithDetails => Boolean(b))
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}

export async function getBookingsForTherapist(
  therapistId: string,
  status?: BookingStatus
): Promise<BookingWithDetails[]> {
  return bookings
    .filter((b) => b.therapistId === therapistId && (!status || b.status === status))
    .map(toBookingWithDetails)
    .filter((b): b is BookingWithDetails => Boolean(b))
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
}

export async function getBookingById(id: string): Promise<BookingWithDetails | undefined> {
  const booking = byId(bookings, id);
  return booking ? toBookingWithDetails(booking) : undefined;
}

export async function getNextUpcomingBookingForChild(
  childId: string
): Promise<BookingWithDetails | undefined> {
  const all = bookings
    .filter((b) => b.childId === childId && b.status === "confirmed")
    .map(toBookingWithDetails)
    .filter((b): b is BookingWithDetails => Boolean(b))
    .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
  return all[0];
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function getMessagesForBooking(bookingId: string): Promise<Message[]> {
  return messages
    .filter((m) => m.bookingId === bookingId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export async function getMessageThreadsForUser(userId: string): Promise<MessageThreadPreview[]> {
  const user = byId(users, userId);
  if (!user) return [];

  const relevantBookingIds = new Set(
    bookings
      .filter((b) => (user.role === "parent" ? b.parentId === userId : b.therapistId === userId))
      .map((b) => b.id)
  );

  const threads: MessageThreadPreview[] = [];
  for (const bookingId of relevantBookingIds) {
    const threadMessages = messages
      .filter((m) => m.bookingId === bookingId)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    if (threadMessages.length === 0) continue;

    const booking = byId(bookings, bookingId);
    if (!booking) continue;
    const counterpartId = user.role === "parent" ? booking.therapistId : booking.parentId;
    const therapistProfile = byId(therapistProfiles, counterpartId);
    const counterpart =
      user.role === "parent"
        ? byId(users, therapistProfile?.userId ?? "")
        : byId(users, counterpartId);
    if (!counterpart) continue;

    threads.push({
      bookingId,
      counterpart,
      lastMessage: threadMessages[0],
      unread: threadMessages[0].senderId !== userId,
    });
  }

  return threads.sort((a, b) => b.lastMessage.sentAt.localeCompare(a.lastMessage.sentAt));
}

// ---------------------------------------------------------------------------
// Therapist dashboard aggregates
// ---------------------------------------------------------------------------

export async function getTodaysBookingsForTherapist(
  therapistId: string,
  todayISODate: string
): Promise<BookingWithDetails[]> {
  const all = await getBookingsForTherapist(therapistId);
  return all.filter(
    (b) =>
      b.slot.startTime.startsWith(todayISODate) &&
      (b.status === "confirmed" || b.status === "completed")
  );
}

export async function getActiveClientCountForTherapist(therapistId: string): Promise<number> {
  const active = bookings.filter(
    (b) => b.therapistId === therapistId && b.status !== "cancelled"
  );
  return new Set(active.map((b) => b.childId)).size;
}

/** Completed sessions with no session note written yet -- powers "Reports due". */
export async function getReportsDueForTherapist(therapistId: string): Promise<BookingWithDetails[]> {
  const completed = await getBookingsForTherapist(therapistId, "completed");
  const bookingIdsWithNotes = new Set(sessionNotes.map((n) => n.bookingId));
  return completed.filter((b) => !bookingIdsWithNotes.has(b.id));
}

export async function getEarningsForTherapist(therapistId: string): Promise<number> {
  return payments
    .filter(
      (p) => p.payeeId === therapistId && p.type === "session_commission" && p.status === "successful"
    )
    .reduce((sum, p) => sum + p.amount, 0);
}

// ---------------------------------------------------------------------------
// Session notes / progress goals
// ---------------------------------------------------------------------------

export async function getSessionNotesForBooking(
  bookingId: string,
  { includeInternal = false }: { includeInternal?: boolean } = {}
) {
  return sessionNotes
    .filter((n) => n.bookingId === bookingId && (includeInternal || n.visibleToParent))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProgressGoalsForChild(childId: string): Promise<ProgressGoal[]> {
  return progressGoals
    .filter((g) => g.childId === childId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface LatestProgressUpdate {
  goal: ProgressGoal;
  quote: string;
}

/** Powers the parent dashboard's progress card -- a real quoted note, not just a percentage. */
export async function getLatestProgressUpdateForChild(
  childId: string
): Promise<LatestProgressUpdate | undefined> {
  const goals = await getProgressGoalsForChild(childId);
  const activeGoal = goals.find((g) => g.status === "in_progress") ?? goals[0];
  if (!activeGoal) return undefined;

  const relatedNote = sessionNotes
    .filter(
      (n) =>
        n.visibleToParent &&
        n.therapistId === activeGoal.therapistId &&
        n.goalsAddressed.includes(activeGoal.id)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return {
    goal: activeGoal,
    quote: relatedNote?.recommendations ?? "No progress note shared yet.",
  };
}

// ---------------------------------------------------------------------------
// Verification (admin)
// ---------------------------------------------------------------------------

export async function getVerificationRequests(
  status?: VerificationRequest["status"]
): Promise<VerificationRequestWithTherapist[]> {
  return verificationRequests
    .filter((vr) => !status || vr.status === status)
    .map((vr) => {
      const therapist = byId(therapistProfiles, vr.therapistId);
      if (!therapist) return undefined;
      return {
        ...vr,
        therapist: toTherapistWithSpecialties(therapist),
        credentials: credentials.filter((c) => c.therapistId === vr.therapistId),
      };
    })
    .filter((vr): vr is VerificationRequestWithTherapist => Boolean(vr))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

export async function getVerificationRequestById(
  id: string
): Promise<VerificationRequestWithTherapist | undefined> {
  const all = await getVerificationRequests();
  return all.find((vr) => vr.id === id);
}

export async function getCredentialsForTherapist(therapistId: string): Promise<Credential[]> {
  return credentials.filter((c) => c.therapistId === therapistId);
}

// ---------------------------------------------------------------------------
// Payments / subscriptions / notifications
// ---------------------------------------------------------------------------

export async function getPaymentsForUser(
  userId: string,
  type?: Payment["type"]
): Promise<Payment[]> {
  return payments
    .filter((p) => (p.payerId === userId || p.payeeId === userId) && (!type || p.type === type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSubscriptionForParent(parentId: string) {
  return subscriptions.find((s) => s.parentId === parentId);
}

export async function getNotificationsForUser(
  userId: string,
  { unreadOnly = false }: { unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  return notifications
    .filter((n) => n.userId === userId && (!unreadOnly || !n.read))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
