import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { AddChildForm } from "@/components/parent/add-child-form";
import { getSession } from "@/lib/auth/session";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { ageFromDob, formatDate, initialsFromName } from "@/data/format";

export default async function ParentChildrenPage() {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  const children = await getRealChildrenForParent(session.userId);

  return (
    <div>
      <DashboardHeader
        session={session}
        greeting="My children"
        subtext={`${children.length} ${children.length === 1 ? "child" : "children"} on your account`}
      />

      <div className="flex flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        {children.length === 0 ? (
          <p className="rounded-sm bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            You haven&apos;t added a child yet. Add one below to start booking sessions.
          </p>
        ) : (
          <Card lift className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {children.map((child) => (
                <div key={child.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-medium text-charcoal">
                    {initialsFromName(child.firstName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal">
                      {child.firstName}, {ageFromDob(child.dateOfBirth)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Born {formatDate(child.dateOfBirth)}
                      {child.presentingConcern ? ` · ${child.presentingConcern}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end text-xs font-medium">
                    <Link
                      href={`/parent/children/${child.id}/reports`}
                      className="py-1.5 text-terracotta hover:underline"
                    >
                      Progress reports
                    </Link>
                    <Link
                      href={`/parent/children/${child.id}/intake`}
                      className="py-1.5 text-terracotta hover:underline"
                    >
                      Intake form
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <AddChildForm />
      </div>
    </div>
  );
}
