-- The `no_show` booking status has existed since 0001 but nothing ever set
-- it -- a family that simply didn't turn up was indistinguishable from a
-- completed session. These columns back a therapist-set no-show flag (the
-- write still goes through the service-role client with an app-level
-- ownership check, same as every other booking write; bookings' UPDATE
-- policy stays admin-only per 0018/0030).

alter table public.bookings
  add column no_show_at timestamptz,
  add column no_show_note text;
