import { getPlatformMetrics } from "@/lib/admin/queries";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)]">
      <p className="label-micro text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl text-charcoal">{value.toLocaleString()}</p>
    </div>
  );
}

export default async function AdminMetricsPage() {
  const m = await getPlatformMetrics();

  return (
    <div className="min-h-screen overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Metrics</h1>
        <p className="mt-1 text-sm text-muted-foreground">A snapshot of platform activity.</p>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section>
          <h2 className="label-micro text-rust-dark">People</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Parents" value={m.totalParents} />
            <StatCard label="Therapists" value={m.totalTherapists} />
            <StatCard label="Verified therapists" value={m.verifiedTherapists} />
            <StatCard label="Supervisors" value={m.totalSupervisors} />
          </div>
        </section>

        <section>
          <h2 className="label-micro text-rust-dark">Activity</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Children" value={m.totalChildren} />
            <StatCard label="Bookings" value={m.totalBookings} />
            <StatCard label="Completed bookings" value={m.completedBookings} />
            <StatCard label="Sessions logged" value={m.totalSessions} />
          </div>
        </section>

        <section>
          <h2 className="label-micro text-rust-dark">Reports</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Reports generated" value={m.totalReports} />
            <StatCard label="Published to parents" value={m.publishedReports} />
          </div>
        </section>
      </div>
    </div>
  );
}
