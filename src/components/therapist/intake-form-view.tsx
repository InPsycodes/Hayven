import { StatusBadge } from "@/components/ui/status-badge";
import type { RealIntakeForm } from "@/lib/intake/queries";

const SECTIONS: { key: keyof Omit<RealIntakeForm, "childId" | "updatedAt">; label: string }[] = [
  { key: "sensoryProfile", label: "Sensory profile" },
  { key: "medicalHistory", label: "Medical history" },
  { key: "consentSharing", label: "Consent & sharing" },
  { key: "homeRoutine", label: "Home routine survey" },
];

export function IntakeFormView({ childName, form }: { childName: string; form: RealIntakeForm | null }) {
  if (!form) {
    return (
      <p className="rounded-sm bg-[#F6F4F0] p-4 text-sm text-muted-foreground">
        {childName}&apos;s parent hasn&apos;t filled in an intake form yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {SECTIONS.map((section) => {
        const value = form[section.key];
        const complete = Boolean(value?.trim());
        return (
          <div key={section.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-charcoal">{section.label}</h3>
              <StatusBadge tone={complete ? "sage" : "grey"}>{complete ? "Complete" : "Not provided"}</StatusBadge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {complete ? value : "Nothing shared for this section yet."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
