import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { listClinics } from "@/lib/clinics/queries";
import { createClinic } from "@/lib/clinics/actions";
import { formatRate } from "@/lib/payouts/commission";
import { formatDate } from "@/data/format";

export default async function AdminClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [clinics, { error }] = await Promise.all([listClinics(), searchParams]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Clinics</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          A clinic groups its therapists under one set of terms: a free pilot, then an agreed commission, with
          payouts sent to the clinic&apos;s bank account. Independent therapists stay on the standard 20%.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        {clinics === null ? (
          <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">
            Clinics aren&apos;t set up in the database yet. Run migration 0111_clinics_and_commission.sql.
          </p>
        ) : (
          <>
            <Card className="p-5">
              <h2 className="font-heading text-base text-charcoal">New clinic</h2>
              <form action={createClinic} className="mt-3 flex flex-wrap items-end gap-3">
                <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                  <label htmlFor="clinic-name" className="text-xs text-muted-foreground">
                    Clinic name
                  </label>
                  <Input id="clinic-name" name="name" maxLength={120} required />
                </div>
                <Button type="submit">Create clinic</Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Starts with a 3-month free pilot, then 10%. You can change both on the clinic&apos;s page.
              </p>
              {error && <p className="mt-2 text-sm text-error-text">{error}</p>}
            </Card>

            {clinics.length === 0 ? (
              <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground">No clinics yet.</p>
            ) : (
              <Card lift className="p-2">
                <div className="flex flex-col divide-y divide-border">
                  {clinics.map((c) => {
                    const inPilot = !!c.pilotEndsOn && today <= c.pilotEndsOn;
                    return (
                      <Link
                        key={c.id}
                        href={`/admin/clinics/${c.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-paper/40"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-charcoal">{c.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {c.therapistCount} therapist{c.therapistCount === 1 ? "" : "s"} ·{" "}
                            {inPilot
                              ? `${formatRate(c.pilotRate)} until ${formatDate(c.pilotEndsOn!)}, then ${formatRate(c.commissionRate)}`
                              : `${formatRate(c.commissionRate)} commission`}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {inPilot && <StatusBadge tone="amber">Pilot</StatusBadge>}
                          {!c.hasBank && <StatusBadge tone="error">No bank</StatusBadge>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
