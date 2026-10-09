
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUser } from "./mocks";

const admin = createAdminClient();
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TEST_PASSWORD = "IntegrationTest!2026";

// Every row this suite creates is tracked here, in creation order, so
// afterEach/afterAll cleanup can delete in reverse -- no table in this
// schema cascades from users/children/therapist_profiles down to
// bookings/payments/earnings/payouts (checked: those FKs are plain
// `references`, no `on delete cascade`), so deletion order matters and
// "delete everything of table X" is not safe once two tests' fixtures
// coexist.
type CleanupEntry = { table: string; column: string; value: string };
const cleanupStack: CleanupEntry[] = [];
const authUserIds: string[] = [];

function track(table: string, value: string, column = "id") {
  cleanupStack.push({ table, column, value });
  return value;
}

export async function cleanupAll(): Promise<void> {
  // audit_log.actor_id has no cascade (by design -- an audit trail
  // shouldn't quietly vanish when the account does) and public.users itself
  // is in cleanupStack below, so this has to run first or the users-row
  // delete hits the same FK this is meant to clear.
  if (authUserIds.length > 0) {
    await admin.from("audit_log").delete().in("actor_id", authUserIds);
  }
  for (let i = cleanupStack.length - 1; i >= 0; i--) {
    const { table, column, value } = cleanupStack[i];
    const { error } = await admin.from(table).delete().eq(column, value);
    if (error) console.error(`cleanup: failed to delete ${table}.${column}=${value}: ${error.message}`);
  }
  cleanupStack.length = 0;
  const ids = authUserIds.splice(0, authUserIds.length);
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id).catch((e) => console.error(`cleanup: failed to delete auth user ${id}:`, e));
  }
  currentUser.client = null;
}

function uniqueEmail(label: string): string {
  return `integration-test+${RUN_ID}-${label}-${Math.random().toString(36).slice(2, 8)}@hayven.test`;
}

interface TestPerson {
  authUserId: string;
  email: string;
  password: string;
}

async function createAuthUser(label: string, metadata: Record<string, string>): Promise<TestPerson> {
  const email = uniqueEmail(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !data.user) throw new Error(`createAuthUser(${label}) failed: ${error?.message}`);
  authUserIds.push(data.user.id);
  // handle_new_user (0029) creates the public.users row synchronously, as
  // part of the same auth.users insert transaction -- no wait needed.
  return { authUserId: data.user.id, email, password: TEST_PASSWORD };
}

export interface TestParent extends TestPerson {
  userId: string;
}

/** A signed-up parent -- handle_new_user already gave them a public.users row with role 'parent'. */
export async function createTestParent(): Promise<TestParent> {
  const person = await createAuthUser("parent", { role: "parent", full_name: "Test Parent" });
  track("users", person.authUserId);
  return { ...person, userId: person.authUserId };
}

export interface TestChild {
  id: string;
  parentId: string;
}

export async function createTestChild(parentId: string): Promise<TestChild> {
  const { data, error } = await admin
    .from("children")
    .insert({ parent_id: parentId, first_name: "Test Child", date_of_birth: "2020-01-01" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createTestChild failed: ${error?.message}`);
  track("children", data.id);
  return { id: data.id, parentId };
}

export interface TestTherapist extends TestPerson {
  userId: string;
  therapistProfileId: string;
}

/**
 * A fully bookable, payable therapist: verified, bank details set (so
 * runPayouts doesn't skip them), a session price set, current insurance.
 */
export async function createTestTherapist(opts: { priceNaira?: number } = {}): Promise<TestTherapist> {
  const person = await createAuthUser("therapist", { role: "therapist", full_name: "Test Therapist" });
  track("users", person.authUserId);

  // therapist_profiles has no auto-create trigger (unlike public.users) --
  // the real app creates it via an upsert on the signup/profile step
  // (src/lib/therapist/actions.ts), which this mirrors.
  const { data, error } = await admin
    .from("therapist_profiles")
    .upsert(
      {
        user_id: person.authUserId,
        verification_status: "verified",
        price_per_session: opts.priceNaira ?? 15000,
        session_types: ["virtual"],
        bank_code: "058",
        bank_account_number: "0000000000",
        bank_account_name: "Test Therapist",
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`createTestTherapist setup failed: ${error?.message}`);

  // Current indemnity insurance is a booking gate (0106). Cascades away
  // with the profile (credentials.therapist_id is on delete cascade).
  const { error: insuranceError } = await admin.from("credentials").insert({
    therapist_id: data.id,
    document_type: "insurance",
    file_url: `${person.authUserId}/test-insurance.pdf`,
    issuing_body: "Test Insurer",
    expires_on: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
  });
  if (insuranceError) throw new Error(`createTestTherapist insurance setup failed: ${insuranceError.message}`);

  // Already tracked for deletion via the users row cascade being *forward*
  // (therapist_profiles.user_id -> users, on delete cascade per 0001) -- but
  // that cascade only fires if nothing NEWER references this profile
  // (availability_slots/bookings do, and those aren't cascaded). So this
  // profile is deleted by the users-row cascade, but only after this
  // suite's own explicit tracking has already removed every
  // slot/booking/earning/payout that points at it.
  return { ...person, userId: person.authUserId, therapistProfileId: data.id };
}

export async function createTestSlot(
  therapistId: string,
  opts: { hoursFromNow?: number; sessionType?: "virtual" | "in_person" } = {}
): Promise<{ id: string; startTime: string }> {
  const hours = opts.hoursFromNow ?? 4; // clear of the 2h MIN_BOOKING_NOTICE_MS
  const start = new Date(Date.now() + hours * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const { data, error } = await admin
    .from("availability_slots")
    .insert({
      therapist_id: therapistId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      session_type: opts.sessionType ?? "virtual",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createTestSlot failed: ${error?.message}`);
  track("availability_slots", data.id);
  return { id: data.id, startTime: start.toISOString() };
}

export async function makeAdmin(userId: string): Promise<void> {
  const { error } = await admin.from("users").update({ role: "admin" }).eq("id", userId);
  if (error) throw new Error(`makeAdmin failed: ${error.message}`);
}

/**
 * Signs in as a real user against the throwaway project (a genuine
 * password-grant auth flow, real access token) and points the mocked
 * @/lib/supabase/server createClient() at that authenticated client --
 * every getSession() call and every RLS policy downstream of it now runs
 * for real, exactly as it would for that user in production.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the cast note inside; a cross-module generic-inference quirk, not a real type gap.
export async function signInAs(person: TestPerson): Promise<any> {
  const client = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email: person.email, password: person.password });
  if (error) throw new Error(`signInAs(${person.email}) failed: ${error.message}`);
  // Cast: currentUser.client's SupabaseClient generic (declared in
  // mocks.ts) and this file's locally-inferred one resolve to structurally
  // different generic instantiations of the exact same @supabase/supabase-js
  // version/types -- a TS inference quirk across module boundaries, not a
  // real type mismatch (both are the same createClient() call's result).
  currentUser.client = client as unknown as typeof currentUser.client;
  return client;
}

export function signOut(): void {
  currentUser.client = null;
}

export { admin as testAdminClient };

/** Directly track a row this test created outside the helpers above (e.g. a booking id returned by createPendingBooking), so cleanup still reaches it. */
export function trackForCleanup(table: string, id: string, column = "id"): void {
  track(table, id, column);
}
