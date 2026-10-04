-- 002_seed_profiles.sql

-- Insert exactly 4 profile slots if they don't exist
insert into profiles (slot, onboarding_completed)
values
  (1, false),
  (2, false),
  (3, false),
  (4, false)
on conflict (slot) do nothing;
