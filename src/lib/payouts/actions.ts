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

  const { data: profiles } = await admin
    .from("therapist_profiles")
    .select("id, user_id, bank_code, bank_account_number, bank_account_name, paystack_recipient_code, users(full_name)")
    .in("id", eligible.map(([tid]) => tid));
  const profById = new Map((profiles ?? []).map((p) => [p.id, p]));

  for (const [therapistId, group] of eligible) {
    const p = profById.get(therapistId);
    const name = (p?.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown therapist";

    if (!p || !p.bank_account_number || !p.bank_code) {
      skipped.push({ name, reason: "No bank account on file" });
      continue;
    }

    try {
      let recipient = p.paystack_recipient_code as string | null;
      if (!recipient) {
        recipient = await createTransferRecipient({
          name: p.bank_account_name ?? name,
          accountNumber: p.bank_account_number,
          bankCode: p.bank_code,
        });
        await admin.from("therapist_profiles").update({ paystack_recipient_code: recipient }).eq("id", therapistId);
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

      await admin.from("therapist_earnings").update({ payout_id: payout.id }).in("id", group.ids);

      try {
        const transfer = await initiateTransfer({
          amountNaira: group.total,
          recipientCode: recipient,
          reason: `Hayven payout — ${group.ids.length} item${group.ids.length === 1 ? "" : "s"}`,
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
            body: `A payout of ${formatNaira(group.total)} is on its way to your bank account.`,
            url: "/therapist/earnings",
          });
        }
        created++;
        paidNaira += group.total;
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
    entityId: "batch",
    metadata: { created, paidNaira, skipped: skipped.length, errors: errors.length },
  });
  revalidatePath("/admin/payouts");
  revalidatePath("/therapist/earnings");
  return { ok: true, created, paidNaira, skipped, errors };
}
