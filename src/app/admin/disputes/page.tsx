import { Card } from "@/components/ui/card";
import { DisputeRow } from "@/components/admin/dispute-row";
import { getOpenDisputes } from "@/lib/disputes/queries";

export default async function AdminDisputesPage() {
  const disputes = await getOpenDisputes();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Disputes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sessions a parent has reported a problem with. A refund resolution records the amount and adds it
          to the Refunds queue &mdash; you still move the money in Paystack. That session&apos;s therapist
          payout is held until you resolve this.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {disputes.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No open disputes.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {disputes.map((d) => (
                <DisputeRow key={d.id} dispute={d} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
