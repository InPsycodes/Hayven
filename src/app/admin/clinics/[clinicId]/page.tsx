import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { getClinicDetail } from "@/lib/clinics/queries";
import {
  addTherapistToClinic,
  removeTherapistFromClinic,
  updateClinicBank,
  updateClinicTerms,
} from "@/lib/clinics/actions";
import { NIGERIAN_BANKS, bankName } from "@/lib/payments/nigerian-banks";
import { formatRate } from "@/lib/payouts/commission";
import { formatDate } from "@/data/format";

const SELECT_CLASS =
  "h-9 w-full rounded-sm border border-input bg-transparent px-2.5 text-sm text-charcoal focus-visible:outline-2 focus-visible:outline-terracotta";

/** 0.1 -> "10", 0.125 -> "12.5" for a percent input. */
const asPercent = (rate: number) => String(Math.round(rate * 10000) / 100);

export default async function AdminClinicPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinicId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [{ clinicId }, { error, saved }] = await Promise.all([params, searchParams]);
  const clinic = await getClinicDetail(clinicId);
  if (!clinic) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const inPilot = !!clinic.pilotEndsOn && today <= clinic.pilotEndsOn;

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <Link href="/admin/clinics" className="text-xs text-muted-foreground hover:text-charcoal">
          ← All clinics
        </Link>
        <h1 className="mt-2 font-heading text-xl text-charcoal">{clinic.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inPilot
            ? `Free pilot: Hayven takes ${formatRate(clinic.pilotRate)} until ${formatDate(clinic.pilotEndsOn!)}, then ${formatRate(clinic.commissionRate)}.`
            : `Hayven takes ${formatRate(clinic.commissionRate)} of each session.`}{" "}
          Hayven pays the Paystack fee either way.
        </p>
        {saved && (
          <p role="status" className="mt-3 rounded-sm bg-success/10 px-3 py-2 text-sm text-success-text">
            {saved}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-sm bg-error/10 px-3 py-2 text-sm text-error-text">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 px-6 pb-8 md:px-8 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-heading text-base text-charcoal">Terms</h2>
          <form action={updateClinicTerms.bind(null, clinic.id)} className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs text-muted-foreground">Clinic name</label>
              <Input id="name" name="name" defaultValue={clinic.name} maxLength={120} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pilotPercent" className="text-xs text-muted-foreground">Pilot commission (%)</label>
                <Input id="pilotPercent" name="pilotPercent" type="number" min={0} max={50} step={0.5} defaultValue={asPercent(clinic.pilotRate)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pilotEndsOn" className="text-xs text-muted-foreground">Pilot ends on (last day)</label>
                <Input id="pilotEndsOn" name="pilotEndsOn" type="date" defaultValue={clinic.pilotEndsOn ?? ""} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="commissionPercent" className="text-xs text-muted-foreground">Commission after the pilot (%)</label>
              <Input id="commissionPercent" name="commissionPercent" type="number" min={0} max={50} step={0.5} defaultValue={asPercent(clinic.commissionRate)} required />
            </div>
            <p className="text-xs text-muted-foreground">
              A session counts as part of the pilot if it happens on or before the last pilot day. Leave the date
              empty for no pilot. Changes apply to sessions completed from now on; past earnings keep their rate.
            </p>
            <Button type="submit" className="w-fit">Save terms</Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base text-charcoal">Payout bank account</h2>
            <StatusBadge tone={clinic.hasBank ? "sage" : "error"}>{clinic.hasBank ? "On file" : "Missing"}</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Every therapist in this clinic is paid into this account. Until it&apos;s set, the clinic&apos;s therapists
            without their own account don&apos;t appear in search.
          </p>
          {clinic.hasBank && (
            <p className="mt-2 text-sm text-charcoal">
              {clinic.bankAccountName} · {bankName(clinic.bankCode) ?? clinic.bankCode} · {clinic.bankAccountMasked}
            </p>
          )}
          <form action={updateClinicBank.bind(null, clinic.id)} className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bankCode" className="text-xs text-muted-foreground">Bank</label>
              <select id="bankCode" name="bankCode" defaultValue={clinic.bankCode ?? ""} required className={SELECT_CLASS}>
                <option value="" disabled>Choose a bank</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="accountNumber" className="text-xs text-muted-foreground">Account number</label>
              <Input id="accountNumber" name="accountNumber" inputMode="numeric" pattern="\d{10}" maxLength={10} required />
            </div>
            <Button type="submit" variant="outline" className="w-fit">
              {clinic.hasBank ? "Replace account" : "Verify and save"}
            </Button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-heading text-base text-charcoal">Therapists ({clinic.members.length})</h2>
          {clinic.members.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No therapists in this clinic yet.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {clinic.members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="text-sm text-charcoal">
                    {m.name} <span className="text-xs text-muted-foreground">· {m.verificationStatus}</span>
                  </span>
                  <form action={removeTherapistFromClinic.bind(null, clinic.id)}>
                    <input type="hidden" name="therapistId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">Remove</Button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={addTherapistToClinic.bind(null, clinic.id)} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div className="flex min-w-60 flex-1 flex-col gap-1.5">
              <label htmlFor="therapistId" className="text-xs text-muted-foreground">Add a therapist</label>
              <select id="therapistId" name="therapistId" defaultValue="" required className={SELECT_CLASS}>
                <option value="" disabled>
                  {clinic.available.length === 0 ? "No therapists without a clinic" : "Choose a therapist"}
                </option>
                {clinic.available.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.verificationStatus})</option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" disabled={clinic.available.length === 0}>Add to clinic</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            A therapist in a clinic follows its terms and is paid into its account from their next completed session.
          </p>
        </Card>
      </div>
    </div>
  );
}
