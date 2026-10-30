import { createClient as createAnonClient } from "@supabase/supabase-js";
import { describe, it, expect, afterAll, beforeAll } from "vitest";

import {
  createTestParent,
  createTestChild,
  createTestTherapist,
  createTestSlot,
  signInAs,
  signOut,
  cleanupAll,
  testAdminClient,
  trackForCleanup,
  type TestParent,
  type TestTherapist,
  type TestChild,
} from "./helpers";

// Audit 2026-10-29, phase 5: the cross-family and unassigned-therapist
// negative tests the existing suite didn't cover directly. One family's full
// record set is built with the service-role client; then parent B, an
// unassigned therapist B and an anonymous visitor each try to read or change
// it through their own RLS-bound clients. Parent A and therapist A are the
// controls, so a pass can't come from nobody being able to see anything.

const admin = testAdminClient;
const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

interface World {
  parentA: TestParent;
  childA: TestChild;
  therapistA: TestTherapist;
  parentB: TestParent;
  childB: TestChild;
  therapistB: TestTherapist;
  bookingId: string;
  sessionId: string;
  reportId: string;
  credentialPath: string;
}

let w: World;

beforeAll(async () => {
  const parentA = await createTestParent();
  const childA = await createTestChild(parentA.userId);
  const therapistA = await createTestTherapist();
  const parentB = await createTestParent();
  const childB = await createTestChild(parentB.userId);
  const therapistB = await createTestTherapist();

  const { data: assignment } = await admin
    .from("therapist_child_assignments")
    .insert({ child_id: childA.id, therapist_id: therapistA.therapistProfileId, status: "active" })
    .select("id")
    .single();
  trackForCleanup("therapist_child_assignments", assignment!.id);

  const slot = await createTestSlot(therapistA.therapistProfileId, { hoursFromNow: 48 });
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      parent_id: parentA.userId,
      child_id: childA.id,
      therapist_id: therapistA.therapistProfileId,
      availability_slot_id: slot.id,
      session_type: "virtual",
      status: "confirmed",
    })
    .select("id")
    .single();
  if (bookingError) throw new Error(`booking fixture: ${bookingError.message}`);
  trackForCleanup("bookings", booking!.id);

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      booking_id: booking!.id,
      payer_id: parentA.userId,
      payee_id: therapistA.userId,
      amount: 15000,
      type: "session_commission",
      gateway_reference: `iso-${booking!.id}`,
      status: "successful",
    })
    .select("id")
    .single();
  if (paymentError) throw new Error(`payment fixture: ${paymentError.message}`);
  trackForCleanup("payments", payment!.id);

  const { data: message, error: messageError } = await admin
    .from("messages")
    .insert({ booking_id: booking!.id, sender_id: parentA.userId, content: "Synthetic message for isolation test" })
    .select("id")
    .single();
  if (messageError) throw new Error(`message fixture: ${messageError.message}`);
  trackForCleanup("messages", message!.id);

  const { data: notification, error: notificationError } = await admin
    .from("notifications")
    .insert({ user_id: parentA.userId, type: "booking_confirmed", title: "Synthetic", body: "Synthetic notification" })
    .select("id")
    .single();
  if (notificationError) throw new Error(`notification fixture: ${notificationError.message}`);
  trackForCleanup("notifications", notification!.id);

  const { data: intake, error: intakeError } = await admin
    .from("intake_forms")
    .insert({ child_id: childA.id })
    .select("id")
    .single();
  if (intakeError) throw new Error(`intake fixture: ${intakeError.message}`);
  trackForCleanup("intake_forms", intake!.id);

  const { data: diagnosis, error: diagnosisError } = await admin
    .from("child_diagnoses")
    .insert({ child_id: childA.id, label: "Synthetic diagnosis", created_by: therapistA.therapistProfileId })
    .select("id")
    .single();
  if (diagnosisError) throw new Error(`diagnosis fixture: ${diagnosisError.message}`);
  trackForCleanup("child_diagnoses", diagnosis!.id);

  const { data: session } = await admin
    .from("therapy_sessions")
    .insert({
      child_id: childA.id,
      therapist_id: therapistA.therapistProfileId,
      status: "complete",
      session_date: "2026-10-01",
      duration_minutes: 45,
    })
    .select("id")
    .single();
  trackForCleanup("therapy_sessions", session!.id);

  const body = { schemaVersion: 1, sections: [] };
  const { data: report } = await admin
    .from("reports")
    .insert({
      session_id: session!.id,
      status: "published",
      published_at: new Date().toISOString(),
      therapist_body: body,
      parent_body: body,
    })
    .select("id")
    .single();
  trackForCleanup("reports", report!.id);

  const credentialPath = `${therapistA.userId}/isolation-test-credential.pdf`;
  const { error: uploadError } = await admin.storage
    .from("credentials")
    .upload(credentialPath, new Blob(["%PDF-1.4 synthetic"], { type: "application/pdf" }), { upsert: true });
  if (uploadError) throw new Error(`credential upload fixture: ${uploadError.message}`);

  w = {
    parentA,
    childA,
    therapistA,
    parentB,
    childB,
    therapistB,
    bookingId: booking!.id,
    sessionId: session!.id,
    reportId: report!.id,
    credentialPath,
  };
}, 120_000);

