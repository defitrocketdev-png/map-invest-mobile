import { PermissionExplanationScreen } from '@/components/PermissionExplanationScreen';
import { config } from '@/config';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSyncOnOpen } from '@/hooks/useSyncOnOpen';
import { clearAllCells } from '@/services/database';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, type AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Delay before sending batch sync to allow WebView to fully initialize
const BATCH_SYNC_DELAY_MS = 2000; // 2 seconds

export default function Index() {
  const webViewRef = useRef<WebView>(null);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [permissionType, setPermissionType] = useState<'initial' | 'upgrade'>('initial');

  const {
    location,
    latitude,
    longitude,
    getCurrentLocation,
    requestPermission,
    startBackgroundTracking,
    stopBackgroundTracking,
    isBackgroundTracking,
    hasAlwaysPermission,
    permissionStatus,
  } = useGeolocation({
    watchPosition: true,
    distanceInterval: 1, // Track every 1 meter of movement
    timeInterval: 1000, // Track every 1 second
    enableBackground: true, // Enable background tracking
  });

  // Sync hook to get unsynced cells when app opens/foregrounds
  const { unsyncedCells } = useSyncOnOpen();

  // Helper function to build and set WebView URL
  const buildAndSetWebViewUrl = async () => {
    try {
      const currentLocation = await getCurrentLocation();
      const authToken = await SecureStore.getItemAsync('auth_token');

      const params = new URLSearchParams();
      if (authToken) {
        params.append('authtoken', authToken);
      }
      if (currentLocation) {
        params.append('lat', currentLocation.coords.latitude.toString());
        params.append('lng', currentLocation.coords.longitude.toString());
      }

      const finalUrl = params.toString()
        ? `${config.webUrl}?${params.toString()}`
        : config.webUrl;

      console.log('Setting WebView URL:', finalUrl);
      setWebViewUrl(finalUrl);
    } catch (error) {
      console.error('Error building WebView URL:', error);
      setWebViewUrl(config.webUrl);
    }
  };


  // Check permission status and show permission screen if needed
  useEffect(() => {
    const checkPermissions = async () => {
      // If permission is granted but not "Always", show upgrade screen
      if (permissionStatus === 'granted' && !hasAlwaysPermission) {
        setPermissionType('upgrade');
        setShowPermissionScreen(true);
      }
      // If no permission at all, show initial screen
      else if (!permissionStatus || permissionStatus === 'denied') {
        setPermissionType('initial');
        setShowPermissionScreen(true);
      }
      // If we have "Always" permission, hide the screen
      else if (hasAlwaysPermission) {
        setShowPermissionScreen(false);
      }
    };

    checkPermissions();
  }, [permissionStatus, hasAlwaysPermission]);

  // Listen for app state changes to re-check permissions when returning from Settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App has come to the foreground, re-check permissions
        console.log('App became active, re-checking permissions...');
        // const background = await Location.getBackgroundPermissionsAsync();
        // console.log('Background permission status:', background.status);
        const foreground = await Location.getForegroundPermissionsAsync();
        console.log('Foreground permission status:', JSON.stringify(foreground));
        let granted = Platform.OS === 'ios' ? foreground.scope === 'always' : foreground.granted;
        if (granted && showPermissionScreen) {
          console.log('✅ Background permission now granted, hiding permission screen');
          setShowPermissionScreen(false);

          // Build and set WebView URL
          await buildAndSetWebViewUrl();

          // Start background tracking if not already started
          if (!isBackgroundTracking) {
            await startBackgroundTracking();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [showPermissionScreen, isBackgroundTracking]);

  // Request location permission and load URL on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Log update info
        console.log('📦 Update ID:', Updates.updateId || 'embedded build');
        console.log('📦 Channel:', Updates.channel || 'N/A');
        console.log('📦 Runtime Version:', Updates.runtimeVersion || 'N/A');

        // Step 1: Request location permission (will check on mount)
        console.log('Requesting location permission...');
        const permissionGranted = await requestPermission();

        if (!permissionGranted) {
          console.log('Location permission denied');
          return; // Don't load WebView if permission denied
        }

        // Step 2: Build and set WebView URL with location and auth token
        await buildAndSetWebViewUrl();

      } catch (error) {
        console.error('Error initializing app:', error);
        setWebViewUrl(config.webUrl);
      }
    };

    initializeApp();
  }, []);

  // Log background tracking status changes
  useEffect(() => {
    console.log('📊 Background tracking status:', isBackgroundTracking ? '✅ Active' : '❌ Inactive');
  }, [isBackgroundTracking]);

  // Log detailed location info on every move
  useEffect(() => {
    if (location) {
      console.log('========== Location Update ==========');
      console.log('Coordinates:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
      });
      console.log('Timestamp:', new Date(location.timestamp).toLocaleString());
      console.log('=====================================');
    }
  }, [location]);

  // Send location updates to web app when tracking is enabled
  useEffect(() => {
    if (isTrackingEnabled && location && webViewRef.current) {
      // Generate cell ID (resolution 10 = 5 decimal places = ~1.1m precision)
      const cellId = `${location.coords.latitude.toFixed(5)}_${location.coords.longitude.toFixed(5)}`;

      const payload: {
        h3Index: string;
        latitude: number;
        longitude: number;
        heading?: number;
        accuracy?: number;
      } = {
        h3Index: cellId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Add optional fields if available
      if (location.coords.heading !== null && location.coords.heading !== undefined) {
        payload.heading = location.coords.heading;
      }
      if (location.coords.accuracy !== null && location.coords.accuracy !== undefined) {
        payload.accuracy = location.coords.accuracy;
      }

      const response = {
        type: 'LOCATION_UPDATE',
        payload,
      };

      // Log message type and payload separately
      console.log('📍 Message type:', response.type);
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));
      console.log('🌐 Full message:', JSON.stringify(response, null, 2));

      webViewRef.current.postMessage(JSON.stringify(response));
    }
  }, [location, isTrackingEnabled]);

  // Send batch locations to WebView when unsynced cells are loaded AND WebView is ready
  useEffect(() => {
    console.log('='.repeat(50));
    console.log('🔍 BATCH SYNC EFFECT TRIGGERED');
    console.log('   Unsynced cells:', unsyncedCells.length);
    console.log('   WebView ready:', isWebViewReady);
    console.log('   WebView ref exists:', !!webViewRef.current);
    console.log('   Will send batch:', unsyncedCells.length > 0 && !!webViewRef.current && isWebViewReady);
    console.log('='.repeat(50));

    const sendBatchAndClear = async () => {
      console.log('='.repeat(50));
      console.log("sendBatchAndClear")
      console.log('   Unsynced cells:', unsyncedCells.length);
      console.log('   WebView ready:', isWebViewReady);
      console.log('   WebView ref exists:', !!webViewRef.current);
      console.log('   Will send batch:', unsyncedCells.length > 0 && !!webViewRef.current && isWebViewReady);
      console.log('='.repeat(50));
      if (unsyncedCells.length > 0 && webViewRef.current && isWebViewReady) {
        // Wait for WebView to fully initialize its services
        console.log(`⏳ Waiting ${BATCH_SYNC_DELAY_MS}ms for WebView to initialize...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_SYNC_DELAY_MS));

        const positions = unsyncedCells.map(cell => ({
          latitude: cell.latitude,
          longitude: cell.longitude,
        }));

        const batchMessage = {
          type: 'BATCH_LOCATION_SYNC',
          payload: {
            positions,
            count: unsyncedCells.length,
          },
        };

        console.log('='.repeat(50));
        console.log('📦 SENDING BATCH_LOCATION_SYNC TO WEBVIEW');
        console.log(`   Source: Background locations collected while app was killed`);
        console.log(`   Total positions: ${unsyncedCells.length}`);
        console.log(`   Time range: ${unsyncedCells[0].discovered_at} → ${unsyncedCells[unsyncedCells.length - 1].discovered_at}`);
        console.log('='.repeat(50));

        webViewRef.current.postMessage(JSON.stringify(batchMessage));

        // Clear all cells from SQLite after sending to WebView
        try {
          await clearAllCells();
          console.log(`✅ Cleared ${unsyncedCells.length} cells from SQLite (already sent to WebView)`);
        } catch (error) {
          console.error('❌ Failed to clear SQLite:', error);
        }
      } else {
        console.log('⚠️ Not sending batch - conditions not met');
      }
    };

    sendBatchAndClear();
  }, [unsyncedCells, isWebViewReady]);

  const handleWebViewLoad = () => {
    console.log('✅ WebView loaded and ready');
    setIsWebViewReady(true);
  };

  const handleMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Received message from web app:', message);

      if (message.type === 'SAVE_AUTH_TOKEN') {
        console.log('Saving auth token from web app');
        try {
          const { auth_token } = message.payload;

          if (!auth_token) {
            throw new Error('auth_token is required');
          }

          // Save auth token to secure storage
          await SecureStore.setItemAsync('auth_token', auth_token);
          console.log('Auth token saved successfully');

          // Update the URL with the new auth token and current location
          const params = new URLSearchParams();
          params.append('authtoken', auth_token);

          if (latitude && longitude) {
            params.append('lat', latitude.toString());
            params.append('lng', longitude.toString());
          }

          setWebViewUrl(`${config.webUrl}?${params.toString()}`);

          // Send success response back to webview
          if (webViewRef.current) {
            console.log('Sending AUTH_TOKEN_SAVED to web app');
            webViewRef.current.postMessage(JSON.stringify({
              type: 'AUTH_TOKEN_SAVED',
              payload: { success: true },
            }));
          }
        } catch (error) {
          console.error('Error saving auth token:', error);

          // Send error response back to webview
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'AUTH_TOKEN_SAVED',
              payload: {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save auth token'
              },
            }));
          }
        }
      }
      else if (message.type === 'REMOVE_AUTH_TOKEN') {
        console.log('Removing auth token from secure storage');
        try {
          await SecureStore.deleteItemAsync('auth_token');
          console.log('Auth token removed successfully');

          // Reload URL without auth token but keep location params if available
          const params = new URLSearchParams();
          if (latitude && longitude) {
            params.append('lat', latitude.toString());
            params.append('lng', longitude.toString());
          }

          const finalUrl = params.toString()
            ? `${config.webUrl}?${params.toString()}`
            : config.webUrl;

          setWebViewUrl(finalUrl);

          // Send success response back to webview
          if (webViewRef.current) {
            console.log('Sending AUTH_TOKEN_REMOVED to web app');
            webViewRef.current.postMessage(JSON.stringify({
              type: 'AUTH_TOKEN_REMOVED',
              payload: { success: true },
            }));
          }
        } catch (error) {
          console.error('Error removing auth token:', error);

          // Send error response back to webview
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'AUTH_TOKEN_REMOVED',
              payload: {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove auth token'
              },
            }));
          }
        }
      }
      else if (message.type === 'START_LOCATION_UPDATES') {
        console.log('Starting location updates for web app');
        setIsTrackingEnabled(true);

        // Start background location tracking
        console.log('🚀 Starting background location tracking...');
        const started = await startBackgroundTracking();

        if (started) {
          console.log('✅ Background tracking started successfully');
        } else {
          console.log('❌ Failed to start background tracking');
        }
      }
      else if (message.type === 'STOP_LOCATION_UPDATES') {
        console.log('Stopping location updates for web app');
        setIsTrackingEnabled(false);

        // Stop background location tracking
        console.log('🛑 Stopping background location tracking...');
        await stopBackgroundTracking();
        console.log('✅ Background tracking stopped');
      }
      else if (message.type === 'REQUEST_CENTER_LOCATION') {
        // Get the latest location
        const location = await getCurrentLocation();
        console.log('📍 Latest location:', location);
        if (location) {
          // Direct push to webhook for testing
          // try {
          //   console.log('🔄 Pushing location to webhook...');
          //   const response = await fetch('https://webhook.site/62836f17-d372-4a3c-bfcc-b91cd1a4c0bb', {
          //     method: 'POST',
          //     headers: {
          //       'Content-Type': 'application/json',
          //     },
          //     body: JSON.stringify({
          //       latitude: location.coords.latitude,
          //       longitude: location.coords.longitude,
          //       timestamp: new Date().toISOString(),
          //     }),
          //   });
          //   console.log('✅ Location pushed to webhook:', response.status);
          // } catch (error) {
          //   console.error('❌ Failed to push to webhook:', error);
          // }

          // Send location back to web view
          if (webViewRef.current) {
            // Generate cell ID (resolution 10 = 5 decimal places = ~1.1m precision)
            const cellId = `${location.coords.latitude.toFixed(5)}_${location.coords.longitude.toFixed(5)}`;

            webViewRef.current.postMessage(JSON.stringify({
              type: 'CENTER_LOCATION_UPDATE',
              payload: {
                h3Index: cellId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              },
            }));
          }
        }
      }
      else if (message.type === 'ALERT_UPDATE_INFO') {
        // Show alert with update info
        const updateId = Updates.updateId || 'embedded build';
        const createdAt = Updates.createdAt
          ? new Date(Updates.createdAt).toLocaleString()
          : 'N/A';

        Alert.alert(
          'Update Info',
          `Update ID: ${updateId}\n\nDate: ${createdAt}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error handling message from WebView:', error);
    }
  };

  const handlePermissionRequest = async () => {
    console.log('User tapped Continue on permission screen');
    const granted = await requestPermission();

    if (granted && hasAlwaysPermission) {
      setShowPermissionScreen(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {showPermissionScreen ? (
        <PermissionExplanationScreen
          onRequestPermission={handlePermissionRequest}
          permissionType={permissionType}
        />
      ) : webViewUrl ? (
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.webview}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          onLoad={handleWebViewLoad}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});



