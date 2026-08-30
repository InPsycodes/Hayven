/**
 * Reading-time helpers for Learning Center content. `learning_articles` has
 * a free-text `read_time` an editor can set; lessons don't, so we estimate
 * from the paragraph body (~220 wpm, floored at 1 minute).
 */
export function estimateMinutes(body: string[]): number {
  const words = body.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Editor-set read time if present, otherwise an estimate from the body. */
export function readingLabel(body: string[], readTime?: string | null): string {
  if (readTime && readTime.trim()) return readTime.trim();
  return `${estimateMinutes(body)} min read`;
}

/** Sum of per-lesson estimates, rounded to the nearest 5 minutes for a course total. */
export function courseMinutes(lessonBodies: string[][]): number {
  const total = lessonBodies.reduce((sum, body) => sum + estimateMinutes(body), 0);
  return Math.max(5, Math.round(total / 5) * 5);
}
