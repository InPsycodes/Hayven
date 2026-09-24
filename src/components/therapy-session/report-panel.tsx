"use client";

import { useState } from "react";

import { ReportEditor } from "@/components/therapy-session/report-editor";
import { ReportView } from "@/components/therapy-session/report-view";
import { Button } from "@/components/ui/button";
import type { ReportBody } from "@/lib/reports/types";

export function ReportPanel({ reportId, body }: { reportId: string; body: ReportBody }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <ReportEditor reportId={reportId} body={body} />
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="w-fit">
          Done editing
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ReportView body={body} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditing(true)} className="w-fit">
          Edit report
        </Button>
        <Button asChild variant="outline" className="w-fit">
          <a href={`/api/reports/${reportId}/pdf?version=clinical`} download>
            Download PDF
          </a>
        </Button>
      </div>
    </div>
  );
}
