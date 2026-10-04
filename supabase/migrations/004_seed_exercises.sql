-- 004_seed_exercises.sql

insert into exercises (name, slug, category, movement_pattern, difficulty, description, primary_muscles, secondary_muscles, equipment_required, is_compound, is_powerlifting, is_conditioning)
values
  -- Squat family
  ('Back Squat', 'back-squat', 'Squat', 'Squat', 'Intermediate', 'Barbell back squat for lower body strength and mass.', '["quadriceps", "glutes"]', '["hamstrings", "lower_back"]', '["rack", "barra-olimpica", "discos"]', true, true, false),
  ('Front Squat', 'front-squat', 'Squat', 'Squat', 'Intermediate', 'Barbell front squat focusing on quad dominance and upright torso.', '["quadriceps"]', '["glutes", "upper_back"]', '["rack", "barra-olimpica", "discos"]', true, false, false),
  ('Paused Squat', 'paused-squat', 'Squat', 'Squat', 'Intermediate', 'Squat with a 2-second pause at the bottom position.', '["quadriceps", "glutes"]', '["core"]', '["rack", "barra-olimpica", "discos"]', true, true, false),
  ('Tempo Squat', 'tempo-squat', 'Squat', 'Squat', 'Intermediate', 'Controlled eccentric and concentric tempo squat.', '["quadriceps", "glutes"]', '["core"]', '["rack", "barra-olimpica", "discos"]', true, false, false),
  ('Bulgarian Split Squat', 'bulgarian-split-squat', 'Squat', 'Lunge', 'Beginner', 'Unilateral leg squat with rear foot elevated.', '["quadriceps", "glutes"]', '["hamstrings"]', '["mancuernas", "banco"]', true, false, false),

  -- Bench family
  ('Bench Press', 'bench-press', 'Bench', 'Horizontal Push', 'Intermediate', 'Flat barbell bench press for chest, shoulders, and triceps.', '["chest"]', '["triceps", "front_delt"]', '["rack", "banco", "barra-olimpica", "discos"]', true, true, false),
  ('Paused Bench Press', 'paused-bench-press', 'Bench', 'Horizontal Push', 'Intermediate', 'Competition pause at the chest.', '["chest"]', '["triceps", "front_delt"]', '["rack", "banco", "barra-olimpica", "discos"]', true, true, false),
  ('Close Grip Bench Press', 'close-grip-bench-press', 'Bench', 'Horizontal Push', 'Intermediate', 'Narrow grip press placing higher load on triceps.', '["triceps"]', '["chest", "front_delt"]', '["rack", "banco", "barra-olimpica", "discos"]', true, false, false),
  ('Cable Fly', 'cable-fly', 'Bench', 'Isolation', 'Beginner', 'Cable isolation exercise for chest hypertrophy.', '["chest"]', '["front_delt"]', '["maquina-de-poleas"]', false, false, false),

  -- Deadlift family
  ('Deadlift', 'deadlift', 'Deadlift', 'Hinge', 'Intermediate', 'Conventional barbell deadlift for posterior chain power.', '["hamstrings", "glutes", "lower_back"]', '["upper_back", "forearms"]', '["barra-olimpica", "discos"]', true, true, false),
  ('Romanian Deadlift', 'romanian-deadlift', 'Deadlift', 'Hinge', 'Intermediate', 'Focus on hamstring and glute stretch under load.', '["hamstrings", "glutes"]', '["lower_back"]', '["barra-olimpica", "discos"]', true, false, false),
  ('Paused Deadlift', 'paused-deadlift', 'Deadlift', 'Hinge', 'Advanced', 'Deadlift pausing off the floor at shin height.', '["hamstrings", "lower_back"]', '["upper_back"]', '["barra-olimpica", "discos"]', true, true, false),
  ('Hip Thrust', 'hip-thrust', 'Deadlift', 'Hinge', 'Beginner', 'Barbell hip extension targeting glute power.', '["glutes"]', '["hamstrings"]', '["banco", "barra-olimpica", "discos"]', true, false, false),

  -- Upper Body
  ('Overhead Press', 'overhead-press', 'Upper body', 'Vertical Push', 'Intermediate', 'Standing barbell overhead press for shoulder strength.', '["shoulders"]', '["triceps", "upper_chest"]', '["barra-olimpica", "discos"]', true, false, false),
  ('Barbell Row', 'barbell-row', 'Upper body', 'Horizontal Pull', 'Intermediate', 'Bent-over barbell rowing for back thickness.', '["lats", "upper_back"]', '["biceps", "rear_delt"]', '["barra-olimpica", "discos"]', true, false, false),
  ('Lat Pulldown', 'lat-pulldown', 'Upper body', 'Vertical Pull', 'Beginner', 'Cable vertical pulldown for lat width.', '["lats"]', '["biceps", "upper_back"]', '["maquina-de-poleas"]', true, false, false),
  ('Cable Row', 'cable-row', 'Upper body', 'Horizontal Pull', 'Beginner', 'Seated cable row for mid-back and lats.', '["upper_back", "lats"]', '["biceps"]', '["maquina-de-poleas"]', true, false, false),
  ('Face Pull', 'face-pull', 'Upper body', 'Horizontal Pull', 'Beginner', 'Cable rear delt and shoulder external rotation exercise.', '["rear_delt", "rotator_cuff"]', '["upper_back"]', '["maquina-de-poleas"]', false, false, false),
  ('Cable Curl', 'cable-curl', 'Upper body', 'Isolation', 'Beginner', 'Cable biceps curl with constant tension.', '["biceps"]', '["forearms"]', '["maquina-de-poleas"]', false, false, false),
  ('Rope Triceps Pushdown', 'rope-triceps-pushdown', 'Upper body', 'Isolation', 'Beginner', 'Cable triceps extension using rope attachment.', '["triceps"]', '[]', '["maquina-de-poleas"]', false, false, false),
  ('Cable Lateral Raise', 'cable-lateral-raise', 'Upper body', 'Isolation', 'Beginner', 'Side lateral raise using cable for side delts.', '["side_delt"]', '[]', '["maquina-de-poleas"]', false, false, false),
  ('Straight Arm Pulldown', 'straight-arm-pulldown', 'Upper body', 'Isolation', 'Beginner', 'Standing lat isolation with cables.', '["lats"]', '["triceps_long_head"]', '["maquina-de-poleas"]', false, false, false),

  -- Leg extra
  ('Step Up', 'step-up', 'Pierna', 'Lunge', 'Beginner', 'Box step up with dumbbells.', '["quadriceps", "glutes"]', '["calves"]', '["cajon", "mancuernas"]', false, false, false),

  -- Conditioning
  ('Elliptical Zone 2', 'elliptical-zone-2', 'Conditioning', 'Cardio', 'Beginner', 'Steady state cardio in aerobic zone 2.', '["cardio"]', '[]', '["eliptica"]', false, false, true),
  ('Elliptical Intervals', 'elliptical-intervals', 'Conditioning', 'Cardio', 'Intermediate', 'High intensity interval sprints on elliptical.', '["cardio"]', '[]', '["eliptica"]', false, false, true)
on conflict (slug) do nothing;
