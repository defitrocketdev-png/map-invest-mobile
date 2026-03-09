import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { initDB } from '../services/database';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  isTrackingActive,
} from '../services/backgroundLocation';

export interface UseFogOfWarTrackingReturn {
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  permissionStatus: Location.PermissionResponse | null;
  error: string | null;
}

/**
 * Hook for managing fog-of-war background location tracking
 *
 * @example
 * ```tsx
 * const { isTracking, startTracking, stopTracking, error } = useFogOfWarTracking();
 *
 * // Start tracking
 * await startTracking();
 *
 * // Stop tracking
 * await stopTracking();
 * ```
 */
export function useFogOfWarTracking(): UseFogOfWarTrackingReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize database on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        console.log('✅ Database initialized in useFogOfWarTracking');
      } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        setError('Failed to initialize database');
      }
    };

    initialize();
  }, []);

  // Check tracking status and permissions on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check if tracking is active
        const tracking = await isTrackingActive();
        setIsTracking(tracking);

        // Check permission status
        const foreground = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(foreground);
      } catch (err) {
        console.error('❌ Error checking tracking status:', err);
      }
    };

    checkStatus();
  }, []);

  const startTracking = async (): Promise<void> => {
    try {
      setError(null);
      await startBackgroundLocation();
      setIsTracking(true);

      // Update permission status
      const foreground = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(foreground);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start tracking';
      setError(errorMessage);
      setIsTracking(false);
      throw err;
    }
  };

  const stopTracking = async (): Promise<void> => {
    try {
      setError(null);
      await stopBackgroundLocation();
      setIsTracking(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to stop tracking';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    isTracking,
    startTracking,
    stopTracking,
    permissionStatus,
    error,
  };
}
