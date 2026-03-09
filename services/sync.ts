import * as SecureStore from 'expo-secure-store';
import { getUnsyncedCells, markCellsSynced } from './database';

// TODO: Update this with your actual API base URL
const API_BASE_URL = 'https://webhook.site/99fd869c-5b27-492d-a662-60ba82c8b1a6';

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT = 10000;

/**
 * Get the auth token from secure storage
 * This must work in both foreground and background contexts
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    return token;
  } catch (error) {
    console.error('❌ Error retrieving auth token:', error);
    return null;
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Sync unsynced cells to the backend
 * This function is safe to call from both background tasks and foreground
 * It will never throw - always catches and logs errors
 *
 * @param authToken - Optional auth token (if not provided, will try to retrieve from storage)
 * @returns Number of cells successfully synced
 */
export async function syncToBackend(authToken?: string): Promise<number> {
  try {
    // 1. Get unsynced cells
    const unsyncedCells = await getUnsyncedCells();

    if (unsyncedCells.length === 0) {
      console.log('ℹ️ No unsynced cells to sync');
      return 0;
    }

    console.log(`🔄 Attempting to sync ${unsyncedCells.length} cells...`);

    // 2. Get auth token if not provided
    let token = authToken;
    if (!token) {
      token = await getAuthToken();
    }

    if (!token) {
      console.log('⚠️ No auth token available, skipping sync');
      return 0;
    }

    // 3. Prepare payload
    const payload = {
      cells: unsyncedCells.map((cell) => ({
        h3_index: cell.h3_index,
        latitude: cell.latitude,
        longitude: cell.longitude,
        discovered_at: cell.discovered_at,
      })),
    };

    // 4. POST to backend
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/explored-cells`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      FETCH_TIMEOUT
    );

    // 5. Check response
    if (!response.ok) {
      console.error(`❌ Backend sync failed with status ${response.status}`);
      return 0;
    }

    // 6. Mark cells as synced
    const cellIds = unsyncedCells.map((cell) => cell.id);
    await markCellsSynced(cellIds);

    console.log(`✅ Successfully synced ${unsyncedCells.length} cells to backend`);
    return unsyncedCells.length;

  } catch (error) {
    // Never throw in background context - just log and return 0
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏱️ Sync request timed out');
      } else {
        console.error('❌ Sync error:', error.message);
      }
    } else {
      console.error('❌ Unknown sync error:', error);
    }
    return 0;
  }
}
