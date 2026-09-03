import http from "k6/http";
import { check, sleep } from "k6";

// Point this at a STAGING/PREVIEW deploy, never production. See README.md.
//   k6 run -e BASE_URL=https://hayven-git-staging-xxx.vercel.app load-test/browse.js
export const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

// Hard stop: this suite creates real load and the discovery path reads the
// live therapist table. Running it against the production hostname would
// degrade the service for real families and skew the analytics we just wired
// up. A throwaway environment is the only correct target.
if (/hayven\.com\.ng|hayven\.com|www\.hayven/.test(BASE_URL)) {
  throw new Error(
    `Refusing to load test "${BASE_URL}". Set BASE_URL to a staging/preview deploy backed by a throwaway Supabase project.`
  );
}

// Pass/fail gates for a run. Tuned for a pilot on Vercel's serverless
// functions + Supabase (small instance). Loosen deliberately, with a note in
// the run log, rather than silently.
export const thresholds = {
  http_req_failed: ["rate<0.01"], // < 1% of requests error
  http_req_duration: ["p(95)<1500", "p(99)<3500"],
  "http_req_duration{kind:document}": ["p(95)<1800"], // full SSR page
  checks: ["rate>0.99"],
};

const SPECIALTIES = [
  "Speech Therapy",
  "Occupational Therapy",
  "Applied Behaviour Analysis",
  "Behavioural Therapy",
  "Early Intervention",
];
const LOCATIONS = ["Lagos", "Abuja", "Ikeja", "Lekki", "Port Harcourt"];
const SESSION_TYPES = ["virtual", "in_person"];
const SORTS = ["", "rating", "price_asc", "experience"];

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
export const catalogue = { SPECIALTIES, LOCATIONS, SESSION_TYPES, SORTS };

/** Human-ish pause between actions. */
export function think(min = 1, max = 4) {
  sleep(Math.random() * (max - min) + min);
}

/** Standard assertions for an HTML page response. */
export function pageCheck(res, name) {
  return check(res, {
    [`${name} — 200`]: (r) => r.status === 200,
    [`${name} — html body`]: (r) =>
      typeof r.body === "string" && /<!doctype html>/i.test(r.body),
    [`${name} — not an error page`]: (r) =>
      !/Application error|500 - Internal/i.test(r.body || ""),
  });
}

/**
 * Runs once before the test. Pulls the real set of public URLs from the
 * sitemap so the browse mix hits actual therapist profiles and Learn
 * articles without hardcoding ids that rot.
 */
export function discoverUrls() {
  const res = http.get(`${BASE_URL}/sitemap.xml`);
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(res.body)) !== null) {
    urls.push(m[1].replace(/^https?:\/\/[^/]+/, ""));
  }
  const therapists = urls.filter((u) => u.includes("/therapists/"));
  const articles = urls.filter((u) => u.includes("/learn/"));
  console.log(
    `sitemap: ${urls.length} urls (${therapists.length} therapist profiles, ${articles.length} articles)`
  );
  if (therapists.length === 0) {
    console.warn(
      "No verified therapist profiles in the sitemap — seed the staging DB first or the profile mix is a no-op (see README)."
    );
  }
  return { therapists, articles };
}
