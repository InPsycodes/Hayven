-- Pre-session reminders (a day before, and shortly before start) reuse the
-- existing notification/bell machinery -- one new type value, with the
-- 24 h vs "soon" vs therapist-copy variants told apart by entity_type, the
-- same way the cron's other dedup checks already use it.
alter type notification_type add value if not exists 'session_reminder';
