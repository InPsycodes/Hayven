import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
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
        <div className="flex flex-col gap-3">
          {children.length === 0 ? (
            <p className="rounded-sm bg-white p-4 text-sm text-muted-foreground ring-1 ring-border">
              You haven&apos;t added a child yet. Add one below to start booking sessions.
            </p>
          ) : (
            children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-3 rounded-sm bg-white p-4 ring-1 ring-border"
              >
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
              </div>
            ))
          )}
        </div>

        <AddChildForm />
      </div>
    </div>
  );
}
