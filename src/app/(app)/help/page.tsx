import { redirect } from "next/navigation";
import { IconChevronDown } from "@tabler/icons-react";

import { DashboardHeader } from "@/components/shared/dashboard-header";
import { Card } from "@/components/ui/card";
import { SupportRequestSection } from "@/components/shared/support-request-section";
import { getSession } from "@/lib/auth/session";
import { getRealSupportRequests } from "@/lib/account/queries";
import { FAQ_CATEGORIES } from "@/content/help-faqs";

export default async function HelpPage() {
  const session = await getSession();
  if (!session || (session.role !== "parent" && session.role !== "therapist")) redirect("/login");

  const supportRequests = await getRealSupportRequests(session.userId);

  return (
    <div>
      <DashboardHeader session={session} greeting="Help & FAQs" subtext="Answers to common questions" />
      <div className="flex max-w-2xl flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        {FAQ_CATEGORIES.map((category) => {
          const entries = category.entries.filter((entry) => !entry.role || entry.role === session.role);
          if (entries.length === 0) return null;
          return (
            <div key={category.title}>
              <h2 className="mb-2 font-heading text-base text-charcoal">{category.title}</h2>
              <Card className="p-2">
                <div className="flex flex-col divide-y divide-border">
                  {entries.map((entry) => (
                    <details key={entry.question} className="group px-3 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-charcoal">
                        {entry.question}
                        <IconChevronDown
                          size={16}
                          className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <p className="mt-2 text-sm text-muted-foreground">{entry.answer}</p>
                    </details>
                  ))}
                </div>
              </Card>
            </div>
          );
        })}

        <SupportRequestSection requests={supportRequests} />
      </div>
    </div>
  );
}