afterAll(async () => {
  signOut();
  if (w) await admin.storage.from("credentials").remove([w.credentialPath]);
  await cleanupAll();
}, 120_000);

// The rows parent A owns, as [table, column, value-getter] -- what every outsider is checked against.
const familyRecords: [string, string, () => string][] = [
  ["children", "id", () => w.childA.id],
  ["intake_forms", "child_id", () => w.childA.id],
  ["bookings", "id", () => w.bookingId],
  ["payments", "booking_id", () => w.bookingId],
  ["messages", "booking_id", () => w.bookingId],
  ["notifications", "user_id", () => w.parentA.userId],
  ["child_diagnoses", "child_id", () => w.childA.id],
  ["therapy_sessions", "child_id", () => w.childA.id],
  ["reports", "id", () => w.reportId],
];

async function visibleRows(client: ReturnType<typeof createAnonClient>, table: string, column: string, value: string) {
  // Only the key column: several tables hide columns from some roles on
  // purpose (e.g. reports.therapist_body is never readable by parents,
  // 0017), so select("*") would be refused outright even for the owner.
  // A permission error is as good as zero rows for an outsider.
  const { data, error } = await client.from(table).select(column).eq(column, value);
  return { rows: data?.length ?? 0, error: error?.message ?? null };
}

describe("controls: the family and its assigned therapist can see their own records", () => {
  it("parent A sees their child, intake, booking, payment, message, notification and published report", async () => {
    const client = await signInAs(w.parentA);
    for (const [table, column, value] of familyRecords) {
      if (table === "child_diagnoses" || table === "therapy_sessions") continue; // clinical, therapist-side
      const { rows, error } = await visibleRows(client, table, column, value());
      expect(rows, `parent A should see ${table} (${error ?? "no error"})`).toBeGreaterThan(0);
    }
  });

  it("assigned therapist A sees the child, intake, diagnosis, session and report", async () => {
    const client = await signInAs(w.therapistA);
    for (const table of ["children", "intake_forms", "child_diagnoses", "therapy_sessions", "reports"]) {
      const [, column, value] = familyRecords.find(([t]) => t === table)!;
      const { rows, error } = await visibleRows(client, table, column, value());
      expect(rows, `therapist A should see ${table} (${error ?? "no error"})`).toBeGreaterThan(0);
    }
  });
});

