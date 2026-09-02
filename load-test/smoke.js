import http from "k6/http";
import { check, group } from "k6";

import { BASE_URL, discoverUrls, pageCheck, catalogue, pick } from "./config.js";

// Smoke: one user, one pass over every public route. Run this first, every
// time, before browse.js / stress.js — it catches a broken deploy, a missing
// env var, or an unseeded DB in ~15s without generating load.
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

export function setup() {
  return discoverUrls();
}

export default function (data) {
  group("static pages", () => {
    for (const path of ["/", "/about", "/learn", "/search", "/needs-assessment", "/privacy", "/terms"]) {
      pageCheck(http.get(`${BASE_URL}${path}`), path);
    }
  });

  group("search filters", () => {
    pageCheck(
      http.get(`${BASE_URL}/search?specialty=${encodeURIComponent(pick(catalogue.SPECIALTIES))}`),
      "search?specialty"
    );
    pageCheck(
      http.get(`${BASE_URL}/search?location=${encodeURIComponent(pick(catalogue.LOCATIONS))}&sort=rating`),
      "search?location&sort"
    );
    pageCheck(http.get(`${BASE_URL}/search?available=2w`), "search?available");
  });

  group("dynamic content", () => {
    if (data.articles.length) pageCheck(http.get(`${BASE_URL}${data.articles[0]}`), "learn article");
    if (data.therapists.length) pageCheck(http.get(`${BASE_URL}${data.therapists[0]}`), "therapist profile");
  });

  group("infra", () => {
    const res = http.get(`${BASE_URL}/sitemap.xml`);
    check(res, {
      "sitemap.xml — 200": (r) => r.status === 200,
      "sitemap.xml — is xml": (r) => (r.body || "").includes("<urlset"),
    });
  });
}
