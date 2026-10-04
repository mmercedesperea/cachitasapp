import { openDB, IDBPDatabase } from 'idb';
import { supabase } from '../lib/supabase';
import { isUuid, generateUuid } from '../utils/uuid';

export interface PendingSyncOperation {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  createdAt: string;
}

const DB_NAME = 'cachitasapp_offline_db';
const STORE_NAME = 'pending_operations';

export class SyncService {
  private static dbPromise: Promise<IDBPDatabase> | null = null;

  private static getDB(): Promise<IDBPDatabase> | null {
    if (typeof indexedDB === 'undefined') {
      return null;
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Queue an operation into IndexedDB when offline or when Supabase fails.
   */
  static async enqueueOperation(op: Omit<PendingSyncOperation, 'id' | 'createdAt'>): Promise<number | null> {
    try {
      const db = await this.getDB();
      if (!db) return null;
      const operation: PendingSyncOperation = {
        ...op,
        createdAt: new Date().toISOString()
      };
      return await db.add(STORE_NAME, operation) as number;
    } catch {
      return null;
    }
  }

  /**
   * Get all queued operations.
   */
  static async getPendingOperations(): Promise<PendingSyncOperation[]> {
    try {
      const db = await this.getDB();
      if (!db) return [];
      return await db.getAll(STORE_NAME);
    } catch {
      return [];
    }
  }

  /**
   * Remove operation by ID after successfully syncing to Supabase.
   */
  static async removeOperation(id: number): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db) return;
      await db.delete(STORE_NAME, id);
    } catch {}
  }

  /**
   * Clear all queued operations.
   */
  static async clearQueue(): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db) return;
      await db.clear(STORE_NAME);
    } catch {}
  }

  /**
   * Process all pending operations in queue and attempt to sync them to Supabase.
   */
  static async processQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
    const operations = await this.getPendingOperations();
    if (operations.length === 0) {
      return { syncedCount: 0, remainingCount: 0 };
    }

    let syncedCount = 0;

    for (const op of operations) {
      if (!op.id) continue;
      try {
        let success = false;

        if (op.table === 'programs') {
          const { program, weeks } = op.data;
          const programData = program || op.data;
          if (programData && isUuid(programData.profile_id)) {
            const progRes: any = await supabase.from('programs').upsert({
              id: isUuid(programData.id) ? programData.id : generateUuid(),
              profile_id: programData.profile_id,
              name: programData.name,
              goal: programData.goal,
              days_per_week: programData.days_per_week,
              active: programData.active,
              created_at: programData.created_at,
              updated_at: programData.updated_at
            });

            if (!progRes.error) {
              success = true;
              if (weeks && Array.isArray(weeks)) {
                for (const w of weeks) {
                  const { days, ...wData } = w;
                  await supabase.from('program_weeks').upsert(wData);
                  if (days && Array.isArray(days)) {
                    for (const d of days) {
                      const { exercises, ...dData } = d;
                      await supabase.from('program_days').upsert({
                        ...dData,
                        program_week_id: w.id,
                        week_number: w.week_number
                      });
                      if (exercises && Array.isArray(exercises)) {
                        for (const ex of exercises) {
                          if (!isUuid(ex.exercise_id)) continue;
                          const { exercise, ...exData } = ex;
                          await supabase.from('program_exercises').upsert(exData);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else if (op.table === 'workout_sessions') {
          const session = op.data;
          if (session && isUuid(session.profile_id)) {
            const { exercises, ...sessionData } = session;
            const resSess: any = await supabase.from('workout_sessions').upsert({
              ...sessionData,
              id: isUuid(sessionData.id) ? sessionData.id : generateUuid()
            });
            if (!resSess.error) {
              success = true;
              if (exercises && Array.isArray(exercises)) {
                for (const ex of exercises) {
                  if (!isUuid(ex.exercise_id)) continue;
                  const { sets, exercise, ...exData } = ex;
                  await supabase.from('workout_exercises').upsert(exData);
                  if (sets && Array.isArray(sets)) {
                    for (const st of sets) {
                      await supabase.from('workout_sets').upsert(st);
                    }
                  }
                }
              }
            }
          }
        } else if (op.table === 'personal_records') {
          const pr = op.data;
          if (pr && isUuid(pr.profile_id) && isUuid(pr.exercise_id)) {
            const { exercise, ...prData } = pr;
            const resPr: any = await supabase.from('personal_records').upsert({
              ...prData,
              id: isUuid(prData.id) ? prData.id : generateUuid()
            });
            if (!resPr.error) success = true;
          }
        } else if (op.table === 'body_weight_entries') {
          const bw = op.data;
          if (bw && isUuid(bw.profile_id)) {
            const resBw: any = await supabase.from('body_weight_entries').insert({
              ...bw,
              id: isUuid(bw.id) ? bw.id : generateUuid()
            });
            if (!resBw.error) success = true;
          }
        } else if (op.table === 'profiles') {
          const profile = op.data;
          const resProf: any = await supabase.from('profiles').upsert(profile, { onConflict: 'slot' });
          if (!resProf.error) success = true;
        } else {
          // Generic fallback for any other table
          let res: any;
          if (op.action === 'delete') {
            res = await supabase.from(op.table).delete().match(op.data);
          } else {
            res = await supabase.from(op.table).upsert(op.data);
          }
          if (!res.error) success = true;
        }

        if (success) {
          await this.removeOperation(op.id);
          syncedCount++;
        }
      } catch {
        // Leave in queue to retry later
      }
    }

    const remaining = await this.getPendingOperations();
    return { syncedCount, remainingCount: remaining.length };
  }
}
