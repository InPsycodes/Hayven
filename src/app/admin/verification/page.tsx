import { VerificationQueueList } from "@/components/admin/verification-queue-list";
import { VerificationDetailPanel } from "@/components/admin/verification-detail-panel";
import { getRealVerificationRequests } from "@/lib/admin/queries";

const FILTER_STATUSES: Record<string, string[]> = {
  pending: ["submitted", "in_review"],
  flagged: ["needs_more_info"],
  approved: ["approved"],
};

interface AdminVerificationPageProps {
  searchParams: Promise<{ status?: string; applicationId?: string }>;
}

export default async function AdminVerificationPage({
  searchParams,
}: AdminVerificationPageProps) {
  const { status, applicationId } = await searchParams;
  const activeFilter = status && FILTER_STATUSES[status] ? status : "pending";

  const allRequests = await getRealVerificationRequests();
  const filteredRequests = allRequests.filter((r) =>
    FILTER_STATUSES[activeFilter].includes(r.status)
  );

  const selected =
    filteredRequests.find((r) => r.id === applicationId) ?? filteredRequests[0];

  return (
    <div className="flex h-screen w-full flex-col md:flex-row">
      <VerificationQueueList
        requests={filteredRequests}
        allRequests={allRequests}
        activeFilter={activeFilter}
        activeId={selected?.id}
      />
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <VerificationDetailPanel key={selected.id} request={selected} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            No application selected.
          </div>
        )}
      </div>
    </div>
  );
}
