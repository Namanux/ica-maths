-- ============================================================
--  Beehave schema for the Honeycomb Supabase project
--  Run once in: Supabase Dashboard -> SQL Editor -> New query
--
--  Consolidates Kids Karma's schema.sql + phase3_migration.sql +
--  session_runs_migration.sql, with Honeycomb changes:
--    * profiles.slug  (the bridge from the Honeycomb URL slug)
--    * seed rows for naman / aaron / aarya / guest, coin_balance = 0
--    * task_completions / coin_transactions / session_runs / initiatives
--      start EMPTY (fresh count from today)
--  Idempotent: safe to re-run.
-- ============================================================

create extension if not exists "pgcrypto";

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid references auth.users(id) on delete set null,
  slug          text unique,                         -- Honeycomb profile slug
  name          text not null,
  role          text not null check (role in ('admin','co-admin','kid')),
  email         text,
  pin           text,
  avatar_emoji  text default '😊',
  avatar_color  text default '#4f8ef7',
  coin_balance  integer not null default 0,
  total_earned  integer not null default 0,
  streak_count  integer not null default 0,
  last_streak_date date,
  created_at    timestamptz default now()
);
-- If the table already existed without slug:
alter table profiles add column if not exists slug text;
do $$ begin
  alter table profiles add constraint profiles_slug_key unique (slug);
exception when duplicate_table or duplicate_object then null;
end $$;

-- ─── TASKS ───────────────────────────────────────────────────
create table if not exists tasks (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  description              text,
  icon                     text not null default '⭐',
  note                     text,
  assigned_to              uuid references profiles(id) on delete cascade,
  days_of_week             integer[] not null default '{1,2,3,4,5}',  -- 0=Sun … 6=Sat
  start_time               time not null,
  deadline_time            time,
  expiry_time              time,
  start_date               date,
  end_date                 date,
  task_type                text not null default 'task'
                           check (task_type in ('task','session','focus')),
  target_duration          integer,                  -- session length, seconds
  full_coins               integer not null default 20,
  min_coins                integer not null default 5,
  penalty_coins            integer not null default 10,
  approval                 text not null default 'auto' check (approval in ('auto','review')),
  requires_approval        boolean not null default false,
  requires_approval_every  integer not null default 3,
  requires_photo           boolean not null default false,
  created_by_kid           boolean not null default false,
  is_kid_created           boolean not null default false,
  pending_parent_review    boolean not null default false,
  is_active                boolean not null default true,
  created_by               uuid references profiles(id),
  created_at               timestamptz default now()
);
-- Bring an existing tasks table up to spec:
alter table tasks add column if not exists note text;
alter table tasks add column if not exists start_date date;
alter table tasks add column if not exists end_date date;
alter table tasks add column if not exists task_type text not null default 'task';
alter table tasks add column if not exists target_duration integer;
alter table tasks add column if not exists approval text not null default 'auto';
alter table tasks add column if not exists requires_approval boolean not null default false;
alter table tasks add column if not exists requires_photo boolean not null default false;
alter table tasks add column if not exists created_by_kid boolean not null default false;
alter table tasks add column if not exists is_kid_created boolean not null default false;
alter table tasks add column if not exists pending_parent_review boolean not null default false;
alter table tasks alter column deadline_time drop not null;
alter table tasks alter column expiry_time drop not null;

-- ─── TASK COMPLETIONS ────────────────────────────────────────
create table if not exists task_completions (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid references tasks(id) on delete cascade,
  kid_id           uuid references profiles(id) on delete cascade,
  scheduled_date   date not null,
  completed_at     timestamptz default now(),
  coins_earned     integer not null,
  status           text not null default 'auto_approved'
                   check (status in ('auto_approved','pending_approval','approved','rejected')),
  completion_count integer,
  photo_path       text,
  approved_by      uuid references profiles(id),
  approved_at      timestamptz,
  parent_note      text,
  kid_note         text,
  unique (task_id, kid_id, scheduled_date)
);
alter table task_completions add column if not exists photo_path text;

-- ─── COIN TRANSACTIONS ───────────────────────────────────────
create table if not exists coin_transactions (
  id               uuid primary key default gen_random_uuid(),
  kid_id           uuid references profiles(id) on delete cascade,
  amount           integer not null,
  reason           text not null,
  transaction_type text not null
                   check (transaction_type in ('task_reward','penalty','redemption','bonus','adjustment','refund')),
  reference_id     uuid,
  created_at       timestamptz default now()
);

-- ─── SESSION RUNS ────────────────────────────────────────────
create table if not exists session_runs (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid references tasks(id) on delete cascade,
  kid_id         uuid references profiles(id) on delete cascade,
  scheduled_date date not null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  duration_secs  integer,
  created_at     timestamptz default now()
);

-- ─── INITIATIVES ─────────────────────────────────────────────
create table if not exists initiatives (
  id                uuid primary key default gen_random_uuid(),
  kid_id            uuid references profiles(id) on delete cascade,
  note              text,
  before_photo_path text,
  after_photo_path  text,
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  coins_awarded     integer,
  decided_by        uuid references profiles(id),
  decided_at        timestamptz,
  created_at        timestamptz default now()
);

-- ─── REWARDS ─────────────────────────────────────────────────
create table if not exists rewards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  icon         text default '🎁',
  coin_cost    integer not null,
  reward_type  text default 'custom' check (reward_type in ('screen_time','money','custom')),
  reward_value numeric,
  is_active    boolean default true,
  created_by   uuid references profiles(id),
  created_at   timestamptz default now()
);

