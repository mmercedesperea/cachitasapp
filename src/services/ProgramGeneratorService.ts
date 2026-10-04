import { Exercise, Program, ProgramDay, ProgramExercise } from '../types';
import { EquipmentRepository, ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgramRepository } from '../repositories/WorkoutAndOtherRepositories';

export class ProgramGeneratorService {
  /**
   * Generates a tailored 4-day Powerlifting / Strength program for a profile
   * strictly filtering out exercises that require unselected equipment.
   */
  static async generateProgramForProfile(
    profileId: string,
    goal: string = 'Powerlifting',
    experienceLevel: string = 'Intermedio'
  ): Promise<{ program: Program; days: (ProgramDay & { exercises: ProgramExercise[] })[] }> {
    const availableEquipmentSlugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    const allExercises = await ExerciseRepository.getAllExercises();
    const favoriteIds = await ExerciseRepository.getFavoriteExerciseIds(profileId);

    // Filter exercises based on user's equipment
    const allowedExercises = allExercises.filter(ex => {
      if (!ex.equipment_required || ex.equipment_required.length === 0) return true;
      return ex.equipment_required.every(req => availableEquipmentSlugs.includes(req));
    });

    const getBestExercise = (category: string, isCompound = true): Exercise => {
      // First check favorites
      const favMatch = allowedExercises.find(
        e => favoriteIds.includes(e.id) && e.category === category && (!isCompound || e.is_compound)
      );
      if (favMatch) return favMatch;

      // Secondary check by category
      const catMatch = allowedExercises.find(
        e => e.category === category && (!isCompound || e.is_compound)
      );
      if (catMatch) return catMatch;

      // Fallback
      return allowedExercises[0] || allExercises[0];
    };

    const programId = `program-${profileId}-${Date.now()}`;
    const newProgram: Program = {
      id: programId,
      profile_id: profileId,
      name: `${goal} (${experienceLevel})`,
      goal,
      days_per_week: 4,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const squatEx = getBestExercise('Squat', true);
    const benchEx = getBestExercise('Bench', true);
    const deadliftEx = getBestExercise('Deadlift', true);
    const upperEx = getBestExercise('Upper body', true);
    const latPullEx = allowedExercises.find(e => e.slug === 'lat-pulldown') || upperEx;
    const curlEx = allowedExercises.find(e => e.slug === 'cable-curl') || upperEx;
    const tricepsEx = allowedExercises.find(e => e.slug === 'rope-triceps-pushdown') || upperEx;
    const rowEx = allowedExercises.find(e => e.slug === 'cable-row') || upperEx;
    const pausedSquatEx = allowedExercises.find(e => e.slug === 'paused-squat') || squatEx;
    const rdlEx = allowedExercises.find(e => e.slug === 'romanian-deadlift') || deadliftEx;
    const cardioEx = allowedExercises.find(e => e.is_conditioning) || squatEx;

    const days: (ProgramDay & { exercises: ProgramExercise[] })[] = [
      {
        id: `day-1-${programId}`,
        program_id: programId,
        day_number: 1,
        name: 'Día 1 — Squat Strength',
        description: 'Fuerza principal de sentadilla y banca complementaria',
        exercises: [
          { id: `pe-1-1`, program_day_id: `day-1-${programId}`, exercise_id: squatEx.id, exercise_order: 1, target_sets: 5, target_reps: 5, target_rpe: 8, rest_seconds: 180, exercise: squatEx },
          { id: `pe-1-2`, program_day_id: `day-1-${programId}`, exercise_id: benchEx.id, exercise_order: 2, target_sets: 4, target_reps: 6, target_rpe: 8, rest_seconds: 120, exercise: benchEx },
          { id: `pe-1-3`, program_day_id: `day-1-${programId}`, exercise_id: latPullEx.id, exercise_order: 3, target_sets: 4, target_reps: 10, target_rpe: 8, rest_seconds: 90, exercise: latPullEx },
          { id: `pe-1-4`, program_day_id: `day-1-${programId}`, exercise_id: curlEx.id, exercise_order: 4, target_sets: 3, target_reps: 12, target_rpe: 8, rest_seconds: 60, exercise: curlEx },
          { id: `pe-1-5`, program_day_id: `day-1-${programId}`, exercise_id: cardioEx.id, exercise_order: 5, target_sets: 1, target_reps: 10, target_rpe: 6, rest_seconds: 60, exercise: cardioEx }
        ]
      },
      {
        id: `day-2-${programId}`,
        program_id: programId,
        day_number: 2,
        name: 'Día 2 — Bench Strength',
        description: 'Fuerza de press banca y empuje vertical',
        exercises: [
          { id: `pe-2-1`, program_day_id: `day-2-${programId}`, exercise_id: benchEx.id, exercise_order: 1, target_sets: 5, target_reps: 5, target_rpe: 8.5, rest_seconds: 180, exercise: benchEx },
          { id: `pe-2-2`, program_day_id: `day-2-${programId}`, exercise_id: upperEx.id, exercise_order: 2, target_sets: 4, target_reps: 6, target_rpe: 8, rest_seconds: 120, exercise: upperEx },
          { id: `pe-2-3`, program_day_id: `day-2-${programId}`, exercise_id: rowEx.id, exercise_order: 3, target_sets: 4, target_reps: 10, target_rpe: 8, rest_seconds: 90, exercise: rowEx },
          { id: `pe-2-4`, program_day_id: `day-2-${programId}`, exercise_id: tricepsEx.id, exercise_order: 4, target_sets: 3, target_reps: 12, target_rpe: 8, rest_seconds: 60, exercise: tricepsEx }
        ]
      },
      {
        id: `day-3-${programId}`,
        program_id: programId,
        day_number: 3,
        name: 'Día 3 — Deadlift Strength',
        description: 'Fuerza de peso muerto y sentadilla secundaria',
        exercises: [
          { id: `pe-3-1`, program_day_id: `day-3-${programId}`, exercise_id: deadliftEx.id, exercise_order: 1, target_sets: 5, target_reps: 3, target_rpe: 8.5, rest_seconds: 180, exercise: deadliftEx },
          { id: `pe-3-2`, program_day_id: `day-3-${programId}`, exercise_id: pausedSquatEx.id, exercise_order: 2, target_sets: 3, target_reps: 6, target_rpe: 8, rest_seconds: 120, exercise: pausedSquatEx },
          { id: `pe-3-3`, program_day_id: `day-3-${programId}`, exercise_id: latPullEx.id, exercise_order: 3, target_sets: 4, target_reps: 10, target_rpe: 8, rest_seconds: 90, exercise: latPullEx },
          { id: `pe-3-4`, program_day_id: `day-3-${programId}`, exercise_id: curlEx.id, exercise_order: 4, target_sets: 3, target_reps: 12, target_rpe: 8, rest_seconds: 60, exercise: curlEx }
        ]
      },
      {
        id: `day-4-${programId}`,
        program_id: programId,
        day_number: 4,
        name: 'Día 4 — Strength + Conditioning',
        description: 'Volumen e hipertrofia de accesorios + acondicionamiento',
        exercises: [
          { id: `pe-4-1`, program_day_id: `day-4-${programId}`, exercise_id: benchEx.id, exercise_order: 1, target_sets: 4, target_reps: 8, target_rpe: 8, rest_seconds: 120, exercise: benchEx },
          { id: `pe-4-2`, program_day_id: `day-4-${programId}`, exercise_id: squatEx.id, exercise_order: 2, target_sets: 4, target_reps: 6, target_rpe: 8, rest_seconds: 120, exercise: squatEx },
          { id: `pe-4-3`, program_day_id: `day-4-${programId}`, exercise_id: rdlEx.id, exercise_order: 3, target_sets: 3, target_reps: 8, target_rpe: 8, rest_seconds: 90, exercise: rdlEx },
          { id: `pe-4-4`, program_day_id: `day-4-${programId}`, exercise_id: cardioEx.id, exercise_order: 4, target_sets: 1, target_reps: 15, target_rpe: 7, rest_seconds: 60, exercise: cardioEx }
        ]
      }
    ];

    await ProgramRepository.saveProgram(newProgram, days);
    return { program: newProgram, days };
  }
}
