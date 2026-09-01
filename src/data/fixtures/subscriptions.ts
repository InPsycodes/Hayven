import type { Subscription } from "../types";
import { fxTs } from "./_clock";

export const subscriptions: Subscription[] = [
  {
    id: "sub_amaka",
    parentId: "user_parent_amaka",
    plan: "monthly",
    status: "active",
    renewsAt: fxTs(21, 0, 0),
  },
];
