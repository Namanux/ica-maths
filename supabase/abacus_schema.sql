-- Abacus practice module. Run this in the Supabase SQL editor (after
-- schema.sql, which this reuses the same profile_slug convention from).

create table if not exists abacus_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_slug text not null,
  level int not null,
  lesson int not null,
  score int not null,
  accuracy numeric(5,2) not null,
  xp_earned int not null,
  avg_response_time_ms int,
  questions_total int not null,
  questions_correct int not null,
  completed_at timestamptz not null default now()
);

alter table abacus_sessions enable row level security;

create policy "Allow insert for all" on abacus_sessions
  for insert
  with check (true);

create policy "Allow read for all" on abacus_sessions
  for select
  using (true);

-- Student XP and progress, one row per profile.
create table if not exists abacus_progress (
  profile_slug text primary key,
  total_xp int not null default 0,
  current_level int not null default 1,
  highest_lesson_unlocked int not null default 1,
  updated_at timestamptz not null default now()
);

alter table abacus_progress enable row level security;

create policy "Allow insert for all" on abacus_progress
  for insert
  with check (true);

create policy "Allow read for all" on abacus_progress
  for select
  using (true);

create policy "Allow update for all" on abacus_progress
  for update
  using (true)
  with check (true);
