import * as SQLite from 'expo-sqlite';

const DB_NAME = 'fogofwar.db';
const DEFAULT_RESOLUTION = 10; // 5 decimal places precision

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export interface ExploredCell {
  id: number;
  h3_index: string;
  latitude: number;
  longitude: number;
  discovered_at: string;
  synced: number;
}

/**
 * Initialize the SQLite database and create tables if they don't exist
 * Handles concurrent initialization from foreground + background safely
 */
export async function initDB(): Promise<void> {
  // If already initialized, return immediately
  if (db) {
    return;
  }

  // If currently initializing, wait for existing initialization
  if (isInitializing && initPromise) {
    console.log('⏳ Database initialization in progress, waiting...');
    await initPromise;
    return;
  }

  // Start new initialization
  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('🔄 Initializing database...');

      // Small delay to reduce Android race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      db = await SQLite.openDatabaseAsync(DB_NAME);

      // Create the explored_cells table with H3 index support
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS explored_cells (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          h3_index TEXT UNIQUE NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          discovered_at TEXT NOT NULL,
          synced INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_synced ON explored_cells(synced);
        CREATE INDEX IF NOT EXISTS idx_h3_index ON explored_cells(h3_index);
      `);

      // Migration: Add h3_index column if it doesn't exist (for existing databases)
      try {
        await db.execAsync(`
          ALTER TABLE explored_cells ADD COLUMN h3_index TEXT;
        `);
        console.log('✅ Added h3_index column to existing database');
      } catch (error) {
        // Column already exists, which is fine
      }

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      db = null; // Reset on failure
      throw error;
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();

  await initPromise;
}

/**
 * Insert a new location into the database (IGNORE if already exists)
 * Creates unique cell identifiers based on coordinates
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param resolution - Resolution level (affects decimal precision, default: 10 = 5 decimals)
 */
export async function insertCell(
  latitude: number,
  longitude: number,
  resolution: number = DEFAULT_RESOLUTION
): Promise<void> {
  try {
    if (!db) {
      await initDB();
    }

    // Generate cell ID from coordinates
    // Resolution 10 = 5 decimal places precision
    const precisionMap: Record<number, number> = {
      7: 3,   // 0.001° ≈ 111m
      8: 4,   // 0.0001° ≈ 11m
      9: 4,   // 0.0001° ≈ 11m
      10: 5,  // 0.00001° ≈ 1.1m (default)
      11: 6,  // 0.000001° ≈ 0.11m
      12: 6,  // 0.000001° ≈ 0.11m
    };
    const precision = precisionMap[resolution] ?? 5;
    const cellId = `${latitude.toFixed(precision)}_${longitude.toFixed(precision)}`;

    const discoveredAt = new Date().toISOString();

    await db!.runAsync(
      `INSERT OR IGNORE INTO explored_cells (h3_index, latitude, longitude, discovered_at, synced)
       VALUES (?, ?, ?, ?, 0)`,
      [cellId, latitude, longitude, discoveredAt]
    );

    console.log(`📍 Inserted cell: ${cellId} at (${latitude}, ${longitude})`);
  } catch (error) {
    console.error('❌ Error inserting location:', error);
    throw error;
  }
}

/**
 * Get all unsynced cells from the database
 */
export async function getUnsyncedCells(): Promise<ExploredCell[]> {
  try {
    if (!db) {
      await initDB();
    }

    const result = await db!.getAllAsync<ExploredCell>(
      'SELECT * FROM explored_cells WHERE synced = 0'
    );

    console.log(`📊 Found ${result.length} unsynced cells`);
    return result;
  } catch (error) {
    console.error('❌ Error getting unsynced cells:', error);
    return [];
  }
}

/**
 * Mark cells as synced
 */
export async function markCellsSynced(ids: number[]): Promise<void> {
  try {
    if (!db || ids.length === 0) {
      return;
    }

    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE explored_cells SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );

    console.log(`✅ Marked ${ids.length} cells as synced`);
  } catch (error) {
    console.error('❌ Error marking cells as synced:', error);
    throw error;
  }
}

/**
 * Get all cells (for passing to WebView)
 */
export async function getAllCells(): Promise<ExploredCell[]> {
  try {
    if (!db) {
      await initDB();
    }

    const result = await db!.getAllAsync<ExploredCell>(
      'SELECT * FROM explored_cells'
    );

    console.log(`📊 Retrieved ${result.length} total cells`);
    return result;
  } catch (error) {
    console.error('❌ Error getting all cells:', error);
    return [];
  }
}

/**
 * Clear all cells from the database
 */
export async function clearAllCells(): Promise<void> {
  try {
    if (!db) {
      await initDB();
    }

    await db!.runAsync('DELETE FROM explored_cells');
    console.log('🗑️ All cells cleared from database');
  } catch (error) {
    console.error('❌ Error clearing cells:', error);
    throw error;
  }
}

/**
 * Get database instance (for debugging/advanced usage)
 */
export function getDatabase(): SQLite.SQLiteDatabase | null {
  return db;
}
