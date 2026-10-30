import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it, expect, afterAll, beforeAll } from "vitest";

import {
  createTestParent,
  createTestTherapist,
  makeAdmin,
  signInAs,
  signOut,
  cleanupAll,
  type TestParent,
  type TestTherapist,
} from "./helpers";

// Audit 2026-10-29, phase 5 (function-level authorisation). Every export of a
// "use server" file is a public endpoint a browser can call directly. This
// finds every server action whose body gates on the admin role (or on being
// a safeguarding lead, who must be an admin) and calls each one as a signed-in
// parent and as a signed-in therapist. Each call must be refused: an
// { ok: false } / { error } result, or a redirect to /login. Discovery is by
// scanning the source, so admin actions added later are covered automatically.

const SRC = join(__dirname, "../../src");
const ADMIN_GATE = /role\s*!==\s*["']admin["']|requireAdmin\(|isSafeguardingLead\(/;

interface AdminAction {
  module: string; // "@/lib/..."
  name: string;
  params: string[];
}

function discoverAdminActions(): AdminAction[] {
  const found: AdminAction[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry)) {
        const src = readFileSync(path, "utf8");
        if (!/^\s*["']use server["']/m.test(src.slice(0, 200))) continue;
        const re = /export async function (\w+)\s*\(([^)]*)\)/g;
        const starts: { name: string; params: string; at: number }[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) starts.push({ name: m[1], params: m[2], at: m.index });
        starts.forEach((s, i) => {
          const body = src.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : src.length);
          if (!ADMIN_GATE.test(body)) return;
          const params = s.params
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          const mod = "@/" + relative(SRC, path).replace(/\\/g, "/").replace(/\.tsx?$/, "");
          found.push({ module: mod, name: s.name, params });
        });
      }
    }
  })(SRC);
  return found;
}

// Plausible arguments by parameter shape, so a call reaches the auth check
// rather than failing on argument types first.
function argsFor(params: string[]): unknown[] {
  return params.map((p) => {
    const [rawName, type = ""] = p.split(":").map((s) => s.trim());
    const name = rawName.replace(/\?$/, "");
    if (/FormData/.test(type) || /formData/i.test(name)) {
      const fd = new FormData();
      fd.set("id", "00000000-0000-0000-0000-000000000000");
      return fd;
    }
    if (/prevState|_prev/i.test(name)) return {};
    if (/boolean/.test(type)) return true;
    if (/number/.test(type)) return 1;
    if (/\[\]/.test(type)) return [];
    if (/string/.test(type) || /Id$|id$/.test(name)) return "00000000-0000-0000-0000-000000000000";
    return {};
  });
}

type Outcome = "refused" | "allowed" | "inconclusive";

function classify(result: unknown, thrown: unknown): { outcome: Outcome; detail: string } {
  if (thrown) {
    const digest = String((thrown as { digest?: string })?.digest ?? "");
    const message = String((thrown as Error)?.message ?? thrown);
    if (digest.includes("NEXT_REDIRECT") || message.includes("NEXT_REDIRECT")) {
      // The digest is "NEXT_REDIRECT;<type>;<url>;<status>;". Only a bounce
      // to /login is an auth refusal; a redirect elsewhere (e.g. back to the
      // clinic page with a validation error) means the gate was passed.
      const url = digest.split(";")[2] ?? "";
      return url.startsWith("/login")
        ? { outcome: "refused", detail: "redirect to /login" }
        : { outcome: "inconclusive", detail: `redirect past the gate to ${url}` };
    }
    return { outcome: "inconclusive", detail: `threw: ${message.slice(0, 120)}` };
  }
  if (result && typeof result === "object") {
    const r = result as { ok?: boolean; error?: string };
    if (r.ok === false || typeof r.error === "string") return { outcome: "refused", detail: r.error ?? "ok:false" };
    if (r.ok === true) return { outcome: "allowed", detail: "ok:true" };
  }
  return { outcome: "inconclusive", detail: `returned ${JSON.stringify(result)?.slice(0, 80)}` };
}

// A refusal only counts if it's an authorisation refusal -- not, say, a
// validation error on the dummy arguments that happens to come first.
const AUTH_REFUSAL = /redirect to \/login|not authori[sz]ed|not allowed|must be signed in|sign in|log in|admin|safeguarding leads/i;

async function callAll(): Promise<{ action: AdminAction; outcome: Outcome; detail: string }[]> {
  const out: { action: AdminAction; outcome: Outcome; detail: string }[] = [];
  for (const action of actions) {
    const mod = (await import(/* @vite-ignore */ action.module)) as Record<string, (...a: unknown[]) => unknown>;
    let result: unknown;
    let thrown: unknown;
    try {
      result = await mod[action.name](...argsFor(action.params));
    } catch (err) {
      thrown = err;
    }
    out.push({ action, ...classify(result, thrown) });
  }
  return out;
}

const actions = discoverAdminActions();
let parent: TestParent;
let therapist: TestTherapist;
let adminUser: TestParent;

beforeAll(async () => {
  parent = await createTestParent();
  therapist = await createTestTherapist();
  adminUser = await createTestParent();
  await makeAdmin(adminUser.userId);
}, 60_000);

afterAll(async () => {
  signOut();
  await cleanupAll();
}, 60_000);

describe("admin-only server actions refuse non-admin callers", () => {
  it("discovers the admin actions to test", () => {
    expect(actions.length).toBeGreaterThan(20);
  });

  for (const role of ["parent", "therapist"] as const) {
    it(`every admin action refuses a signed-in ${role}`, async () => {
      await signInAs(role === "parent" ? parent : therapist);
      const results = await callAll();
      const allowed = results.filter((r) => r.outcome === "allowed").map((r) => `${r.action.module}#${r.action.name}`);
      const notAuthRefusal = results
        .filter((r) => r.outcome !== "allowed" && !AUTH_REFUSAL.test(r.detail))
        .map((r) => `${r.action.module}#${r.action.name} -> ${r.detail}`);
      console.log(
        `[${role}] ${results.length} admin actions called; allowed=${allowed.length}, refused for another reason=${notAuthRefusal.length}`
      );
      if (notAuthRefusal.length) console.log(`  ${notAuthRefusal.join("\n  ")}`);
      expect(allowed, `admin actions that let a ${role} through`).toEqual([]);
      expect(notAuthRefusal, `admin actions that refused a ${role} for a non-auth reason`).toEqual([]);
    }, 300_000);
  }

  // Control: a real admin must get PAST the gate, or the refusals above prove
  // nothing. Dummy ids point at nothing, so a passed call ends in "not found"
  // or similar -- the point is only that it isn't an auth refusal. Runs
  // against the staging project only.
  it("a real admin gets past the gate on the same calls (control)", async () => {
    await signInAs(adminUser);
    const results = await callAll();
    const authRefused = results.filter((r) => r.outcome === "refused" && AUTH_REFUSAL.test(r.detail));
    console.log(`[admin] ${results.length} called; auth-refused=${authRefused.length}`);
    if (authRefused.length) console.log(`  ${authRefused.map((r) => `${r.action.module}#${r.action.name} -> ${r.detail}`).join("\n  ")}`);
    // Safeguarding actions also need the admin to be a designated lead; with
    // no leads designated every admin counts (src/lib/safeguarding/leads.ts),
    // so none should be auth-refused here.
    expect(authRefused).toEqual([]);
  }, 300_000);
});
