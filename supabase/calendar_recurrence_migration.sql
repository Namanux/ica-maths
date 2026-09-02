-- ══════════════════════════════════════════════════════════════════════════
--  Beehave · calendar recurrence + extra calendars
--  Safe to run repeatedly.
-- ══════════════════════════════════════════════════════════════════════════

-- ─── Custom recurrence on tasks ──────────────────────────────
-- repeat_freq: NULL  -> legacy behaviour (weekly on days_of_week)
--              'none' -> one-off, occurs only on start_date
--              'day' | 'week' | 'month' | 'year'
-- repeat_interval: "every N <freq>"          (default 1)
-- repeat_count:    ends after N occurrences  (NULL = no cap; end_date still applies)
-- start_date doubles as the recurrence anchor for interval math.
alter table tasks add column if not exists repeat_freq     text;
alter table tasks add column if not exists repeat_interval integer not null default 1;
alter table tasks add column if not exists repeat_count    integer;

do $$ begin
  alter table tasks
    add constraint tasks_repeat_freq_chk
    check (repeat_freq is null or repeat_freq in ('none','day','week','month','year'));
exception when duplicate_object then null;
end $$;

-- ─── Extra calendars (personal / non-coin) ───────────────────
-- A profile row with is_personal = true still shows as a calendar column
-- everywhere kids do, but represents the admin's own schedule rather than a
-- coin-earning child.
alter table profiles add column if not exists is_personal boolean not null default false;

-- profiles already carries an `allow_all` RLS policy from beehave_schema.sql,
-- so client inserts for new calendars work without further changes.
