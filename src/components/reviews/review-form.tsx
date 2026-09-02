"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconStarFilled } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview, deleteMyReview } from "@/lib/reviews/actions";

export function ReviewForm({
  therapistId,
  initial,
}: {
  therapistId: string;
  initial: { rating: number; body: string | null } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    if (rating < 1) {
      setError("Pick a star rating.");
      return;
    }
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await submitReview(therapistId, rating, body);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await deleteMyReview(therapistId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRating(0);
      setBody("");
      setSaved(false);
      router.refresh();
    });
  }

  const shown = hover || rating;

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
      <p className="text-sm font-medium text-charcoal">{initial ? "Your review" : "Leave a review"}</p>

      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={rating === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => setRating(n)}
            className={
              n <= shown
                ? "text-amber transition-colors"
                : "text-border transition-colors hover:text-amber/50"
            }
          >
            <IconStarFilled size={22} />
          </button>
        ))}
      </div>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1500}
        placeholder="What was your experience like? (optional)"
        aria-label="Review comment"
        className="text-sm"
      />

      {error && <p className="text-xs text-error-text">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving..." : initial ? "Update review" : "Post review"}
        </Button>
        {initial && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-error-text"
          >
            Delete
          </button>
        )}
        {saved && <span className="fade-in text-xs text-success-text">Saved.</span>}
      </div>
    </div>
  );
}
