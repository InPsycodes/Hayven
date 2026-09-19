import type { Metadata } from "next";

import { canonicalFor } from "@/lib/seo/metadata";
import { ReferralStatusLookup } from "@/components/marketing/referral-status-lookup";

export const metadata: Metadata = {
  title: "Track a Referral | Hayven",
  description: "Check the status of a referral you submitted to Hayven.",
  alternates: canonicalFor("/pediatricians/status"),
};

export default function ReferralStatusPage() {
  return (
    <div className="bg-canvas-white px-6 py-16 md:px-10 md:py-24">
      <ReferralStatusLookup />
    </div>
  );
}