describe("parent B cannot reach parent A's family", () => {
  it("reads nothing of parent A's records, table by table", async () => {
    const client = await signInAs(w.parentB);
    for (const [table, column, value] of familyRecords) {
      const { rows } = await visibleRows(client, table, column, value());
      expect(rows, `parent B must not see parent A's ${table}`).toBe(0);
    }
  });

  it("cannot rename parent A's child or take ownership of it", async () => {
    const client = await signInAs(w.parentB);
    await client.from("children").update({ first_name: "Hijacked" }).eq("id", w.childA.id);
    await client.from("children").update({ parent_id: w.parentB.userId }).eq("id", w.childA.id);
    const { data } = await admin.from("children").select("first_name, parent_id").eq("id", w.childA.id).single();
    expect(data?.first_name).toBe("Test Child");
    expect(data?.parent_id).toBe(w.parentA.userId);
  });

  it("cannot hand their own child over to parent A", async () => {
    const client = await signInAs(w.parentB);
    await client.from("children").update({ parent_id: w.parentA.userId }).eq("id", w.childB.id);
    const { data } = await admin.from("children").select("parent_id").eq("id", w.childB.id).single();
    expect(data?.parent_id).toBe(w.parentB.userId);
  });

  it("cannot create a booking or message against parent A's child or booking", async () => {
    const client = await signInAs(w.parentB);
    const slot = await createTestSlot(w.therapistA.therapistProfileId, { hoursFromNow: 72 });
    const { data: forgedBooking } = await client
      .from("bookings")
      .insert({
        parent_id: w.parentA.userId,
        child_id: w.childA.id,
        therapist_id: w.therapistA.therapistProfileId,
        availability_slot_id: slot.id,
        session_type: "virtual",
      })
      .select("id");
    expect(forgedBooking?.length ?? 0).toBe(0);

    const { data: forgedMessage } = await client
      .from("messages")
      .insert({ booking_id: w.bookingId, sender_id: w.parentB.userId, content: "intrusion" })
      .select("id");
    expect(forgedMessage?.length ?? 0).toBe(0);
    const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("booking_id", w.bookingId);
    expect(count).toBe(1);
  });
});

describe("an unassigned therapist cannot reach the child's clinical record", () => {
  it("therapist B reads nothing of child A's records", async () => {
    const client = await signInAs(w.therapistB);
    for (const [table, column, value] of familyRecords) {
      const { rows } = await visibleRows(client, table, column, value());
      expect(rows, `unassigned therapist must not see ${table}`).toBe(0);
    }
  });

  it("therapist B cannot add a diagnosis or session for child A", async () => {
    const client = await signInAs(w.therapistB);
    const { data: dx } = await client
      .from("child_diagnoses")
      .insert({ child_id: w.childA.id, label: "intrusion", created_by: w.therapistB.therapistProfileId })
      .select("id");
    expect(dx?.length ?? 0).toBe(0);
    const { data: ts } = await client
      .from("therapy_sessions")
      .insert({ child_id: w.childA.id, therapist_id: w.therapistB.therapistProfileId, status: "complete", session_date: "2026-10-02" })
      .select("id");
    expect(ts?.length ?? 0).toBe(0);
  });
});

describe("credential documents stay private", () => {
  it("therapist A can read their own credential file (control)", async () => {
    const client = await signInAs(w.therapistA);
    const { data, error } = await client.storage.from("credentials").download(w.credentialPath);
    expect(error, error?.message).toBeNull();
    expect(data).toBeTruthy();
  });

  it("therapist B, parent B and an anonymous visitor cannot download or list it", async () => {
    for (const person of [w.therapistB, w.parentB]) {
      const client = await signInAs(person);
      const { data } = await client.storage.from("credentials").download(w.credentialPath);
      expect(data, "outsider must not download another therapist's credential").toBeNull();
      const { data: listed } = await client.storage.from("credentials").list(w.therapistA.userId);
      expect(listed?.length ?? 0).toBe(0);
    }
    const { data: anonData } = await anon.storage.from("credentials").download(w.credentialPath);
    expect(anonData).toBeNull();
  });

  it("therapist B cannot read therapist A's credential rows", async () => {
    const client = await signInAs(w.therapistB);
    const { data } = await client.from("credentials").select("id").eq("therapist_id", w.therapistA.therapistProfileId);
    expect(data?.length ?? 0).toBe(0);
  });
});

describe("anonymous visitors see none of it", () => {
  it("the anonymous client reads zero rows from every family table", async () => {
    for (const [table, column, value] of familyRecords) {
      const { rows } = await visibleRows(anon, table, column, value());
      expect(rows, `anonymous must not see ${table}`).toBe(0);
    }
  });
});
