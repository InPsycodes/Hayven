/**
 * Client-and-server-safe email checks. Two jobs:
 *  - `emailFormatError` catches the obviously-wrong shape before a submit
 *    round-trips ("no @", trailing dot, spaces) with a specific message.
 *  - `emailDomainSuggestion` catches the near-miss ("gmial.com",
 *    "yaho.com", "hotmial.com") that passes the format check but bounces --
 *    a one-edit-away match against the handful of providers almost everyone
 *    actually uses. It never rewrites the address, only offers "Did you
 *    mean ...?".
 */

// Deliberately narrow: only the providers common enough here that a typo is
// far more likely than a real lookalike domain. A wider list starts flagging
// legitimate small domains.
const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
];

const COMMON_TLDS = ["com", "net", "org", "edu", "co", "io", "ng", "co.uk", "com.ng"];

// Not RFC 5322 -- just enough to reject what a person would recognise as
// broken. One @, something before it, a dotted domain after it, no spaces.
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailFormatError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Enter your email address.";
  if (/\s/.test(value)) return "Email addresses can't contain spaces.";
  const at = value.indexOf("@");
  if (at === -1) return "That doesn't look like an email address -- it's missing an @.";
  if (value.indexOf("@", at + 1) !== -1) return "An email address can only have one @.";
  if (at === 0) return "Add the part before the @ (your username).";
  const domain = value.slice(at + 1);
  if (!domain) return "Add the part after the @ (the domain, like gmail.com).";
  if (!domain.includes(".")) return "The domain looks incomplete -- it should include a dot, like gmail.com.";
  if (domain.startsWith(".") || domain.endsWith(".")) return "The domain can't start or end with a dot.";
  if (domain.includes("..")) return "The domain has a double dot.";
  if (!SHAPE.test(value)) return "That doesn't look like a valid email address.";
  return null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Returns a corrected address to suggest, or null. Only fires on a domain
 * that's close to a known one but not equal to it -- so a valid
 * "gmail.com" never gets flagged, but "gmail.con" / "gmial.com" do.
 */
export function emailDomainSuggestion(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at === -1) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local || !domain || !domain.includes(".")) return null;

  // Exact known domain -- nothing to suggest.
  if (COMMON_DOMAINS.includes(domain)) return null;

  // Whole-domain near match (covers a wrong SLD like "gmial.com" and a
  // wrong TLD like "gmail.con" in one check).
  let best: { domain: string; distance: number } | null = null;
  for (const known of COMMON_DOMAINS) {
    const d = levenshtein(domain, known);
    if (d > 0 && d <= 2 && (!best || d < best.distance)) best = { domain: known, distance: d };
  }
  // A distance of 2 is only trustworthy on a longer domain -- on a short
  // one it's too aggressive (would "aol.com" -> "aol.com"? no, but many
  // 6-8 char domains sit 2 edits from a real one).
  if (best && (best.distance === 1 || domain.length >= 9)) {
    return `${local}@${best.domain}`;
  }

  // Fall back to a TLD-only near match ("gmail.commm", "user@company.con").
  const lastDot = domain.lastIndexOf(".");
  const base = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot + 1);
  if (base && tld && !COMMON_TLDS.includes(tld)) {
    for (const known of COMMON_TLDS) {
      if (levenshtein(tld, known) === 1) return `${local}@${base}.${known}`;
    }
  }

  return null;
}
