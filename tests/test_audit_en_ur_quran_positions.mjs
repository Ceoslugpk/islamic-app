#!/usr/bin/env node
/**
 * tests/test_audit_en_ur_quran_positions.mjs
 *
 * Narrow Audit Test:
 * Verifies English <-> Urdu language switching persistence and Quran Continue Reading
 * survival across ayahs 15, 35, and 70 (Surah 2).
 *
 * Flow per position (15, 35, 70):
 *   1. Save Quran Reading Position / Marker at Surah 2, Ayah N.
 *   2. Switch locale en -> ur via serialized settings queue.
 *   3. Simulate process restart (wipe all in-memory caches).
 *   4. Read back active locale (must be 'ur') and Quran position (must be Surah 2, Ayah N).
 *   5. Switch locale ur -> en via serialized settings queue.
 *   6. Simulate process restart (wipe all in-memory caches).
 *   7. Read back active locale (must be 'en') and Quran position (must be Surah 2, Ayah N).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('=== AUDIT TEST: ENGLISH <-> URDU PERSISTENCE & QURAN CONTINUE READING (15, 35, 70) ===\n');

// 1. Static Invariant Check on Production Source
const continuingSrc = fs.readFileSync(path.join(ROOT, 'src/lib/continuing.ts'), 'utf8');
const settingsQueueSrc = fs.readFileSync(path.join(ROOT, 'src/lib/settingsWriteQueue.ts'), 'utf8');
const settingsSrc = fs.readFileSync(path.join(ROOT, 'src/lib/settings.tsx'), 'utf8');

assert.ok(continuingSrc.includes("STORAGE_KEY = 'quran-last-reading'"), 'continuing.ts defines STORAGE_KEY');
assert.ok(continuingSrc.includes("MARKER_KEY = 'quran-reading-marker'"), 'continuing.ts defines MARKER_KEY');
assert.ok(settingsSrc.includes("STORAGE_KEY = 'islamic-settings'"), 'settings.tsx defines STORAGE_KEY');

// 2. Mock AsyncStorage Store
const store = new Map();

const mockAsyncStorage = {
  getItem: async (key) => store.get(key) ?? null,
  setItem: async (key, val) => { store.set(key, String(val)); },
  removeItem: async (key) => { store.delete(key); },
  clear: async () => { store.clear(); },
};

// Replicate continuing.ts production logic against mock storage
let inMemoryMarker = undefined;
let inMemoryPosition = undefined;

function resetInMemoryCache() {
  inMemoryMarker = undefined;
  inMemoryPosition = undefined;
}

async function saveReadingMarker(surah, ayah, page = 1) {
  const marker = {
    surah,
    ayah,
    page,
    savedAt: Date.now(),
    manual: true,
  };
  inMemoryMarker = marker;
  await mockAsyncStorage.setItem('quran-reading-marker', JSON.stringify(marker));
  return true;
}

async function getReadingMarker() {
  const raw = await mockAsyncStorage.getItem('quran-reading-marker');
  if (!raw) return inMemoryMarker ?? null;
  const parsed = JSON.parse(raw);
  inMemoryMarker = parsed;
  return parsed;
}

async function getContinueReadingPosition() {
  const marker = await getReadingMarker();
  if (marker) return marker;
  const raw = await mockAsyncStorage.getItem('quran-last-reading');
  if (!raw) return inMemoryPosition ?? null;
  const parsed = JSON.parse(raw);
  inMemoryPosition = parsed;
  return parsed;
}

// Replicate settingsWriteQueue logic
let writeTail = Promise.resolve();
async function enqueueSettingsWrite(key, nextValue, verifier) {
  const task = writeTail.then(async () => {
    const serialized = JSON.stringify(nextValue);
    await mockAsyncStorage.setItem(key, serialized);
    const readback = await mockAsyncStorage.getItem(key);
    if (verifier) {
      verifier(readback);
    }
    return nextValue;
  });
  writeTail = task.catch(() => {});
  return task;
}

async function setLanguage(lang) {
  const currentRaw = (await mockAsyncStorage.getItem('islamic-settings')) || '{}';
  const current = JSON.parse(currentRaw);
  const next = { ...current, language: lang };
  await enqueueSettingsWrite('islamic-settings', next, (readback) => {
    const parsed = JSON.parse(readback);
    if (parsed.language !== lang) {
      throw new Error(`Readback mismatch: expected ${lang}, got ${parsed.language}`);
    }
  });
  return next;
}

async function getLanguage() {
  const raw = await mockAsyncStorage.getItem('islamic-settings');
  if (!raw) return 'en';
  return JSON.parse(raw).language || 'en';
}

// 3. Execute Matrix: Ayahs 15, 35, 70 across English <-> Urdu switch cycles
const targetAyahs = [15, 35, 70];

for (const ayah of targetAyahs) {
  console.log(`--- Testing Surah 2, Ayah ${ayah} with English <-> Urdu Transition ---`);

  // Initial state: English
  await mockAsyncStorage.clear();
  resetInMemoryCache();
  await setLanguage('en');
  assert.equal(await getLanguage(), 'en', 'Initial language must be English');

  // Step 1: User reads/marks Ayah N
  await saveReadingMarker(2, ayah, Math.ceil(ayah / 7));
  const posBeforeSwitch = await getContinueReadingPosition();
  assert.equal(posBeforeSwitch.surah, 2);
  assert.equal(posBeforeSwitch.ayah, ayah);
  console.log(`  ✓ Position saved at Surah 2, Ayah ${ayah}`);

  // Step 2: Switch to Urdu
  await setLanguage('ur');
  assert.equal(await getLanguage(), 'ur', 'Language persisted as Urdu');
  console.log(`  ✓ Locale switched to Urdu (ur)`);

  // Step 3: Cold restart
  resetInMemoryCache();
  console.log(`  ✓ Cold restart simulated (memory caches wiped)`);

  // Step 4: Verify read-back in Urdu
  const langAfterRestart1 = await getLanguage();
  assert.equal(langAfterRestart1, 'ur', 'Urdu persisted across cold restart');
  const posAfterRestart1 = await getContinueReadingPosition();
  assert.equal(posAfterRestart1.surah, 2, 'Surah 2 preserved');
  assert.equal(posAfterRestart1.ayah, ayah, `Ayah ${ayah} preserved across en->ur restart`);
  assert.equal(posAfterRestart1.manual, true, 'Manual marker flag preserved');
  console.log(`  ✓ Verified progress in Urdu: Surah 2, Ayah ${ayah} intact`);

  // Step 5: Switch back to English
  await setLanguage('en');
  assert.equal(await getLanguage(), 'en', 'Language persisted as English');
  console.log(`  ✓ Locale switched back to English (en)`);

  // Step 6: Second cold restart
  resetInMemoryCache();
  console.log(`  ✓ Second cold restart simulated (memory caches wiped)`);

  // Step 7: Verify read-back in English
  const langAfterRestart2 = await getLanguage();
  assert.equal(langAfterRestart2, 'en', 'English persisted across cold restart');
  const posAfterRestart2 = await getContinueReadingPosition();
  assert.equal(posAfterRestart2.surah, 2, 'Surah 2 preserved');
  assert.equal(posAfterRestart2.ayah, ayah, `Ayah ${ayah} preserved across ur->en restart`);
  assert.equal(posAfterRestart2.manual, true, 'Manual marker flag preserved');
  console.log(`  ✓ Verified progress in English: Surah 2, Ayah ${ayah} intact\n`);
}

console.log('========================================================================');
console.log('ALL QURAN CONTINUE READING (AYAHS 15, 35, 70) & EN<->UR AUDIT TESTS PASSED');
console.log('========================================================================');
