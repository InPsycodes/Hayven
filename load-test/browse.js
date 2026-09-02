import http from "k6/http";
import { group } from "k6";

import {
  BASE_URL,
  thresholds,
  think,
  pageCheck,
  discoverUrls,
  catalogue,
  pick,
} from "./config.js";

/**
 * The main load scenario: anonymous visitors doing the "find a therapist"
 * journey. All reads, no auth, no writes, no Paystack — this measures SSR
 * capacity, the discovery query, and the Supabase read path under a realistic
 * pilot-launch traffic shape.
 *
 * Default shape: warm up to 20 concurrent, hold, push to 50, hold, ramp down
 * (~11 min). Override without editing:
 *   k6 run -e BASE_URL=... -e PEAK=80 -e HOLD=8m load-test/browse.js
 */
const PEAK = Number(__ENV.PEAK || 50);
const RAMP = __ENV.RAMP || "1m";
const HOLD = __ENV.HOLD || "3m";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: RAMP, target: Math.ceil(PEAK * 0.4) },
        { duration: HOLD, target: Math.ceil(PEAK * 0.4) },
        { duration: RAMP, target: PEAK },
        { duration: HOLD, target: PEAK },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds,
};

export function setup() {
  return discoverUrls();
}

export default function (data) {
  group("01 landing", () => {
    pageCheck(http.get(`${BASE_URL}/`, { tags: { kind: "document" } }), "home");
    think(1, 3);
  });

  group("02 learn", () => {
    pageCheck(http.get(`${BASE_URL}/learn`, { tags: { kind: "document" } }), "learn index");
    if (data.articles.length) {
      think(0.5, 2);
      pageCheck(
        http.get(`${BASE_URL}${pick(data.articles)}`, { tags: { kind: "document" } }),
        "learn article"
      );
    }
    think(1, 3);
  });

  group("03 search", () => {
    pageCheck(http.get(`${BASE_URL}/search`, { tags: { kind: "document" } }), "search all");
    think(1, 3);

    const specialty = encodeURIComponent(pick(catalogue.SPECIALTIES));
    const sessionType = pick(catalogue.SESSION_TYPES);
    pageCheck(
      http.get(`${BASE_URL}/search?specialty=${specialty}&sessionType=${sessionType}`, {
        tags: { kind: "document" },
      }),
      "search filtered"
    );
    think(1, 4);

    const sort = pick(catalogue.SORTS);
    const location = encodeURIComponent(pick(catalogue.LOCATIONS));
    pageCheck(
      http.get(`${BASE_URL}/search?location=${location}${sort ? `&sort=${sort}` : ""}`, {
        tags: { kind: "document" },
      }),
      "search sorted"
    );
    think(1, 3);
  });

  group("04 therapist profile", () => {
    if (data.therapists.length) {
      pageCheck(
        http.get(`${BASE_URL}${pick(data.therapists)}`, { tags: { kind: "document" } }),
        "therapist profile"
      );
      think(2, 6);
    }
  });

  group("05 needs assessment", () => {
    pageCheck(
      http.get(`${BASE_URL}/needs-assessment`, { tags: { kind: "document" } }),
      "needs assessment"
    );
    think(2, 5);
  });
}
