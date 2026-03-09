I have an existing Expo React Native app that displays a fog-of-war map in a WebView.
I need you to set up background location tracking that works even when the app is killed/terminated.

## Architecture & Data Flow

BACKGROUND (app killed/background):
  Location change detected → Compute H3 index → Write to SQLite →
  Attempt to sync unsynced cells to backend → If sync fails (no network, timeout, etc.),
  silently ignore — cells remain unsynced in SQLite and will retry on next trigger.

FOREGROUND (user opens app):
  App opens → Also trigger a sync of any remaining unsynced cells to backend →
  Load all cells from SQLite → Pass to WebView to update fog-of-war map.

SQLite is the source of truth and the offline buffer. Every cell is written to SQLite FIRST,
then sync is attempted. If sync fails, no data is lost.

---

## 1. Install Required Dependencies

Install these packages:
- expo-location
- expo-task-manager
- expo-sqlite
- h3-reactnative (from GitHub: `git+https://github.com/realPrimoh/h3-reactnative.git`)

## 2. Configure app.json / app.config.js

Merge the following into my existing app.json (do not overwrite existing config):

{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "We need your location to reveal the Map Invest map even when the app is in the background.",
        "NSLocationWhenInUseUsageDescription": "We need your location to reveal the Map Invest map.",
        "NSLocationAlwaysUsageDescription": "We need your location to reveal the Map Invest map even when the app is closed."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to reveal the Map Invest map.",
          "isIosBackgroundLocationEnabled": true,
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ]
    ]
  }
}

## 3. Create the SQLite Database Layer

Create `src/services/database.ts` (or .js):

- Initialize a SQLite database called "fogofwar.db"
- Create table `explored_cells`:
  - id (INTEGER PRIMARY KEY AUTOINCREMENT)
  - h3_index (TEXT UNIQUE NOT NULL)
  - latitude (REAL NOT NULL)
  - longitude (REAL NOT NULL)
  - discovered_at (TEXT NOT NULL, ISO 8601 timestamp)
  - synced (INTEGER DEFAULT 0)
- Export functions:
  - initDB(): Create table if not exists
  - insertCell(h3Index, latitude, longitude): Insert cell, IGNORE if h3_index already exists
  - getUnsyncedCells(): SELECT * WHERE synced = 0
  - markCellsSynced(ids: number[]): UPDATE synced = 1 WHERE id IN (ids)
  - getAllCells(): SELECT * (for passing to WebView)

Keep this module simple. It will be called from BOTH the background task context
and the foreground app context.

## 4. Create the H3 Utility

Create `src/utils/h3.ts` (or .js):

- Import * as h3 from 'h3-reactnative'
- Export function latLngToCell(latitude: number, longitude: number, resolution: number = 10): string
  - Resolution 10 ≈ 66m hexagons (19m edge length), good for walking fog-of-war
  - Returns h3.geoToH3(latitude, longitude, resolution)
  - Note: h3-reactnative uses older API (geoToH3 instead of latLngToCell)

## 5. Create the Sync Service

Create `src/services/sync.ts` (or .js):

This service is called from BOTH background tasks and foreground.
It must be safe to call in any context — never throw, always catch errors.

- Export async function syncToBackend(authToken: string): Promise<number>
  1. Call getUnsyncedCells() from database
  2. If no unsynced cells, return 0
  3. Try to POST to backend:
     POST ${API_BASE_URL}/api/v1/explored-cells
     Authorization: Bearer ${authToken}
     Content-Type: application/json
     Body: {
       cells: [{ h3_index, latitude, longitude, discovered_at }]
     }
  4. On success: call markCellsSynced() with the IDs, return count
  5. On failure (network error, timeout, any exception):
     Log the error, return 0. Do NOT mark as synced. They will retry next time.
  6. Use a short timeout (e.g. 10 seconds) for the fetch request to avoid
     blocking the background task too long.

- API_BASE_URL should be a configurable constant at the top of the file.
- Auth token retrieval: export a getAuthToken() helper that reads the token
  from AsyncStorage or SecureStore (whatever my app uses). This must work
  in the background context too. If token is unavailable, skip sync silently.

## 6. Create the Background Location Task

Create `src/services/backgroundLocation.ts` (or .js):

### Task Definition (MUST be at top-level module scope, NOT inside a component):

