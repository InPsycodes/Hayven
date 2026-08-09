-- Additive: antecedent_category is a fixed dropdown (transition, denied,
-- non_preferred, attention, peer, wait, other) sitting alongside the existing
-- free-text `antecedent` detail field. Lets pattern detection in the report
-- generator do an exact GROUP BY instead of guessing from keyword overlap in
-- free text. Nullable so existing rows and any future free-text-only entry
-- (no category picked) keep working exactly as before.

alter table public.session_abc_observations
  add column antecedent_category text;
