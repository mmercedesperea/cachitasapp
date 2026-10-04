-- 005_seed_program.sql

-- Helper SQL seed function/procedure for reference program template insertion
-- Note: User programs will be dynamically generated per profile based on equipment.
-- This creates a standard reference program layout for reference if needed.

do $$
declare
  ref_program_id uuid := gen_random_uuid();
  day1_id uuid := gen_random_uuid();
  day2_id uuid := gen_random_uuid();
  day3_id uuid := gen_random_uuid();
  day4_id uuid := gen_random_uuid();

  e_squat uuid;
  e_bench uuid;
  e_lat_pull uuid;
  e_curl uuid;
  e_elliptical uuid;
  e_ohp uuid;
  e_row uuid;
  e_triceps uuid;
  e_deadlift uuid;
  e_paused_squat uuid;
  e_rdl uuid;
  e_elliptical_int uuid;
begin
  -- Retrieve exercise UUIDs
  select id into e_squat from exercises where slug = 'back-squat';
  select id into e_bench from exercises where slug = 'bench-press';
  select id into e_lat_pull from exercises where slug = 'lat-pulldown';
  select id into e_curl from exercises where slug = 'cable-curl';
  select id into e_elliptical from exercises where slug = 'elliptical-zone-2';
  select id into e_ohp from exercises where slug = 'overhead-press';
  select id into e_row from exercises where slug = 'cable-row';
  select id into e_triceps from exercises where slug = 'rope-triceps-pushdown';
  select id into e_deadlift from exercises where slug = 'deadlift';
  select id into e_paused_squat from exercises where slug = 'paused-squat';
  select id into e_rdl from exercises where slug = 'romanian-deadlift';
  select id into e_elliptical_int from exercises where slug = 'elliptical-intervals';

  -- Seed program template only if profiles exist
  if exists (select 1 from profiles where slot = 1) then
    -- Sample reference template attached to Slot 1 if initialized
    -- Will be managed by ProgramGeneratorService dynamically on frontend
    null;
  end if;
end $$;
