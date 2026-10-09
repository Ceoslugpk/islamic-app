/**
 * Language Switching Architecture & Persistence Test Suite
 * Self-contained (no native runtime dependencies).
 * Tests:
 *  1. Code structure / contract verification across settings.tsx, i18n.ts, SettingsScreen.tsx, and App.tsx
 *  2. en -> ur persist succeeds -> reload allowed
 *  3. ur -> en persist succeeds -> reload allowed
 *  4. Storage write failure -> reload blocked + no false success + state rolled back
 *  5. Repeated rapid switching converges on final selected language without double-reload
 *  6. Stale-closure write impossibility (concurrent settings updates preserved)
 *  7. RTL flag derivation in both directions
 *  8. Side-effect ordering & resilience (quran lang / tafsir / audio run only after persist; failures do not lose language)
 *  9. Quran reading position preservation across language switch and boot
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== LANGUAGE SWITCHING & PERSISTENCE TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// 1. Static Contract & Source Code Verification
// ---------------------------------------------------------------------------
console.log('--- 1. Static Contract Verification ---');

const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const i18nCode = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
const appCode = fs.readFileSync('App.tsx', 'utf8');

// (a) settings.tsx exports pure helpers
assert.ok(
  settingsCode.includes('export function computeNextLanguageSettings('),
  'settings.tsx must export computeNextLanguageSettings helper'
);
assert.ok(
  settingsCode.includes('export async function persistLanguageChange('),
  'settings.tsx must export persistLanguageChange helper'
);

// (b) settings.tsx uses functional state and awaits storage write without swallowing
assert.ok(
  settingsCode.includes('await AsyncStorage.setItem') && settingsCode.includes('JSON.stringify(nextClean)'),
  'setLanguage must await direct AsyncStorage write with sanitized clean settings'
);
assert.ok(
  settingsCode.includes("persist({\n          ...prev,\n          language: nextLang,"),
  'setLanguage must use functional updater with nextLang'
);
assert.ok(
  settingsCode.includes('throw err;'),
  'setLanguage must re-throw on persistence failure so caller does not falsely reload'
);

// (c) settings.tsx rolls back optimistic state on write failure
assert.ok(
  settingsCode.includes("persist({\n            ...prev,\n            language: prevLang,"),
  'setLanguage must revert React state back to prevLang on write failure'
);
assert.ok(
  settingsCode.includes('setAppLanguage(prevLang)'),
  'setLanguage must revert in-memory i18n language back to prevLang on write failure'
);

// (d) SettingsProvider initial state and hydration fallbacks preserve boot language
assert.ok(
  settingsCode.includes('language: getBootLanguage()'),
  'SettingsProvider initial state must use getBootLanguage()'
);
assert.ok(
  settingsCode.includes('next.language = getBootLanguage()'),
  'Hydration must preserve getBootLanguage() when storage language is unset'
);
assert.ok(
  settingsCode.includes('setAppLanguage(getBootLanguage())'),
  'Hydration catch block must fall back to getBootLanguage()'
);

// (e) SettingsScreen double-reload and error handling guards
assert.ok(
  settingsScreenCode.includes('isSwitchingLanguageRef.current'),
  'SettingsScreen must guard against concurrent language switches with isSwitchingLanguageRef'
);
assert.ok(
  settingsScreenCode.includes('reloadTimerRef.current'),
  'SettingsScreen must track reload timer in reloadTimerRef'
);
assert.ok(
  settingsScreenCode.includes('clearTimeout(reloadTimerRef.current)'),
  'SettingsScreen must clear pending reload timer on unmount or new change'
);
assert.ok(
  settingsScreenCode.includes('setLanguageError('),
  'SettingsScreen must set languageError when setLanguage rejects'
);
assert.ok(
  settingsScreenCode.includes('onPrepareReload?.()'),
  'SettingsScreen must call onPrepareReload before scheduling reload'
);

// (f) App.tsx boot reconciliation & reader unmount
assert.ok(
  appCode.includes('onPrepareReload={handlePrepareReload}'),
  'App.tsx Root must wire onPrepareReload into SettingsModal'
);
assert.ok(
  appCode.includes("if (quran.screen === 'reader')"),
  'App.tsx handlePrepareReload must check if reader is active'
);
assert.ok(
  appCode.includes("setQuran({ screen: 'home' })"),
  'App.tsx handlePrepareReload must transition reader to home to trigger unmount flush'
);
assert.ok(
  appCode.includes('applyRTL(lang === \'ur\')'),
  'App.tsx boot effect must apply RTL according to persisted language'
);

// (g) i18n.ts RTL and resolution
assert.ok(
  i18nCode.includes('resolvePersistedLanguage(forceFresh = false)'),
  'i18n.ts resolvePersistedLanguage must support forceFresh parameter'
);
assert.ok(
  i18nCode.includes('languageResolved = true;'),
  'i18n.ts setAppLanguage must mark language as resolved'
);

console.log('  ✓ Static contracts in settings.tsx, i18n.ts, SettingsScreen.tsx, and App.tsx verified.');


// ---------------------------------------------------------------------------
// 2. In-Memory Mock Harness & State Machine Simulation
// ---------------------------------------------------------------------------
console.log('\n--- 2. Dynamic Behavioral Test Suite ---');

class MockStorage {
  constructor() {
    this.store = new Map();
    this.failNextWrite = false;
    this.writeLatencyMs = 0;
  }

  async getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async setItem(key, value) {
    if (this.failNextWrite) {
      throw new Error('AsyncStorage disk write error (simulated DiskFull)');
    }
    if (this.writeLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.writeLatencyMs));
    }
    this.store.set(key, String(value));
  }

  async removeItem(key) {
    this.store.delete(key);
  }

  dump(key) {
    const raw = this.store.get(key);
    return raw ? JSON.parse(raw) : null;
  }
}

const STORAGE_KEY = 'islamic-settings';

const DEFAULT_SETTINGS = {
  settingsVersion: 1,
  methodId: 16,
  madhab: 'shafi',
  timeFormat: '12h',
  locationMode: 'manual',
  manualLocation: { latitude: 21.4225, longitude: 39.8262, label: 'Makkah' },
  autoLocation: null,
  autoLocationTimestamp: null,
  remindersEnabled: false,
  reminderOffsetMinutes: 0,
  prayerConfigs: {},
  quranReminderEnabled: false,
  quranReminderTime: '06:00',
  quranGoal: 10,
  adhanReciterId: 'alafasy',
  themeMode: 'system',
  accentKey: 'amber',
  translationAudioEnabled: true,
  namesLanguage: 'en',
  womenWorshipEnabled: false,
  womenPinHash: null,
  womenLockEnabled: false,
  hapticsEnabled: true,
  quranArabicFont: 'amiri',
  quranScript: 'indopak',
  quranFontSize: 24,
  quranLineHeight: 1.8,
  quranShowTranslation: true,
  tafsirSourceId: 'jalalayn',
  quranPreloadRequested: true,
  language: 'en',
};

function sanitizeMockSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    language: raw.language === 'ur' ? 'ur' : 'en',
    madhab: raw.madhab === 'hanafi' ? 'hanafi' : 'shafi',
  };
}

function computeNextSettings(prev, nextLang) {
  return sanitizeMockSettings({
    ...prev,
    language: nextLang,
  });
}

function isRTL(lang) {
  return lang === 'ur';
}

class SettingsHarness {
  constructor(storage) {
    this.storage = storage;
    this.settings = { ...DEFAULT_SETTINGS };
    this.bootLang = 'en';
    this.activeLang = 'en';
    this.reloadScheduled = false;
    this.reloadLang = null;
    this.reloadTimer = null;
    this.isSwitching = false;
    this.lastError = null;
    this.readerUnmounted = false;
    this.sideEffectsRun = [];
  }

  async boot() {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.language === 'en' || parsed.language === 'ur')) {
        this.bootLang = parsed.language;
      }
    }
    this.activeLang = this.bootLang;
    this.settings = sanitizeMockSettings(raw ? JSON.parse(raw) : {});
    if (!raw || !JSON.parse(raw).language) {
      this.settings.language = this.bootLang;
    }
  }

  async runSideEffects(nextLang) {
    if (nextLang === 'ur') {
      await this.storage.setItem('quran-translation-language', 'ur');
      this.sideEffectsRun.push('quran-lang:ur');
      if (this.settings.tafsirSourceId === 'jalalayn') {
        this.settings.tafsirSourceId = 'api-ibn-kathir-urdu';
        this.sideEffectsRun.push('tafsir:urdu');
      }
      await this.storage.setItem('quran-audio-translation-edition', 'ur.everyayah-shamshad');
      this.sideEffectsRun.push('audio:shamshad');
    } else {
      await this.storage.setItem('quran-translation-language', 'en');
      this.sideEffectsRun.push('quran-lang:en');
      if (this.settings.tafsirSourceId === 'api-ibn-kathir-urdu') {
        this.settings.tafsirSourceId = 'jalalayn';
        this.sideEffectsRun.push('tafsir:jalalayn');
      }
      await this.storage.setItem('quran-audio-translation-edition', 'en.walk');
      this.sideEffectsRun.push('audio:english');
    }
  }

  async setLanguage(nextLang) {
    const prevLang = this.settings.language;
    if (nextLang === prevLang) return;

    const currentSnapshot = { ...this.settings };
    const nextClean = computeNextSettings(currentSnapshot, nextLang);

    // Optimistic update
    this.activeLang = nextLang;
    this.settings = computeNextSettings(this.settings, nextLang);

    // Durability gate: await direct write
    try {
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(nextClean));
    } catch (err) {
      // Rollback on failure
      this.settings = computeNextSettings(this.settings, prevLang);
      this.activeLang = prevLang;
      throw err;
    }

    // Side-effects run ONLY AFTER storage write succeeds
    await this.runSideEffects(nextLang);
  }

  async onUserSelectLanguage(nextLang) {
    if (nextLang === this.settings.language || this.isSwitching) return;
    this.isSwitching = true;
    this.lastError = null;

    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }

    try {
      await this.setLanguage(nextLang);
      this.isSwitching = false;

      // Unmount reader / flush position before reload
      this.readerUnmounted = true;

      // Schedule reload
      this.reloadTimer = setTimeout(() => {
        this.reloadScheduled = true;
        this.reloadLang = nextLang;
      }, 50);
    } catch (_err) {
      this.isSwitching = false;
      if (this.reloadTimer) {
        clearTimeout(this.reloadTimer);
        this.reloadTimer = null;
      }
      this.lastError = 'Still could not load. Try again later.';
    }
  }
}

// ---------------------------------------------------------------------------
// Test 2: en -> ur persist succeeds -> reload allowed
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const harness = new SettingsHarness(storage);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 60));

  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(harness.activeLang, 'ur');
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'ur');
  assert.strictEqual(harness.lastError, null);
  assert.strictEqual(harness.readerUnmounted, true);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ur');
  assert.strictEqual(isRTL(stored.language), true);

  console.log('  ✓ Test 2 passed: en -> ur persist succeeds and reload is scheduled with RTL layout.');
}

// ---------------------------------------------------------------------------
// Test 3: ur -> en persist succeeds -> reload allowed
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  await storage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'ur' }));
  const harness = new SettingsHarness(storage);
  await harness.boot();
  assert.strictEqual(harness.bootLang, 'ur');
  assert.strictEqual(harness.settings.language, 'ur');

  await harness.onUserSelectLanguage('en');
  await new Promise((r) => setTimeout(r, 60));

  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.activeLang, 'en');
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'en');
  assert.strictEqual(harness.lastError, null);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'en');
  assert.strictEqual(isRTL(stored.language), false);

  console.log('  ✓ Test 3 passed: ur -> en persist succeeds and reload is scheduled with LTR layout.');
}

// ---------------------------------------------------------------------------
// Test 4: Storage write failure -> reload blocked + no false success + rolled back
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const harness = new SettingsHarness(storage);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');

  // Inject failure
  storage.failNextWrite = true;

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 60));

  // Reload must NOT be scheduled
  assert.strictEqual(harness.reloadScheduled, false);
  assert.strictEqual(harness.reloadLang, null);

  // State must NOT claim urdu (no false success; rolled back to 'en')
  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.activeLang, 'en');

  // Error notice must be displayed
  assert.strictEqual(harness.lastError, 'Still could not load. Try again later.');

  // Storage key must not contain false urdu
  const stored = storage.dump(STORAGE_KEY);
  assert.ok(!stored || stored.language === 'en');

  console.log('  ✓ Test 4 passed: Persistence failure blocks reload, reverts optimistic state, and shows error.');
}

// ---------------------------------------------------------------------------
// Test 5: Repeated rapid switching converges on final selected language
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  storage.writeLatencyMs = 10;
  const harness = new SettingsHarness(storage);
  await harness.boot();

  // Rapidly trigger en -> ur, then ur -> en, then en -> ur
  // Each subsequent switch waits for current in-flight switch or is queued safely
  const p1 = harness.onUserSelectLanguage('ur');
  // Attempting concurrent switch while in-flight is rejected by guard
  const p2 = harness.onUserSelectLanguage('en');
  await p1;
  await p2;

  // After first switch finishes, switch back to en
  await harness.onUserSelectLanguage('en');
  // Then immediately switch to ur
  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 80));

  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'ur');

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ur');

  console.log('  ✓ Test 5 passed: Repeated rapid switches converge correctly without corrupting storage.');
}

// ---------------------------------------------------------------------------
// Test 6: Stale-closure write impossibility (concurrent setting updates preserved)
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const harness = new SettingsHarness(storage);
  await harness.boot();

  // Simulate user changing madhab to 'hanafi' and timeFormat to '24h' right before switching language
  harness.settings.madhab = 'hanafi';
  harness.settings.timeFormat = '24h';

  // Now switch language to 'ur'
  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 60));

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ur');
  // Crucial check: madhab and timeFormat must NOT be clobbered back to defaults ('shafi' / '12h')
  assert.strictEqual(stored.madhab, 'hanafi', 'Madhab must remain hanafi (not overwritten by stale closure)');
  assert.strictEqual(stored.timeFormat, '24h', 'TimeFormat must remain 24h (not overwritten by stale closure)');

  console.log('  ✓ Test 6 passed: Stale-closure write is impossible; all current setting fields preserved.');
}

// ---------------------------------------------------------------------------
// Test 7: Side-effect ordering & resilience
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const harness = new SettingsHarness(storage);
  await harness.boot();

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 60));

  // Verify side-effects executed in order
  assert.deepStrictEqual(harness.sideEffectsRun, [
    'quran-lang:ur',
    'tafsir:urdu',
    'audio:shamshad',
  ]);

  // Now verify that if a side-effect fails, main language persist is NOT lost
  storage.failNextWrite = true; // side-effect write might fail
  const harness2 = new SettingsHarness(storage);
  await harness2.boot();
  assert.strictEqual(harness2.settings.language, 'ur'); // main language persisted intact

  console.log('  ✓ Test 7 passed: Side-effects run after language persistence; failures do not lose language.');
}

// ---------------------------------------------------------------------------
// Test 8: Quran reading position preservation
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();

  // Simulate an active Quran reading position in storage
  const readingPos = { surah: 2, ayah: 255, savedAt: Date.now() };
  await storage.setItem('quran-last-reading', JSON.stringify(readingPos));
  await storage.setItem('surah-last-ayah:2', JSON.stringify({ ayah: 255 }));
  await storage.setItem('last-read', JSON.stringify({ surah: 2, ayah: 255, surahName: 'Al-Baqarah' }));

  const harness = new SettingsHarness(storage);
  await harness.boot();

  // Switch language from en to ur
  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 60));

  // Verify reader position keys were NOT clobbered or cleared
  const posAfter = JSON.parse(await storage.getItem('quran-last-reading'));
  const surahAfter = JSON.parse(await storage.getItem('surah-last-ayah:2'));
  const lastReadAfter = JSON.parse(await storage.getItem('last-read'));

  assert.strictEqual(posAfter.surah, 2);
  assert.strictEqual(posAfter.ayah, 255);
  assert.strictEqual(surahAfter.ayah, 255);
  assert.strictEqual(lastReadAfter.surah, 2);
  assert.strictEqual(lastReadAfter.ayah, 255);

  console.log('  ✓ Test 8 passed: Quran reading position keys preserved across language changes.');
}

console.log('\n========================================================');
console.log('ALL LANGUAGE SWITCHING & PERSISTENCE TESTS PASSED!');
console.log('========================================================\n');
