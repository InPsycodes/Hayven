"use server";

import { revalidatePath } from "next/cache";

import { verificationRequests } from "./fixtures/verification-requests";
import { therapistProfiles } from "./fixtures/therapist-profiles";
import { messages } from "./fixtures/messages";
import { sessionNotes } from "./fixtures/session-notes";
import type { VerificationRequestStatus } from "./types";

/**
 * Mutates the in-memory fixture arrays directly -- there is no database in
 * this scaffold. This is enough to make the admin approve/reject flow feel
 * real for a demo (state persists for the life of the dev server process),
 * but it is not durable and resets on server restart.
 */
export async function reviewVerificationRequest(
  requestId: string,
  status: Extract<VerificationRequestStatus, "approved" | "rejected" | "needs_more_info">,
  reviewerNotes?: string
) {
  const request = verificationRequests.find((vr) => vr.id === requestId);
  if (!request) return;

  request.status = status;
  request.adminId = "user_admin_ngozi";
  request.reviewedAt = new Date().toISOString();
  if (reviewerNotes) request.reviewerNotes = reviewerNotes;

  if (status === "approved") {
    const profile = therapistProfiles.find((t) => t.id === request.therapistId);
    if (profile) {
      profile.verificationStatus = "verified";
      profile.verifiedBadgeLabel = `Verified ${profile.professionalBody
        .split(" ")
        .map((w) => w[0])
        .join("")} Member in Good Standing`;
      profile.updatedAt = new Date().toISOString();
    }
  } else if (status === "rejected") {
    const profile = therapistProfiles.find((t) => t.id === request.therapistId);
    if (profile) profile.verificationStatus = "rejected";
  }

  revalidatePath("/admin/verification");
}

export async function sendMessage(bookingId: string, senderId: string, content: string) {
  if (!content.trim()) return;

  messages.push({
    id: `msg_${Date.now()}`,
    bookingId,
    senderId,
    content: content.trim(),
    sentAt: new Date().toISOString(),
    flagged: false,
  });

  revalidatePath(`/parent/messages/${bookingId}`);
  revalidatePath(`/therapist/messages/${bookingId}`);
}

export async function submitSessionNote(params: {
  bookingId: string;
  therapistId: string;
  summary: string;
  goalsAddressed: string[];
  recommendations: string;
}) {
  sessionNotes.push({
    id: `note_${Date.now()}`,
    bookingId: params.bookingId,
    therapistId: params.therapistId,
    summary: params.summary,
    goalsAddressed: params.goalsAddressed,
    recommendations: params.recommendations,
    visibleToParent: true,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/therapist");
  revalidatePath(`/therapist/sessions/${params.bookingId}/report`);
}
