import Constants from 'expo-constants';

/**
 * App configuration that changes based on build profile
 *
 * Build profiles are defined in eas.json:
 * - development: Local development environment
 * - preview: Preview/staging environment
 * - production: Live production environment
 * - dapp-store: Solana DApp store build
 *
 * Environment variables are loaded from:
 * - Local dev: .env files (via dotenv in app.config.js)
 * - EAS builds: eas.json env section
 */

// Get the build profile from expo-constants
// This is set during EAS Build via the EAS_BUILD_PROFILE env var
const buildProfile = Constants.expoConfig?.extra?.eas?.profile ||
  process.env.EAS_BUILD_PROFILE ||
  'development'; // Default to development for local dev

const isProduction = buildProfile === 'production';

console.log('📦 Build Profile:', buildProfile);

/**
 * Configuration object
 */
export const config = {
  /**
   * Current build profile
   */
  buildProfile,

  /**
   * WebView URL - loaded from environment variable
   * Fallback to development URL if not set
   */
  webUrl: process.env.WEB_URL ||
    Constants.expoConfig?.extra?.webUrl ||
    '',

  /**
   * API Base URL - loaded from environment variable
   * Fallback to development API if not set
   */
  apiBaseUrl: process.env.API_BASE_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl ||
    '',

  /**
   * Feature flags - loaded from environment variables
   */
  features: {
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true' || isProduction,
    enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true' || !isProduction,
  },

};


