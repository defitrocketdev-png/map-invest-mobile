import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// NOTE: Task definition is in services/backgroundLocation.ts
// and imported at the top of app/_layout.tsx to ensure it's registered early

export interface BackgroundLocationState {
  isTracking: boolean;
  error: string | null;
  hasBackgroundPermission: boolean;
}

export interface UseBackgroundLocationOptions {
  distanceInterval?: number;
  timeInterval?: number;
  showsBackgroundLocationIndicator?: boolean;
  deferredUpdatesInterval?: number;
}

export interface UseBackgroundLocationReturn extends BackgroundLocationState {
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
  requestBackgroundPermission: () => Promise<boolean>;
}

/**
 * Custom hook for background location tracking
 * This allows your app to track location even when it's in the background
 *
 * IMPORTANT: Make sure to configure app.json with location permissions
 *
 * @param options - Configuration options for background tracking
 * @returns Background location state and control functions
 *
 * @example
 * ```tsx
 * const { isTracking, startTracking, stopTracking } = useBackgroundLocation({
 *   distanceInterval: 50,
 *   onLocationUpdate: (locations) => {
 *     console.log('New locations:', locations);
 *   }
 * });
 *
 * // Start tracking
 * await startTracking();
 *
 * // Stop tracking
 * await stopTracking();
 * ```
 */
export function useBackgroundLocation(
  options: UseBackgroundLocationOptions = {}
): UseBackgroundLocationReturn {
  const {
    distanceInterval = 1,
    timeInterval = 1000,
    showsBackgroundLocationIndicator = true,
    deferredUpdatesInterval = 1000,
  } = options;

  const [state, setState] = useState<BackgroundLocationState>({
    isTracking: false,
    error: null,
    hasBackgroundPermission: false,
  });

  const requestBackgroundPermission = useCallback(async (): Promise<boolean> => {
    try {
      // First request foreground permission
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== Location.PermissionStatus.GRANTED) {
        setState(prev => ({
          ...prev,
          error: 'Foreground location permission is required',
          hasBackgroundPermission: false,
        }));
        return false;
      }

      // Then request background permission
      const background = await Location.requestBackgroundPermissionsAsync();
      const granted = background.status === Location.PermissionStatus.GRANTED;

      setState(prev => ({
        ...prev,
        hasBackgroundPermission: granted,
        error: granted ? null : 'Background location permission denied',
      }));

      return granted;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to request background permission';
      setState(prev => ({ ...prev, error: errorMessage, hasBackgroundPermission: false }));
      return false;
    }
  }, []);

  const startTracking = useCallback(async (): Promise<boolean> => {
    try {
      // Check if we have background permission
      const { status } = await Location.getBackgroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        const granted = await requestBackgroundPermission();
        if (!granted) {
          setState(prev => ({
            ...prev,
            error: 'Background location permission required to start tracking',
          }));
          return false;
        }
      }

      // Start background location updates with iOS-optimized settings
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval,
        timeInterval,
        showsBackgroundLocationIndicator,
        deferredUpdatesInterval,
        activityType: Location.ActivityType.Fitness, // iOS: Optimizes for walking/running
        pausesUpdatesAutomatically: false, // iOS: Don't pause when stationary
        foregroundService: {
          notificationTitle: 'Map Invest',
          notificationBody: 'Exploring the map...',
          notificationColor: '#4A90D9',
        },
      });

      setState(prev => ({ ...prev, isTracking: true, error: null }));
      console.log('✅ Background location tracking started');
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start background tracking';
      setState(prev => ({ ...prev, error: errorMessage, isTracking: false }));
      return false;
    }
  }, [
    distanceInterval,
    timeInterval,
    showsBackgroundLocationIndicator,
    deferredUpdatesInterval,
    requestBackgroundPermission,
  ]);

  const stopTracking = useCallback(async () => {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('✅ Background location tracking stopped');
      }

      setState(prev => ({ ...prev, isTracking: false, error: null }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop tracking';
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, []);

  // Check permission status on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await Location.getBackgroundPermissionsAsync();
      setState(prev => ({
        ...prev,
        hasBackgroundPermission: status === Location.PermissionStatus.GRANTED,
      }));
    };

    checkPermissions();
  }, []);

  // Check if tracking is active on mount
  useEffect(() => {
    const checkTrackingStatus = async () => {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      setState(prev => ({ ...prev, isTracking: hasStarted }));
    };

    checkTrackingStatus();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't automatically stop tracking on unmount
      // because background tracking should persist even when component unmounts
      // Call stopTracking() explicitly when needed
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    requestBackgroundPermission,
  };
}
