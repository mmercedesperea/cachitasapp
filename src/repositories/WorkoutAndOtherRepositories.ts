import { supabase } from '../lib/supabase';
import { Program, ProgramWeek, ProgramDay, ProgramExercise, WorkoutSession, WorkoutExercise, WorkoutSet, PersonalRecord, BodyWeightEntry, ProfilePreferences } from '../types';
import { SyncService } from '../services/SyncService';
import { isUuid, isDummyLocalUuid } from '../utils/uuid';

async function withTimeout<T>(promise: PromiseLike<T>, ms = 2000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export class ProgramRepository {
  private static LOCAL_PROGRAMS_KEY = 'cachitas_programs_';

  static async getActiveProgramForProfile(profileId: string): Promise<Program | null> {
    let program: Program | null = null;

    if (isUuid(profileId)) {
      try {
        const res: any = await withTimeout(
          supabase
            .from('programs')
            .select('*')
            .eq('profile_id', profileId)
            .eq('active', true)
            .single()
        );
        if (res.data) program = res.data;
      } catch {}
    }

    if (!program) {
      const local = localStorage.getItem(this.LOCAL_PROGRAMS_KEY + profileId);
      if (local) {
        try {
          const programs: Program[] = JSON.parse(local);
          program = programs.find(p => p.active) || null;
        } catch {}
      }
    }

    if (program) {
      const weeks = await this.getProgramWeeks(program.id);
      program = { ...program, weeks };
    }

    return program;
  }

  static async saveProgram(
    program: Program,
    weeksOrDays: (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[] | (ProgramDay & { exercises: ProgramExercise[] })[]
  ): Promise<void> {
    const local = localStorage.getItem(this.LOCAL_PROGRAMS_KEY + program.profile_id);
    let programs: Program[] = local ? JSON.parse(local) : [];
    programs = programs.filter(p => p.id !== program.id);

    let structuredWeeks: (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[] = [];

    // Check if input is weeks array or days array
    if (weeksOrDays.length > 0 && 'week_number' in weeksOrDays[0] && 'days' in weeksOrDays[0]) {
      structuredWeeks = weeksOrDays as (ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[];
    } else {
      // Legacy single-week/days array: convert to 1 week
      const days = weeksOrDays as (ProgramDay & { exercises: ProgramExercise[] })[];
      structuredWeeks = [
        {
          id: `week-1-${program.id}`,
          program_id: program.id,
          week_number: 1,
          name: 'Semana 1',
          focus: 'Base RPE 7-8',
          days
        }
      ];
    }

    const programToSave: Program = {
      ...program,
      weeks: structuredWeeks
    };

    programs.push(programToSave);
    localStorage.setItem(this.LOCAL_PROGRAMS_KEY + program.profile_id, JSON.stringify(programs));
    localStorage.setItem(`cachitas_program_weeks_${program.id}`, JSON.stringify(structuredWeeks));

    // Also store flattened days for backwards compatibility
    const allDays = structuredWeeks.flatMap(w => w.days || []);
    localStorage.setItem(`cachitas_program_days_${program.id}`, JSON.stringify(allDays));

    if (isUuid(program.profile_id)) {
      try {
        await supabase.from('programs').upsert({
          id: program.id,
          profile_id: program.profile_id,
          name: program.name,
          goal: program.goal,
          days_per_week: program.days_per_week,
          active: program.active,
          created_at: program.created_at,
          updated_at: program.updated_at
        });

        const weekRows = structuredWeeks.map(({ days, ...w }) => w);
        if (weekRows.length > 0) {
          await supabase.from('program_weeks').upsert(weekRows);
        }

        const dayRows = structuredWeeks.flatMap(w =>
          (w.days || []).map(({ exercises, ...d }) => ({
            ...d,
            program_week_id: w.id,
            week_number: w.week_number
          }))
        );
        if (dayRows.length > 0) {
          await supabase.from('program_days').upsert(dayRows);
        }

        const exerciseRows = structuredWeeks.flatMap(w =>
          (w.days || []).flatMap(d =>
            (d.exercises || []).map(({ exercise, ...exData }) => exData)
          )
        );
        if (exerciseRows.length > 0) {
          await supabase.from('program_exercises').upsert(exerciseRows);
        }
      } catch {
        await SyncService.enqueueOperation({
          table: 'programs',
          action: 'insert',
          data: { program: programToSave, weeks: structuredWeeks }
        });
      }
    }
  }

  static async getProgramWeeks(programId: string): Promise<(ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[]> {
    if (isUuid(programId)) {
      try {
        const { data: weeks } = await supabase
          .from('program_weeks')
          .select('*')
          .eq('program_id', programId)
          .order('week_number', { ascending: true });

        if (weeks && weeks.length > 0) {
          const result = [];
          for (const week of weeks) {
            const { data: days } = await supabase
              .from('program_days')
              .select('*')
              .eq('program_week_id', week.id)
              .order('day_number', { ascending: true });

            const daysWithExercises = [];
            if (days && days.length > 0) {
              for (const day of days) {
                const { data: exercises } = await supabase
                  .from('program_exercises')
                  .select('*, exercise:exercise_id(*)')
                  .eq('program_day_id', day.id)
                  .order('exercise_order', { ascending: true });
                daysWithExercises.push({ ...day, exercises: exercises || [] });
              }
            }
            result.push({ ...week, days: daysWithExercises });
          }
          return result;
        }
      } catch {}
    }

    const localWeeks = localStorage.getItem(`cachitas_program_weeks_${programId}`);
    if (localWeeks) {
      try {
        return JSON.parse(localWeeks);
      } catch {}
    }

    // Fallback: build 1 week from legacy program days
    const legacyDays = await this.getProgramDays(programId);
    if (legacyDays.length > 0) {
      return [
        {
          id: `week-1-${programId}`,
          program_id: programId,
          week_number: 1,
          name: 'Semana 1',
          focus: 'Fuerza base',
          days: legacyDays
        }
      ];
    }

    return [];
  }

  static async getProgramDays(programId: string): Promise<(ProgramDay & { exercises: ProgramExercise[] })[]> {
    if (isUuid(programId)) {
      try {
        const { data: days } = await supabase
          .from('program_days')
          .select('*')
          .eq('program_id', programId)
          .order('day_number', { ascending: true });

        if (days && days.length > 0) {
          const result = [];
          for (const day of days) {
            const { data: exercises } = await supabase
              .from('program_exercises')
              .select('*, exercise:exercise_id(*)')
              .eq('program_day_id', day.id)
              .order('exercise_order', { ascending: true });
            result.push({ ...day, exercises: exercises || [] });
          }
          return result;
        }
      } catch {}
    }

    const local = localStorage.getItem(`cachitas_program_days_${programId}`);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export class WorkoutRepository {
  private static LOCAL_SESSIONS_KEY = 'cachitas_workout_sessions_';

  static async getSessionsForProfile(profileId: string): Promise<WorkoutSession[]> {
    if (isUuid(profileId)) {
      try {
        const res: any = await withTimeout(
          supabase
            .from('workout_sessions')
            .select('*, exercises:workout_exercises(*, exercise:exercise_id(*), sets:workout_sets(*))')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
        );
        if (res.data) return res.data;
      } catch {}
    }

    const local = localStorage.getItem(this.LOCAL_SESSIONS_KEY + profileId);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }

  static async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    const sessions = await this.getSessionsForProfile(session.profile_id);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(this.LOCAL_SESSIONS_KEY + session.profile_id, JSON.stringify(sessions));

    if (isUuid(session.profile_id)) {
      try {
        const { exercises, ...sessionData } = session;
        await supabase.from('workout_sessions').upsert(sessionData);
        if (exercises) {
          for (const ex of exercises) {
            const { sets, exercise, ...exData } = ex;
            await supabase.from('workout_exercises').upsert(exData);
            if (sets) {
              for (const st of sets) {
                await supabase.from('workout_sets').upsert(st);
              }
            }
          }
        }
      } catch {
        await SyncService.enqueueOperation({
          table: 'workout_sessions',
          action: 'insert',
          data: session
        });
      }
    }
  }

  static async getActiveSession(profileId: string): Promise<WorkoutSession | null> {
    const sessions = await this.getSessionsForProfile(profileId);
    return sessions.find(s => s.status === 'in_progress') || null;
  }
}

export class PersonalRecordRepository {
  private static LOCAL_PRS_KEY = 'cachitas_prs_';

  static async getPRsForProfile(profileId: string): Promise<PersonalRecord[]> {
    if (isUuid(profileId)) {
      try {
        const { data } = await supabase
          .from('personal_records')
          .select('*, exercise:exercise_id(*)')
          .eq('profile_id', profileId);
        if (data) return data;
      } catch {}
    }

    const local = localStorage.getItem(this.LOCAL_PRS_KEY + profileId);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }

  static async savePR(pr: PersonalRecord): Promise<void> {
    const prs = await this.getPRsForProfile(pr.profile_id);
    const existingIdx = prs.findIndex(p => p.exercise_id === pr.exercise_id && p.record_type === pr.record_type);
    if (existingIdx !== -1) {
      prs[existingIdx] = pr;
    } else {
      prs.push(pr);
    }
    localStorage.setItem(this.LOCAL_PRS_KEY + pr.profile_id, JSON.stringify(prs));

    if (isUuid(pr.profile_id)) {
      try {
        const { exercise, ...prData } = pr;
        await supabase.from('personal_records').upsert(prData);
      } catch {
        await SyncService.enqueueOperation({
          table: 'personal_records',
          action: 'insert',
          data: pr
        });
      }
    }
  }
}

export class BodyWeightRepository {
  private static LOCAL_BW_KEY = 'cachitas_bodyweight_';

  static async getEntriesForProfile(profileId: string): Promise<BodyWeightEntry[]> {
    if (isUuid(profileId)) {
      try {
        const { data } = await supabase
          .from('body_weight_entries')
          .select('*')
          .eq('profile_id', profileId)
          .order('recorded_at', { ascending: true });
        if (data) return data;
      } catch {}
    }

    const local = localStorage.getItem(this.LOCAL_BW_KEY + profileId);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }

  static async addEntry(profileId: string, weightKg: number): Promise<BodyWeightEntry> {
    const entry: BodyWeightEntry = {
      id: 'bw-' + Date.now(),
      profile_id: profileId,
      weight_kg: weightKg,
      recorded_at: new Date().toISOString()
    };
    const entries = await this.getEntriesForProfile(profileId);
    entries.push(entry);
    localStorage.setItem(this.LOCAL_BW_KEY + profileId, JSON.stringify(entries));

    if (isUuid(profileId)) {
      try {
        await supabase.from('body_weight_entries').insert(entry);
      } catch {
        await SyncService.enqueueOperation({
          table: 'body_weight_entries',
          action: 'insert',
          data: entry
        });
      }
    }
    return entry;
  }
}

export class PreferencesRepository {
  private static LOCAL_PREFS_KEY = 'cachitas_prefs_';

  static async getPreferences(profileId: string): Promise<ProfilePreferences> {
    const defaultPrefs: ProfilePreferences = {
      profile_id: profileId,
      training_days: [1, 2, 4, 5],
      session_duration: 60,
      upper_body_increment: 2.5,
      lower_body_increment: 5.0,
      default_rest_seconds: 120,
      updated_at: new Date().toISOString()
    };

    if (isUuid(profileId)) {
      try {
        const res: any = await withTimeout(
          supabase
            .from('profile_preferences')
            .select('*')
            .eq('profile_id', profileId)
            .single()
        );
        if (res.data) return res.data;
      } catch {}
    }

    const local = localStorage.getItem(this.LOCAL_PREFS_KEY + profileId);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return defaultPrefs;
  }

  static async savePreferences(prefs: ProfilePreferences): Promise<void> {
    localStorage.setItem(this.LOCAL_PREFS_KEY + prefs.profile_id, JSON.stringify(prefs));
    if (isUuid(prefs.profile_id)) {
      try {
        await supabase.from('profile_preferences').upsert(prefs);
      } catch {}
    }
  }
}
