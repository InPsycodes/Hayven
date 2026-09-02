import http from "k6/http";
import { group } from "k6";

import { BASE_URL, think, pageCheck, discoverUrls, catalogue, pick } from "./config.js";

/**
 * Stress: push past the expected peak in steps until something gives, to find
 * where the knee is (latency climbs, errors start, a Supabase connection
 * limit or a Vercel concurrency cap bites). No pass/fail thresholds here —
 * the point is the shape of the curve, read from the summary and (ideally)
 * the Vercel + Supabase dashboards during the run.
 *
 *   k6 run -e BASE_URL=https://staging.example load-test/stress.js
 */
export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: "2m", target: 20 }, // 20 req/s
        { duration: "2m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "2m", target: 200 },
        { duration: "2m", target: 300 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  // Abort early if the deploy is clearly falling over — no point cooking a
  // staging box for 10 more minutes once it's returning 5xx to half of
  // requests.
  thresholds: {
    http_req_failed: [{ threshold: "rate<0.25", abortOnFail: true, delayAbortEval: "30s" }],
  },
};

export function setup() {
  return discoverUrls();
}

export default function (data) {
  // A lighter mix than browse.js — the two heaviest reads (search + a profile)
  // plus the home page, no think time padding beyond a short pause.
  group("stress mix", () => {
    pageCheck(http.get(`${BASE_URL}/`, { tags: { kind: "document" } }), "home");

    const specialty = encodeURIComponent(pick(catalogue.SPECIALTIES));
    pageCheck(
      http.get(`${BASE_URL}/search?specialty=${specialty}&sort=${pick(catalogue.SORTS) || "rating"}`, {
        tags: { kind: "document" },
      }),
      "search"
    );

    if (data.therapists.length) {
      pageCheck(
        http.get(`${BASE_URL}${pick(data.therapists)}`, { tags: { kind: "document" } }),
        "therapist profile"
      );
    }
    think(0.2, 1);
  });
}
