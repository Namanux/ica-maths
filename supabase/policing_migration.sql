-- ============================================================
--  Beehave · Policing feature
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Idempotent: safe to re-run.
--
--  Policing = the inverse of rewards. The parent defines "policing
--  tasks" (e.g. "Turn off the light", 20 coins). Any user can police
--  another user who missed one: hit Remind, wait 30s (the other person
--  hears a loud reminder on their iPad), then "Did it" to settle.
--
--  Coin rules (the parent keeps no balance):
--    * target is a kid  -> target loses the task's coins (may go NEGATIVE
--                          — overdraft is allowed for policing only)
--    * actor  is a kid  -> actor earns the task's coins
--    * the admin is never debited or credited
-- ============================================================

create extension if not exists "pgcrypto";

-- ─── POLICING TASKS (parent-defined, like rewards) ──────────
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

-- ─── POLICING EVENTS (one remind -> settle cycle) ───────────
create table if not exists policing_events (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references policing_tasks(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete cascade,  -- who reminded / did it
  target_id   uuid references profiles(id) on delete cascade,  -- whose coins are at stake
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

-- ─── RLS (permissive MVP, matches the rest of Beehave) ──────
do $$
declare t text;
begin
  foreach t in array array['policing_tasks','policing_events'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists allow_all on %I', t);
    execute format('create policy allow_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ─── REALTIME (target device listens for the reminder) ──────
do $$
declare t text;
begin
  foreach t in array array['policing_events'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ─── SEED: a few example policing tasks (edit / delete freely)
insert into policing_tasks (name, icon, coins, description) values
  ('Turn off the light',       '💡', 20, 'Left a light on after leaving the room'),
  ('Close the fridge',         '🧊', 15, 'Fridge door left open'),
  ('Put shoes away',           '👟', 10, 'Shoes left in the walkway'),
  ('Flush / lid down',         '🚽', 15, 'Bathroom left in a state'),
  ('Push the chair in',        '🪑', 10, 'Chair left out from the table'),
  ('Clear your plate',         '🍽️', 15, 'Plate left on the table')
on conflict do nothing;
