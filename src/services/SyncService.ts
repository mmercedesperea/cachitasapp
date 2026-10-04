import { openDB, IDBPDatabase } from 'idb';

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

  private static getDB() {
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
   * Queue an operation into IndexedDB when offline.
   */
  static async enqueueOperation(op: Omit<PendingSyncOperation, 'id' | 'createdAt'>): Promise<number> {
    const db = await this.getDB();
    const operation: PendingSyncOperation = {
      ...op,
      createdAt: new Date().toISOString()
    };
    return await db.add(STORE_NAME, operation) as number;
  }

  /**
   * Get all queued operations.
   */
  static async getPendingOperations(): Promise<PendingSyncOperation[]> {
    const db = await this.getDB();
    return await db.getAll(STORE_NAME);
  }

  /**
   * Remove operation by ID after successfully syncing to Supabase.
   */
  static async removeOperation(id: number): Promise<void> {
    const db = await this.getDB();
    await db.delete(STORE_NAME, id);
  }

  /**
   * Clear all queued operations.
   */
  static async clearQueue(): Promise<void> {
    const db = await this.getDB();
    await db.clear(STORE_NAME);
  }
}
