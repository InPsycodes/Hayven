import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

// Moved out of reports/actions.ts ("use server"), where every export is a
// publicly callable endpoint. Audit F-01.

/**
 * Shared by publishReport (therapist, unsupervised case) and
 * approveAndPublishReport (src/lib/supervisor/actions.ts, E10/D5) -- always
 * names the treating therapist, not whoever's session triggered the call,
 * so a supervisor's approval doesn't produce a notification that looks like
 * it came from them.
 */
export async function notifyParentReportPublished(
  admin: ReturnType<typeof createAdminClient>,
  childId: string,
  reportId: string,
  therapistName: string
): Promise<void> {
  try {
    const { data: child } = await admin.from("children").select("first_name, parent_id").eq("id", childId).maybeSingle();
    if (child) {
      await createNotification({
        userId: child.parent_id,
        type: "report_published",
        entityType: "report",
        entityId: reportId,
        title: `${child.first_name}'s new session report is ready`,
        body: `${therapistName} just published a new report for ${child.first_name}.`,
        url: `/parent/children/${childId}/reports`,
      });
    }
  } catch (err) {
    console.error("report_published notification threw", reportId, err);
  }
}
