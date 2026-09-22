import { describe, it, expect, afterEach } from "vitest";

import { createTestParent, createTestChild, signInAs, signOut, cleanupAll, testAdminClient, trackForCleanup } from "./helpers";
import { saveIntakeForm, recordIntakeConsent } from "@/lib/intake/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// RLS-06 regression (pre-launch audit, P3): intake_forms.therapist_notified_at
// is meant to be a one-time, system-set flag -- a parent could previously
// reset or pre-set it directly via the table-wide grant, suppressing or
// manipulating the "your assigned therapist was notified" signal.
describe("RLS-06 regression: a parent can't directly set intake_forms.therapist_notified_at", () => {
  it("a direct update touching therapist_notified_at doesn't change it", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);

    const { data: form, error } = await admin
      .from("intake_forms")
      .insert({ child_id: child.id, details: {} })
      .select("child_id")
      .single();
    if (error || !form) throw new Error(`intake_forms fixture failed: ${error?.message}`);
    trackForCleanup("intake_forms", child.id, "child_id");

    const client = await signInAs(parent);
    await client.from("intake_forms").update({ therapist_notified_at: new Date().toISOString() }).eq("child_id", child.id);

    const { data: afterAttempt } = await admin
      .from("intake_forms")
      .select("therapist_notified_at")
      .eq("child_id", child.id)
      .single();
    expect(afterAttempt?.therapist_notified_at).toBeNull();
  });

  it("saveIntakeForm still works normally for the parent's own child", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);

    await signInAs(parent);
    const result = await saveIntakeForm(child.id, { sensoryCalming: "Weighted blanket" });
    expect(result.ok).toBe(true);
    trackForCleanup("intake_forms", child.id, "child_id");

    const { data: form } = await admin.from("intake_forms").select("details").eq("child_id", child.id).single();
    expect((form?.details as { sensoryCalming?: string } | null)?.sensoryCalming).toBe("Weighted blanket");
  });

  it("recordIntakeConsent still works normally (its own, narrower upsert)", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);

    await signInAs(parent);
    const result = await recordIntakeConsent(child.id, "therapist_access", true);
    expect(result.ok).toBe(true);
    trackForCleanup("intake_forms", child.id, "child_id");
    trackForCleanup("intake_consents", child.id, "child_id");

    const { data: consent } = await admin
      .from("intake_consents")
      .select("granted")
      .eq("child_id", child.id)
      .eq("consent_type", "therapist_access")
      .single();
    expect(consent?.granted).toBe(true);
  });
});
