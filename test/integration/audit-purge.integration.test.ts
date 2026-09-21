import { describe, it, expect, afterEach } from "vitest";

import { createTestParent, cleanupAll, testAdminClient, trackForCleanup } from "./helpers";
import { purgeExpiredAuditLogs } from "@/lib/audit/cron";

const admin = testAdminClient;

afterEach(async () => {
  await cleanupAll();
});

async function insertAuditRow(actorId: string, createdAt: string): Promise<string> {
  const { data, error } = await admin
    .from("audit_log")
    .insert({ actor_id: actorId, actor_role: "parent", action: "test.action", entity_type: "test", created_at: createdAt })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insertAuditRow failed: ${error?.message}`);
  return data.id;
}

// E3 follow-up regression: Privacy Policy Section 6 (/privacy) promises
// "security and audit logs are kept for 24 months, then deleted."
describe("E3 follow-up regression: audit log purge", () => {
  it("deletes rows older than 24 months but keeps recent ones", async () => {
    const parent = await createTestParent();

    const oldId = await insertAuditRow(parent.userId, new Date(Date.now() - 731 * 24 * 60 * 60 * 1000).toISOString());
    const recentId = await insertAuditRow(parent.userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    // Cleanup safety net in case the purge assertion below fails partway --
    // harmless double-delete either way (afterEach ignores a missing row).
    trackForCleanup("audit_log", oldId);
    trackForCleanup("audit_log", recentId);

    const result = await purgeExpiredAuditLogs();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const { data: old } = await admin.from("audit_log").select("id").eq("id", oldId).maybeSingle();
    expect(old).toBeNull();

    const { data: recent } = await admin.from("audit_log").select("id").eq("id", recentId).maybeSingle();
    expect(recent).toBeTruthy();
  });
});
