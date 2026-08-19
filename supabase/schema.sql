-- Run this in the Supabase SQL editor to set up the data hub for attempt history.

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  paper_id text not null,
  paper_title text not null,
  score integer not null,
  total_questions integer not null,
  percentage integer not null,
  time_taken_seconds integer not null,
  question_results jsonb not null,
  category_breakdown jsonb,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table attempts enable row level security;

-- Anonymous practice tool: allow inserts and reads for everyone.
-- Tighten this once you add authentication (e.g. scope by a user_id column).
create policy "Allow insert for all" on attempts
  for insert
  with check (true);

create policy "Allow read for all" on attempts
  for select
  using (true);
