import { Card } from "@/components/ui/card";
import { RefundRow } from "@/components/admin/refund-row";
import { getBookingsNeedingRefund } from "@/lib/admin/queries";

export default async function AdminRefundsPage() {
  const refunds = await getBookingsNeedingRefund();

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F6F4F0]">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Refunds owed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cancelling a paid session never refunds it automatically -- process each of these manually
          (Paystack dashboard, bank transfer), then mark it here.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {refunds.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">Nothing owed right now.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {refunds.map((refund) => (
                <RefundRow key={refund.paymentId} refund={refund} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
