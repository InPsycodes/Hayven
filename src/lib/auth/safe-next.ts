/**
 * Validates a ?next= redirect target so it can only ever point at a page on
 * this site. Checking for a leading "/" but not "//" isn't enough: browsers
 * read a backslash as a slash, so "/\evil.com" resolves to //evil.com and a
 * signed-in user would be sent off-site (a phishing open redirect).
 * Returns the path when it's safe, otherwise null.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  // Control characters (tabs, newlines) are stripped by URL parsing and can
  // also turn a path into a protocol-relative URL.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const base = "https://hayven.invalid";
    const resolved = new URL(raw, base);
    if (resolved.origin !== base) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}
