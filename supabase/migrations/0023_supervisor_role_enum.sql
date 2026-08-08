-- Standalone by necessity: Postgres forbids using a new enum value in the
-- same transaction that added it, so this file does nothing else.

alter type user_role add value 'supervisor';
