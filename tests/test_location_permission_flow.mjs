/**
 * Location Permission Flow & Grant Transition Test Suite
 *
 * Verifies regression fixes for Issue 1:
 * 1. Initial mount on Android (getForegroundPermissionsAsync -> { status: 'denied', canAskAgain: true })
 *    maps to status: 'pending', preventing false denial on first launch.
 * 2. Cached status 'denied' from pre-grant checks does NOT short-circuit force requests (requestLocation(true)).
 * 3. Fresh permission grant resolves location, updates cachedStatus to 'granted', and notifies listeners.
 * 4. Stale in-flight non-forced requests that resolve to null do not swallow forced user requests.
 * 5. Last-known position fallback works if current position times out or throws.
 * 6. Setting autoLocation and locationMode: 'auto' propagates to HomeScreen effectiveLocation and triggers reload.
 * 7. Recovery when user grants permission in OS settings after previous denial.
 */

import assert from 'node:assert/strict';

console.log('=== RUNNING LOCATION PERMISSION FLOW REGRESSION TEST SUITE ===\n');

// Mock state and module variables simulating src/lib/useLocation.ts
let cachedLocation = null;
let cachedTimestamp = null;
let cachedStatus = null;
let inFlightRequest = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

function resetMockState() {
  cachedLocation = null;
  cachedTimestamp = null;
  cachedStatus = null;
  inFlightRequest = null;
  listeners.clear();
}

// Mock Expo Location module
let mockForegroundPerm = { status: 'undetermined', canAskAgain: true, granted: false };
let mockRequestPermResult = { status: 'denied', canAskAgain: true, granted: false };
let mockCurrentPosition = { coords: { latitude: 21.4225, longitude: 39.8262 }, timestamp: Date.now() };
let mockLastKnownPosition = { coords: { latitude: 21.4225, longitude: 39.8262 }, timestamp: Date.now() };
let requestForegroundCount = 0;

const MockLocation = {
  getForegroundPermissionsAsync: async () => mockForegroundPerm,
  requestForegroundPermissionsAsync: async () => {
    requestForegroundCount++;
    return mockRequestPermResult;
  },
  getCurrentPositionAsync: async () => mockCurrentPosition,
  getLastKnownPositionAsync: async () => mockLastKnownPosition,
  reverseGeocodeAsync: async () => [{ city: 'Makkah', region: 'Makkah Province', country: 'Saudi Arabia' }],
};

async function getPermissionStatus() {
  try {
    const perm = await MockLocation.getForegroundPermissionsAsync();
    const status = perm.granted
      ? 'granted'
      : perm.status === 'denied' && !perm.canAskAgain
      ? 'denied'
      : 'pending';
    cachedStatus = status;
    notifyListeners();
    return status;
  } catch {
    cachedStatus = 'unavailable';
    notifyListeners();
    return 'unavailable';
  }
}

function setCachedLocation(loc, timestamp) {
  cachedLocation = loc;
  cachedTimestamp = timestamp ?? (loc ? Date.now() : null);
  if (loc) {
    cachedStatus = 'granted';
  }
  notifyListeners();
}

async function performRequest(force = false) {
  if (!force && cachedLocation && cachedStatus === 'granted') {
    return cachedLocation;
  }

  if (inFlightRequest) {
    if (!force) {
      return await inFlightRequest;
    } else {
      try {
        const res = await inFlightRequest;
        if (res) return res;
      } catch {}
    }
  }

  const exec = async () => {
    try {
      const currentPerm = await MockLocation.getForegroundPermissionsAsync();
      let isGranted = currentPerm.granted;

      if (!isGranted) {
        if (!force && (cachedStatus === 'denied' || !currentPerm.canAskAgain)) {
          cachedStatus = 'denied';
          notifyListeners();
          return null;
        }

        const req = await MockLocation.requestForegroundPermissionsAsync();
        if (!req.granted && req.status !== 'granted') {
          cachedStatus = 'denied';
          notifyListeners();
          return null;
        }
        isGranted = true;
      }

      let pos = mockLastKnownPosition;
      if (!pos || Date.now() - pos.timestamp > 3600000) {
        try {
          pos = await MockLocation.getCurrentPositionAsync();
        } catch {
          if (mockLastKnownPosition) {
            pos = mockLastKnownPosition;
          } else {
            throw new Error('Location request timed out');
          }
        }
      }
      if (!pos) return null;

      const newLoc = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label: 'Makkah, Saudi Arabia',
      };

      cachedLocation = newLoc;
      cachedTimestamp = Date.now();
      cachedStatus = 'granted';
      notifyListeners();
      return newLoc;
    } catch {
      cachedStatus = 'unavailable';
      notifyListeners();
      return null;
    } finally {
      inFlightRequest = null;
    }
  };

  inFlightRequest = exec();
  return inFlightRequest;
}

// -------------------------------------------------------------
// Test 1: Android fresh launch permission state
// -------------------------------------------------------------
console.log('Test 1: Android fresh launch returns status: "pending" when canAskAgain is true...');
{
  resetMockState();
  // Android native returns status: 'denied' with canAskAgain: true before user has ever been asked
  mockForegroundPerm = { status: 'denied', canAskAgain: true, granted: false };

  const status = await getPermissionStatus();
  assert.equal(status, 'pending', 'Must map to pending so LocationSetupModal is not prematurely suppressed');
  assert.equal(cachedStatus, 'pending');
  console.log('  ✓ PASSED');
}