-- ─── REWARD REDEMPTIONS ──────────────────────────────────────
create table if not exists reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid references profiles(id) on delete cascade,
  reward_id   uuid references rewards(id),
  coins_spent integer not null,
  status      text default 'pending' check (status in ('pending','approved','rejected')),
  parent_note text,                         -- note left when the parent accepts
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at  timestamptz default now()
);
alter table reward_redemptions add column if not exists parent_note text;

-- ─── MESSAGES ────────────────────────────────────────────────
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid references profiles(id) on delete cascade,
  to_id      uuid references profiles(id) on delete cascade,  -- null = all kids
  content    text not null,
  is_read    boolean default false,
  created_at timestamptz default now()
);

-- ─── POLICING (inverse of rewards — see supabase/policing_migration.sql) ─
create table if not exists policing_tasks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  icon        text default '🚨',
  coins       integer not null default 20,
  is_active   boolean default true,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);
create table if not exists policing_events (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references policing_tasks(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete cascade,
  target_id   uuid references profiles(id) on delete cascade,
  coins       integer not null,
  status      text not null default 'reminded'
              check (status in ('reminded','done','cancelled')),
  created_at  timestamptz default now(),
  resolved_at timestamptz
);
create index if not exists policing_events_target_idx
  on policing_events (target_id, created_at desc);
create index if not exists policing_events_actor_idx
  on policing_events (actor_id, status, created_at desc);

-- ─── TASK OVERRIDES (per-day "just today" schedule changes) ──
create table if not exists task_overrides (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid references tasks(id) on delete cascade,
  date          date not null,
  start_time    time,
  expiry_time   time,
  deadline_time time,
  created_at    timestamptz default now(),
  unique (task_id, date)
);

-- ─── ROW LEVEL SECURITY (permissive MVP — tighten before prod) ─
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','tasks','task_completions','coin_transactions','session_runs',
    'initiatives','rewards','reward_redemptions','messages',
    'policing_tasks','policing_events','task_overrides'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists allow_all on %I', t);
    execute format('create policy allow_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ─── STORAGE: task-photos bucket ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

drop policy if exists "allow_all_task_photos_select" on storage.objects;
drop policy if exists "allow_all_task_photos_insert" on storage.objects;
drop policy if exists "allow_all_task_photos_update" on storage.objects;
drop policy if exists "allow_all_task_photos_delete" on storage.objects;
create policy "allow_all_task_photos_select" on storage.objects
  for select using (bucket_id = 'task-photos');
create policy "allow_all_task_photos_insert" on storage.objects
  for insert with check (bucket_id = 'task-photos');
create policy "allow_all_task_photos_update" on storage.objects
  for update using (bucket_id = 'task-photos');
create policy "allow_all_task_photos_delete" on storage.objects
  for delete using (bucket_id = 'task-photos');

-- ─── REALTIME (dashboards subscribe to these) ────────────────
do $$
declare t text;
begin
  foreach t in array array['task_completions','messages','initiatives','policing_events'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ─── SEED: one profiles row per Honeycomb profile ────────────
-- role: admin -> Parent dashboard, kid -> Kid dashboard.
-- coin_balance starts at 0 (fresh count from today).
insert into profiles (slug, name, role, avatar_emoji, avatar_color, coin_balance) values
  ('naman', 'Naman', 'admin', '👨', '#f5c518', 0),
  ('aaron', 'Aaron', 'kid',   '🧒', '#4f8ef7', 0),
  ('aarya', 'Aarya', 'kid',   '👧', '#ec4899', 0),
  ('guest', 'Guest', 'kid',   '🐝', '#22c55e', 0)
on conflict (slug) do update
  set role = excluded.role,
      name = excluded.name;

-- ─── SEED: example rewards (edit / delete freely) ────────────
insert into rewards (name, icon, coin_cost, description, reward_type, reward_value) values
  ('30 min screen time', '📱', 100, 'Extra 30 minutes on your device', 'screen_time', 30),
  ('1 hour screen time', '🎮', 180, 'Extra hour on your device',        'screen_time', 60),
  ('Choose dinner',      '🍕', 300, 'You pick what we eat tonight!',    'custom',      null),
  ('$1 pocket money',    '💵', 100, 'Real dollar in your piggy bank',   'money',       1.00),
  ('Stay up 30 min late','🌙', 250, 'Bedtime extended by 30 minutes',   'custom',      null)
on conflict do nothing;

-- ─── SEED: example policing tasks (edit / delete freely) ─────
insert into policing_tasks (name, icon, coins, description) values
  ('Turn off the light', '💡', 20, 'Left a light on after leaving the room'),
  ('Close the fridge',   '🧊', 15, 'Fridge door left open'),
  ('Put shoes away',     '👟', 10, 'Shoes left in the walkway'),
  ('Flush / lid down',   '🚽', 15, 'Bathroom left in a state'),
  ('Push the chair in',  '🪑', 10, 'Chair left out from the table'),
  ('Clear your plate',   '🍽️', 15, 'Plate left on the table')
on conflict do nothing;

-- ============================================================
--  Tasks are NOT seeded here. To bring your existing Kids Karma
--  tasks across: in the OLD app export the Tasks tab to Excel,
--  then in Honeycomb's Beehave Parent dashboard (Task tab) use
--  "↑ Import". It matches kids by name, so keep Aaron / Aarya.
-- ============================================================
