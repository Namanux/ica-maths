-- Run this in the Supabase SQL editor to set up the data hub for attempt history.

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null,
  paper_title text not null,
  profile_slug text,
  score integer not null,
  total_questions integer not null,
  percentage integer not null,
  time_taken_seconds integer not null,
  question_results jsonb not null,
  category_breakdown jsonb,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Migration for existing databases created before profile_slug existed:
-- alter table attempts add column if not exists profile_slug text;

alter table attempts enable row level security;

-- Anonymous practice tool: allow inserts and reads for everyone.
-- Tighten this once you add authentication (e.g. scope by a user_id column).
create policy "Allow insert for all" on attempts
  for insert
  with check (true);

create policy "Allow read for all" on attempts
  for select
  using (true);

create policy "Allow delete for all" on attempts
  for delete
  using (true);

-- Questions flagged by users as having an issue (wrong answer, bad image, etc).
create table if not exists question_flags (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null,
  paper_title text not null,
  question_id text not null,
  question_number integer not null,
  profile_slug text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table question_flags enable row level security;

create policy "Allow insert for all" on question_flags
  for insert
  with check (true);

create policy "Allow read for all" on question_flags
  for select
  using (true);

create policy "Allow delete for all" on question_flags
  for delete
  using (true);
