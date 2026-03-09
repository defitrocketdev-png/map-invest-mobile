import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { initDB, insertCell } from './database';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

/**
 * Define the background location task at module scope
 * This MUST be at the top level, NOT inside a component or function
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ No data in background location task');
    return;
  }

  try {
    const { locations } = data as Location.LocationTaskEventData;
    const location = locations[0];

    if (!location) {
      console.log('⚠️ No location in background task');
      return;
    }

    const { latitude, longitude } = location.coords;

    // Generate cell ID (resolution 10 = 5 decimal places = ~1.1m precision)
    const cellId = `${latitude.toFixed(5)}_${longitude.toFixed(5)}`;

    console.log('📍 Background location update:', { latitude, longitude, cellId });

    // Push to webhook for testing (even when app is killed)
    // try {
    //   await fetch('https://webhook.site/99fd869c-5b27-492d-a662-60ba82c8b1a6', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       source: 'BACKGROUND_TASK',
    //       h3_index: h3Index,
    //       latitude,
    //       longitude,
    //       timestamp: new Date().toISOString(),
    //     }),
    //   });
    //   console.log('✅ Background location pushed to webhook from backgroundLocation.ts');
    // } catch (error) {
    //   console.error('❌ Failed to push to webhook:', error);
    // }

    // Try to initialize and insert with retry logic
    let retries = 2;
    let success = false;

    while (retries > 0 && !success) {
      try {
        // Ensure database is initialized
        await initDB();

        // Insert into SQLite
        await insertCell(latitude, longitude);

        success = true;
        console.log('✅ Location saved to database');
        console.log('🔄 Would sync to backend here:', { cellId, latitude, longitude });
      } catch (dbError) {
        retries--;
        console.error(`❌ Database operation failed (${retries} retries left):`, dbError);

        if (retries > 0) {
          // Small delay before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    if (!success) {
      console.error('❌ Failed to save location after all retries');
    }

  } catch (error) {
    // Never let the background task crash
    console.error('❌ Background location task processing error:', error);
  }
});

console.log('✅ Background location task defined');

/**
 * Start background location tracking
 * @throws Error if permissions are denied
 */
export async function startBackgroundLocation(): Promise<void> {
  try {
    // 1. Request foreground permissions
    const foreground = await Location.requestForegroundPermissionsAsync();

    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Foreground location permission denied');
    }

    console.log('✅ Foreground location permission granted');

    // 2. Request background permissions
    const background = await Location.requestBackgroundPermissionsAsync();

    if (background.status !== Location.PermissionStatus.GRANTED) {
      throw new Error(
        'Background location permission denied. Please enable "Always" in Settings.'
      );
    }

    console.log('✅ Background location permission granted');

    // 3. Start location updates with iOS-optimized configuration
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 1000, // 1 second minimum (fastest reliable interval)
      distanceInterval: 1, // 1 meter minimum movement

      // iOS-specific settings
      showsBackgroundLocationIndicator: true, // iOS: Shows blue status bar
      activityType: Location.ActivityType.Fitness, // iOS: Optimizes for walking/running
      pausesUpdatesAutomatically: false, // iOS: Don't pause when stationary
      deferredUpdatesInterval: 1000, // iOS: Batch updates for battery efficiency

      // Android-specific settings
      foregroundService: {
        notificationTitle: 'MapInvest',
        notificationBody: 'Exploring MapInvest...',
        notificationColor: '#4A90D9',
      },
    });

    console.log('✅ Background location tracking started');
  } catch (error) {
    console.error('❌ Error starting background location:', error);
    throw error;
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocation(): Promise<void> {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    );

    if (isTracking) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('✅ Background location tracking stopped');
    } else {
      console.log('ℹ️ Background location tracking was not active');
    }
  } catch (error) {
    console.error('❌ Error stopping background location:', error);
    throw error;
  }
}

/**
 * Check if background location tracking is active
 */
export async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    );
  } catch (error) {
    console.error('❌ Error checking tracking status:', error);
    return false;
  }
}
