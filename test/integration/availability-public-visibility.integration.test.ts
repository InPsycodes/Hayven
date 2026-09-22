import { createClient as createAnonClient } from "@supabase/supabase-js";
import { describe, it, expect, afterEach } from "vitest";

import { createTestTherapist, createTestSlot, signOut, cleanupAll, testAdminClient } from "./helpers";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

function anonClient() {
  return createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

// RLS-05 regression (pre-launch audit, P3): "anyone can view availability"
// was unconditional -- unlike therapist_public_profiles (the curated
// discovery view), the raw availability_slots table never filtered on the
// owning therapist's verification/bank/active status.
describe("RLS-05 regression: availability_slots is only publicly visible for a publicly-bookable therapist", () => {
  it("hides an unverified therapist's slots from an anonymous query", async () => {
    const therapist = await createTestTherapist();
    await admin.from("therapist_profiles").update({ verification_status: "pending" }).eq("id", therapist.therapistProfileId);
    const slot = await createTestSlot(therapist.therapistProfileId);

    const { data } = await anonClient().from("availability_slots").select("id").eq("id", slot.id).maybeSingle();
    expect(data).toBeNull();
  });

  it("hides a suspended therapist's slots from an anonymous query", async () => {
    const therapist = await createTestTherapist();
    await admin.from("users").update({ status: "suspended" }).eq("id", therapist.userId);
    const slot = await createTestSlot(therapist.therapistProfileId);

    const { data } = await anonClient().from("availability_slots").select("id").eq("id", slot.id).maybeSingle();
    expect(data).toBeNull();
  });

  it("still shows a verified, banked, active therapist's slots publicly", async () => {
    const therapist = await createTestTherapist();
    const slot = await createTestSlot(therapist.therapistProfileId);

    const { data } = await anonClient().from("availability_slots").select("id").eq("id", slot.id).maybeSingle();
    expect(data?.id).toBe(slot.id);
  });
});
