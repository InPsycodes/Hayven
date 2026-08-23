import { Card } from "@/components/ui/card";
import { DeletionRequestRow } from "@/components/admin/deletion-request-row";
import { getAccountDeletionRequests } from "@/lib/admin/queries";

export default async function AdminDeletionRequestsPage() {
  const requests = await getAccountDeletionRequests();

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Account deletion requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marking a request reviewed or actioned only tracks that here -- the actual deletion is a
          separate, manual step.
        </p>
      </div>

      <div className="px-6 pb-8 md:px-8">
        {requests.length === 0 ? (
          <div className="rounded-sm bg-white p-6 text-sm text-muted-foreground">No requests yet.</div>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {requests.map((request) => (
                <DeletionRequestRow key={request.id} request={request} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