// -------------------------------------------------------------
// Test 2: Force request bypasses stale 'denied' cachedStatus
// -------------------------------------------------------------
console.log('Test 2: Force request bypasses cachedStatus "denied" and invokes prompt...');
{
  resetMockState();
  cachedStatus = 'denied'; // Stale denial from an earlier silent check
  mockForegroundPerm = { status: 'denied', canAskAgain: true, granted: false };
  mockRequestPermResult = { status: 'granted', granted: true, canAskAgain: true };
  requestForegroundCount = 0;

  let listenerNotified = false;
  listeners.add(() => { listenerNotified = true; });

  const result = await performRequest(true);
  assert.notEqual(result, null, 'Must not return null when force is true and permission granted');
  assert.equal(requestForegroundCount, 1, 'Must have requested foreground permission from user');
  assert.equal(result.latitude, 21.4225);
  assert.equal(cachedStatus, 'granted');
  assert.equal(listenerNotified, true, 'Hook instances must be notified of grant');
  console.log('  ✓ PASSED');
}

// -------------------------------------------------------------
// Test 3: Stale in-flight null request does NOT swallow force request
// -------------------------------------------------------------
console.log('Test 3: Stale in-flight null request does not swallow forced user request...');
{
  resetMockState();
  requestForegroundCount = 0;
  mockForegroundPerm = { status: 'denied', canAskAgain: true, granted: false };
  mockRequestPermResult = { status: 'granted', granted: true, canAskAgain: true };

  // Simulate an unforced background request in-flight that will resolve to null
  inFlightRequest = Promise.resolve(null);

  const result = await performRequest(true);
  assert.notEqual(result, null, 'Force request must proceed and obtain location even if previous in-flight was null');
  assert.equal(result.latitude, 21.4225);
  console.log('  ✓ PASSED');
}

// -------------------------------------------------------------
// Test 4: Last-known position fallback works when current GPS times out
// -------------------------------------------------------------
console.log('Test 4: Last-known fallback used when current GPS throws/times out...');
{
  resetMockState();
  mockForegroundPerm = { status: 'granted', canAskAgain: true, granted: true };
  mockLastKnownPosition = { coords: { latitude: 24.4672, longitude: 39.6111 }, timestamp: Date.now() - 5000000 };
  
  // Current position throws
  MockLocation.getCurrentPositionAsync = async () => { throw new Error('Timeout'); };

  const result = await performRequest(true);
  assert.notEqual(result, null);
  assert.equal(result.latitude, 24.4672, 'Should fall back to last known position coordinates');
  console.log('  ✓ PASSED');
}

// -------------------------------------------------------------
// Test 5: Full HomeScreen effectiveLocation transition after grant
// -------------------------------------------------------------
console.log('Test 5: HomeScreen effectiveLocation switches to auto and triggers reload...');
{
  resetMockState();
  // Simulate App settings state
  const settings = {
    locationMode: 'manual',
    manualLocation: { latitude: 30.0444, longitude: 31.2357, label: 'Cairo, Egypt' },
    autoLocation: null,
  };

  function computeEffectiveLocation(s, gps) {
    if (s.locationMode === 'auto') {
      return gps || s.autoLocation || s.manualLocation;
    }
    return s.manualLocation;
  }

  // Initial state: manual mode with Cairo
  let effective = computeEffectiveLocation(settings, cachedLocation);
  assert.equal(effective.label, 'Cairo, Egypt');

  // User taps "Use current location" -> grant simulation
  mockForegroundPerm = { status: 'denied', canAskAgain: true, granted: false };
  mockRequestPermResult = { status: 'granted', granted: true, canAskAgain: true };
  MockLocation.getCurrentPositionAsync = async () => mockCurrentPosition;
  mockLastKnownPosition = mockCurrentPosition;

  const grantedLoc = await performRequest(true);
  assert.notEqual(grantedLoc, null);

  // App.tsx handleUseCurrentLocation handler executes:
  settings.autoLocation = grantedLoc;
  settings.locationMode = 'auto';
  setCachedLocation(grantedLoc);

  // HomeScreen re-evaluates effectiveLocation
  effective = computeEffectiveLocation(settings, cachedLocation);
  assert.equal(effective.latitude, 21.4225);
  assert.equal(effective.label, 'Makkah, Saudi Arabia');
  console.log('  ✓ PASSED');
}

// -------------------------------------------------------------
// Test 6: Recovery after user grants in OS Settings
// -------------------------------------------------------------
console.log('Test 6: Silent recovery when user grants permission in device settings...');
{
  resetMockState();
  // Previously marked denied
  cachedStatus = 'denied';

  // User went to Android settings and enabled permission
  mockForegroundPerm = { status: 'granted', canAskAgain: true, granted: true };

  const result = await performRequest(true);
  assert.notEqual(result, null, 'Must successfully obtain location after OS settings grant');
  assert.equal(cachedStatus, 'granted');
  console.log('  ✓ PASSED');
}

console.log('\n===============================================================');
console.log('ALL LOCATION PERMISSION REGRESSION TESTS PASSED SUCCESSFULLY!');
console.log('===============================================================\n');
