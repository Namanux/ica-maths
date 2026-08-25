-- Abacus progression engine + admin dashboard support.
-- Safe to run multiple times — every change is guarded.
-- Run this after abacus_schema.sql.

-- Progression position, teacher-tunable settings, and session counter.
-- total_sessions isn't in the original spec's ALTER list but is required by
-- saveProgressionResult / getAllStudents below, so it's added here too.
alter table abacus_progress
  add column if not exists content_block int not null default 1,
  add column if not exists speed_seconds int not null default 15,
  add column if not exists display_level int not null default 1,
  add column if not exists accuracy_threshold int not null default 100,
  add column if not exists questions_per_session int not null default 5,
  add column if not exists total_sessions int not null default 0;

-- Record what content/speed a session was actually played at.
alter table abacus_sessions
  add column if not exists speed_seconds int,
  add column if not exists content_block int,
  add column if not exists avg_response_time_ms int;

-- Admin roster of enrolled students.
create table if not exists abacus_students (
  student_id text primary key,
  display_name text not null,
  enrolled_at timestamptz not null default now(),
  is_active boolean not null default true
);

alter table abacus_students enable row level security;

create policy "Allow insert for all" on abacus_students
  for insert
  with check (true);

create policy "Allow read for all" on abacus_students
  for select
  using (true);

create policy "Allow update for all" on abacus_students
  for update
  using (true)
  with check (true);

insert into abacus_students (student_id, display_name)
values ('naman', 'Naman')
on conflict do nothing;
