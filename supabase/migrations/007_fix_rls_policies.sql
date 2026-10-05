-- 007_fix_rls_policies.sql
-- Safely configure Row Level Security (RLS) policies for profile_favorite_exercises and existing application tables

-- 1. Ensure profile_favorite_exercises table exists
CREATE TABLE IF NOT EXISTS profile_favorite_exercises (
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(profile_id, exercise_id)
);

-- 2. Safely enable RLS and create permissive policies only for tables that exist
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles',
        'equipment',
        'profile_equipment',
        'exercises',
        'profile_favorite_exercises',
        'programs',
        'program_weeks',
        'program_days',
        'program_exercises',
        'workout_sessions',
        'workout_exercises',
        'workout_sets',
        'personal_records',
        'body_weight_entries',
        'profile_preferences'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF to_regclass(tbl) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'allow_anon_all_' || tbl, tbl);
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', 'allow_anon_all_' || tbl, tbl);
        END IF;
    END LOOP;
END $$;
