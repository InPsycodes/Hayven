import { notFound, redirect } from "next/navigation";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { IntakeForm } from "@/components/parent/intake-form";
import { getSession } from "@/lib/auth/session";
import { getRealChildrenForParent } from "@/lib/parent/queries";
import { getIntakeFormForChild } from "@/lib/intake/queries";

export default async function ParentIntakeFormPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/login");

  const { childId } = await params;
  const children = await getRealChildrenForParent(session.userId);
  const child = children.find((c) => c.id === childId);
  if (!child) notFound();

  const form = await getIntakeFormForChild(childId);

  return (
    <div>
      <DashboardHeader session={session} greeting="Intake form" subtext={`For ${child.firstName}`} />
      <div className="px-5 py-6 md:px-10 md:py-8">
        <Card lift className="max-w-2xl p-5 md:p-6">
          <IntakeForm childId={childId} childName={child.firstName} initial={form} />
        </Card>
      </div>
    </div>
  );
}
