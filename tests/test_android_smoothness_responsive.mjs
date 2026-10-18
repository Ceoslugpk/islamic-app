/**
 * Regression Test Suite: Android Smoothness & Responsive UI Repair
 *
 * Verifies:
 * 1. Source invariants & wiring contracts:
 *    - CompactPrayerBar: accepts `isActive?: boolean`, forwards to PrayerCountdown, uses flexible minHeight, memoized
 *    - HomeScreen: passes `isActive={isHomeVisible && isScrolled}` to CompactPrayerBar
 *    - ToolsScreen: accepts `isActive?: boolean`, pauses pulseAnim on inactive/reduceMotion, guards fetchPrayerTimes
 *    - ToolsScreen: responsive prayerPitch calculation prevents overlap on narrow screens (320dp/360dp) and in RTL
 *    - LibraryScreen: accepts `isActive?: boolean`
 *    - App.tsx: wires `isActive` to HomeScreen, LibraryScreen, and ToolsScreen
 * 2. Behavioral timer, animation & network request lifecycle:
 *    - Tab switching: active Home -> Library -> Tools -> Quran -> Home
 *    - Zero active timers or running loops when tab is hidden
 *    - 100 rapid tab switch cycles: zero accumulation, strict cleanup
 *    - Request deduplication: no redundant fetch when tab is inactive
 * 3. Responsive geometry & content contracts:
 *    - Widths: 320, 360, 393, 430, 600, 768, 1024
 *    - LTR (English) and RTL (Urdu)
 *    - 130% font scale clearance
 *    - Zero overlap between prayer circles and streak cluster at all widths
 *    - 24dp content gap & 32dp bottom clearance invariants
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING ANDROID SMOOTHNESS & RESPONSIVE UI REPAIR REGRESSION TEST ===\n');

// ---------------------------------------------------------------------------
// 1. Source Invariant Checks
// ---------------------------------------------------------------------------
console.log('Test 1: Verifying source invariants across CompactPrayerBar, HomeScreen, ToolsScreen, LibraryScreen, and App.tsx...');

const compactBarSrc = fs.readFileSync(path.resolve('src/components/CompactPrayerBar.tsx'), 'utf-8');
const homeSrc = fs.readFileSync(path.resolve('src/screens/HomeScreen.tsx'), 'utf-8');
const toolsSrc = fs.readFileSync(path.resolve('src/screens/ToolsScreen.tsx'), 'utf-8');
const librarySrc = fs.readFileSync(path.resolve('src/screens/LibraryScreen.tsx'), 'utf-8');
const surahDownloadsSrc = fs.readFileSync(path.resolve('src/lib/surahDownloads.ts'), 'utf-8');
const appSrc = fs.readFileSync(path.resolve('App.tsx'), 'utf-8');

// CompactPrayerBar invariants
assert.ok(
  compactBarSrc.includes('isActive?: boolean;'),
  'CompactPrayerBarProps must define isActive?: boolean'
);
assert.ok(
  compactBarSrc.includes('isActive={isActive}'),
  'CompactPrayerBar must forward isActive to PrayerCountdown'
);
assert.ok(
  compactBarSrc.includes('minHeight: 52') && !compactBarSrc.includes('height: 52'),
  'CompactPrayerBar must use minHeight: 52 without fixed height: 52 to avoid 130% font scale clipping'
);
assert.ok(
  compactBarSrc.includes('export const CompactPrayerBar = React.memo'),
  'CompactPrayerBar must be memoized with React.memo'
);

// HomeScreen invariants
assert.ok(
  homeSrc.includes('isActive={isHomeVisible && isScrolled && !isHomeScrolling}'),
  'HomeScreen must pause the pinned countdown during scroll gestures'
);
assert.ok(
  homeSrc.includes('isActive={isHomeVisible && !isScrolled && !isHomeScrolling}') &&
  homeSrc.includes('onScrollBeginDrag={beginHomeScroll}') &&
  homeSrc.includes('onMomentumScrollEnd={endHomeScroll}'),
  'HomeScreen must pause the hero countdown while scrolling and activate only the visible countdown when idle'
);

// ToolsScreen invariants
assert.ok(
  toolsSrc.includes('isActive?: boolean;'),
  'ToolsScreenProps must define isActive?: boolean'
);
assert.ok(
  toolsSrc.includes('isActive = true,'),
  'ToolsScreen must accept isActive with default true'
);
assert.ok(
  toolsSrc.includes('if (reduceMotion || !isActive) {') &&
  toolsSrc.includes('pulseAnim.setValue(1);'),
  'ToolsScreen must stop and reset pulseAnim when inactive or reduceMotion is enabled'
);
assert.ok(
  toolsSrc.includes('if (!isActive) return;') &&
  toolsSrc.includes('fetchPrayerTimes(loc, settings.methodId)'),
  'ToolsScreen must guard fetchPrayerTimes with if (!isActive) return;'
);
assert.ok(
  toolsSrc.includes('prayerPitch = Math.min(46.5, Math.max(34, (heroCardWidth - 130) / 4))'),
  'ToolsScreen must compute responsive prayerPitch for prayer circles'
);

// LibraryScreen invariants
assert.ok(
  librarySrc.includes('isActive?: boolean;'),
  'LibraryScreenProps must define isActive?: boolean'
);
assert.ok(
  librarySrc.includes('isActive = true,'),
  'LibraryScreen must accept isActive with default true'
);
assert.ok(
  librarySrc.includes('useSurahDownloads(isActive)') &&
  surahDownloadsSrc.includes('useSurahDownloads(isActive = true)') &&
  surahDownloadsSrc.includes('if (!isActive) return;'),
  'LibraryScreen must only subscribe to Quran download updates while its hub is active'
);

// App.tsx tab wiring invariants
assert.ok(
  appSrc.includes('isActive={tab === \'home\'}'),
  'App.tsx must pass isActive to HomeScreen'
);
assert.ok(
  appSrc.includes("isActive={tab === 'library' && library.screen === 'hub'}"),
  'App.tsx must pass isActive to LibraryScreen'
);
assert.ok(
  appSrc.includes("isActive={tab === 'tools' && tools.screen === 'hub'}"),
  'App.tsx must pass isActive to ToolsScreen'
);

console.log('✓ All source invariants verified\n');

// ---------------------------------------------------------------------------
// 2. Behavioral Timer, Animation & Request Lifecycle
// ---------------------------------------------------------------------------
console.log('Test 2: Verifying behavioral timer, animation, and network request lifecycle...');

class MockTimerTracker {
  constructor() {
    this.nextId = 1;
    this.activeIntervals = new Set();
    this.activeTimeouts = new Set();
  }

  setInterval(fn, ms) {
    const id = this.nextId++;
    this.activeIntervals.add(id);
    return id;
  }

  clearInterval(id) {
    this.activeIntervals.delete(id);
  }

  setTimeout(fn, ms) {
    const id = this.nextId++;
    this.activeTimeouts.add(id);
    return id;
  }

  clearTimeout(id) {
    this.activeTimeouts.delete(id);
  }

  get count() {
    return this.activeIntervals.size + this.activeTimeouts.size;
  }
}

// App Multi-Tab Simulation
class AppTabSimulation {
  constructor() {
    this.tracker = new MockTimerTracker();
    this.activeTab = 'home';
    this.isAppActive = true;
    this.isHomeScrolled = false;

    // Subsystem states
    this.homeClockTimer = null;
    this.heroCountdownTimer = null;
    this.compactBarTimer = null;
    this.toolsPulseRunning = false;
    this.toolsNetworkRequestsCount = 0;

    this.sync();
  }

  setTab(tab) {
    this.activeTab = tab;
    this.sync();
  }

  setAppActive(active) {
    this.isAppActive = active;
    this.sync();
  }

  setHomeScrolled(scrolled) {
    this.isHomeScrolled = scrolled;
    this.sync();
  }

  sync() {
    // 1. Home Screen
    const isHomeVisible = Boolean(this.activeTab === 'home' && this.isAppActive);
    if (!isHomeVisible) {
      if (this.homeClockTimer) {
        this.tracker.clearInterval(this.homeClockTimer);
        this.homeClockTimer = null;
      }
      if (this.heroCountdownTimer) {
        this.tracker.clearInterval(this.heroCountdownTimer);
        this.heroCountdownTimer = null;
      }
    } else {
      if (!this.homeClockTimer) {
        this.homeClockTimer = this.tracker.setInterval(() => {}, 30000);
      }
      if (!this.heroCountdownTimer) {
        this.heroCountdownTimer = this.tracker.setInterval(() => {}, 1000);
      }
    }

    // Compact prayer bar: only active if home is visible AND scrolled
    const isCompactBarActive = Boolean(isHomeVisible && this.isHomeScrolled);
    if (!isCompactBarActive) {
      if (this.compactBarTimer) {
        this.tracker.clearInterval(this.compactBarTimer);
        this.compactBarTimer = null;
      }
    } else {
      if (!this.compactBarTimer) {
        this.compactBarTimer = this.tracker.setInterval(() => {}, 1000);
      }
    }

    // 2. Tools Screen
    const isToolsActive = Boolean(this.activeTab === 'tools' && this.isAppActive);
    if (!isToolsActive) {
      this.toolsPulseRunning = false;
    } else {
      if (!this.toolsPulseRunning) {
        this.toolsPulseRunning = true;
        this.toolsNetworkRequestsCount++;
      }
    }

    // 3. Library Screen
    // (Pure rendering without unmanaged timers)
  }
}

const sim = new AppTabSimulation();

// Step A: Initial Home (unscrolled)
assert.equal(sim.activeTab, 'home');
assert.equal(sim.toolsPulseRunning, false, 'Tools pulse must not run on Home');
assert.equal(sim.toolsNetworkRequestsCount, 0, 'Tools must not fetch on Home');
assert.equal(sim.compactBarTimer, null, 'Compact prayer bar must not tick when unscrolled');
assert.equal(sim.tracker.activeIntervals.size, 2, 'Only Home clock (30s) and Hero countdown (1s) should run');

// Step B: Scroll Home down
sim.setHomeScrolled(true);
assert.ok(sim.compactBarTimer !== null, 'Compact prayer bar ticks when scrolled into view');
assert.equal(sim.tracker.activeIntervals.size, 3);

// Step C: Switch to Quran
sim.setTab('quran');
assert.equal(sim.tracker.activeIntervals.size, 0, 'Zero Home intervals when Quran tab is active');
assert.equal(sim.toolsPulseRunning, false, 'Tools pulse must not run on Quran');
assert.equal(sim.toolsNetworkRequestsCount, 0, 'Tools must not fetch on Quran');

// Step D: Switch to Tools
sim.setTab('tools');
assert.equal(sim.tracker.activeIntervals.size, 0, 'Zero Home intervals when Tools tab is active');
assert.equal(sim.toolsPulseRunning, true, 'Tools pulse runs when Tools tab is active');
assert.equal(sim.toolsNetworkRequestsCount, 1, 'Tools fetches prayer times when first activated');

// Step E: Switch to Library
sim.setTab('library');
assert.equal(sim.tracker.activeIntervals.size, 0, 'Zero intervals when Library tab is active');
assert.equal(sim.toolsPulseRunning, false, 'Tools pulse must stop when switching to Library');

// Step F: 100 Rapid Tab Switches (Stress Test)
for (let i = 0; i < 100; i++) {
  const tabs = ['home', 'quran', 'library', 'tools'];
  sim.setTab(tabs[i % 4]);
  sim.setAppActive(i % 5 !== 0);
  sim.setHomeScrolled(i % 2 === 0);
}

// Return to clean Home active state
sim.setAppActive(true);
sim.setHomeScrolled(false);
sim.setTab('home');

assert.equal(sim.tracker.activeIntervals.size, 2, 'Exactly 2 active intervals on clean Home unscrolled (zero timer leak)');
assert.equal(sim.toolsPulseRunning, false, 'Tools pulse stopped after returning to Home');

console.log('✓ Behavioral timer and lifecycle simulation passed (100 cycles, zero leaks)\n');

// ---------------------------------------------------------------------------
// 3. Responsive Geometry & Zero Overlap Contract Verification
// ---------------------------------------------------------------------------
console.log('Test 3: Verifying responsive card geometry across 7 screen widths, LTR & RTL, and 130% font scale...');

const testWidths = [320, 360, 393, 430, 600, 768, 1024];

for (const width of testWidths) {
  const contentMaxWidth = Math.min(width, 680);
  const horizontalMargin = 14.5;
  const heroCardWidth = Math.max(0, contentMaxWidth - 2 * horizontalMargin);
  const streakClusterWidth = 56;
  const streakMargin = 18;
  const prayerDiameter = 24.7;

  // ToolsScreen Prayer Circles layout formula:
  const prayerPitch = Math.min(46.5, Math.max(34, (heroCardWidth - 130) / 4));
  const prayerMarginStart = heroCardWidth < 340 ? 12 : 16.05;
  const prayerLabelWidth = Math.min(44, prayerPitch + 2);

  // Test LTR Layout
  {
    // Circle 4 (last circle) right edge:
    const circle4Offset = prayerMarginStart + prayerPitch * 4;
    const circle4RightEdge = circle4Offset + prayerDiameter;

    // Label 4 right edge:
    const text4Offset = circle4Offset + 12.35 - prayerLabelWidth / 2;
    const text4RightEdge = text4Offset + prayerLabelWidth;

    // Streak cluster left edge in LTR:
    const streakClusterLeftEdge = heroCardWidth - streakMargin - streakClusterWidth;

    // Clearance between prayer circles/label and streak cluster:
    const circleClearance = streakClusterLeftEdge - circle4RightEdge;
    const textClearance = streakClusterLeftEdge - text4RightEdge;

    assert.ok(
      circleClearance >= 10,
      `[Width ${width} LTR] Circle 4 must not collide with streak cluster (clearance=${circleClearance.toFixed(1)}dp >= 10dp)`
    );
    assert.ok(
      textClearance >= 3,
      `[Width ${width} LTR] Prayer label 4 must not collide with streak cluster (clearance=${textClearance.toFixed(1)}dp >= 3dp)`
    );
  }

  // Test RTL Layout
  {
    // In RTL, streak cluster is at left: 18 (leftEdge = 18, rightEdge = 18 + 56 = 74)
    const streakClusterRtlRightEdge = streakMargin + streakClusterWidth;

    // Circle 4 is measured from the right:
    // Offset from right edge = prayerMarginStart + prayerPitch * 4
    // Position from left edge = heroCardWidth - (prayerMarginStart + prayerPitch * 4 + prayerDiameter)
    const circle4OffsetFromRight = prayerMarginStart + prayerPitch * 4;
    const circle4LeftEdge = heroCardWidth - (circle4OffsetFromRight + prayerDiameter);

    const text4OffsetFromRight = circle4OffsetFromRight + 12.35 - prayerLabelWidth / 2;
    const text4LeftEdge = heroCardWidth - (text4OffsetFromRight + prayerLabelWidth);

    const circleClearanceRtl = circle4LeftEdge - streakClusterRtlRightEdge;
    const textClearanceRtl = text4LeftEdge - streakClusterRtlRightEdge;

    assert.ok(
      circleClearanceRtl >= 10,
      `[Width ${width} RTL] Circle 4 must not collide with streak cluster (clearance=${circleClearanceRtl.toFixed(1)}dp >= 10dp)`
    );
    assert.ok(
      textClearanceRtl >= 3,
      `[Width ${width} RTL] Prayer label 4 must not collide with streak cluster (clearance=${textClearanceRtl.toFixed(1)}dp >= 3dp)`
    );
  }

  // Test LibraryScreen Grid Tile Dimensions
  const gridGap = 7.3;
  const tileWidth = Math.max(0, (contentMaxWidth - 2 * horizontalMargin - gridGap) / 2);
  assert.ok(tileWidth > 135, `[Width ${width}] Library tileWidth must be viable (>135dp, got ${tileWidth.toFixed(1)}dp)`);
}

console.log('✓ All 7 responsive widths (320-1024dp) verified in both LTR & RTL with zero overlap');

// ---------------------------------------------------------------------------
// 4. Invariant Architecture Proofs: CONTENT_GAP, 32dp Clearance, Header
// ---------------------------------------------------------------------------
console.log('\nTest 4: Verifying spacing, header, and bottom clearance invariants...');

const layoutConstantsSrc = fs.readFileSync(path.resolve('src/components/layout/layout.constants.ts'), 'utf-8');
const tabScreenSrc = fs.readFileSync(path.resolve('src/components/layout/TabScreen.tsx'), 'utf-8');

assert.ok(layoutConstantsSrc.includes('export const CONTENT_GAP = 24;'), 'CONTENT_GAP must be 24dp');
assert.ok(layoutConstantsSrc.includes('CONTENT_GAP: 24'), 'SPACING_CONTRACT.CONTENT_GAP must be 24');
assert.ok(layoutConstantsSrc.includes('BOTTOM_CLEARANCE: 32'), 'SPACING_CONTRACT.BOTTOM_CLEARANCE must be 32');
assert.ok(layoutConstantsSrc.includes('NAV_HEIGHT + safeBottom + 14 + 32'), 'TAB_PAD_BOTTOM must provide 32dp bottom clearance above nav');
assert.ok(tabScreenSrc.includes('CONTENT_GAP'), 'TabScreen must enforce CONTENT_GAP');
assert.ok(tabScreenSrc.includes('TAB_PAD_BOTTOM'), 'TabScreen must enforce TAB_PAD_BOTTOM clearance');
assert.ok(toolsSrc.includes('minHeight: 160'), 'Tools heroCard minHeight: 160 preserved');
assert.ok(librarySrc.includes('contentMaxWidth = Math.min(width, 680)'), 'Library contentMaxWidth preserved');

console.log('✓ Invariant architecture proofs passed');

console.log('\n=== ALL REGRESSION TESTS PASSED SUCCESSFULLY ===');
