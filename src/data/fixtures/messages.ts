import type { Message } from "../types";

export const messages: Message[] = [
  {
    id: "msg_1",
    bookingId: "booking_zara_upcoming",
    senderId: "user_parent_amaka",
    content: "Hi Dr. Amara, quick question: should we keep practicing the flashcards at home before Tuesday's session?",
    sentAt: "2026-08-01T18:12:00Z",
    flagged: false,
  },
  {
    id: "msg_2",
    bookingId: "booking_zara_upcoming",
    senderId: "user_therapist_amara",
    content: "Yes, 10 minutes a day is perfect. Focus on the ones with action words. Zara responded really well to those last time.",
    sentAt: "2026-08-01T19:03:00Z",
    flagged: false,
  },
  {
    id: "msg_3",
    bookingId: "booking_zara_upcoming",
    senderId: "user_parent_amaka",
    content: "Will do! She's already asking to \"play the word game\" again, which feels like a good sign.",
    sentAt: "2026-08-01T19:07:00Z",
    flagged: false,
  },
  {
    id: "msg_4",
    bookingId: "booking_zara_upcoming",
    senderId: "user_therapist_amara",
    content: "That's a great sign. Engagement makes a real difference. See you both Tuesday at 10am.",
    sentAt: "2026-08-01T19:10:00Z",
    flagged: false,
  },
  {
    id: "msg_5",
    bookingId: "booking_dayo_upcoming",
    senderId: "user_therapist_chinedu",
    content: "Hi Amaka, sharing the worksheet we discussed for Dayo ahead of Thursday.",
    sentAt: "2026-08-02T10:00:00Z",
    flagged: false,
    attachment: { fileName: "focus-worksheet.pdf", fileUrl: "/mock-storage/messages/focus-worksheet.pdf" },
  },
  {
    id: "msg_6",
    bookingId: "booking_dayo_upcoming",
    senderId: "user_parent_amaka",
    content: "Thank you, we'll go through it this weekend.",
    sentAt: "2026-08-02T10:20:00Z",
    flagged: false,
  },
];
