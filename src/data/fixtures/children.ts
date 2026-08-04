import type { Child } from "../types";

/** Amaka (the demo parent) has two children, to exercise multi-child UI. */
export const children: Child[] = [
  {
    id: "child_zara",
    parentId: "user_parent_amaka",
    firstName: "Zara",
    dateOfBirth: "2019-05-12",
    presentingConcern: "Speech delay, mostly around forming full sentences.",
    createdAt: "2026-03-02T09:10:00Z",
  },
  {
    id: "child_dayo",
    parentId: "user_parent_amaka",
    firstName: "Dayo",
    dateOfBirth: "2016-11-03",
    presentingConcern: "Difficulty focusing at school, occasional outbursts.",
    createdAt: "2026-04-18T09:10:00Z",
  },
];
