import { StarRating } from "@/components/reviews/star-rating";
import { ReviewForm } from "@/components/reviews/review-form";
import { formatDate } from "@/data/format";
import type { MyReviewState, ReviewSummary, TherapistReview } from "@/lib/reviews/queries";

export function ReviewSection({
  therapistId,
  reviews,
  summary,
  mine,
}: {
  therapistId: string;
  reviews: TherapistReview[];
  summary: ReviewSummary;
  mine: MyReviewState;
}) {
  return (
    <div className="flex flex-col gap-4">
      {summary.count > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-charcoal">{summary.average.toFixed(1)}</span>
          <StarRating value={summary.average} size={15} />
          <span className="text-xs text-muted-foreground">
            {summary.count} review{summary.count === 1 ? "" : "s"}
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Reviews appear after a parent completes a session.
        </p>
      )}

      {reviews.length > 0 && (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <StarRating value={r.rating} size={13} />
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(r.createdAt, { month: "short", year: "numeric" })}
                </span>
              </div>
              {r.body && <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{r.body}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">Verified parent</p>
            </li>
          ))}
        </ul>
      )}

      {mine.canReview && <ReviewForm therapistId={therapistId} initial={mine.mine} />}
    </div>
  );
}
