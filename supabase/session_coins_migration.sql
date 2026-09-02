-- ══════════════════════════════════════════════════════════════════════════
--  Beehave · record how long a session actually ran on its completion row
--  so the parent's approval card can show "ran N / target" and the
--  linear time-based coin score is auditable. Safe to run repeatedly.
-- ══════════════════════════════════════════════════════════════════════════
alter table task_completions add column if not exists time_spent_secs integer;
