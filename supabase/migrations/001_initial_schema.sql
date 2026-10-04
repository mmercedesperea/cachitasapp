-- 001_initial_schema.sql

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Profiles table (Exactly 4 profile slots)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  slot integer unique not null,
  name text,
  age integer,
  height_cm numeric,
  weight_kg numeric,
  experience_level text,
  primary_goal text,
  unit_system text default 'metric',
  avatar text,
  onboarding_completed boolean default false,

  pin_hash text,
  pin_enabled boolean default false,
  pin_attempts integer default 0,
  pin_locked_until timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  check (slot between 1 and 4)
);

-- Equipment catalog
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text
);

-- Equipment assigned to profiles
create table if not exists profile_equipment (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete cascade,
  quantity integer default 1,
  unique(profile_id, equipment_id)
);

-- Exercises catalog
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text,
  movement_pattern text,
  difficulty text,
  description text,
  instructions jsonb,
  primary_muscles jsonb,
  secondary_muscles jsonb,
  equipment_required jsonb,
  is_compound boolean default false,
  is_powerlifting boolean default false,
  is_conditioning boolean default false
);

-- Favorite exercises per profile
create table if not exists profile_favorite_exercises (
  profile_id uuid references profiles(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete cascade,
  created_at timestamptz default now(),
  primary key(profile_id, exercise_id)
);

-- Programs
create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  goal text,
  days_per_week integer,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Program Days
create table if not exists program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  day_number integer not null,
  name text not null,
  description text
);

-- Program Exercises
create table if not exists program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_days(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  exercise_order integer not null,
  target_sets integer,
  target_reps integer,
  target_rpe numeric,
  target_percentage numeric,
  rest_seconds integer,
  notes text
);

-- Workout Sessions
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  program_day_id uuid references program_days(id),
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer,
  status text default 'in_progress',
  total_volume numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- Workout Exercises
create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  exercise_order integer not null
);

-- Workout Sets
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_number integer not null,
  target_weight numeric,
  actual_weight numeric,
  target_reps integer,
  actual_reps integer,
  target_rpe numeric,
  actual_rpe numeric,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Personal Records
create table if not exists personal_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  record_type text not null,
  weight numeric,
  reps integer,
  estimated_1rm numeric,
  achieved_at timestamptz default now()
);

-- Body Weight Entries
create table if not exists body_weight_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  weight_kg numeric not null,
  recorded_at timestamptz default now()
);

-- Profile Preferences
create table if not exists profile_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  training_days integer[],
  session_duration integer,
  upper_body_increment numeric default 2.5,
  lower_body_increment numeric default 5,
  default_rest_seconds integer default 120,
  updated_at timestamptz default now()
);
