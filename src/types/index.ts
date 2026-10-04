export interface Profile {
  id: string;
  slot: number;
  name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: string | null;
  primary_goal: string | null;
  unit_system: string;
  avatar: string | null;
  onboarding_completed: boolean;
  pin_hash: string | null;
  pin_enabled: boolean;
  pin_attempts: number;
  pin_locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface ProfileEquipment {
  id: string;
  profile_id: string;
  equipment_id: string;
  quantity: number;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  movement_pattern: string;
  difficulty: string;
  description: string;
  instructions: any;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment_required: string[];
  is_compound: boolean;
  is_powerlifting: boolean;
  is_conditioning: boolean;
}

export interface Program {
  id: string;
  profile_id: string;
  name: string;
  goal: string;
  days_per_week: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
  description?: string;
  exercises?: ProgramExercise[];
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number;
  target_reps: number;
  target_rpe?: number;
  target_percentage?: number;
  rest_seconds?: number;
  notes?: string;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  profile_id: string;
  program_day_id?: string | null;
  started_at: string;
  completed_at?: string | null;
  duration_seconds?: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  total_volume: number;
  notes?: string;
  created_at: string;
  exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  exercise_order: number;
  exercise?: Exercise;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  target_weight?: number;
  actual_weight?: number;
  target_reps?: number;
  actual_reps?: number;
  target_rpe?: number;
  actual_rpe?: number;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
}

export interface PersonalRecord {
  id: string;
  profile_id: string;
  exercise_id: string;
  record_type: '1RM' | 'e1RM' | '5RM' | '10RM' | 'Max reps' | 'Volume' | string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
  exercise?: Exercise;
}

export interface BodyWeightEntry {
  id: string;
  profile_id: string;
  weight_kg: number;
  recorded_at: string;
}

export interface ProfilePreferences {
  profile_id: string;
  training_days: number[];
  session_duration: number;
  upper_body_increment: number;
  lower_body_increment: number;
  default_rest_seconds: number;
  updated_at: string;
}
