import { createClient as createAnonClient } from "@supabase/supabase-js";
import { describe, it, expect, afterEach } from "vitest";

import { createTestParent, createTestChild, createTestTherapist, signOut, cleanupAll, testAdminClient, trackForCleanup } from "./helpers";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

async function createActiveAssignment(therapistProfileId: string, childId: string) {
  const { data, error } = await admin
    .from("therapist_child_assignments")
    .insert({ therapist_id: therapistProfileId, child_id: childId, status: "active" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`assignment fixture failed: ${error?.message}`);
  trackForCleanup("therapist_child_assignments", data.id);
}

async function signInClient(person: { email: string; password: string }) {
  const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email: person.email, password: person.password });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return client;
}

// RLS-03 regression (pre-launch audit, P2): child_diagnoses never got the
// owner-scoped write split every sibling clinical table has (goals,
// target_behaviours, skills, ...) -- any therapist sharing a case could
// edit or delete a diagnosis entered by a different clinician for that
// child, with zero attribution trail.
describe("RLS-03 regression: a therapist can't edit or delete another's diagnosis entry", () => {
  it("therapist B (also actively assigned) cannot update or delete a diagnosis therapist A created", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();
    await createActiveAssignment(therapistA.therapistProfileId, child.id);
    await createActiveAssignment(therapistB.therapistProfileId, child.id);

    const { data: diagnosis, error } = await admin
      .from("child_diagnoses")
      .insert({ child_id: child.id, label: "Autism Spectrum Disorder", created_by: therapistA.therapistProfileId })
      .select("id")
      .single();
    if (error || !diagnosis) throw new Error(`diagnosis fixture failed: ${error?.message}`);
    trackForCleanup("child_diagnoses", diagnosis.id);

    const clientB = await signInClient(therapistB);
    await clientB.from("child_diagnoses").update({ label: "Tampered label" }).eq("id", diagnosis.id);
    await clientB.from("child_diagnoses").delete().eq("id", diagnosis.id);

    // Neither RLS-blocked write is itself an "error" in Supabase's client
    // (0 rows matched under the policy, not a rejected statement) --
    // verify by content: the row must still exist, unchanged.
    const { data: stillThere } = await admin.from("child_diagnoses").select("label").eq("id", diagnosis.id).single();
    expect(stillThere?.label).toBe("Autism Spectrum Disorder");
  });

  it("therapist B can still read the diagnosis, and therapist A can still edit their own", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);
    const therapistA = await createTestTherapist();
    const therapistB = await createTestTherapist();
    await createActiveAssignment(therapistA.therapistProfileId, child.id);
    await createActiveAssignment(therapistB.therapistProfileId, child.id);

    const { data: diagnosis, error } = await admin
      .from("child_diagnoses")
      .insert({ child_id: child.id, label: "ADHD", created_by: therapistA.therapistProfileId })
      .select("id")
      .single();
    if (error || !diagnosis) throw new Error(`diagnosis fixture failed: ${error?.message}`);
    trackForCleanup("child_diagnoses", diagnosis.id);

    const clientB = await signInClient(therapistB);
    const { data: readByB } = await clientB.from("child_diagnoses").select("label").eq("id", diagnosis.id).maybeSingle();
    expect(readByB?.label).toBe("ADHD");

    const clientA = await signInClient(therapistA);
    const { data: updated, error: updateError } = await clientA
      .from("child_diagnoses")
      .update({ label: "ADHD, combined presentation" })
      .eq("id", diagnosis.id)
      .select("id")
      .maybeSingle();
    expect(updateError).toBeNull();
    expect(updated).toBeTruthy();
  });
});
