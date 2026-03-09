import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { useBackgroundLocation } from './useBackgroundLocation';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

export interface GeolocationState {
  location: Location.LocationObject | null;
  loading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceInterval?: number;
  timeInterval?: number;
  watchPosition?: boolean;
  enableBackground?: boolean;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<Location.LocationObject | null>;
  clearError: () => void;
  latitude: number | null;
  longitude: number | null;
  startBackgroundTracking: () => Promise<boolean>;
  stopBackgroundTracking: () => Promise<void>;
  isBackgroundTracking: boolean;
  hasAlwaysPermission: boolean;
}

/**
 * Custom hook for geolocation functionality with background tracking support
 *
 * @param options - Configuration options for geolocation
 * @returns Geolocation state and helper functions
 *
 * @example
 * ```tsx
 * const { location, loading, error, getCurrentLocation } = useGeolocation();
 *
 * // Watch position continuously (foreground only)
 * const { location, latitude, longitude } = useGeolocation({
 *   watchPosition: true,
 *   distanceInterval: 10
 * });
 *
 * // Enable background tracking (AUTO-STARTS after permission granted)
 * const {
 *   location,
 *   requestPermission,
 *   isBackgroundTracking
 * } = useGeolocation({
 *   enableBackground: true,
 *   distanceInterval: 1,
 *   timeInterval: 1000
 * });
 *
 * // Request permission (will auto-start background tracking)
 * await requestPermission();
 *
 * // Background tracking will continue even when app is in background
 * // You can manually stop it if needed:
 * // await stopBackgroundTracking();
 * ```
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 10000,
    distanceInterval = 10,
    timeInterval = 5000,
    watchPosition = false,
    enableBackground = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
    permissionStatus: null,
  });

  const [hasAlwaysPermission, setHasAlwaysPermission] = useState(false);

  // Background location tracking
  const {
    isTracking: isBackgroundTracking,
    startTracking,
    stopTracking,
  } = useBackgroundLocation({
    distanceInterval,
    timeInterval,
    onLocationUpdate: (locations) => {
      // Update state with the latest location from background tracking
      if (locations.length > 0) {
        const latestLocation = locations[locations.length - 1];
        setState(prev => ({
          ...prev,
          location: latestLocation,
          error: null,
        }));
      }
    },
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request foreground permission first
      const foreground = await Location.requestForegroundPermissionsAsync();
      setState(prev => ({ ...prev, permissionStatus: foreground.status }));

      if (foreground.status !== Location.PermissionStatus.GRANTED) {
        setHasAlwaysPermission(false);
        return false;
      }

      // If background is enabled, also request background permission
      if (enableBackground) {
        console.log('🔐 Requesting background location permission...');
        const background = await Location.requestBackgroundPermissionsAsync();

        if (background.status === Location.PermissionStatus.GRANTED) {
          console.log('✅ Background permission granted');
          setHasAlwaysPermission(true);
          // Auto-start background tracking after permission is granted
          // Check if already tracking to avoid starting multiple times
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          if (!hasStarted) {
            const started = await startTracking();
            if (started) {
              console.log('✅ Background tracking started automatically');
            }
          } else {
            console.log('ℹ️ Background tracking already active');
          }
        } else {
          console.log('❌ Background permission denied');
          setHasAlwaysPermission(false);
        }
      }

      return foreground.status === Location.PermissionStatus.GRANTED;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request location permission';
      setState(prev => ({ ...prev, error: errorMessage }));
      setHasAlwaysPermission(false);
      return false;
    }
  }, [enableBackground]);

  const getCurrentLocation = useCallback(async (): Promise<Location.LocationObject | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        const granted = await requestPermission();
        if (!granted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Location permission not granted',
          }));
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: enableHighAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
        timeInterval,
        maximumAge,
      });

      setState(prev => ({
        ...prev,
        location,
        loading: false,
        error: null,
      }));

      return location;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current location';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [enableHighAccuracy, timeInterval, maximumAge, requestPermission]);

  // Auto-start background tracking when enableBackground is true
  useEffect(() => {
    const setupBackgroundTracking = async () => {
      if (enableBackground) {
        console.log('🚀 Attempting to start background location tracking...');

        // Check if already tracking to avoid starting multiple times
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

        if (hasStarted) {
          console.log('ℹ️ Background tracking already active');
          setHasAlwaysPermission(true);
          return;
        }

        // Check if background permission is granted
        const { status } = await Location.getBackgroundPermissionsAsync();

        if (status === Location.PermissionStatus.GRANTED) {
          console.log('✅ Background permission granted, starting tracking...');
          setHasAlwaysPermission(true);
          const started = await startTracking();

          if (started) {
            console.log('✅ Background tracking started successfully');
          } else {
            console.log('❌ Failed to start background tracking');
          }
        } else {
          console.log('⚠️ Background permission not granted yet. Will start after permission is granted.');
          setHasAlwaysPermission(false);
        }
      }
    };

    setupBackgroundTracking();

    return () => {
      // Don't auto-stop on unmount because background tracking should persist
      console.log('🔄 useGeolocation unmounting (background tracking continues)');
    };
  }, [enableBackground]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const setupGeolocation = async () => {
      // Check permission status on mount
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();

      setState(prev => ({ ...prev, permissionStatus: foreground.status }));

      // Check if we have "Always" permission (background permission granted)
      setHasAlwaysPermission(background.status === Location.PermissionStatus.GRANTED);

      if (watchPosition) {
        if (foreground.status !== Location.PermissionStatus.GRANTED) {
          const granted = await requestPermission();
          if (!granted) {
            setState(prev => ({
              ...prev,
              error: 'Location permission required for watching position',
            }));
            return;
          }
        }

        setState(prev => ({ ...prev, loading: true }));

        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: enableHighAccuracy
                ? Location.Accuracy.High
                : Location.Accuracy.Balanced,
              timeInterval,
              distanceInterval,
            },
            (location) => {
              setState(prev => ({
                ...prev,
                location,
                loading: false,
                error: null,
              }));
            }
          );
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to watch position';
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
        }
      }
    };

    setupGeolocation();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [watchPosition, enableHighAccuracy, timeInterval, distanceInterval, requestPermission]);

  return {
    ...state,
    requestPermission,
    getCurrentLocation,
    clearError,
    latitude: state.location?.coords.latitude ?? null,
    longitude: state.location?.coords.longitude ?? null,
    startBackgroundTracking: startTracking,
    stopBackgroundTracking: stopTracking,
    isBackgroundTracking,
    hasAlwaysPermission,
  };
}
