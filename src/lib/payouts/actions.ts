"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { createNotification } from "@/lib/notifications/create";
import { createTransferRecipient, initiateTransfer } from "@/lib/payments/paystack";
import { MIN_PAYOUT_NAIRA } from "@/lib/payouts/commission";
import { formatNaira } from "@/data/format";

export interface PayoutRunResult {
  ok: boolean;
  error?: string;
  created: number;
  paidNaira: number;
  skipped: { name: string; reason: string }[];
  errors: string[];
}

/**
 * Pays every therapist whose cleared earnings are at or above the minimum.
 * Manual-trigger (an admin clicks Run) rather than a cron -- money leaving
 * the account should have a person behind it for the pilot.
 */
export async function runPayouts(): Promise<PayoutRunResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "Not authorized.", created: 0, paidNaira: 0, skipped: [], errors: [] };
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return { ok: false, error: "PAYSTACK_SECRET_KEY isn't set.", created: 0, paidNaira: 0, skipped: [], errors: [] };
  }

  const admin = createAdminClient();

  const { data: earnings } = await admin
    .from("therapist_earnings")
    .select("id, therapist_id, net_amount")
    .eq("status", "pending")
    .is("payout_id", null)
    .lte("payable_at", new Date().toISOString());

  const byTherapist = new Map<string, { ids: string[]; total: number }>();
  for (const e of earnings ?? []) {
    const g = byTherapist.get(e.therapist_id) ?? { ids: [], total: 0 };
    g.ids.push(e.id);
    g.total += e.net_amount;
    byTherapist.set(e.therapist_id, g);
  }

  const eligible = [...byTherapist.entries()].filter(([, g]) => g.total >= MIN_PAYOUT_NAIRA);
  const skipped: { name: string; reason: string }[] = [];
  const errors: string[] = [];
  let created = 0;
  let paidNaira = 0;

  if (eligible.length === 0) {
    return { ok: true, created: 0, paidNaira: 0, skipped: [], errors: [] };
  }

  const profiles = await loadPayoutProfiles(admin, eligible.map(([tid]) => tid));
  const profById = new Map(profiles.map((p) => [p.id, p]));

  for (const [therapistId, group] of eligible) {
    const p = profById.get(therapistId);
    const name = (p?.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown therapist";

    // A clinic's therapists are paid into the clinic's account.
    const clinic = p?.clinics ?? null;
    const account = clinic
      ? {
          code: clinic.bank_code,
          number: clinic.bank_account_number,
          holder: clinic.bank_account_name ?? clinic.name,
          recipient: clinic.paystack_recipient_code,
        }
      : p
        ? { code: p.bank_code, number: p.bank_account_number, holder: p.bank_account_name ?? name, recipient: p.paystack_recipient_code }
        : null;
    if (!p || !account || !account.number || !account.code) {
      skipped.push({ name, reason: clinic ? `${clinic.name} has no bank account on file` : "No bank account on file" });
      continue;
    }

    try {
      let recipient = account.recipient;
      if (!recipient) {
        recipient = await createTransferRecipient({
          name: account.holder,
          accountNumber: account.number,
          bankCode: account.code,
        });
        if (clinic) {
          await admin.from("clinics").update({ paystack_recipient_code: recipient }).eq("id", clinic.id);
          // Later therapists of the same clinic in this run reuse it.
          clinic.paystack_recipient_code = recipient;
        } else {
          await admin.from("therapist_profiles").update({ paystack_recipient_code: recipient }).eq("id", therapistId);
        }
      }

      const reference = `payout_${therapistId}_${Date.now()}`;
      const { data: payout, error: pErr } = await admin
        .from("payouts")
        .insert({
          therapist_id: therapistId,
          amount: group.total,
          earning_count: group.ids.length,
          status: "processing",
          paystack_reference: reference,
        })
        .select("id")
        .single();
      if (pErr || !payout) {
        errors.push(`${name}: ${pErr?.message ?? "couldn't create payout"}`);
        continue;
      }

      // Atomic claim: the WHERE clause (payout_id is null) is re-checked
      // against committed data, so if a second concurrent run already
      // claimed one of these rows for its own payout, it won't come back
      // here -- closing the double-pay race two simultaneous runs used to
      // hit (H-1, production audit 2026-09-03). Build the transfer from
      // what was actually claimed, never the original planned group.
      const { data: claimed, error: claimErr } = await admin
        .from("therapist_earnings")
        .update({ payout_id: payout.id })
        .in("id", group.ids)
        .is("payout_id", null)
        .select("id, net_amount");
      if (claimErr) {
        errors.push(`${name}: ${claimErr.message}`);
        await admin.from("payouts").delete().eq("id", payout.id);
        continue;
      }

      const claimedIds = (claimed ?? []).map((e) => e.id);
      const claimedTotal = (claimed ?? []).reduce((sum, e) => sum + e.net_amount, 0);

      if (claimedIds.length === 0) {
        // Every one of these earnings was already claimed by a concurrent run.
        await admin.from("payouts").delete().eq("id", payout.id);
        skipped.push({ name, reason: "Already claimed by a concurrent payout run" });
        continue;
      }
      if (claimedTotal < MIN_PAYOUT_NAIRA) {
        // A concurrent run took some of these earnings; what's left doesn't clear the minimum.
        await admin.from("therapist_earnings").update({ payout_id: null }).in("id", claimedIds);
        await admin.from("payouts").delete().eq("id", payout.id);
        skipped.push({ name, reason: "Remaining balance fell below the payout minimum after a concurrent run" });
        continue;
      }
      if (claimedIds.length !== group.ids.length) {
        await admin
          .from("payouts")
          .update({ amount: claimedTotal, earning_count: claimedIds.length })
          .eq("id", payout.id);
      }

      try {
        const transfer = await initiateTransfer({
          amountNaira: claimedTotal,
          recipientCode: recipient,
          reason: clinic
            ? `Hayven payout for ${name}, ${claimedIds.length} item${claimedIds.length === 1 ? "" : "s"}`
            : `Hayven payout, ${claimedIds.length} item${claimedIds.length === 1 ? "" : "s"}`,
          reference,
        });
        const settled = transfer.status === "success";
        await admin
          .from("payouts")
          .update({
            paystack_transfer_code: transfer.transferCode,
            status: settled ? "paid" : "processing",
            paid_at: settled ? new Date().toISOString() : null,
          })
          .eq("id", payout.id);
        if (settled) {
          await admin.from("therapist_earnings").update({ status: "paid" }).eq("payout_id", payout.id);
        }
        if (p.user_id) {
          await createNotification({
            userId: p.user_id,
            type: "payment_receipt",
            title: "Payout sent",
            body: clinic
              ? `A payout of ${formatNaira(claimedTotal)} for your sessions is on its way to ${clinic.name}'s account.`
              : `A payout of ${formatNaira(claimedTotal)} is on its way to your bank account.`,
            url: "/therapist/earnings",
          });
        }
        created++;
        paidNaira += claimedTotal;
      } catch (transferErr) {
        await admin.from("therapist_earnings").update({ payout_id: null }).eq("payout_id", payout.id);
        await admin
          .from("payouts")
          .update({
            status: "failed",
            failure_reason: transferErr instanceof Error ? transferErr.message : "transfer failed",
          })
          .eq("id", payout.id);
        errors.push(`${name}: ${transferErr instanceof Error ? transferErr.message : "transfer failed"}`);
      }
    } catch (recipientErr) {
      errors.push(`${name}: ${recipientErr instanceof Error ? recipientErr.message : "recipient setup failed"}`);
    }
  }

  await logAuditEvent({
    actor: session,
    action: "payout.run",
    entityType: "payout",
    // No single entity for a batch run -- entity_id is a uuid column, and
    // the literal "batch" previously written here failed that type check on
    // every single call (caught silently by logAuditEvent's own try/catch),
    // meaning payout runs have never actually had an audit log entry in
    // production. Found via the money-flow integration test. The batch
    // detail already lives in metadata below.
    metadata: { created, paidNaira, skipped: skipped.length, errors: errors.length },
  });
  revalidatePath("/admin/payouts");
  revalidatePath("/therapist/earnings");
  return { ok: true, created, paidNaira, skipped, errors };
}

interface PayoutClinic {
  id: string;
  name: string;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  paystack_recipient_code: string | null;
}

interface PayoutProfile {
  id: string;
  user_id: string | null;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  paystack_recipient_code: string | null;
  users: unknown;
  clinics: PayoutClinic | null;
}

/**
 * Bank details for each therapist being paid, with their clinic's when they
 * belong to one. Falls back to the therapist's own details alone if the
 * clinics table isn't there yet (before migration 0111), so a payout run
 * never stalls on it.
 */
async function loadPayoutProfiles(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<PayoutProfile[]> {
  const base = "id, user_id, bank_code, bank_account_number, bank_account_name, paystack_recipient_code, users(full_name)";
  const withClinic = await admin
    .from("therapist_profiles")
    .select(`${base}, clinics(id, name, bank_code, bank_account_number, bank_account_name, paystack_recipient_code)`)
    .in("id", ids);
  if (!withClinic.error) return (withClinic.data ?? []) as unknown as PayoutProfile[];
  const plain = await admin.from("therapist_profiles").select(base).in("id", ids);
  return ((plain.data ?? []) as unknown as Omit<PayoutProfile, "clinics">[]).map((p) => ({ ...p, clinics: null }));
}
