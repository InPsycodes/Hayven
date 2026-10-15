# Backup and restore drill

**Status:** draft checklist, not yet run. Written 2026-09-24 alongside DPIA risk #12
(no tested recovery path) and P0-8. A backup that has never been restored is not a
backup, so this document is the drill that proves it.

**Owner:** the founder, with the DPO signing off the result.
**When to run it:** once immediately after Point-in-Time Recovery (PITR) is enabled, then
quarterly, and after any major schema change.

Some Supabase behaviour below (plan tiers, retention windows, whether a restore can go
to a new project) changes over time. Confirm each "verify" item in the Supabase
dashboard or docs before relying on it, and write down what you find.

---

## 1. Turn it on (dashboard, one time)

1. Supabase, production project, **Database, Backups, Point in Time**.
2. Enable PITR. It needs the Pro plan plus the PITR add-on; pick a retention window
   (7, 14 or 28 days). Pick the longest you can justify: a problem is often noticed
   days later.
3. Note the **date and time it was enabled**. PITR can only restore to moments after
   that. Record it in section 6.

Confirm it took effect: the Point in Time tab shows an earliest restorable time.

## 2. What is and is not covered

| Data | Covered by database PITR? |
|---|---|
| Tables, rows, RLS policies, functions, triggers, migrations | Yes |
| Auth users and their password hashes, MFA factors | Yes (auth schema is in the database) |
| **Files in Supabase Storage** (therapist credential documents, profile photos) | **No.** The database holds only the file records, not the files. Verify in Supabase docs. |
| Vercel environment variables, Flutterwave, Resend, PostHog data | No, separate systems |

**Open gap to close:** decide how credential documents and photos are backed up
(a scheduled export of the storage buckets to a location you control, or storage
replication if the plan offers it), and test restoring one file. Without it a full
restore brings back the records but not the documents.

## 3. Never rehearse on production

A PITR restore **overwrites the project it is run against** and takes it offline while
it runs. Do not test by restoring production in place.

Pick one:

- **A. Restore into a new project** (verify: Supabase offers "restore to a new
  project" on your plan). Best, because production is untouched.
- **B. Rehearse on the staging project.** Enable PITR there for a day, run steps 4 to
  6 against it, then disable it.

Whichever you use, the restored copy has its own URL and API keys, so the app does not
see it until you point a preview deployment at it.

## 4. The drill

Do this on staging or the restored copy, never on production.

1. **Before.** Record a snapshot for comparison:
   - row counts for `users`, `children`, `therapist_profiles`, `therapy_sessions`,
     `reports`, `bookings`, `payments`, `audit_log`;
   - the newest `audit_log.created_at`;
   - the list of RLS-enabled tables:
     `select tablename from pg_tables where schemaname = 'public' and rowsecurity;`
2. **Plant a marker.** Insert a clearly named test row (for example a support request
   titled "RESTORE MARKER") and note the exact time, **T1**. Wait two minutes.
3. **Simulate the accident.** Delete the marker row and a handful of other test rows
   at **T2**. Note the time.
4. **Restore** to a point just after T1 and before T2.
5. Start a stopwatch when you press restore and stop it when the project is usable
   again. That is your **recovery time**.
6. **After.** Check each item in section 5.

## 5. What "restored correctly" means

- [ ] The marker row and the deleted test rows are back.
- [ ] Row counts match the "before" snapshot (allowing for the rows you deleted).
- [ ] The latest migration's objects exist (for example the `caller_is_active` and
      `is_supervised_report` functions) and no migration is missing.
- [ ] The same tables have RLS enabled as before.
- [ ] A QA parent, therapist and admin can each log in.
- [ ] A therapist still cannot read a child who is not assigned to them (run the RLS
      integration tests against the restored copy).
- [ ] The newest `audit_log` entry is close to T1, not older.
- [ ] A preview deployment pointed at the restored copy loads a dashboard.

## 6. Record the result

| Date | Where restored | PITR enabled at | Restore point | Recovery time | Data loss window | Everything in section 5 ticked? | Done by |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

"Data loss window" is the gap between the chosen restore point and the last change
you could not recover. PITR normally keeps this to minutes, but write down what you
actually observed.

DPO sign-off: ____________________  Date: ____________

## 7. If it ever happens for real

1. Stop the damage: put the app in maintenance or pause the writes (suspend the affected
   accounts, pause payouts).
2. Decide the restore point with the DPO. Note that everything written after that
   point is lost, so also note what that includes.
3. If personal data was lost, exposed or altered, follow
   [breach-response-runbook.md](breach-response-runbook.md) at the same time. The
   72-hour NDPC clock may already be running.
4. Restore. Point the app at the restored project (URL and keys change if it is a new
   project, so update the Vercel environment variables and redeploy).
5. **Reconcile money before anything else runs.** Bookings and payments made between the
   restore point and the incident exist at Flutterwave but may not exist in the database.
   Run the payments reconciliation before the Monday payout, and hold payouts until
   it is clean, so nobody is paid twice or not at all.
6. Expect some duplicate emails and push notifications from jobs that re-run.
7. Tell affected users what happened and what to re-do (for example a booking made
   just before the incident), and write it up for the DPIA review.
