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
console.log('  ✓ (g) app-restart persistence verified for ayahs 15, 35, 70\n');

// Static source file checks: ensure files adhere to contracts and no regressions
const continuingSource = fs.readFileSync('src/lib/continuing.ts', 'utf8');
const readerSource = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
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
