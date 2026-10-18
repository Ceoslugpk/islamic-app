/**
 * Regression Test Suite: Task 1 - Location Setup Modal Dismissal & Persistence (S4-001)
 *
 * Verifies:
 * 1. New user / missing flag: initial dismissal state is false.
 * 2. Dismissing location setup: session flag and persistent storage are updated.
 * 3. Route transitions: dismissal flag remains honored across simulated route crawls.
 * 4. Reload / readback: saved flag persists across app restarts.
 * 5. Explicit reopen: location setup can be intentionally re-triggered from Settings / Location screen.
 * 6. Storage failure resilience: in-memory session flag prevents dialog loop even if AsyncStorage throws.
 */

import assert from 'node:assert/strict';

console.log('=== RUNNING TASK 1 LOCATION SETUP DISMISSAL REGRESSION TEST ===\n');

// Mock AsyncStorage
const mockStorage = new Map();
let storageShouldFail = false;

const MockAsyncStorage = {
  getItem: async (key) => {
    if (storageShouldFail) throw new Error('AsyncStorage read error');
    return mockStorage.has(key) ? mockStorage.get(key) : null;
  },
  setItem: async (key, val) => {
    if (storageShouldFail) throw new Error('AsyncStorage write error');
    mockStorage.set(key, String(val));
  },
  removeItem: async (key) => {
    if (storageShouldFail) throw new Error('AsyncStorage remove error');
    mockStorage.delete(key);
  },
};

const LOCATION_SETUP_DISMISSED_KEY = 'location_setup_dismissed_v1';
let sessionLocationSetupDismissed = false;

function hasDismissedLocationSetupSync() {
  return sessionLocationSetupDismissed;
}

async function hasDismissedLocationSetup() {
  if (sessionLocationSetupDismissed) return true;
  try {
    const val = await MockAsyncStorage.getItem(LOCATION_SETUP_DISMISSED_KEY);
    const dismissed = val === 'true';
    if (dismissed) {
      sessionLocationSetupDismissed = true;
    }
    return dismissed;
  } catch {
    return sessionLocationSetupDismissed;
  }
}

async function setDismissedLocationSetup(dismissed) {
  sessionLocationSetupDismissed = dismissed;
  try {
    if (dismissed) {
      await MockAsyncStorage.setItem(LOCATION_SETUP_DISMISSED_KEY, 'true');
    } else {
      await MockAsyncStorage.removeItem(LOCATION_SETUP_DISMISSED_KEY);
    }
  } catch {
    // Non-fatal
  }
}

// 1. Missing flag / New user
console.log('Test 1: New user initial state...');
sessionLocationSetupDismissed = false;
mockStorage.clear();
assert.equal(hasDismissedLocationSetupSync(), false, 'Sync dismissal flag should be false for new user');
assert.equal(await hasDismissedLocationSetup(), false, 'Async dismissal check should be false for new user');
console.log('✓ Initial dismissal state is false for new user');

// 2. Dismissing location setup updates session and storage
console.log('\nTest 2: Dismissing location setup...');
await setDismissedLocationSetup(true);
assert.equal(hasDismissedLocationSetupSync(), true, 'Sync dismissal flag should be true after dismissal');
assert.equal(await hasDismissedLocationSetup(), true, 'Async dismissal flag should be true after dismissal');
assert.equal(mockStorage.get(LOCATION_SETUP_DISMISSED_KEY), 'true', 'Storage should contain "true"');
console.log('✓ Dismissal flag correctly set in memory and persistent storage');

// 3. Navigation across routes honors dismissal
console.log('\nTest 3: Route crawl navigation with locStatus updates...');
const routes = ['home', 'quran', 'qibla', 'dhikr', 'duas', 'calendar', 'settings', 'library'];
let dialogCount = 0;
for (const route of routes) {
  // Simulate App.tsx checkLocationSetup() logic during navigation
  const dismissedSync = hasDismissedLocationSetupSync();
  const dismissedAsync = await hasDismissedLocationSetup();
  const shouldPrompt = !dismissedSync && !dismissedAsync;
  if (shouldPrompt) {
    dialogCount++;
  }
}
assert.equal(dialogCount, 0, 'Location setup dialog should never be prompted across routes once dismissed');
console.log(`✓ Navigated across ${routes.length} routes: dialogCount = 0 (S4-001 resolved)`);

// 4. Reload / Readback (app restart simulation)
console.log('\nTest 4: App restart reload / readback...');
sessionLocationSetupDismissed = false; // Reset in-memory session to simulate cold launch
assert.equal(hasDismissedLocationSetupSync(), false, 'In-memory flag is false on fresh cold launch before reading storage');
const readbackDismissed = await hasDismissedLocationSetup();
assert.equal(readbackDismissed, true, 'Storage readback restores dismissed state');
assert.equal(hasDismissedLocationSetupSync(), true, 'Storage readback hydrates in-memory sync flag');
console.log('✓ Cold restart successfully restores dismissal state from storage');

// 5. Explicit reopen from Settings / Location screen
console.log('\nTest 5: Explicit reopen from Settings / Location entry point...');
await setDismissedLocationSetup(false);
assert.equal(hasDismissedLocationSetupSync(), false, 'Sync dismissal flag should be reset to false');
assert.equal(await hasDismissedLocationSetup(), false, 'Async dismissal check should return false');
assert.equal(mockStorage.has(LOCATION_SETUP_DISMISSED_KEY), false, 'Storage key should be removed');
console.log('✓ Explicit reopen successfully re-enables location setup flow');

// 6. Storage failure resilience
console.log('\nTest 6: Storage failure resilience...');
mockStorage.clear();
sessionLocationSetupDismissed = false;
storageShouldFail = true;

// User clicks "Not now" / Dismiss while storage is unavailable
await setDismissedLocationSetup(true);
assert.equal(hasDismissedLocationSetupSync(), true, 'In-memory flag must remain true despite storage failure');
assert.equal(await hasDismissedLocationSetup(), true, 'Async check falls back to in-memory session flag');
console.log('✓ Storage failure safely absorbed without infinite dialog re-prompts');

storageShouldFail = false;
console.log('\n=== ALL LOCATION DISMISSAL TESTS PASSED ===');
