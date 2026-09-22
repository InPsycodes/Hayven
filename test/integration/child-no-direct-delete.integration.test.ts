import { describe, it, expect, afterEach } from "vitest";

import { createTestParent, createTestChild, signInAs, signOut, cleanupAll, testAdminClient } from "./helpers";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

// RLS-07 regression (pre-launch audit, P3): account_deletion_requests and
// the 6-year retention purge both document deletion as a deliberate,
// admin/cron-controlled process -- but a parent could previously DELETE
// their own child row directly via RLS, bypassing that path entirely (for
// a booking-less child, where no FK violation stops it).
describe("RLS-07 regression: a parent can't directly delete their own child row", () => {
  it("a direct delete against a booking-less child is rejected", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);

    const client = await signInAs(parent);
    const { error } = await client.from("children").delete().eq("id", child.id);
    expect(error).toBeTruthy();

    const { data: stillThere } = await admin.from("children").select("id").eq("id", child.id).maybeSingle();
    expect(stillThere?.id).toBe(child.id);
  });

  it("the parent can still read and update their own child normally", async () => {
    const parent = await createTestParent();
    const child = await createTestChild(parent.userId);

    const client = await signInAs(parent);
    const { data: read } = await client.from("children").select("id, first_name").eq("id", child.id).maybeSingle();
    expect(read?.id).toBe(child.id);

    const { error: updateError } = await client.from("children").update({ first_name: "Updated Name" }).eq("id", child.id);
    expect(updateError).toBeNull();

    const { data: updated } = await admin.from("children").select("first_name").eq("id", child.id).single();
    expect(updated?.first_name).toBe("Updated Name");
  });
});
