import { createClient as createAnonClient } from "@supabase/supabase-js";
import { describe, it, expect, afterEach } from "vitest";

import { createTestTherapist, signOut, cleanupAll, testAdminClient } from "./helpers";
import { getMySupervisedTherapists } from "@/lib/supervisor/queries";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// RLS-01 regression (pre-launch audit, P1): "supervisor views team
// therapist user profiles" (0027) was row-level only, with no column
// limit, so a supervisor reading a supervised therapist's users row got
// every column -- email, phone, status, role -- not just the name it was
// built to show. Dropped (0098) in favor of the app code looking up the
// name via the admin client, ownership already verified.
describe("RLS-01 regression: a supervisor can't read more than a supervised therapist's name", () => {
  it("a raw query against the therapist's users row returns nothing over RLS", async () => {
    const therapist = await createTestTherapist();
    const supervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
    await admin
      .from("supervisor_assignments")
      .insert({ supervisor_id: supervisor.userId, therapist_id: therapist.therapistProfileId, status: "active" });

    const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: signInError } = await client.auth.signInWithPassword({
      email: supervisor.email,
      password: supervisor.password,
    });
    if (signInError) throw new Error(`sign-in failed: ${signInError.message}`);

    const { data } = await client.from("users").select("id, email, phone, status, role").eq("id", therapist.userId).maybeSingle();
    expect(data).toBeNull();
  });

  it("the supervisor's own team roster still correctly shows the therapist's name", async () => {
    const therapist = await createTestTherapist();
    const supervisor = await createTestTherapist();
    await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
    await admin
      .from("supervisor_assignments")
      .insert({ supervisor_id: supervisor.userId, therapist_id: therapist.therapistProfileId, status: "active" });

    const roster = await getMySupervisedTherapists(supervisor.userId);
    expect(roster).toHaveLength(1);
    expect(roster[0].id).toBe(therapist.therapistProfileId);
    expect(roster[0].name).toBe("Test Therapist");
  });
});
