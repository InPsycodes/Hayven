import { Card } from "@/components/ui/card";
import { SupportRequestRow } from "@/components/admin/support-request-row";
import { getSupportRequests } from "@/lib/admin/queries";

export default async function AdminSupportPage() {
  const requests = await getSupportRequests();

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F6F4F0]">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Support requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Replying sends your message straight back to the requester, by email and in-app.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {requests.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No requests yet.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {requests.map((request) => (
                <SupportRequestRow key={request.id} request={request} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
