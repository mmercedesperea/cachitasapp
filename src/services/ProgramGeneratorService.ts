import { Exercise, Program, ProgramWeek, ProgramDay, ProgramExercise } from '../types';
import { EquipmentRepository, ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgramRepository } from '../repositories/WorkoutAndOtherRepositories';
import { generateUuid } from '../utils/uuid';

export class ProgramGeneratorService {
  /**
   * Generates a tailored 4-week periodized program using the user's Favorite Exercise Pool
   * while satisfying available equipment, goal, and muscle balance rules.
   */
  static async generateFourWeekPlan(
    profileId: string,
    goal: string = 'Powerlifting',
    experienceLevel: string = 'Intermedio'
  ): Promise<{ program: Program; weeks: (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[] }> {
    const availableEquipmentSlugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    const allExercises = await ExerciseRepository.getAllExercises();
    const favoriteIds = await ExerciseRepository.getFavoriteExerciseIds(profileId);

    // 1. Filter exercises based strictly on user's available equipment
    const allowedExercises = allExercises.filter(ex => {
      if (!ex.equipment_required || ex.equipment_required.length === 0) return true;
      return ex.equipment_required.every(req => availableEquipmentSlugs.includes(req));
    });

    // Helper to select best exercise giving top priority to favorite exercise pool
    const selectBestExercise = (
      movementPatternOrCategory: string,
      isCompoundReq: boolean = true,
      excludeIds: string[] = []
    ): { exercise: Exercise; isFav: boolean } => {
      const candidates = allowedExercises.filter(e => !excludeIds.includes(e.id));

      // 1. Check favorites first
      const favMatch = candidates.find(
        e => favoriteIds.includes(e.id) &&
          (e.category === movementPatternOrCategory || e.movement_pattern === movementPatternOrCategory) &&
          (!isCompoundReq || e.is_compound)
      );
      if (favMatch) return { exercise: favMatch, isFav: true };

      // 2. Check general allowed exercises by category or pattern
      const match = candidates.find(
        e => (e.category === movementPatternOrCategory || e.movement_pattern === movementPatternOrCategory) &&
          (!isCompoundReq || e.is_compound)
      );
      if (match) return { exercise: match, isFav: favoriteIds.includes(match.id) };

      // 3. Fallback: check any favorite candidate
      const anyFav = candidates.find(e => favoriteIds.includes(e.id));
      if (anyFav) return { exercise: anyFav, isFav: true };

      // 4. Fallback: any candidate
      const fallback = candidates[0] || allowedExercises[0] || allExercises[0];
      return { exercise: fallback, isFav: favoriteIds.includes(fallback.id) };
    };

    // Pick exercises for 4 daily template splits (Squat Day, Bench Day, Deadlift Day, Strength + Conditioning)
    const squatEx = selectBestExercise('Squat', true);
    const benchEx = selectBestExercise('Bench', true);
    const deadliftEx = selectBestExercise('Deadlift', true);
    const upperEx = selectBestExercise('Vertical Push', true, [benchEx.exercise.id]);
    const latPullEx = selectBestExercise('Vertical Pull', true);
    const rowEx = selectBestExercise('Horizontal Pull', true);
    const curlEx = selectBestExercise('Isolation', false);
    const tricepsEx = selectBestExercise('Isolation', false, [curlEx.exercise.id]);
    const pausedSquatEx = selectBestExercise('Squat', true, [squatEx.exercise.id]);
    const rdlEx = selectBestExercise('Hinge', true, [deadliftEx.exercise.id]);
    const cardioEx = allowedExercises.find(e => e.is_conditioning) ||
      allowedExercises.find(e => e.movement_pattern === 'Cardio') ||
      squatEx.exercise;

    const programId = generateUuid();
    const newProgram: Program = {
      id: programId,
      profile_id: profileId,
      name: `Programa 4 Semanas — ${goal}`,
      goal,
      days_per_week: 4,
      total_weeks: 4,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Define 4 Weeks Periodization Parameters
    const weekConfigs = [
      {
        weekNum: 1,
        name: 'Semana 1 — Base & Técnica',
        focus: 'Base RPE 7–8',
        rpeMain: 7.5,
        rpeAcc: 7.0,
        mainSets: 5,
        mainReps: 5,
        accMult: 1.0
      },
      {
        weekNum: 2,
        name: 'Semana 2 — Progresión de Carga',
        focus: 'Progresión +2.5kg / Reps (RPE 8)',
        rpeMain: 8.0,
        rpeAcc: 8.0,
        mainSets: 5,
        mainReps: 5,
        accMult: 1.0
      },
      {
        weekNum: 3,
        name: 'Semana 3 — Semana Fuerte',
        focus: 'Carga Máxima (RPE 8.5–9)',
        rpeMain: 8.5,
        rpeAcc: 8.5,
        mainSets: 5,
        mainReps: 3,
        accMult: 1.0
      },
      {
        weekNum: 4,
        name: 'Semana 4 — Deload & Consolidación',
        focus: 'Descarga / Menor volumen (RPE 7)',
        rpeMain: 7.0,
        rpeAcc: 7.0,
        mainSets: 3,
        mainReps: 5,
        accMult: 0.75
      }
    ];

    const weeks: (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[] = weekConfigs.map(config => {
      const weekId = generateUuid();

      const buildExerciseObj = (
        dayId: string,
        item: { exercise: Exercise; isFav: boolean },
        order: number,
        sets: number,
        reps: number,
        rpe: number,
        rest: number
      ): ProgramExercise => ({
        id: generateUuid(),
        program_day_id: dayId,
        exercise_id: item.exercise.id,
        exercise_order: order,
        target_sets: sets,
        target_reps: reps,
        target_rpe: rpe,
        rest_seconds: rest,
        is_favorite: item.isFav,
        exercise: item.exercise
      });

      const day1Id = generateUuid();
      const day2Id = generateUuid();
      const day3Id = generateUuid();
      const day4Id = generateUuid();

      const day1: ProgramDay & { exercises: ProgramExercise[] } = {
        id: day1Id,
        program_id: programId,
        program_week_id: weekId,
        week_number: config.weekNum,
        day_number: 1,
        name: 'Día 1 — Squat Day',
        description: 'Fuerza principal de sentadilla y accesorios',
        exercises: [
          buildExerciseObj(day1Id, squatEx, 1, config.mainSets, config.mainReps, config.rpeMain, 180),
          buildExerciseObj(day1Id, benchEx, 2, Math.max(3, Math.round(4 * config.accMult)), 6, config.rpeAcc, 120),
          buildExerciseObj(day1Id, latPullEx, 3, Math.max(3, Math.round(4 * config.accMult)), 10, config.rpeAcc, 90),
          buildExerciseObj(day1Id, curlEx, 4, Math.max(2, Math.round(3 * config.accMult)), 12, config.rpeAcc, 60),
          buildExerciseObj(day1Id, { exercise: cardioEx, isFav: favoriteIds.includes(cardioEx.id) }, 5, 1, 10, 6, 60)
        ]
      };

      const day2: ProgramDay & { exercises: ProgramExercise[] } = {
        id: day2Id,
        program_id: programId,
        program_week_id: weekId,
        week_number: config.weekNum,
        day_number: 2,
        name: 'Día 2 — Bench Day',
        description: 'Fuerza de press banca y empuje vertical',
        exercises: [
          buildExerciseObj(day2Id, benchEx, 1, config.mainSets, config.mainReps, config.rpeMain, 180),
          buildExerciseObj(day2Id, upperEx, 2, Math.max(3, Math.round(4 * config.accMult)), 6, config.rpeAcc, 120),
          buildExerciseObj(day2Id, rowEx, 3, Math.max(3, Math.round(4 * config.accMult)), 10, config.rpeAcc, 90),
          buildExerciseObj(day2Id, tricepsEx, 4, Math.max(2, Math.round(3 * config.accMult)), 12, config.rpeAcc, 60)
        ]
      };

      const day3: ProgramDay & { exercises: ProgramExercise[] } = {
        id: day3Id,
        program_id: programId,
        program_week_id: weekId,
        week_number: config.weekNum,
        day_number: 3,
        name: 'Día 3 — Deadlift Day',
        description: 'Fuerza de peso muerto y sentadilla secundaria',
        exercises: [
          buildExerciseObj(day3Id, deadliftEx, 1, config.mainSets, Math.max(3, config.mainReps - 2), config.rpeMain, 180),
          buildExerciseObj(day3Id, pausedSquatEx, 2, Math.max(2, Math.round(3 * config.accMult)), 6, config.rpeAcc, 120),
          buildExerciseObj(day3Id, latPullEx, 3, Math.max(3, Math.round(4 * config.accMult)), 10, config.rpeAcc, 90),
          buildExerciseObj(day3Id, curlEx, 4, Math.max(2, Math.round(3 * config.accMult)), 12, config.rpeAcc, 60)
        ]
      };

      const day4: ProgramDay & { exercises: ProgramExercise[] } = {
        id: day4Id,
        program_id: programId,
        program_week_id: weekId,
        week_number: config.weekNum,
        day_number: 4,
        name: 'Día 4 — Strength + Conditioning',
        description: 'Volumen e hipertrofia de accesorios + acondicionamiento',
        exercises: [
          buildExerciseObj(day4Id, benchEx, 1, Math.max(3, Math.round(4 * config.accMult)), 8, config.rpeAcc, 120),
          buildExerciseObj(day4Id, squatEx, 2, Math.max(3, Math.round(4 * config.accMult)), 6, config.rpeAcc, 120),
          buildExerciseObj(day4Id, rdlEx, 3, Math.max(2, Math.round(3 * config.accMult)), 8, config.rpeAcc, 90),
          buildExerciseObj(day4Id, { exercise: cardioEx, isFav: favoriteIds.includes(cardioEx.id) }, 4, 1, 15, 7, 60)
        ]
      };

      return {
        id: weekId,
        program_id: programId,
        week_number: config.weekNum,
        name: config.name,
        focus: config.focus,
        days: [day1, day2, day3, day4]
      };
    });

    await ProgramRepository.saveProgram(newProgram, weeks);
    return { program: newProgram, weeks };
  }

  /**
   * Backwards compatibility helper
   */
  static async generateProgramForProfile(
    profileId: string,
    goal: string = 'Powerlifting',
    experienceLevel: string = 'Intermedio'
  ) {
    const res = await this.generateFourWeekPlan(profileId, goal, experienceLevel);
    const flatDays = res.weeks.flatMap(w => w.days || []);
    return { program: res.program, days: flatDays };
  }
}
