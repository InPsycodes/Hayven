-- Migration 0055's revoke didn't actually close the hole: Postgres grants
-- EXECUTE on a newly created function to the PUBLIC pseudo-role by default,
-- and 0046's original `create function` never revoked that. Every real role
-- -- including anon and authenticated -- is automatically a member of
-- PUBLIC, so `revoke ... from anon, authenticated` in 0055 was a no-op in
-- the presence of the standing PUBLIC grant; the function remained callable
-- by anyone with the public anon key exactly as before. Confirmed via a
-- live re-test of the same direct-RPC exploit 0055 was meant to close.
--
-- The actual fix is revoking from PUBLIC specifically.

revoke execute on function public.check_rate_limit(text, int, int) from public;
