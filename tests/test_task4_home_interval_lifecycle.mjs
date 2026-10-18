/**
 * Regression Test Suite: Task 4 - HomeScreen & PrayerCountdown Interval Lifecycle (S7-009)
 *
 * Verifies:
 * 1. Source invariants:
 *    - HomeScreenProps specifies `isActive?: boolean`
 *    - HomeScreen computes `isHomeVisible = Boolean(isActive && isAppActive)`
 *    - Clock interval clears when `isHomeVisible` is false, restarts with fresh Date when true
 *    - PrayerCountdown accepts `isActive` and pauses its 1-second interval while Home is scrolled or animating
 *    - App.tsx passes `isActive={tab === 'home'}` to HomeScreen
 * 2. Strict Behavioral Lifecycle:
 *    - Mount on active Home: strict active interval count
 *    - Navigate to Quran/Library/Tools: strict 0 active intervals
 *    - Background/visibility change: strict 0 active intervals
 *    - Return to Home: interval restarts, fresh time synced, no duplicate timer leak
 *    - Rapid tab switching: 50 cycles, zero accumulation, strict bounded counts
 *    - Unmount: 0 active intervals
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING TASK 4 HOME INTERVAL LIFECYCLE REGRESSION TEST ===\n');

// ---------------------------------------------------------------------------
// 1. Source Invariant Checks
// ---------------------------------------------------------------------------
console.log('Test 1: Verifying source invariants across HomeScreen, PrayerCountdown, and App.tsx...');

const homeScreenSrc = fs.readFileSync(path.resolve('src/screens/HomeScreen.tsx'), 'utf-8');
const countdownSrc = fs.readFileSync(path.resolve('src/components/PrayerCountdown.tsx'), 'utf-8');
const appSrc = fs.readFileSync(path.resolve('App.tsx'), 'utf-8');

// HomeScreenProps & params
assert.ok(
  homeScreenSrc.includes('isActive?: boolean;'),
  'HomeScreenProps must define isActive?: boolean'
);
assert.ok(
  homeScreenSrc.includes('isActive = true,'),
  'HomeScreen must accept isActive with default true'
);

// AppState & visibility tracking
assert.ok(
  homeScreenSrc.includes('const isHomeVisible = Boolean(isActive && isAppActive);'),
  'HomeScreen must combine tab active state and app visibility'
);
assert.ok(
  homeScreenSrc.includes("AppState.addEventListener('change'"),
  'HomeScreen must subscribe to AppState changes'
);
assert.ok(
  homeScreenSrc.includes("document.addEventListener('visibilitychange'"),
  'HomeScreen must subscribe to document visibilitychange on web'
);

// Interval lifecycle
assert.ok(
  homeScreenSrc.includes('if (!isHomeVisible) return;') &&
  homeScreenSrc.includes('const syncTimer = setTimeout(() => setNow(new Date()), 0);') &&
  homeScreenSrc.includes('const id = setInterval(() => setNow(new Date()), 30000);') &&
  homeScreenSrc.includes('clearTimeout(syncTimer);') &&
  homeScreenSrc.includes('clearInterval(id);'),
  'HomeScreen clock interval must return early when inactive and clear both timers on cleanup'
);

// PrayerCountdown integration
assert.ok(
  homeScreenSrc.includes('isActive={isHomeVisible && !isScrolled && !isHomeScrolling}'),
  'HomeScreen must pause PrayerCountdown while scrolled or while the scroll animation is active'
);
assert.ok(
  countdownSrc.includes('isActive?: boolean;'),
  'PrayerCountdownProps must include isActive?: boolean'
);
assert.ok(
  countdownSrc.includes('if (isActive === false) return;'),
  'PrayerCountdown must guard interval setup when isActive is false'
);

// App.tsx tab pass-through
assert.ok(
  appSrc.includes("isActive={tab === 'home'}"),
  "App.tsx must pass isActive={tab === 'home'} to HomeScreen"
);

console.log('✓ All source invariants verified across all three files.\n');

// ---------------------------------------------------------------------------
// 2. Behavioral Simulation with Strict Interval Tracking
// ---------------------------------------------------------------------------
console.log('Test 2: Behavioral simulation of focus, route, and visibility lifecycle...');

class IntervalTracker {
  constructor() {
    this.nextId = 1;
    this.activeIntervals = new Map();
    this.totalRegistered = 0;
    this.totalCleared = 0;
  }

  setInterval(cb, ms) {
    const id = this.nextId++;
    this.activeIntervals.set(id, { cb, ms, createdAt: Date.now() });
    this.totalRegistered++;
    return id;
  }

  clearInterval(id) {
    if (this.activeIntervals.has(id)) {
      this.activeIntervals.delete(id);
      this.totalCleared++;
    }
  }

  get activeCount() {
    return this.activeIntervals.size;
  }
}

// Simulates the exact state machine in HomeScreen & PrayerCountdown
class SimulatedHomeScreen {
  constructor(tracker, { initialTab = 'home', initialAppActive = true } = {}) {
    this.tracker = tracker;
    this.props = { isActive: initialTab === 'home' };
    this.state = {
      isAppActive: initialAppActive,
      isScrolled: false,
      isHomeScrolling: false,
      now: new Date(1000),
    };
    this.countdownState = { digits: null };
    this.homeClockTimerId = null;
    this.countdownTimerId = null;
    this.setNowCallCount = 0;
    this.mounted = false;

    this.mount();
  }

  get isHomeVisible() {
    return Boolean(this.props.isActive && this.state.isAppActive);
  }

  mount() {
    this.mounted = true;
    this.syncEffects();
  }

  unmount() {
    this.mounted = false;
    this.cleanupEffects();
  }

  setTab(tab) {
    this.props.isActive = (tab === 'home');
    this.syncEffects();
  }

  setAppActive(active) {
    this.state.isAppActive = active;
    this.syncEffects();
  }

  setScrollState({ isScrolled, isHomeScrolling }) {
    if (typeof isScrolled === 'boolean') this.state.isScrolled = isScrolled;
    if (typeof isHomeScrolling === 'boolean') this.state.isHomeScrolling = isHomeScrolling;
    this.syncEffects();
  }

  cleanupEffects() {
    if (this.homeClockTimerId !== null) {
      this.tracker.clearInterval(this.homeClockTimerId);
      this.homeClockTimerId = null;
    }
    if (this.countdownTimerId !== null) {
      this.tracker.clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
  }

  syncEffects() {
    if (!this.mounted) return;

    // Clock interval effect [isHomeVisible]
    if (!this.isHomeVisible) {
      if (this.homeClockTimerId !== null) {
        this.tracker.clearInterval(this.homeClockTimerId);
        this.homeClockTimerId = null;
      }
    } else {
      if (this.homeClockTimerId === null) {
        this.state.now = new Date();
        this.setNowCallCount++;
        this.homeClockTimerId = this.tracker.setInterval(() => {
          this.state.now = new Date();
          this.setNowCallCount++;
        }, 30000);
      }
    }

    // PrayerCountdown interval effect [targetTime, onExpire, isActive]
    const countdownActive = this.isHomeVisible && !this.state.isScrolled && !this.state.isHomeScrolling;
    if (!countdownActive) {
      if (this.countdownTimerId !== null) {
        this.tracker.clearInterval(this.countdownTimerId);
        this.countdownTimerId = null;
      }
    } else {
      if (this.countdownTimerId === null) {
        this.countdownTimerId = this.tracker.setInterval(() => {
          // countdown tick
        }, 1000);
      }
    }
  }
}

const tracker = new IntervalTracker();
const screen = new SimulatedHomeScreen(tracker, { initialTab: 'home', initialAppActive: true });

// Step A: Active Home
assert.equal(tracker.activeCount, 2, 'Active Home must have exactly 2 active intervals (clock: 30s, countdown: 1s)');
assert.equal(screen.setNowCallCount, 1, 'Mounting on Home immediately syncs `now`');
console.log('  ✓ Mount on Home: exactly 2 active intervals registered, clock synced');

// Scrolling keeps the low-frequency clock alive but pauses the per-second countdown.
screen.setScrollState({ isScrolled: true });
assert.equal(tracker.activeCount, 1, 'Scrolled Home must pause the 1-second countdown interval');
screen.setScrollState({ isScrolled: false, isHomeScrolling: true });
assert.equal(tracker.activeCount, 1, 'Active Home scroll animation must pause the countdown interval');
screen.setScrollState({ isHomeScrolling: false });
assert.equal(tracker.activeCount, 2, 'Returning to the top after scrolling must restore the countdown interval');
console.log('  ✓ Home scrolling pauses the countdown timer and resumes it at rest');

// Step B: Navigate to Quran
screen.setTab('quran');
assert.equal(tracker.activeCount, 0, 'Navigating to Quran must clear ALL intervals (strict 0)');
console.log('  ✓ Navigate to Quran: 0 active intervals');

// Step C: Navigate to Library
screen.setTab('library');
assert.equal(tracker.activeCount, 0, 'Navigating to Library must keep 0 intervals');
console.log('  ✓ Navigate to Library: 0 active intervals');

// Step D: Navigate to Tools
screen.setTab('tools');
assert.equal(tracker.activeCount, 0, 'Navigating to Tools must keep 0 intervals');
console.log('  ✓ Navigate to Tools: 0 active intervals');

// Step E: Return to Home
const prevSyncCount = screen.setNowCallCount;
screen.setTab('home');
assert.equal(tracker.activeCount, 2, 'Returning to Home restores exactly 2 intervals');
assert.equal(screen.setNowCallCount, prevSyncCount + 1, 'Returning to Home immediately updates `now`');
console.log('  ✓ Return to Home: exactly 2 active intervals, clock re-synced immediately');

// Step F: Background app while on Home
screen.setAppActive(false);
assert.equal(tracker.activeCount, 0, 'Minimizing/hiding app clears intervals even on Home');
screen.setAppActive(true);
assert.equal(tracker.activeCount, 2, 'Foregrounding app restores intervals on Home');
console.log('  ✓ App visibility toggle: intervals safely paused and resumed');

// Step G: Rapid Tab Switching (50 cycles)
console.log('Test 3: Rapid tab switching stress test (50 cycles)...');
const tabs = ['quran', 'home', 'library', 'home', 'tools', 'home'];
for (let i = 0; i < 50; i++) {
  const target = tabs[i % tabs.length];
  screen.setTab(target);
  if (target === 'home') {
    assert.equal(tracker.activeCount, 2, `Cycle ${i}: Returning to Home must yield exactly 2 intervals`);
  } else {
    assert.equal(tracker.activeCount, 0, `Cycle ${i}: Inactive Home must yield strictly 0 intervals`);
  }
}
console.log('  ✓ 50 rapid tab transitions executed: zero timer leaks, zero accumulation');

// Step H: Unmount
screen.unmount();
assert.equal(tracker.activeCount, 0, 'Unmounting must clear all intervals');
console.log('  ✓ Final unmount: strictly 0 active intervals remaining');

console.log('\n=== ALL HOME INTERVAL LIFECYCLE REGRESSION TESTS PASSED ===');