TaskManager.defineTask("BACKGROUND_LOCATION_TASK", async ({ data, error }) => {
  if (error) { console.error(error); return; }
  if (!data) return;

  const { locations } = data;
  const location = locations[0];
  if (!location) return;

  const { latitude, longitude } = location.coords;

  try {
    // 1. Compute H3 index
    // 2. Insert into SQLite (always succeeds if DB is initialized)
    // 3. Attempt sync — if it fails, that's fine, cells stay in SQLite
    await syncToBackend(authToken);
  } catch (e) {
    // Never let the background task crash
    console.error("Background location task error:", e);
  }
});

### Export functions:

- startBackgroundLocation():
  1. Request foreground permissions (Location.requestForegroundPermissionsAsync)
  2. Request background permissions (Location.requestBackgroundPermissionsAsync)
  3. If both granted, call Location.startLocationUpdatesAsync("BACKGROUND_LOCATION_TASK", {
       accuracy: Location.Accuracy.Balanced,
       timeInterval: 30000,          // 30s minimum between updates (Android)
       distanceInterval: 50,          // 50m minimum movement
       showsBackgroundLocationIndicator: true,  // iOS blue status bar
       activityType: Location.ActivityType.Fitness,
       pausesUpdatesAutomatically: false,
       foregroundService: {            // Android persistent notification
         notificationTitle: "Map Invest",
         notificationBody: "Exploring the map...",
         notificationColor: "#4A90D9",
       },
     })
  4. If permissions denied, throw descriptive error

- stopBackgroundLocation():
  - Location.stopLocationUpdatesAsync("BACKGROUND_LOCATION_TASK")

- isTrackingActive():
  - Location.hasStartedLocationUpdatesAsync("BACKGROUND_LOCATION_TASK")

## 7. Create a React Hook for Tracking

Create `src/hooks/useBackgroundLocation.ts` (or .js):

Export hook useBackgroundLocation() that returns:
  - isTracking: boolean
  - startTracking: () => Promise<void>
  - stopTracking: () => Promise<void>
  - permissionStatus: LocationPermissionResponse | null
  - error: string | null

The hook should:
  - Call initDB() on mount (useEffect)
  - Check current tracking status on mount
  - Handle the full permission flow with clear error messages:
    - "Foreground location permission denied"
    - "Background location permission denied. Please enable 'Always' in Settings."

## 8. Create a Sync-on-Open Hook

Create `src/hooks/useSyncOnOpen.ts` (or .js):

Export hook useSyncOnOpen(authToken: string) that returns:
  - isSyncing: boolean
  - lastSyncCount: number
  - syncNow: () => Promise<void>
  - error: string | null

The hook should:
  - Call syncToBackend() when the app comes to foreground (use AppState listener)
  - Also call syncToBackend() on initial mount
  - Expose syncNow() for manual trigger (e.g. pull-to-refresh)

This catches any cells that the background task failed to sync
(e.g. because there was no network at the time).

## 9. Register Tasks in App Entry Point

In the app entry point (App.tsx or _layout.tsx for Expo Router):
- Import 'src/services/backgroundLocation' at the TOP of the file
  (this triggers TaskManager.defineTask at module load time)
- This import MUST happen before any component renders
- Call initDB() early in the root component mount

## 10. Implementation Rules

- TaskManager.defineTask() MUST be at top-level module scope
- Background task runs in a SEPARATE JS context on iOS — no React state, no context, no hooks
- SQLite is the source of truth. Write to SQLite FIRST, then attempt sync.
- Sync must NEVER throw in the background task — wrap everything in try/catch
- Use a short fetch timeout (10s) in the background to avoid the OS killing a hanging task
- On iOS when app is killed: only "significant location changes" work (~500m).
  The Location.startLocationUpdatesAsync config handles this automatically.
- Test on REAL devices — simulators don't support background location properly

## File Structure

src/
├── services/
│   ├── database.ts            # SQLite init + CRUD
│   ├── backgroundLocation.ts  # Task definition + start/stop
│   └── sync.ts                # Backend sync (used in background + foreground)
├── hooks/
│   ├── useBackgroundLocation.ts  # Permission + tracking control
│   └── useSyncOnOpen.ts          # Catch-up sync when app opens
└── utils/
    └── h3.ts                     # H3 index computation

Implement ALL files with full, working code.
Do NOT modify my existing WebView or map components.
Use TypeScript if my project uses TypeScript, otherwise JavaScript.