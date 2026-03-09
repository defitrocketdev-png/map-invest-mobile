// Load environment variables from .env files based on build profile
// This works for both local development and EAS builds
const buildProfile = process.env.EAS_BUILD_PROFILE || 'development';

// Map build profile to .env file
const envFileMap = {
  'development': '.env',
  'preview': '.env.preview',
  'production': '.env.prod',
  'dapp-store': '.env.sol',
};

const envFile = envFileMap[buildProfile] || '.env';

console.log(`📦 Loading environment from: ${envFile} (profile: ${buildProfile})`);

// Load the appropriate .env file
require('dotenv').config({ path: envFile });

module.exports = ({ config }) => {
  // Get all configuration from environment variables loaded from .env files
  const appName = process.env.APP_NAME || 'MapInDev';
  const backgroundColor = process.env.BACKGROUND_COLOR || '#FFFF00';
  const androidPackage = process.env.ANDROID_PACKAGE || 'com.mapindev.preview';
  const iosBundleId = process.env.IOS_BUNDLE_ID || 'com.mapindev.preview';
  const appVersion = process.env.APP_VERSION || '0.0.1';
  const iosBuildNumber = process.env.IOS_BUILD_NUMBER || '1';
  const androidVersionCode = parseInt(process.env.ANDROID_VERSION_CODE || '1', 10);


  return {
    ...config,
    expo: {
      name: appName,
      slug: 'defit-atlas-app',
      version: appVersion,
      orientation: 'portrait',
      icon: './assets/images/icon.png',
      scheme: 'defitatlasapp',
      userInterfaceStyle: 'automatic',
      newArchEnabled: true,
      ios: {
        supportsTablet: true,
        bundleIdentifier: iosBundleId,
        buildNumber: iosBuildNumber,
        infoPlist: {
          NSLocationAlwaysAndWhenInUseUsageDescription:
            'We need your location to reveal the Map Invest map even when the app is in the background.',
          NSLocationWhenInUseUsageDescription:
            'We need your location to reveal the Map Invest map.',
          NSLocationAlwaysUsageDescription:
            'We need your location to reveal the Map Invest map even when the app is closed.',
          UIBackgroundModes: ['location'],
          // Disable backup to prevent iOS from backing up location data
          UIFileSharingEnabled: false,
          // Required for background location to work reliably
          BGTaskSchedulerPermittedIdentifiers: [],
        },
      },
      android: {
        adaptiveIcon: {
          ...(backgroundColor && { backgroundColor }),
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: androidPackage,
        versionCode: androidVersionCode,
        permissions: [
          'ACCESS_COARSE_LOCATION',
          'ACCESS_FINE_LOCATION',
          'ACCESS_BACKGROUND_LOCATION',
          'FOREGROUND_SERVICE',
          'FOREGROUND_SERVICE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_BACKGROUND_LOCATION',
          'android.permission.FOREGROUND_SERVICE',
          'android.permission.FOREGROUND_SERVICE_LOCATION',
          'ACCESS_COARSE_LOCATION',
          'ACCESS_FINE_LOCATION',
          'ACCESS_BACKGROUND_LOCATION',
          'FOREGROUND_SERVICE',
          'FOREGROUND_SERVICE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_BACKGROUND_LOCATION',
          'android.permission.FOREGROUND_SERVICE',
          'android.permission.FOREGROUND_SERVICE_LOCATION',
        ],
      },
      web: {
        output: 'static',
        favicon: './assets/images/favicon.png',
      },
      plugins: [
        'expo-router',
        [
          'expo-splash-screen',
          {
            image: './assets/images/splash-icon.png',
            imageWidth: 200,
            resizeMode: 'contain',
            ...(backgroundColor && { backgroundColor }),
            ...(backgroundColor && {
              dark: {
                backgroundColor,
              },
            }),
          },
        ],
        'expo-secure-store',
        [
          'expo-location',
          {
            locationAlwaysAndWhenInUsePermission:
              'Allow Atlas to use your location to reveal the Map Invest map.',
            isIosBackgroundLocationEnabled: true,
            isAndroidBackgroundLocationEnabled: true,
            isAndroidForegroundServiceEnabled: true,
          },
        ],
        'expo-task-manager',
      ],
      experiments: {
        typedRoutes: true,
        reactCompiler: true,
      },
      extra: {
        router: {},
        eas: {
          projectId: process.env.PROJECT_ID,
          profile: process.env.EAS_BUILD_PROFILE || 'development',
        },
      },
      runtimeVersion: {
        policy: 'appVersion',
      },
      updates: {
        url: 'https://u.expo.dev/5fa3c8a5-3aaa-4947-b0a9-6848697ae233',
      },
    },
  };
};
