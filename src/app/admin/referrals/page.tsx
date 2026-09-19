import { Card } from "@/components/ui/card";
import { ReferralRow } from "@/components/admin/referral-row";
import { getReferralQueue } from "@/lib/referrals/queries";

export default async function AdminReferralsPage() {
  const referrals = await getReferralQueue();
  const open = referrals.filter((r) => r.status !== "care_started").length;

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="flex items-baseline justify-between p-6 md:p-8">
        <div>
          <h1 className="font-heading text-xl text-charcoal">Referrals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            From pediatricians and referring clinicians. Updating a status emails the referrer.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{open} open</span>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {referrals.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No referrals yet.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {referrals.map((referral) => (
                <ReferralRow key={referral.id} referral={referral} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
