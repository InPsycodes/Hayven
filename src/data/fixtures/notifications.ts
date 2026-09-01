import type { Notification } from "../types";
import { fxTs } from "./_clock";

export const notifications: Notification[] = [
  {
    id: "notif_1",
    userId: "user_parent_amaka",
    type: "booking_confirmed",
    title: "Booking confirmed",
    body: "Your session with Dr. Amara Chukwu is confirmed. Check your sessions for the time.",
    read: false,
    createdAt: fxTs(-2, 8, 6),
  },
  {
    id: "notif_2",
    userId: "user_parent_amaka",
    type: "note_added",
    title: "New session note for Zara",
    body: "Dr. Amara Chukwu shared a progress update after Zara's last session.",
    read: false,
    createdAt: fxTs(-7, 11, 16),
  },
  {
    id: "notif_3",
    userId: "user_parent_amaka",
    type: "new_message",
    title: "New message from Dr. Amara Chukwu",
    body: "Yes, 10 minutes a day is perfect...",
    read: true,
    createdAt: fxTs(-3, 19, 3),
  },
  {
    id: "notif_4",
    userId: "user_therapist_amara",
    type: "new_message",
    title: "New message from Amaka Obi",
    body: "Will do! She's already asking to \"play the word game\" again...",
    read: false,
    createdAt: fxTs(-3, 19, 7),
  },
  {
    id: "notif_5",
    userId: "user_therapist_amara",
    type: "payment_receipt",
    title: "Payment received",
    body: "You received ₦15,000 for your session with Zara O.",
    read: true,
    createdAt: fxTs(-9, 8, 5),
  },
  {
    id: "notif_6",
    userId: "user_admin_ngozi",
    type: "verification_update",
    title: "New verification request",
    body: "Grace Nwosu submitted credentials for review.",
    read: false,
    createdAt: fxTs(-12, 10, 15),
  },
];
