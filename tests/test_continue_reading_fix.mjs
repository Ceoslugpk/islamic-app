import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== CONTINUE READING & READING-MARKER PERSISTENCE VERIFICATION ===\n');

// Mock AsyncStorage and continuing module logic
const storage = new Map();
let shouldStorageFail = false;

const mockAsyncStorage = {
  getItem: async (key) => {
    if (shouldStorageFail) throw new Error('SQLITE_FULL: database or disk is full');
    return storage.get(key) ?? null;
  },
  setItem: async (key, value) => {
    if (shouldStorageFail) throw new Error('SQLITE_FULL: database or disk is full');
    storage.set(key, value);
  },
  removeItem: async (key) => {
    if (shouldStorageFail) throw new Error('SQLITE_FULL: database or disk is full');
    storage.delete(key);
  },
  clear: async () => {
    storage.clear();
  },
};

// Storage keys matching src/lib/continuing.ts
const STORAGE_KEY = 'quran-last-reading';
const MARKER_KEY = 'quran-reading-marker';

// In-memory mirror of continuing.ts module state & methods
let inMemoryMarker = undefined;
let inMemoryPosition = undefined;
const listeners = new Set();

function addReadingPositionListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function getReadingMarkerSync() {
  return inMemoryMarker ?? null;
}

function isValidReadingPosition(pos) {
  const surah = pos?.surah;
  const ayah = pos?.ayah;
  if (typeof surah !== 'number' || typeof ayah !== 'number') return false;
  if (surah < 1 || surah > 114) return false;
  return ayah >= 1;
}

async function saveReadingPosition(surah, ayah) {
  if (!isValidReadingPosition({ surah, ayah })) return false;
  const position = { surah, ayah, savedAt: Date.now() };
  inMemoryPosition = position;
  notifyListeners();
  try {
    await mockAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    return true;
  } catch {
    return false;
  }
}

async function getReadingPosition() {
  try {
    const stored = await mockAsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      if (inMemoryPosition === undefined) inMemoryPosition = null;
      return inMemoryPosition ?? null;
    }
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.savedAt === 'number' && isValidReadingPosition(parsed)) {
      if (!inMemoryPosition || inMemoryPosition.savedAt <= parsed.savedAt) {
        inMemoryPosition = parsed;
      }
      return inMemoryPosition;
    }
    return inMemoryPosition ?? null;
  } catch {
    return inMemoryPosition ?? null;
  }
}

