import type { Message } from "../types";
import { fxTs } from "./_clock";

export const messages: Message[] = [
  {
    id: "msg_1",
    bookingId: "booking_zara_upcoming",
    senderId: "user_parent_amaka",
    content: "Hi Dr. Amara, quick question: should we keep practicing the flashcards at home before Tuesday's session?",
    sentAt: fxTs(-3, 18, 12),
    flagged: false,
  },
  {
    id: "msg_2",
    bookingId: "booking_zara_upcoming",
    senderId: "user_therapist_amara",
    content: "Yes, 10 minutes a day is perfect. Focus on the ones with action words. Zara responded really well to those last time.",
    sentAt: fxTs(-3, 19, 3),
    flagged: false,
  },
  {
    id: "msg_3",
    bookingId: "booking_zara_upcoming",
    senderId: "user_parent_amaka",
    content: "Will do! She's already asking to \"play the word game\" again, which feels like a good sign.",
    sentAt: fxTs(-3, 19, 7),
    flagged: false,
  },
  {
    id: "msg_4",
    bookingId: "booking_zara_upcoming",
    senderId: "user_therapist_amara",
    content: "That's a great sign. Engagement makes a real difference. See you both Tuesday at 10am.",
    sentAt: fxTs(-3, 19, 10),
    flagged: false,
  },
  {
    id: "msg_5",
    bookingId: "booking_dayo_upcoming",
    senderId: "user_therapist_chinedu",
    content: "Hi Amaka, sharing the worksheet we discussed for Dayo ahead of Thursday.",
    sentAt: fxTs(-1, 10, 0),
    flagged: false,
    attachment: { fileName: "focus-worksheet.pdf", fileUrl: "/mock-storage/messages/focus-worksheet.pdf" },
  },
  {
    id: "msg_6",
    bookingId: "booking_dayo_upcoming",
    senderId: "user_parent_amaka",
    content: "Thank you, we'll go through it this weekend.",
    sentAt: fxTs(-1, 10, 20),
    flagged: false,
  },
];
