import { createClient as createAnonClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { describe, it, expect, afterEach } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
} from "./helpers";
import { currentUser } from "./mocks";
import { GET } from "@/app/api/reports/[reportId]/pdf/route";
import { publishReport } from "@/lib/reports/actions";

const admin = testAdminClient;

afterEach(async () => {
  signOut();
  await cleanupAll();
});

const body = {
  schemaVersion: 1,
  sections: [{ key: "session_summary", heading: "Session summary", blocks: [{ type: "paragraph", text: "{{CHILD}} did well today." }] }],
};

async function fixture() {
  const parent = await createTestParent();
  const child = await createTestChild(parent.userId);
  const therapist = await createTestTherapist();
  const { data: assignment } = await admin
    .from("therapist_child_assignments")
    .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, status: "active" })
    .select("id")
    .single();
  trackForCleanup("therapist_child_assignments", assignment!.id);
  const { data: session } = await admin
    .from("therapy_sessions")
    .insert({ child_id: child.id, therapist_id: therapist.therapistProfileId, status: "complete", session_date: "2026-09-16", duration_minutes: 45 })
    .select("id")
    .single();
  trackForCleanup("therapy_sessions", session!.id);
  const { data: report } = await admin
    .from("reports")
    .insert({ session_id: session!.id, status: "draft", therapist_body: body, parent_body: body })
    .select("id")
    .single();
  trackForCleanup("reports", report!.id);
  return { parent, child, therapist, reportId: report!.id };
}

const call = (reportId: string, version?: string) =>
  GET(new NextRequest(`http://localhost/api/reports/${reportId}/pdf${version ? `?version=${version}` : ""}`), {
    params: Promise.resolve({ reportId }),
  });

const auditRows = async (reportId: string) =>
  (await admin.from("audit_log").select("action, actor_role, metadata").eq("entity_id", reportId).eq("action", "report.download")).data ?? [];

describe("report PDF download", () => {
  it("is refused when not logged in", async () => {
    const { reportId } = await fixture();
    // A real logged-out visitor: a client with no session at all.
    currentUser.client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as unknown as typeof currentUser.client;
    const res = await call(reportId);
    expect(res.status).toBe(401);
    expect(await auditRows(reportId)).toHaveLength(0);
  });

  it("lets the owning therapist download both versions, and audit-logs each", async () => {
    const { therapist, reportId } = await fixture();
    await signInAs(therapist);

    const clinical = await call(reportId, "clinical");
    expect(clinical.status).toBe(200);
    expect(clinical.headers.get("content-type")).toBe("application/pdf");
    expect(clinical.headers.get("cache-control")).toContain("no-store");
    expect(clinical.headers.get("content-disposition")).toMatch(/attachment; filename="Hayven-Test-Child-2026-09-16-clinical-report\.pdf"/);
    expect(Buffer.from(await clinical.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");

    const parentVersion = await call(reportId, "parent");
    expect(parentVersion.status).toBe(200);
    expect(parentVersion.headers.get("content-disposition")).toContain("progress-report");

    const rows = await auditRows(reportId);
    expect(rows.map((r) => (r.metadata as { version: string }).version).sort()).toEqual(["clinical", "parent"]);
    expect(rows.every((r) => r.actor_role === "therapist")).toBe(true);
  });

  it("does not let a different therapist download someone else's report", async () => {
    const { reportId } = await fixture();
    const other = await createTestTherapist();
    await signInAs(other);
    expect((await call(reportId, "clinical")).status).toBe(404);
    expect((await call(reportId, "parent")).status).toBe(404);
    expect(await auditRows(reportId)).toHaveLength(0);
  });

  it("gives a parent only the parent version, and only once it is published", async () => {
    const { parent, therapist, reportId } = await fixture();

    await signInAs(parent);
    expect((await call(reportId)).status).toBe(404); // still a draft

    signOut();
    await signInAs(therapist);
    const published = await publishReport(reportId);
    expect(published.ok).toBe(true);

    signOut();
    await signInAs(parent);
    const res = await call(reportId);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("progress-report");
    expect((await call(reportId, "clinical")).status).toBe(403);

    const rows = await auditRows(reportId);
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_role).toBe("parent");
  });

  it("does not let another parent download a published report", async () => {
    const { therapist, reportId } = await fixture();
    await signInAs(therapist);
    await publishReport(reportId);
    signOut();

    const stranger = await createTestParent();
    await signInAs(stranger);
    expect((await call(reportId)).status).toBe(404);
    expect(await auditRows(reportId)).toHaveLength(0);
  });

  it("rejects a malformed report id", async () => {
    const res = await call("not-a-uuid");
    expect(res.status).toBe(404);
  });
});
