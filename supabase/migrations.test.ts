import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// Static guard over supabase/migrations, run with the unit tests in CI
// (audit 2026-10-29, F-07). Supabase grants new public tables to `anon` and
// `authenticated` by default, so a table created without row-level security
// is open to anyone with the public anon key. These checks need no database.

const DIR = join(__dirname, "migrations");
const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const sql = files.map((f) => ({
  file: f,
  text: readFileSync(join(DIR, f), "utf8").replace(/--.*$/gm, ""),
}));
const all = sql.map((s) => s.text).join("\n");

// Logged-out pages read these, and they carry "anyone can read" policies.
// Keep in step with 0113_revoke_anon_from_private_tables.sql.
const ANON_READABLE = new Set([
  "specialties",
  "therapist_profiles",
  "therapist_specialties",
  "availability_slots",
  "therapist_reviews",
  "learning_categories",
  "learning_articles",
  "learning_resources",
  "therapist_public_profiles",
]);

/** Current table name -> where it was created, and every name it has had (RLS survives a rename). */
function createdTables(): Map<string, { file: string; names: string[] }> {
  const out = new Map<string, { file: string; names: string[] }>();
  for (const { file, text } of sql) {
    for (const m of text.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)) out.set(m[1], { file, names: [m[1]] });
    for (const m of text.matchAll(/alter table (?:if exists )?(?:public\.)?(\w+)\s+rename to (\w+)/gi)) {
      const entry = out.get(m[1]);
      if (entry) {
        out.delete(m[1]);
        out.set(m[2], { file: entry.file, names: [...entry.names, m[2]] });
      }
    }
  }
  return out;
}

describe("migrations", () => {
  it("enable row-level security on every table they create", () => {
    const missing: string[] = [];
    for (const [table, { file, names }] of createdTables()) {
      const enabled = names.some((name) =>
        new RegExp(`alter table (?:if exists )?(?:public\\.)?${name}\\s+enable row level security`, "i").test(all)
      );
      if (!enabled) missing.push(`${table} (created in ${file})`);
    }
    expect(missing, "tables without row-level security").toEqual([]);
  });

  it("only grant the anon role on the public, logged-out tables", () => {
    const offending: string[] = [];
    // Only migrations after 0113, which reset anon's grants; earlier blanket
    // grants (0003) are revoked by it.
    for (const { file, text } of sql.filter((s) => s.file > "0113")) {
      for (const m of text.matchAll(/grant\s+[^;]*?\s+on\s+(?:table\s+)?(?:public\.)?(\w+)[^;]*?\bto\s+[^;]*\banon\b/gi)) {
        if (!ANON_READABLE.has(m[1])) offending.push(`${m[1]} in ${file}`);
      }
    }
    expect(offending, "anon grants on non-public tables").toEqual([]);
  });

  it("keep 0113's allowlist in step with this test", () => {
    const migration = sql.find((s) => s.file.startsWith("0113"))!.text;
    const arrayLiteral = migration.match(/public_tables text\[\] := array\[([\s\S]*?)\]/)?.[1] ?? "";
    const listed = [...arrayLiteral.matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(new Set(listed)).toEqual(new Set([...ANON_READABLE].filter((t) => t !== "therapist_public_profiles")));
  });
});
