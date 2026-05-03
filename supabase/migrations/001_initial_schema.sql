create extension if not exists pgcrypto;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  username text,
  first_name text,
  language text not null default 'en',
  tutorial_completed boolean not null default false,
  wood integer not null default 200 check (wood >= 0),
  stone integer not null default 50 check (stone >= 0),
  food integer not null default 200 check (food >= 0),
  diamonds integer not null default 75 check (diamonds >= 0),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists player_buildings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  building_type text not null,
  level integer not null default 0 check (level >= 0 and level <= 9),
  is_built boolean not null default false,
  slot_id text not null,
  last_collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, building_type)
);

create table if not exists construction_queue (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  building_type text not null,
  target_level integer not null check (target_level >= 1 and target_level <= 9),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('active', 'completed', 'cancelled')),
  speedup_spent_diamonds integer not null default 0 check (speedup_spent_diamonds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists construction_queue_one_active_per_player
  on construction_queue (player_id)
  where status = 'active';