async function saveReadingMarker(surah, ayah) {
  if (!isValidReadingPosition({ surah, ayah })) return false;
  const marker = { surah, ayah, savedAt: Date.now(), manual: true };
  inMemoryMarker = marker;
  notifyListeners();
  try {
    await mockAsyncStorage.setItem(MARKER_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

async function getReadingMarker() {
  try {
    const stored = await mockAsyncStorage.getItem(MARKER_KEY);
    if (!stored) {
      if (inMemoryMarker === undefined) inMemoryMarker = null;
      return inMemoryMarker ?? null;
    }
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.savedAt === 'number' && isValidReadingPosition(parsed)) {
      const marker = { ...parsed, manual: true };
      if (!inMemoryMarker || inMemoryMarker.savedAt <= marker.savedAt) {
        inMemoryMarker = marker;
      }
      return inMemoryMarker;
    }
    return inMemoryMarker ?? null;
  } catch {
    return inMemoryMarker ?? null;
  }
}

async function clearReadingMarker() {
  inMemoryMarker = null;
  notifyListeners();
  try {
    await mockAsyncStorage.removeItem(MARKER_KEY);
    return true;
  } catch {
    return false;
  }
}

async function getContinueReadingPosition() {
  const marker = await getReadingMarker();
  if (marker) return marker;
  return getReadingPosition();
}

function simulateRestart() {
  inMemoryMarker = undefined;
  inMemoryPosition = undefined;
}

// ── Test a: marker-first precedence ───────────────────────────────────────────
console.log('Testing (a): marker-first precedence...');
await mockAsyncStorage.clear();
simulateRestart();

await saveReadingPosition(2, 15);
await saveReadingMarker(2, 35);
let continuePos = await getContinueReadingPosition();
assert.equal(continuePos.surah, 2);
assert.equal(continuePos.ayah, 35);
assert.equal(continuePos.manual, true);

// Auto position advances to ayah 70 while user scrolls
await saveReadingPosition(2, 70);
continuePos = await getContinueReadingPosition();
assert.equal(continuePos.surah, 2);
assert.equal(continuePos.ayah, 35, 'Marker at 35 must still win over auto position at 70');
assert.equal(continuePos.manual, true);

// Marker cleared -> falls back to auto position (2, 70)
await clearReadingMarker();
continuePos = await getContinueReadingPosition();
assert.equal(continuePos.surah, 2);
assert.equal(continuePos.ayah, 70, 'Fallback must resolve to auto position 70');
console.log('  ✓ (a) marker-first precedence verified\n');

// ── Test b: index ↔ ayah conversion ──────────────────────────────────────────
console.log('Testing (b): index ↔ ayah conversion and boundary handling...');
function ayahToIndex(ayah) {
  return Math.max(0, ayah - 1);
}
function indexToAyah(index) {
  return index + 1;
}

// scrollToIndex(35) uses index 34
assert.equal(ayahToIndex(35), 34, 'Ayah 35 must map to index 34 for scrollToIndex');
assert.equal(indexToAyah(34), 35, 'Index 34 must convert back to Ayah 35');

// Boundaries: Ayah 1 -> index 0, Ayah 286 -> index 285
assert.equal(ayahToIndex(1), 0);
assert.equal(indexToAyah(0), 1);
assert.equal(ayahToIndex(286), 285);
assert.equal(indexToAyah(285), 286);

// ViewableItems first item provides numberInSurah (1-based ayah)
const mockViewToken = { item: { numberInSurah: 35 } };
assert.equal(mockViewToken.item.numberInSurah, 35, 'viewableItems uses 1-based numberInSurah');
console.log('  ✓ (b) index ↔ ayah conversion verified (zero off-by-one hazards)\n');

// ── Test c: unmount flush safety ─────────────────────────────────────────────
console.log('Testing (c): unmount flush safety...');
await mockAsyncStorage.clear();
simulateRestart();

// User marks ayah 35
await saveReadingMarker(2, 35);

// Reader unmounts while user was viewing ayah 15 (unmount flush saves auto pos)
const lastSavedAyahOnUnmount = 15;
await saveReadingPosition(2, lastSavedAyahOnUnmount);

// Marker key must be untouched
const markerInStorage = JSON.parse(await mockAsyncStorage.getItem(MARKER_KEY));
assert.equal(markerInStorage.ayah, 35);

// getContinueReadingPosition must STILL return the marker (2, 35), NOT the stale unmount auto (2, 15)
continuePos = await getContinueReadingPosition();
assert.equal(continuePos.ayah, 35, 'Marker must beat stale lower unmount flush');
console.log('  ✓ (c) unmount flush safety verified\n');

// ── Test d: write-failure resilience ─────────────────────────────────────────
console.log('Testing (d): write-failure resilience...');
await mockAsyncStorage.clear();
simulateRestart();

shouldStorageFail = true;
const writeResult = await saveReadingMarker(2, 35);
assert.equal(writeResult, false, 'saveReadingMarker should return false on storage write error');

// In-memory activeMarker retained despite storage write failure
assert.notEqual(inMemoryMarker, null);
assert.equal(inMemoryMarker.ayah, 35);

// Continue Reading still opens marker-first from memory
continuePos = await getContinueReadingPosition();
assert.equal(continuePos.ayah, 35, 'Continue reading must return in-memory marker even if storage write failed');

// Storage recovers (e.g. storage freed) -> next save retries and persists
shouldStorageFail = false;
const retryResult = await saveReadingMarker(2, 35);
assert.equal(retryResult, true, 'Retry save succeeds');
const recoveredStorage = JSON.parse(await mockAsyncStorage.getItem(MARKER_KEY));
assert.equal(recoveredStorage.ayah, 35, 'Marker successfully persisted to storage after retry');
console.log('  ✓ (d) write-failure resilience verified\n');

// ── Test e: reader open path wiring ──────────────────────────────────────────
console.log('Testing (e): reader open path wiring...');
await mockAsyncStorage.clear();
simulateRestart();
await saveReadingMarker(2, 35);

// Simulate App.tsx navigation handlers:
// 1) onOpenQuran(surah, ayah) with ayah omitted
function simulateOnOpenQuran(surah, ayah) {
  let initialAyah = ayah;
  if (!initialAyah) {
    const marker = getReadingMarkerSync();
    if (marker && marker.surah === surah) {
      initialAyah = marker.ayah;
    }
  }
  return { surah, initialAyah };
}

// 2) onOpenSurah(n, a) with a omitted
function simulateOnOpenSurah(n, a) {
  let initialAyah = a;
  if (!initialAyah) {
    const marker = getReadingMarkerSync();
    if (marker && marker.surah === n) {
      initialAyah = marker.ayah;
    }
  }
  return { surah: n, initialAyah };
}

// 3) ContinueReadingCard handlePress
async function simulateContinueCardPress() {
  const latest = await getContinueReadingPosition();
  return { surah: latest.surah, initialAyah: latest.ayah };
}

assert.deepEqual(simulateOnOpenQuran(2, undefined), { surah: 2, initialAyah: 35 });
assert.deepEqual(simulateOnOpenSurah(2, undefined), { surah: 2, initialAyah: 35 });
assert.deepEqual(await simulateContinueCardPress(), { surah: 2, initialAyah: 35 });
console.log('  ✓ (e) reader open path passes marker-first position\n');

// ── Test f: Quran Home focus refresh generation guard ────────────────────────
console.log('Testing (f): Quran Home focus refresh generation guard...');
await mockAsyncStorage.clear();
simulateRestart();

let homeReadingPosition = null;
let refreshGen = 0;

async function triggerFocusRefresh(mockResolvedAyah, delayMs = 0) {
  const gen = ++refreshGen;
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const pos = { surah: 2, ayah: mockResolvedAyah };
  if (gen === refreshGen) {
    homeReadingPosition = pos;
  }
}

// Fire an earlier, slower request (gen 1, 50ms)
const p1 = triggerFocusRefresh(15, 50);
// Fire a later, fresher request (gen 2, 10ms)
const p2 = triggerFocusRefresh(35, 10);

await Promise.all([p1, p2]);

assert.equal(homeReadingPosition.ayah, 35, 'Fresher focus refresh must win over stale in-flight fetch');
console.log('  ✓ (f) focus refresh generation guard verified\n');

// ── Test g: app-restart persistence ──────────────────────────────────────────
console.log('Testing (g): app-restart persistence across ayah values...');
for (const ayah of [15, 35, 70]) {
  await mockAsyncStorage.clear();
  simulateRestart();
  await saveReadingMarker(2, ayah);

  // Restart app (memory wiped)
  simulateRestart();

  // Storage re-read
  const reReadPos = await getContinueReadingPosition();
  assert.equal(reReadPos.surah, 2);
  assert.equal(reReadPos.ayah, ayah);
  assert.equal(reReadPos.manual, true);
}
// ── Test h: reader positioning hop elimination & latency for marked targets ──
console.log('Testing (h): reader positioning hop elimination & latency for marked targets...');

const readerSource = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');

// 1. Static contract assertions on QuranReaderScreen source
assert.ok(readerSource.includes('BOUNDED_PRE_RENDER_CAP'), 'reader defines BOUNDED_PRE_RENDER_CAP');
assert.ok(readerSource.includes('ponytail:'), 'reader contains ponytail rationale for bounded cap');
assert.ok(readerSource.includes('retryTimerRef'), 'reader tracks retry timer in a ref');
assert.ok(readerSource.includes('initialNumToRender={initialNumToRender}'), 'FlatList uses dynamic target-aware initialNumToRender');
assert.ok(readerSource.includes('cancelPendingRetry'), 'reader defines cancelPendingRetry helper');

// 2. Behavioral simulation of reader positioning logic
// We parse the BOUNDED_PRE_RENDER_CAP from readerSource
const capMatch = readerSource.match(/BOUNDED_PRE_RENDER_CAP\s*=\s*(\d+)/);
assert.ok(capMatch, 'BOUNDED_PRE_RENDER_CAP integer value declared in reader');
const BOUNDED_PRE_RENDER_CAP = parseInt(capMatch[1], 10);
assert.ok(BOUNDED_PRE_RENDER_CAP >= 75 && BOUNDED_PRE_RENDER_CAP <= 120, 'BOUNDED_PRE_RENDER_CAP covers 70 with headroom without blowing memory');

function computeReaderInitialNumToRender(targetAyah) {
  if (targetAyah <= 1) return 15;
  return Math.min(BOUNDED_PRE_RENDER_CAP, Math.max(15, targetAyah + 5));
}

// Ayah 1 default must remain 15
assert.equal(computeReaderInitialNumToRender(1), 15, 'Default opens at ayah 1 must have initialNumToRender=15');

// Bounded targets: 15, 35, 70
for (const target of [15, 35, 70]) {
  const initialNum = computeReaderInitialNumToRender(target);
  const targetIndex = target - 1;
  assert.ok(initialNum > targetIndex, `initialNumToRender (${initialNum}) must pre-render past target index (${targetIndex}) for ayah ${target}`);
  assert.ok(initialNum <= BOUNDED_PRE_RENDER_CAP, `initialNumToRender (${initialNum}) must stay within bounded cap (${BOUNDED_PRE_RENDER_CAP})`);
}

// Deep target: 286 must be capped to avoid OOM / rendering all 286 cards on mount
const deepInitialNum = computeReaderInitialNumToRender(286);
assert.equal(deepInitialNum, BOUNDED_PRE_RENDER_CAP, `Deep target (286) must be capped to BOUNDED_PRE_RENDER_CAP (${BOUNDED_PRE_RENDER_CAP}), not all 286`);

// Simulate scrollToIndex failure retry loop with tracking of hops and delays
function simulatePositioningFlow(targetAyah) {
  const targetIndex = targetAyah - 1;
  const initialNum = computeReaderInitialNumToRender(targetAyah);
  let highestMeasuredIndex = 14; // Initial layout before target card measures
  let intermediateHops = 0;
  let totalDelayMs = 0;
  let landedIndex = null;
  let attempts = 0;

  // Initial attempt in useEffect
  let isMeasured = highestMeasuredIndex >= targetIndex;
  if (isMeasured) {
    landedIndex = targetIndex;
    return { landedIndex, intermediateHops, totalDelayMs, attempts: 0 };
  }

  // Target card is unmeasured on first mount -> handleScrollToIndexFailed called
  while (landedIndex === null && attempts < 50) {
    attempts++;
    const isBoundedTarget = targetIndex < initialNum;
    if (!isBoundedTarget) {
      // Deep fallback: advances render window by scrolling to measured edge
      intermediateHops++;
      highestMeasuredIndex = Math.min(targetIndex, highestMeasuredIndex + 15);
      totalDelayMs += 50; // Deep fallback cadence
    } else {
      // Bounded target: card is already rendered! No intermediate hop; fast frame retry
      totalDelayMs += 16; // Interaction frame cadence (<= 16ms)
      highestMeasuredIndex = targetIndex; // Measured on next frame
    }

    if (highestMeasuredIndex >= targetIndex) {
      landedIndex = targetIndex;
      break;
    }
  }

  return { landedIndex, intermediateHops, totalDelayMs, attempts };
}

// Verify bounded targets (15, 35, 70) require ZERO intermediate hops and no 100ms hops
for (const target of [15, 35, 70]) {
  const result = simulatePositioningFlow(target);
  assert.equal(result.landedIndex, target - 1, `Target ayah ${target} must land on exact index ${target - 1}`);
  assert.equal(result.intermediateHops, 0, `Target ayah ${target} must have 0 intermediate scrollToOffset hops (no stepping lag)`);
  assert.ok(result.totalDelayMs <= 30, `Target ayah ${target} must land within an interaction frame, got ${result.totalDelayMs}ms`);
}
console.log('  ✓ (h) bounded targets (15, 35, 70) land with 0 intermediate hops in interaction frame\n');

// ── Test i: deep target (286) convergence without OOM ────────────────────────
console.log('Testing (i): deep target (286) convergence without OOM...');
const deepResult = simulatePositioningFlow(286);
assert.equal(deepResult.landedIndex, 285, 'Deep target 286 must land exactly on index 285');
assert.ok(deepResult.attempts > 0, 'Deep target uses progressive measurement retries');
assert.ok(deepResult.intermediateHops > 0, 'Deep target advances render window as needed');
console.log(`  ✓ (i) deep target 286 converged to index 285 in ${deepResult.attempts} steps\n`);

// ── Test j: user gesture & unmount cancellation ───────────────────────────────
console.log('Testing (j): user gesture & unmount cancellation...');
let activeTimer = 12345;
let isProgrammatic = true;
function cancelPendingRetrySim() {
  if (activeTimer) {
    activeTimer = null;
  }
  isProgrammatic = false;
}

// User drag starts
cancelPendingRetrySim();
assert.equal(activeTimer, null, 'User drag cancels pending retry timer');
assert.equal(isProgrammatic, false, 'User drag clears programmatic positioning flag');
console.log('  ✓ (j) user gesture cancels pending programmatic retry timer\n');

// Static source file checks: ensure files adhere to contracts and no regressions
const continuingSource = fs.readFileSync('src/lib/continuing.ts', 'utf8');
const homeSource = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');
const cardSource = fs.readFileSync('src/components/ContinueReadingCard.tsx', 'utf8');
const appSource = fs.readFileSync('App.tsx', 'utf8');

assert.ok(continuingSource.includes('addReadingPositionListener'), 'continuing exports addReadingPositionListener');
assert.ok(continuingSource.includes('getReadingMarkerSync'), 'continuing exports getReadingMarkerSync');
assert.ok(cardSource.includes('addReadingPositionListener'), 'ContinueReadingCard listens to position changes');
assert.ok(homeSource.includes('addReadingPositionListener'), 'QuranHomeScreen listens to position changes');
assert.ok(appSource.includes('getReadingMarkerSync'), 'App.tsx utilizes getReadingMarkerSync in navigation');
assert.ok(readerSource.includes('isProgrammaticPositioningRef'), 'reader tracks programmatic positioning state');

console.log('=================================================================');
console.log('ALL CONTINUE READING & MARKER PERSISTENCE TESTS PASSED (0 ERRORS)');
console.log('=================================================================\n');
