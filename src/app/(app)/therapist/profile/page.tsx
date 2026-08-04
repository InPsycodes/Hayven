import { ComingSoon } from "@/components/shared/coming-soon";
import { LogoutButton } from "@/components/shared/logout-button";

export default function TherapistProfilePage() {
  return (
    <div className="flex flex-col items-center">
      <ComingSoon title="Profile" />
      <LogoutButton className="text-muted-foreground hover:text-charcoal" />
    </div>
  );
}
