"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { isFlutterwaveConfigured, resolveBankAccount } from "@/lib/payments/flutterwave";
import { getBanks } from "@/lib/payments/banks";
import { bankNameIn } from "@/lib/payments/nigerian-banks";
import { revalidateDiscoveryCache } from "@/lib/therapist/discovery";

/** Admin pages use plain forms: each action ends by redirecting back with a message. */
function back(clinicId: string | null, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${clinicId ? `/admin/clinics/${clinicId}` : "/admin/clinics"}?${qs}`);
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  return session;
}

/** "10" or "12.5" (percent) -> 0.1 / 0.125. Null when invalid. */
function percentToRate(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null;
  return Math.round(n * 100) / 10000;
}

function threeMonthsFromToday(): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export async function createClinic(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) back(null, { error: "Enter the clinic's name (up to 120 characters)." });

  // The agreed defaults (pricing plan, 2026-10-11): a 3-month free pilot,
  // then 10%. Both can be changed on the clinic's page.
  const { data, error } = await createAdminClient()
    .from("clinics")
    .insert({ name, commission_rate: 0.1, pilot_rate: 0, pilot_ends_on: threeMonthsFromToday() })
    .select("id")
    .single();
  if (error || !data) back(null, { error: "Couldn't create the clinic. Has migration 0111 been run?" });

  await logAuditEvent({ actor: session, action: "clinic.create", entityType: "clinic", entityId: data.id });
  revalidatePath("/admin/clinics");
  back(data.id, { saved: "Clinic created with a 3-month free pilot, then 10%." });
}

export async function updateClinicTerms(clinicId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const commissionRate = percentToRate(formData.get("commissionPercent"));
  const pilotRate = percentToRate(formData.get("pilotPercent"));
  const pilotEndsRaw = String(formData.get("pilotEndsOn") ?? "").trim();
  const pilotEndsOn = pilotEndsRaw === "" ? null : pilotEndsRaw;

  if (!name || name.length > 120) back(clinicId, { error: "Enter the clinic's name." });
  if (commissionRate === null) back(clinicId, { error: "The commission must be a number from 0 to 50." });
  if (pilotRate === null) back(clinicId, { error: "The pilot rate must be a number from 0 to 50." });
  if (pilotEndsOn && !/^\d{4}-\d{2}-\d{2}$/.test(pilotEndsOn)) back(clinicId, { error: "Choose a valid pilot end date." });

  const { error } = await createAdminClient()
    .from("clinics")
    .update({ name, commission_rate: commissionRate, pilot_rate: pilotRate, pilot_ends_on: pilotEndsOn, updated_at: new Date().toISOString() })
    .eq("id", clinicId);
  if (error) back(clinicId, { error: "Couldn't save the terms. Please try again." });

  // Only earnings recorded from now on use the new terms; earlier ones keep
  // the rate stored on them.
  await logAuditEvent({ actor: session, action: "clinic.update_terms", entityType: "clinic", entityId: clinicId });
  revalidatePath(`/admin/clinics/${clinicId}`);
  back(clinicId, { saved: "Terms saved. They apply to sessions completed from now on." });
}

export async function updateClinicBank(clinicId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();
  if (!isFlutterwaveConfigured()) back(clinicId, { error: "Payouts aren't set up (FLUTTERWAVE_SECRET_KEY is missing)." });

  const bankCode = String(formData.get("bankCode") ?? "");
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  if (!bankNameIn(await getBanks(), bankCode)) back(clinicId, { error: "Choose the clinic's bank from the list." });
  if (!/^\d{10}$/.test(accountNumber)) back(clinicId, { error: "Enter the 10-digit account number." });

  let resolved: { accountNumber: string; accountName: string };
  try {
    resolved = await resolveBankAccount(accountNumber, bankCode);
  } catch (err) {
    back(clinicId, { error: err instanceof Error ? err.message : "Couldn't verify that account." });
  }

  const { error } = await createAdminClient()
    .from("clinics")
    .update({
      bank_code: bankCode,
      bank_account_number: resolved.accountNumber,
      bank_account_name: resolved.accountName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clinicId);
  if (error) back(clinicId, { error: "Couldn't save the bank account. Please try again." });

  await logAuditEvent({ actor: session, action: "clinic.update_bank", entityType: "clinic", entityId: clinicId });
  revalidateDiscoveryCache();
  back(clinicId, { saved: `Bank account verified: ${resolved.accountName}.` });
}

export async function addTherapistToClinic(clinicId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const therapistId = String(formData.get("therapistId") ?? "");
  if (!therapistId) back(clinicId, { error: "Choose a therapist to add." });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("therapist_profiles")
    .update({ clinic_id: clinicId })
    .eq("id", therapistId)
    .is("clinic_id", null)
    .select("id")
    .maybeSingle();
  if (error || !data) back(clinicId, { error: "Couldn't add that therapist. They may already belong to a clinic." });

  await logAuditEvent({ actor: session, action: "clinic.add_therapist", entityType: "clinic", entityId: clinicId });
  revalidateDiscoveryCache();
  back(clinicId, { saved: "Therapist added. Their future sessions follow the clinic's terms and pay into its account." });
}

export async function removeTherapistFromClinic(clinicId: string, formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const therapistId = String(formData.get("therapistId") ?? "");
  const { error } = await createAdminClient()
    .from("therapist_profiles")
    .update({ clinic_id: null })
    .eq("id", therapistId)
    .eq("clinic_id", clinicId);
  if (error) back(clinicId, { error: "Couldn't remove that therapist." });

  await logAuditEvent({ actor: session, action: "clinic.remove_therapist", entityType: "clinic", entityId: clinicId });
  revalidateDiscoveryCache();
  back(clinicId, {
    saved: "Therapist removed. They're back on the standard 20% and need their own bank account to stay in search.",
  });
}
