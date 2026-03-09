# Environment Configuration Guide

This project uses environment-specific configuration files to manage different build environments. This guide explains how to use and manage these configurations.

## Available Environments

The project supports 4 different environments:

1. **Development** (`.env`) - Local development builds
2. **Preview** (`.env.preview`) - Preview/staging builds
3. **Production** (`.env.prod`) - Production builds for App Store/Play Store
4. **DApp Store** (`.env.sol`) - Solana DApp Store builds

## Environment Variables

Each environment file contains the following variables:

### Build Configuration
- `EAS_BUILD_PROFILE` - The build profile name (development, preview, production)
- `APP_NAME` - Display name of the app
- `APP_VERSION` - App version (e.g., "0.0.1")

### Build Numbers
- `IOS_BUILD_NUMBER` - iOS build number (increment for each iOS build)
- `ANDROID_VERSION_CODE` - Android version code (increment for each Android build)

### App Identifiers
- `ANDROID_PACKAGE` - Android package name (e.g., "com.mapinvest.prod")
- `IOS_BUNDLE_ID` - iOS bundle identifier (e.g., "com.mapinvest.prod")

### UI Configuration
- `BACKGROUND_COLOR` - App background/splash color (hex code)

### API/Web Configuration
- `WEB_URL` - WebView URL for the map interface
- `API_BASE_URL` - Backend API base URL

### Feature Flags
- `ENABLE_ANALYTICS` - Enable analytics tracking (true/false)
- `ENABLE_DEBUG_LOGS` - Enable debug logging (true/false)

## How It Works

### Unified Configuration Approach

This project uses a **single source of truth** approach where all environment variables live in `.env` files only. The `eas.json` file is kept minimal and only specifies the build profile name.

### Local Development

When running the app locally (via `npx expo start`), the `.env` file is automatically loaded:

```bash
# Start development server (uses .env)
npx expo start

# OR run on Android (uses .env)
npx expo run:android
```

### EAS Builds

When building with EAS, the build profile is passed via `eas.json`, and `app.config.js` automatically loads the corresponding `.env` file:

```bash
# Build for development (loads .env)
eas build --profile development --platform android

# Build for preview (loads .env.preview)
eas build --profile preview --platform ios

# Build for production (loads .env.prod)
eas build --profile production --platform all

# Build for dapp-store (loads .env.sol)
eas build --profile dapp-store --platform android
```

**Build Profile → .env File Mapping:**
- `development` → `.env`
- `preview` → `.env.preview`
- `production` → `.env.prod`
- `dapp-store` → `.env.sol`

This mapping is configured in `app.config.js` and works automatically for both local development and EAS builds.

### EAS Updates

When publishing updates, use the channel specified in each build profile:

```bash
# Publish update to development channel
eas update --branch development --message "Development update"

# Publish update to preview channel
eas update --branch preview --message "Preview update"

# Publish update to production channel
eas update --branch production --message "Production update"
```

## File Structure

```
.
├── .env                    # Development environment (gitignored)
├── .env.preview            # Preview environment (gitignored)
├── .env.prod               # Production environment (gitignored)
├── .env.sol                # DApp store environment (gitignored)
├── .env.example            # Template file (committed to git)
├── eas.json                # EAS build configuration with env vars
├── app.config.js           # App config that loads env vars
└── config.ts               # Runtime config that reads env vars
```

## Git Configuration

The actual `.env` files are gitignored to prevent committing sensitive data:

```gitignore
# Environment configuration files (keep .env.example)
.env
.env.preview
.env.prod
.env.sol
```

Only `.env.example` is committed to git as a template.

## Updating Environment Variables

### For Local Development

1. Edit the appropriate `.env` file:
   ```bash
   # Edit development environment
   nano .env

   # Edit preview environment
   nano .env.preview
   ```

2. Restart your development server to pick up changes:
   ```bash
   npx expo start --clear
   ```

### For EAS Builds

Simply update the appropriate `.env` file:

```bash
# Edit production environment
nano .env.prod
```

The changes will automatically be picked up by EAS builds when you run:

```bash
eas build --profile production --platform all
```

### Single Source of Truth

**IMPORTANT:** All environment variables are stored in `.env` files only. The `eas.json` file does NOT contain duplicate environment variables - it only specifies the build profile name.

This means:
- ✅ Update `.env.*` files to change configuration
- ❌ NO need to update `eas.json` env section (it only has `EAS_BUILD_PROFILE`)
- ✅ Configuration is consistent across local dev and EAS builds automatically

## Accessing Environment Variables in Code

### In app.config.js

Environment variables are available via `process.env`:

```javascript
const appName = process.env.APP_NAME || 'MapInDev';
const webUrl = process.env.WEB_URL || 'https://default-url.com';
```

### In TypeScript/React Code

Use the `config` object from `config.ts`:

```typescript
import { config } from '@/config';

// Access configuration
console.log('Web URL:', config.webUrl);
console.log('API URL:', config.apiBaseUrl);
console.log('Build Profile:', config.buildProfile);

// Access feature flags
if (config.features.enableAnalytics) {
  // Initialize analytics
}

if (config.features.enableDebugLogs) {
  console.log('Debug mode enabled');
}
```

## Best Practices

1. **Never commit `.env` files** - Keep sensitive data out of version control
2. **Keep `.env.example` updated** - Document all required variables
3. **Increment build numbers** - Update `IOS_BUILD_NUMBER` and `ANDROID_VERSION_CODE` for each build
4. **Single source of truth** - All configuration lives in `.env` files, not in `eas.json`
5. **Use descriptive values** - Make it easy to identify which environment you're in
6. **Test before deploying** - Always test builds locally before pushing to production

## Troubleshooting

### Variables not loading locally

1. Make sure `.env` file exists in the project root
2. Restart your development server with `--clear` flag:
   ```bash
   npx expo start --clear
   ```
3. Check that `dotenv` is installed:
   ```bash
   npm install dotenv
   ```

### Variables not loading in EAS builds

1. Verify the corresponding `.env` file exists (e.g., `.env.prod` for production profile)
2. Check that you're using the correct build profile:
   ```bash
   eas build --profile production --platform android
   ```
3. Check EAS build logs for the message "Loading environment from: .env.prod"
4. Ensure all required variables are set in the `.env` file

### Wrong environment being used

1. Check the `EAS_BUILD_PROFILE` variable
2. Verify you're using the correct build profile in the EAS command
3. Check that `app.config.js` is loading the correct environment

## Example: Adding a New Environment Variable

Let's say you want to add a new `FEATURE_FLAG_NEW_UI` variable:

### Step 1: Add to .env files

```bash
# .env (development)
FEATURE_FLAG_NEW_UI=true

# .env.preview
FEATURE_FLAG_NEW_UI=true

# .env.prod
FEATURE_FLAG_NEW_UI=false

# .env.sol
FEATURE_FLAG_NEW_UI=false

# .env.example
FEATURE_FLAG_NEW_UI=false
```

### Step 2: Add to config.ts

```typescript
export const config = {
  ...
  features: {
    ...
    enableNewUI: process.env.FEATURE_FLAG_NEW_UI === 'true',
  },
};
```

### Step 3: Use in your code

```typescript
import { config } from '@/config';

if (config.features.enableNewUI) {
  return <NewUI />;
} else {
  return <OldUI />;
}
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npx expo start` | Start dev server (uses `.env`) |
| `eas build --profile development` | Build development version |
| `eas build --profile preview` | Build preview version |
| `eas build --profile production` | Build production version |
| `eas build --profile dapp-store` | Build dapp-store version |
| `eas update --branch <channel>` | Publish OTA update to channel |
