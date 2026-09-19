import type { Metadata } from "next";

import { canonicalFor } from "@/lib/seo/metadata";
import { PediatricianReferralForm } from "@/components/marketing/pediatrician-referral-form";

export const metadata: Metadata = {
  title: "Refer a Child | Hayven",
  description: "Refer a child to Hayven's verified paediatric therapists -- no account required.",
  alternates: canonicalFor("/pediatricians/refer"),
};

export default function ReferChildPage() {
  return (
    <div className="bg-canvas-white px-6 py-16 md:px-10 md:py-24">
      <PediatricianReferralForm />
    </div>
  );
}
