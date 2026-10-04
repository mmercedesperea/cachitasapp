-- 006_program_weeks_and_favorites.sql

-- Program Weeks table for 4-week periodization
create table if not exists program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  week_number integer not null,
  name text,
  focus text,
  unique(program_id, week_number)
);

-- Add week_id and week_number to program_days if not already existing
alter table program_days
  add column if not exists program_week_id uuid references program_weeks(id) on delete cascade,
  add column if not exists week_number integer default 1;

-- Add pet_avatar and xp to profiles
alter table profiles
  add column if not exists pet_avatar text default 'cat',
  add column if not exists xp integer default 0;
