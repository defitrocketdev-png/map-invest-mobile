import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getUnsyncedCells, ExploredCell } from '../services/database';

export interface UseSyncOnOpenReturn {
  isSyncing: boolean;
  lastSyncCount: number;
  syncNow: () => Promise<void>;
  error: string | null;
  unsyncedCells: ExploredCell[];
}

/**
 * Hook for syncing unsynced cells when the app opens or comes to foreground
 *
 * @param authToken - Optional auth token (if not provided, will retrieve from storage)
 * @example
 * ```tsx
 * const { isSyncing, lastSyncCount, syncNow } = useSyncOnOpen();
 *
 * // Manually trigger sync
 * await syncNow();
 * ```
 */
export function useSyncOnOpen(authToken?: string): UseSyncOnOpenReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncCount, setLastSyncCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [unsyncedCells, setUnsyncedCells] = useState<ExploredCell[]>([]);

  const syncNow = useCallback(async (): Promise<void> => {
    if (isSyncing) {
      console.log('ℹ️ Sync already in progress, skipping');
      return;
    }

    try {
      setIsSyncing(true);
      setError(null);

      console.log('🔄 Would sync to backend here...');

      // Get unsynced cells to log what would be synced
      const cells = await getUnsyncedCells();

      if (cells.length === 0) {
        console.log('ℹ️ No unsynced cells to sync');
      } else {
        console.log(`📦 Would sync ${cells.length} cells to backend:`, cells);
      }

      setUnsyncedCells(cells);
      setLastSyncCount(cells.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get unsynced cells';
      setError(errorMessage);
      console.error('❌ Error getting unsynced cells:', errorMessage);
    } finally {
      setIsSyncing(false);
    }
  }, [authToken, isSyncing]);

  // Sync on initial mount
  useEffect(() => {
    console.log('🚀 Initial sync on mount');
    syncNow();
  }, []);

  // Sync when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App came to foreground, triggering sync');
        syncNow();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [syncNow]);

  return {
    isSyncing,
    lastSyncCount,
    syncNow,
    error,
    unsyncedCells,
  };
}
