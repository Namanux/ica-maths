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

-- Live activity: one row per profile, upserted continuously while that
-- profile is using the app, so an admin can watch in real time.
create table if not exists live_sessions (
  profile_slug text primary key,
  profile_name text not null,
  section text,
  page_label text,
  paper_id text,
  paper_title text,
  question_number integer,
  total_questions integer,
  answers jsonb,
  last_answer_label text,
  last_answer_correct boolean,
  exam_status text,
  seconds_left integer,
  updated_at timestamptz not null default now()
);

alter table live_sessions enable row level security;

create policy "Allow insert for all" on live_sessions
  for insert
  with check (true);

create policy "Allow read for all" on live_sessions
  for select
  using (true);

create policy "Allow update for all" on live_sessions
  for update
  using (true)
  with check (true);

create policy "Allow delete for all" on live_sessions
  for delete
  using (true);

-- Required for the live dashboard's real-time subscription to receive
-- push updates on this table.
alter publication supabase_realtime add table live_sessions;
