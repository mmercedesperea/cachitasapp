import { Exercise, Program, ProgramWeek, ProgramDay, ProgramExercise } from '../types';
import { EquipmentRepository, ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgramRepository } from '../repositories/WorkoutAndOtherRepositories';

export class ProgramGeneratorService {
  /**
   * Generates a complete 4-week training program for a profile.
   * Leverages the "Favorite Exercise Pool" as top priority while ensuring
   * biomechanical balance and proper 4-week block periodization/progression.
   */
  static async generateProgramForProfile(
    profileId: string,
    goal: string = 'Powerlifting',
    experienceLevel: string = 'Intermedio'
  ): Promise<{
    program: Program;
    weeks: (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[];
  }> {
    const availableEquipmentSlugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    const allExercises = await ExerciseRepository.getAllExercises();
    const favoriteIds = await ExerciseRepository.getFavoriteExerciseIds(profileId);

    // Filter exercises strictly by available equipment
    const allowedExercises = allExercises.filter(ex => {
      if (!ex.equipment_required || ex.equipment_required.length === 0) return true;
      return ex.equipment_required.every(req => availableEquipmentSlugs.includes(req));
    });

    const favExercises = allowedExercises.filter(ex => favoriteIds.includes(ex.id));

    // Helper to pick exercise: favorite pool first, then category/pattern match, then fallback
    const pickExercise = (
      predicate: (ex: Exercise) => boolean,
      fallbackCategory?: string
    ): Exercise => {
      const favMatch = favExercises.find(predicate);
      if (favMatch) return favMatch;

      const allowedMatch = allowedExercises.find(predicate);
      if (allowedMatch) return allowedMatch;

      if (fallbackCategory) {
        const catMatch = allowedExercises.find(e => e.category === fallbackCategory);
        if (catMatch) return catMatch;
      }

      return allowedExercises[0] || allExercises[0];
    };

    // Main movements selection (using favorite pool when possible)
    const squatMain = pickExercise(e => e.category === 'Squat' && e.is_compound, 'Squat');
    const benchMain = pickExercise(e => e.category === 'Bench' && e.is_compound, 'Bench');
    const deadliftMain = pickExercise(e => e.category === 'Deadlift' && e.is_compound, 'Deadlift');
    const pressMain = pickExercise(
      e => e.movement_pattern === 'Vertical Push' || (e.category === 'Upper body' && e.is_compound),
      'Upper body'
    );

    // Accessories selection
    const pullVertical = pickExercise(
      e => e.movement_pattern === 'Vertical Pull' || e.slug === 'lat-pulldown',
      'Upper body'
    );
    const pullHorizontal = pickExercise(
      e => e.movement_pattern === 'Horizontal Pull' || e.slug === 'cable-row' || e.slug === 'barbell-row',
      'Upper body'
    );
    const armBiceps = pickExercise(e => e.slug === 'cable-curl' || e.primary_muscles.includes('bíceps'), 'Upper body');
    const armTriceps = pickExercise(
      e => e.slug === 'rope-triceps-pushdown' || e.primary_muscles.includes('tríceps'),
      'Upper body'
    );
    const squatSecondary = pickExercise(
      e => (e.slug === 'paused-squat' || e.slug === 'front-squat' || e.slug === 'tempo-squat') && e.id !== squatMain.id,
      'Squat'
    );
    const hingeSecondary = pickExercise(
      e => (e.slug === 'romanian-deadlift' || e.slug === 'paused-deadlift' || e.slug === 'hip-thrust') && e.id !== deadliftMain.id,
      'Deadlift'
    );
    const conditioningEx = pickExercise(e => e.is_conditioning || e.movement_pattern === 'Cardio', 'Conditioning');

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

    // 4-Week progression configurations
    const weekConfigs = [
      {
        weekNum: 1,
        name: 'Semana 1: Base',
        focus: 'Acumulación y técnica (RPE 7-8)',
        rpeOffset: 0,
        setMultiplier: 1,
        repOffset: 0
      },
      {
        weekNum: 2,
        name: 'Semana 2: Progresión',
        focus: 'Incremento de carga e intensidad (RPE 7.5-8.5)',
        rpeOffset: 0.5,
        setMultiplier: 1,
        repOffset: 0
      },
      {
        weekNum: 3,
        name: 'Semana 3: Semana Fuerte',
        focus: 'Máxima exigencia y picos de fuerza (RPE 8-9)',
        rpeOffset: 1.0,
        setMultiplier: 1,
        repOffset: -1 // High intensity, lower reps
      },
      {
        weekNum: 4,
        name: 'Semana 4: Deload / Consolidación',
        focus: 'Descarga activa y recuperación (RPE 6-7)',
        rpeOffset: -1.0,
        setMultiplier: 0.7,
        repOffset: 0
      }
    ];

    const templateDays = [
      {
        dayNum: 1,
        name: 'Lunes — Squat Day',
        desc: 'Enfoque en fuerza de Sentadilla y complementarios',
        exercises: [
          { ex: squatMain, baseSets: 5, baseReps: 5, baseRpe: 7.5, rest: 180 },
          { ex: benchMain, baseSets: 4, baseReps: 6, baseRpe: 7.5, rest: 120 },
          { ex: pullVertical, baseSets: 4, baseReps: 10, baseRpe: 7.5, rest: 90 },
          { ex: armBiceps, baseSets: 3, baseReps: 12, baseRpe: 8.0, rest: 60 },
          { ex: conditioningEx, baseSets: 1, baseReps: 10, baseRpe: 6.0, rest: 60 }
        ]
      },
      {
        dayNum: 2,
        name: 'Martes — Bench Day',
        desc: 'Enfoque en Press Banca y empuje de torso',
        exercises: [
          { ex: benchMain, baseSets: 5, baseReps: 5, baseRpe: 8.0, rest: 180 },
          { ex: pressMain, baseSets: 4, baseReps: 6, baseRpe: 7.5, rest: 120 },
          { ex: pullHorizontal, baseSets: 4, baseReps: 10, baseRpe: 7.5, rest: 90 },
          { ex: armTriceps, baseSets: 3, baseReps: 12, baseRpe: 8.0, rest: 60 }
        ]
      },
      {
        dayNum: 3,
        name: 'Jueves — Deadlift Day',
        desc: 'Enfoque en Peso Muerto y variante de Sentadilla',
        exercises: [
          { ex: deadliftMain, baseSets: 5, baseReps: 3, baseRpe: 8.0, rest: 180 },
          { ex: squatSecondary, baseSets: 3, baseReps: 6, baseRpe: 7.5, rest: 120 },
          { ex: pullVertical, baseSets: 4, baseReps: 10, baseRpe: 7.5, rest: 90 },
          { ex: armBiceps, baseSets: 3, baseReps: 12, baseRpe: 8.0, rest: 60 }
        ]
      },
      {
        dayNum: 4,
        name: 'Viernes — Strength + Conditioning',
        desc: 'Fuerza secundaria, accesorios e hipertrofia',
        exercises: [
          { ex: benchMain, baseSets: 4, baseReps: 8, baseRpe: 7.5, rest: 120 },
          { ex: squatMain, baseSets: 4, baseReps: 6, baseRpe: 7.5, rest: 120 },
          { ex: hingeSecondary, baseSets: 3, baseReps: 8, baseRpe: 7.5, rest: 90 },
          { ex: conditioningEx, baseSets: 1, baseReps: 15, baseRpe: 7.0, rest: 60 }
        ]
      }
    ];

    const weeks: (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[] = [];

    for (const wConfig of weekConfigs) {
      const weekId = `week-${wConfig.weekNum}-${programId}`;
      const daysForWeek: (ProgramDay & { exercises: ProgramExercise[] })[] = [];

      for (const tDay of templateDays) {
        const dayId = `day-w${wConfig.weekNum}-d${tDay.dayNum}-${programId}`;

        const exercisesForDay: ProgramExercise[] = tDay.exercises.map((tEx, index) => {
          const targetSets = Math.max(1, Math.round(tEx.baseSets * wConfig.setMultiplier));
          const targetReps = Math.max(1, tEx.baseReps + wConfig.repOffset);
          const targetRpe = Math.min(10, Math.max(5, tEx.baseRpe + wConfig.rpeOffset));
          const isFav = favoriteIds.includes(tEx.ex.id);

          return {
            id: `pe-w${wConfig.weekNum}-d${tDay.dayNum}-${index + 1}-${programId}`,
            program_day_id: dayId,
            exercise_id: tEx.ex.id,
            exercise_order: index + 1,
            target_sets: targetSets,
            target_reps: targetReps,
            target_rpe: targetRpe,
            rest_seconds: tEx.rest,
            is_favorite: isFav,
            exercise: tEx.ex
          };
        });

        daysForWeek.push({
          id: dayId,
          program_id: programId,
          program_week_id: weekId,
          week_number: wConfig.weekNum,
          day_number: tDay.dayNum,
          name: tDay.name,
          description: tDay.desc,
          exercises: exercisesForDay
        });
      }

      weeks.push({
        id: weekId,
        program_id: programId,
        week_number: wConfig.weekNum,
        name: wConfig.name,
        focus: wConfig.focus,
        days: daysForWeek
      });
    }

    await ProgramRepository.saveProgram(newProgram, weeks);
    return { program: newProgram, weeks };
  }
}
