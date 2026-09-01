import { notFound } from "next/navigation";
import { IconCircleCheck } from "@tabler/icons-react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { BookingPanel } from "@/components/booking/booking-panel";
import { TherapistAvatar } from "@/components/shared/therapist-avatar";
import { getRealAvailabilityForTherapist } from "@/lib/therapist/queries";
import { bookingWindow } from "@/lib/booking/window";
import { getDiscoveryTherapistById, type DiscoveryTherapist } from "@/lib/therapist/discovery";
import { getTherapistReviews, getMyReviewState } from "@/lib/reviews/queries";
import { ReviewSection } from "@/components/reviews/review-section";
import { getOrganizationSchema } from "@/lib/seo/organization-schema";
import { safeJsonLdStringify } from "@/lib/seo/json-ld";
import type { AvailabilitySlot } from "@/data/types";

/**
 * Person, not Physician/MedicalBusiness -- specialties here (speech,
 * occupational, ABA, developmental psychology) are allied-health roles, and
 * schema.org's Physician type specifically means a doctor's office. worksFor
 * links to Hayven's own (plain Organization, not medical) schema rather than
 * re-describing it here.
 */
function getTherapistPersonSchema(therapist: DiscoveryTherapist) {
  const org = getOrganizationSchema();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: therapist.displayName,
    jobTitle: "Paediatric Therapist",
    knowsAbout: therapist.specialtyNames,
    ...(therapist.bio ? { description: therapist.bio } : {}),
    ...(therapist.location
      ? { address: { "@type": "PostalAddress", addressLocality: therapist.location, addressCountry: "NG" } }
      : {}),
    worksFor: { "@type": "Organization", name: org.name, url: org.url },
  };
}

export default async function TherapistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const therapist = await getDiscoveryTherapistById(id);
  if (!therapist) notFound();

  // Same forward-only window as the booking flow -- the panel's "next
  // available" must never surface a slot in the past.
  const window = bookingWindow();
  const [slotRows, reviews, myReview] = await Promise.all([
    getRealAvailabilityForTherapist(therapist.id, window),
    getTherapistReviews(therapist.id),
    getMyReviewState(therapist.id),
  ]);
  const slots: AvailabilitySlot[] = slotRows.map((slot) => ({
    id: slot.id,
    therapistId: slot.therapistId,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isBooked: slot.isBooked,
    sessionType: slot.sessionType as AvailabilitySlot["sessionType"],
  }));
  const reviewSummary = {
    count: reviews.length,
    average: reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0,
  };

  const verificationChecks = [
    `${therapist.verifiedBadgeLabel} status confirmed`,
    `${therapist.yearsPracticing} years verified clinical experience`,
    "Identity confirmed by Hayven admin",
  ];

  return (
    <>
      {/* Embeds therapist-editable fields (bio, location) -- safeJsonLdStringify escapes
          `<` so a bio containing "</script>" can't break out of this tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(getTherapistPersonSchema(therapist)) }}
      />
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[3fr_2fr] md:px-10 md:py-14">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-4">
              <TherapistAvatar
                name={therapist.displayName}
                photoUrl={therapist.photoUrl}
                size={64}
                fallbackClassName="bg-paper text-lg text-charcoal"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-xl text-charcoal md:text-2xl">
                    {therapist.displayName}
                  </h1>
                  <VerifiedBadge label={therapist.verifiedBadgeLabel} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {therapist.specialtyNames.join(", ")} · {therapist.location}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {therapist.specialtyNames.map((name) => (
                <Chip key={name} variant="outline">
                  {name}
                </Chip>
              ))}
              {therapist.ageGroupsServed.map((age) => (
                <Chip key={age} variant="tan">
                  Ages {age}
                </Chip>
              ))}
            </div>
          </div>

          <Card className="p-6">
            <h2 className="font-heading text-base text-charcoal">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {therapist.bio || "This therapist hasn't added a bio yet."}
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-heading text-base text-charcoal">Verification</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {verificationChecks.map((check) => (
                <div key={check} className="flex items-start gap-2 text-sm text-charcoal">
                  <IconCircleCheck size={17} stroke={1.75} className="mt-0.5 shrink-0 text-success-text" />
                  {check}
                </div>
              ))}
            </div>
          </Card>

          <Card id="reviews" className="scroll-mt-24 p-6">
            <h2 className="font-heading text-base text-charcoal">Reviews</h2>
            <div className="mt-3">
              <ReviewSection
                therapistId={therapist.id}
                reviews={reviews}
                summary={reviewSummary}
                mine={myReview}
              />
            </div>
          </Card>
        </div>

        <BookingPanel
          therapistId={therapist.id}
          pricePerSession={therapist.pricePerSession}
          sessionTypes={therapist.sessionTypes}
          slots={slots}
        />
      </div>
    </>
  );
}
