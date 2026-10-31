// k6 load test against the STAGING Supabase project only. Run it through
// `node e2e/load/run-load.mjs`, which seeds synthetic users, passes their
// details in as environment variables and removes them afterwards.
//
// Two traffic shapes, kept modest on purpose (staging, like production, is
// on the Free plan's smallest compute):
//   - browse: anonymous visitors reading therapist discovery, a therapist's
//     open slots and the Learning Center, ramping to 20 virtual users;
//   - family: two signed-in parents reading their own children, bookings and
//     reports, ramping to 10 virtual users. Every family response is also
//     checked for the OTHER family's child: isolation has to hold under load
//     too, not only one request at a time.
import http from "k6/http";
import { check, fail } from "k6";
import { Counter } from "k6/metrics";

const URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
if (!URL || !URL.includes("sfvwfbgrfmqaaakbepll")) fail("staging-load: SUPABASE_URL is not the staging project");

const crossFamilyLeaks = new Counter("cross_family_leaks");

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 20 },
        { duration: "1m30s", target: 20 },
        { duration: "30s", target: 0 },
      ],
    },
    family: {
      executor: "ramping-vus",
      exec: "family",
      stages: [
        { duration: "30s", target: 3 },
        { duration: "1m", target: 10 },
        { duration: "1m30s", target: 10 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    "http_req_failed": ["rate<0.01"],
    "http_req_duration{scenario:browse}": ["p(95)<1500"],
    "http_req_duration{scenario:family}": ["p(95)<1500"],
    "cross_family_leaks": ["count==0"],
  },
};

function signIn(email) {
  const res = http.post(
    `${URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password: __ENV.PASSWORD }),
    { headers: { apikey: ANON, "Content-Type": "application/json" } }
  );
  if (res.status !== 200) fail(`sign-in failed for a seeded parent: ${res.status}`);
  return res.json("access_token");
}

// Two sign-ins in total, not one per virtual user: the auth rate limits
// are a separate control and this test is about read capacity.
export function setup() {
  return {
    families: [
      { token: signIn(__ENV.PARENT_A_EMAIL), ownChild: __ENV.CHILD_A_ID, otherChild: __ENV.CHILD_B_ID },
      { token: signIn(__ENV.PARENT_B_EMAIL), ownChild: __ENV.CHILD_B_ID, otherChild: __ENV.CHILD_A_ID },
    ],
  };
}

const anonHeaders = { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } };

export function browse() {
  const list = http.get(`${URL}/rest/v1/therapist_public_profiles?select=*&limit=20`, { ...anonHeaders, tags: { name: "discovery" } });
  check(list, { "discovery 200": (r) => r.status === 200 });
  const slots = http.get(
    `${URL}/rest/v1/availability_slots?select=id,start_time,end_time,session_type&therapist_id=eq.${__ENV.THERAPIST_A_PROFILE_ID}&is_booked=eq.false&start_time=gte.${new Date().toISOString()}`,
    { ...anonHeaders, tags: { name: "open slots" } }
  );
  check(slots, { "slots 200": (r) => r.status === 200 });
  const articles = http.get(`${URL}/rest/v1/learning_articles?select=id,title,slug&limit=20`, { ...anonHeaders, tags: { name: "learning" } });
  check(articles, { "learning 200": (r) => r.status === 200 });
}

export function family(data) {
  const f = data.families[__VU % 2];
  const params = (name) => ({ headers: { apikey: ANON, Authorization: `Bearer ${f.token}` }, tags: { name } });
  for (const [name, path] of [
    ["own children", "children?select=id,first_name"],
    ["own bookings", "bookings?select=id,child_id,status&limit=20"],
    ["own reports", "reports?select=id,status,therapy_sessions(child_id)&limit=20"],
  ]) {
    const res = http.get(`${URL}/rest/v1/${path}`, params(name));
    check(res, { [`${name} 200`]: (r) => r.status === 200 });
    if (res.status === 200 && res.body.includes(f.otherChild)) crossFamilyLeaks.add(1, { name });
  }
}
