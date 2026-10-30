import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Synthetic people for the browser journeys, created on the STAGING project
// before the run and deleted after it. Never runs against production.

const STAGING_REF = "sfvwfbgrfmqaaakbepll";
const STATE_FILE = join(__dirname, ".state.json");
export const E2E_PASSWORD = "E2eJourney!2026";

export interface Person {
  userId: string;
  email: string;
}
export interface SeedState {
  runId: string;
  parentA: Person & { childId: string; childName: string };
  parentB: Person & { childId: string };
  therapistA: Person & { profileId: string };
  therapistB: Person & { profileId: string };
  supervisor: Person & { profileId: string };
  admin: Person;
  rows: { table: string; id: string }[];
  storagePaths: string[];
}

function loadEnvTest(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(join(__dirname, "../.env.test"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function adminClient(): SupabaseClient {
  const env = loadEnvTest();
  if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(STAGING_REF)) throw new Error("e2e seed: .env.test is not the staging project");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function readState(): SeedState {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as SeedState;
}

export async function seed(): Promise<SeedState> {
  const admin = adminClient();
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const rows: SeedState["rows"] = [];
  const authIds: string[] = [];

  async function user(label: string, role: "parent" | "therapist", fullName: string): Promise<Person> {
    const email = `e2e+${runId}-${label}@hayven.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { role, full_name: fullName },
    });
    if (error || !data.user) throw new Error(`seed user ${label}: ${error?.message}`);
    authIds.push(data.user.id);
    // A real email signup records terms acceptance (src/lib/auth/actions.ts);
    // without it the (app) layout sends the user to /signup/finish first.
    await admin
      .from("users")
      .update({ phone: "+2348000000000", terms_accepted_at: new Date().toISOString() })
      .eq("id", data.user.id);
    return { userId: data.user.id, email };
  }

  async function insert(table: string, values: Record<string, unknown>): Promise<string> {
    const { data, error } = await admin.from(table).insert(values).select("id").single();
    if (error || !data) throw new Error(`seed ${table}: ${error?.message}`);
    rows.push({ table, id: data.id as string });
    return data.id as string;
  }

  async function therapist(label: string, name: string): Promise<Person & { profileId: string }> {
    const person = await user(label, "therapist", name);
    const { data, error } = await admin
      .from("therapist_profiles")
      .upsert(
        {
          user_id: person.userId,
          verification_status: "verified",
          price_per_session: 15000,
          session_types: ["virtual"],
          bio: `Synthetic E2E therapist ${label}`,
          location: "Lagos",
          years_practicing: 5,
          bank_code: "058",
          bank_account_number: "0000000000",
          bank_account_name: name,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();
    if (error || !data) throw new Error(`seed therapist profile ${label}: ${error?.message}`);
    await insert("credentials", {
      therapist_id: data.id,
      document_type: "insurance",
      file_url: `${person.userId}/e2e-insurance.pdf`,
      issuing_body: "Synthetic Insurer",
      expires_on: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
    });
    return { ...person, profileId: data.id as string };
  }

  const parentAPerson = await user("parent-a", "parent", "E2E Parent A");
  const childA = await insert("children", {
    parent_id: parentAPerson.userId,
    first_name: "Ada",
    date_of_birth: "2021-03-04",
    guardian_consent_at: new Date().toISOString(),
  });
  const parentBPerson = await user("parent-b", "parent", "E2E Parent B");
  const childB = await insert("children", {
    parent_id: parentBPerson.userId,
    first_name: "Bayo",
    date_of_birth: "2020-07-08",
    guardian_consent_at: new Date().toISOString(),
  });

  const therapistA = await therapist("therapist-a", "E2E Therapist A");
  const therapistB = await therapist("therapist-b", "E2E Therapist B");
  const supervisor = await therapist("supervisor", "E2E Supervisor");
  await admin.from("users").update({ is_supervisor: true }).eq("id", supervisor.userId);
  await insert("supervisor_assignments", { supervisor_id: supervisor.userId, therapist_id: therapistA.profileId, status: "active" });

  await insert("therapist_child_assignments", { child_id: childA, therapist_id: therapistA.profileId, status: "active" });
  // Therapist B has a child too, so "a supervisor can't see an unsupervised
  // therapist's children" has something real to not see.
  await insert("therapist_child_assignments", { child_id: childB, therapist_id: therapistB.profileId, status: "active" });

  for (const hours of [50, 74]) {
    const start = new Date(Date.now() + hours * 3_600_000);
    await insert("availability_slots", {
      therapist_id: therapistA.profileId,
      start_time: start.toISOString(),
      end_time: new Date(start.getTime() + 45 * 60_000).toISOString(),
      session_type: "virtual",
    });
  }

  const adminPerson = await user("admin", "parent", "E2E Admin");
  await admin.from("users").update({ role: "admin" }).eq("id", adminPerson.userId);

  const state: SeedState = {
    runId,
    parentA: { ...parentAPerson, childId: childA, childName: "Ada" },
    parentB: { ...parentBPerson, childId: childB },
    therapistA,
    therapistB,
    supervisor,
    admin: adminPerson,
    rows,
    storagePaths: [],
  };
  writeFileSync(STATE_FILE, JSON.stringify({ ...state, authIds }, null, 2));
  return state;
}

export async function teardown(): Promise<void> {
  if (!existsSync(STATE_FILE)) return;
  const admin = adminClient();
  const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as SeedState & { authIds: string[] };
  const ids = state.authIds;
  const childIds = [state.parentA.childId, state.parentB.childId];
  const profileIds = [state.therapistA.profileId, state.therapistB.profileId, state.supervisor.profileId];

  // Rows the journeys themselves may have created (pending bookings, intake
  // drafts, notifications) before the seeded rows they point at.
  const { data: bookings } = await admin.from("bookings").select("id").in("child_id", childIds);
  const bookingIds = (bookings ?? []).map((b) => b.id as string);
  if (bookingIds.length) {
    await admin.from("payments").delete().in("booking_id", bookingIds);
    await admin.from("messages").delete().in("booking_id", bookingIds);
    await admin.from("bookings").delete().in("id", bookingIds);
  }
  await admin.from("intake_consents").delete().in("child_id", childIds);
  await admin.from("intake_forms").delete().in("child_id", childIds);
  await admin.from("notifications").delete().in("user_id", ids);
  await admin.from("audit_log").delete().in("actor_id", ids);
  await admin.from("availability_slots").delete().in("therapist_id", profileIds);

  for (const { table, id } of [...state.rows].reverse()) {
    if (table === "availability_slots") continue;
    const { error } = await admin.from(table).delete().eq("id", id);
    if (error) console.error(`e2e teardown: ${table} ${id}: ${error.message}`);
  }
  for (const id of ids) {
    // Retried: a single dropped connection otherwise strands a test user.
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await admin.auth.admin.deleteUser(id).catch((e: Error) => ({ error: e }));
      if (!error) {
        lastError = "";
        break;
      }
      lastError = error.message;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (lastError) console.error(`e2e teardown: auth user ${id}: ${lastError}`);
  }
  unlinkSync(STATE_FILE);
}
