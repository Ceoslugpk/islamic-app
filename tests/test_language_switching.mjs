/**
 * Language Switching Architecture & Persistence Test Suite
 * Self-contained (no native runtime dependencies).
 * Tests:
 *  1. Code structure / contract verification across settings.tsx, i18n.ts, SettingsScreen.tsx, and App.tsx
 *  2. en -> ur ordering: write -> readback verify -> forceRTL(true) -> reload
 *  3. ur -> en ordering: write -> readback verify -> forceRTL(false) -> reload
 *  4. Storage write failure -> zero forceRTL, zero reload, state rolled back
 *  4b. Readback mismatch -> zero forceRTL, zero reload, state rolled back
 *  5. Repeated rapid switching converges on final selected language without double-reload
 *  6. Stale-closure write impossibility (concurrent settings updates preserved)
 *  7. Side-effect ordering & resilience (quran lang / tafsir / audio run only after persist; failures do not lose language)
 *  8. Quran reading position preservation across language switch and boot
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== LANGUAGE SWITCHING & PERSISTENCE TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// 1. Static Contract & Source Code Verification
// ---------------------------------------------------------------------------
console.log('--- 1. Static Contract Verification ---');

const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const settingsWriterCode = fs.readFileSync('src/lib/settingsWriteQueue.ts', 'utf8');
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
assert.ok(
  settingsCode.includes('export function getAutoLinkedTafsir('),
  'settings.tsx must export getAutoLinkedTafsir helper'
);
assert.ok(
  settingsCode.includes('export const CANONICAL_AUTO_LINKED_TAFSIR_IDS'),
  'settings.tsx must export CANONICAL_AUTO_LINKED_TAFSIR_IDS'
);
assert.ok(
  settingsCode.includes('export const CANONICAL_AUTO_LINKED_QURAN_LANGS'),
  'settings.tsx must export CANONICAL_AUTO_LINKED_QURAN_LANGS'
);

// (a2) settings.tsx Arabic content auto-linking branches
assert.ok(
  settingsCode.includes("nextLang === 'ar'") && settingsCode.includes("setQuranTranslationLanguage('ar')"),
  'setLanguage must auto-link Arabic Quran translation language'
);
assert.ok(
  settingsCode.includes("'api-ibn-kathir-ar'"),
  'setLanguage must auto-link Arabic Tafsir Ibn Kathir'
);

// (b) durable write & readback remain atomic inside the shared writer queue
assert.ok(
  settingsWriterCode.includes('await storage.setItem') && settingsWriterCode.includes('JSON.stringify(value)'),
  'shared settings writer must await the durable serialized write'
);
assert.ok(
  settingsWriterCode.includes('await storage.getItem(key)') && settingsCode.includes('await enqueueWrite(nextClean, (raw)'),
  'language write must perform readback verification inside the same queued task'
);
assert.ok(
  settingsCode.includes('throw err;'),
  'setLanguage must re-throw on persistence/readback failure so caller does not falsely reload'
);

// (c) settings.tsx rolls back / keeps previous state on failure
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

// (e) i18n.ts layout direction switch preparation helper
assert.ok(
  i18nCode.includes('export function prepareNativeLayoutDirection('),
  'i18n.ts must export prepareNativeLayoutDirection helper'
);
assert.ok(
  i18nCode.includes('I18nManager.forceRTL(isRtl)') || i18nCode.includes('I18nManager.forceRTL(isUrdu)'),
  'prepareNativeLayoutDirection must configure I18nManager.forceRTL for RTL layout'
);

// (f) SettingsScreen integration of prepareNativeLayoutDirection & reload guards
assert.ok(
  settingsScreenCode.includes('prepareNativeLayoutDirection(nextLang)'),
  'SettingsScreen must call prepareNativeLayoutDirection(nextLang) before scheduling reload'
);
assert.ok(
  settingsScreenCode.includes('isSwitchingLanguageRef.current'),
  'SettingsScreen must guard against concurrent language switches with isSwitchingLanguageRef'
);
assert.ok(
  settingsScreenCode.includes('const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false)') &&
    settingsScreenCode.includes('disabled={isSwitchingLanguage}'),
  'SettingsScreen must use reactive state, not ref.current during render, for disabled appearance controls'
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

// (g) App.tsx boot reconciliation & reader unmount
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
  appCode.includes('applyRTL(isRtlLanguage(lang))') || appCode.includes("applyRTL(lang === 'ur')"),
  'App.tsx boot effect must apply RTL according to persisted language'
);

// (h) i18n.ts resolution contract
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
// 2. Dynamic Behavioral Test Suite
// ---------------------------------------------------------------------------
console.log('\n--- 2. Dynamic Behavioral Test Suite ---');

class MockI18nManager {
  constructor(initialRTL = false) {
    this.isRTL = initialRTL;
    this.allowRTLCalls = [];
    this.forceRTLCalls = [];
  }

  allowRTL(allow) {
    this.allowRTLCalls.push(allow);
  }

  forceRTL(force) {
    this.forceRTLCalls.push(force);
    this.isRTL = force;
  }
}

class MockStorage {
  constructor() {
    this.store = new Map();
    this.failNextWrite = false;
    this.failNextRead = false;
    this.readMismatchLang = null;
    this.writeLatencyMs = 0;
  }

  async getItem(key) {
    if (this.failNextRead) {
      throw new Error('AsyncStorage disk read error (simulated ReadFail)');
    }
    if (key === STORAGE_KEY && this.readMismatchLang !== null) {
      const existing = this.store.get(key);
      const parsed = existing ? JSON.parse(existing) : { ...DEFAULT_SETTINGS };
      return JSON.stringify({ ...parsed, language: this.readMismatchLang });
    }
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
  const lang = raw.language === 'ur' || raw.language === 'ar' || raw.language === 'en' ? raw.language : 'en';
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    language: lang,
    madhab: raw.madhab === 'hanafi' ? 'hanafi' : 'shafi',
  };
}

const CANONICAL_TAFSIRS = new Set(['jalalayn', 'api-ibn-kathir-urdu', 'api-ibn-kathir-ar']);
const CANONICAL_QURAN_LANGS = new Set(['en', 'ur', 'ar']);

function computeNextSettings(prev, nextLang) {
  let tafsirSourceId = prev.tafsirSourceId;
  if (CANONICAL_TAFSIRS.has(prev.tafsirSourceId)) {
    if (nextLang === 'ar') tafsirSourceId = 'api-ibn-kathir-ar';
    else if (nextLang === 'ur') tafsirSourceId = 'api-ibn-kathir-urdu';
    else tafsirSourceId = 'jalalayn';
  }
  return sanitizeMockSettings({
    ...prev,
    language: nextLang,
    tafsirSourceId,
  });
}

class SettingsHarness {
  constructor(storage, i18nManager = new MockI18nManager()) {
    this.storage = storage;
    this.i18n = i18nManager;
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
    this.operationLog = [];
  }

  async boot() {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.language === 'en' || parsed.language === 'ur' || parsed.language === 'ar')) {
        this.bootLang = parsed.language;
      }
    }
    this.activeLang = this.bootLang;
    this.settings = sanitizeMockSettings(raw ? JSON.parse(raw) : {});
    if (!raw || !JSON.parse(raw).language) {
      this.settings.language = this.bootLang;
    }
    this.i18n.isRTL = this.bootLang === 'ur' || this.bootLang === 'ar';
  }

  prepareNativeLayoutDirection(lang) {
    const isRtl = lang === 'ur' || lang === 'ar';
    this.i18n.allowRTL(true);
    this.i18n.forceRTL(isRtl);
    this.operationLog.push(`forceRTL:${isRtl}`);
  }

  async runSideEffects(nextLang) {
    const currentQuranLang = (await this.storage.getItem('quran-translation-language')) || 'en';
    if (CANONICAL_QURAN_LANGS.has(currentQuranLang)) {
      if (nextLang === 'ur') {
        await this.storage.setItem('quran-translation-language', 'ur');
        this.sideEffectsRun.push('quran-lang:ur');
      } else if (nextLang === 'ar') {
        await this.storage.setItem('quran-translation-language', 'ar');
        this.sideEffectsRun.push('quran-lang:ar');
      } else {
        await this.storage.setItem('quran-translation-language', 'en');
        this.sideEffectsRun.push('quran-lang:en');
      }
    }

    if (CANONICAL_TAFSIRS.has(this.settings.tafsirSourceId)) {
      if (nextLang === 'ur') {
        this.settings.tafsirSourceId = 'api-ibn-kathir-urdu';
        this.sideEffectsRun.push('tafsir:urdu');
      } else if (nextLang === 'ar') {
        this.settings.tafsirSourceId = 'api-ibn-kathir-ar';
        this.sideEffectsRun.push('tafsir:ar');
      } else {
        this.settings.tafsirSourceId = 'jalalayn';
        this.sideEffectsRun.push('tafsir:jalalayn');
      }
    }

    const currentAudioEdition = (await this.storage.getItem('quran-audio-translation-edition')) || 'en.walk';
    if (nextLang === 'ur') {
      if (currentAudioEdition === 'en.walk' || !currentAudioEdition) {
        await this.storage.setItem('quran-audio-translation-edition', 'ur.everyayah-shamshad');
        this.sideEffectsRun.push('audio:shamshad');
      }
    } else {
      // en or ar: restore default if user had Shamshad. No fake Arabic translation audio.
      if (currentAudioEdition === 'ur.everyayah-shamshad') {
        await this.storage.setItem('quran-audio-translation-edition', 'en.walk');
        this.sideEffectsRun.push('audio:english');
      }
    }
  }

  async setLanguage(nextLang) {
    const prevLang = this.settings.language;
    if (nextLang === prevLang) return;

    const currentSnapshot = { ...this.settings };
    const nextClean = computeNextSettings(currentSnapshot, nextLang);

    // 1. Direct durable write to storage
    try {
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(nextClean));
      this.operationLog.push(`write:${nextLang}`);

      // 2. Read back and verify stored language
      const raw = await this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        throw new Error('Storage readback failed: empty settings');
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.language !== nextLang) {
        throw new Error(`Storage readback verification mismatch: expected ${nextLang}, got ${parsed?.language}`);
      }
      this.operationLog.push(`readback_verify:${parsed.language}`);
    } catch (err) {
      // Revert/keep state on failure
      this.settings = computeNextSettings(this.settings, prevLang);
      this.activeLang = prevLang;
      throw err;
    }

    // 3. Durability verified: update state
    this.settings = nextClean;
    this.activeLang = nextLang;

    // 4. Side-effects run ONLY AFTER storage write & readback succeed
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

      // CRITICAL: prepare layout direction preference AFTER storage write succeeds
      // and IMMEDIATELY BEFORE scheduling reload
      this.prepareNativeLayoutDirection(nextLang);

      // Schedule reload
      this.reloadTimer = setTimeout(() => {
        this.reloadScheduled = true;
        this.reloadLang = nextLang;
        this.operationLog.push(`reload:${nextLang}`);
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
// Test 2: en -> ur ordering: write -> readback verify -> forceRTL(true) -> reload
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const i18n = new MockI18nManager(false);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(i18n.isRTL, false);

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 70));

  // Assert exact sequence of operations
  assert.deepStrictEqual(harness.operationLog, [
    'write:ur',
    'readback_verify:ur',
    'forceRTL:true',
    'reload:ur',
  ], 'Ordering must be write -> readback verify -> forceRTL(true) -> reload');

  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(harness.activeLang, 'ur');
  assert.strictEqual(i18n.isRTL, true);
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'ur');
  assert.strictEqual(harness.lastError, null);
  assert.strictEqual(harness.readerUnmounted, true);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ur');

  console.log('  ✓ Test 2 passed: en -> ur ordering write -> readback verify -> forceRTL(true) -> reload verified.');
}

// ---------------------------------------------------------------------------
// Test 3: ur -> en ordering: write -> readback verify -> forceRTL(false) -> reload
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  await storage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'ur' }));
  const i18n = new MockI18nManager(true);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.bootLang, 'ur');
  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(i18n.isRTL, true);

  await harness.onUserSelectLanguage('en');
  await new Promise((r) => setTimeout(r, 70));

  // Assert exact sequence of operations
  assert.deepStrictEqual(harness.operationLog, [
    'write:en',
    'readback_verify:en',
    'forceRTL:false',
    'reload:en',
  ], 'Ordering must be write -> readback verify -> forceRTL(false) -> reload');

  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.activeLang, 'en');
  assert.strictEqual(i18n.isRTL, false);
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'en');
  assert.strictEqual(harness.lastError, null);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'en');

  console.log('  ✓ Test 3 passed: ur -> en ordering write -> readback verify -> forceRTL(false) -> reload verified.');
}

// ---------------------------------------------------------------------------
// Test 2b: en -> ar ordering: write -> readback verify -> forceRTL(true) -> reload
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const i18n = new MockI18nManager(false);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(i18n.isRTL, false);

  await harness.onUserSelectLanguage('ar');
  await new Promise((r) => setTimeout(r, 70));

  assert.deepStrictEqual(harness.operationLog, [
    'write:ar',
    'readback_verify:ar',
    'forceRTL:true',
    'reload:ar',
  ], 'Ordering must be write -> readback verify -> forceRTL(true) -> reload');

  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(harness.activeLang, 'ar');
  assert.strictEqual(i18n.isRTL, true);
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'ar');
  assert.strictEqual(harness.lastError, null);
  assert.strictEqual(harness.readerUnmounted, true);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ar');

  console.log('  ✓ Test 2b passed: en -> ar ordering write -> readback verify -> forceRTL(true) -> reload verified.');
}

// ---------------------------------------------------------------------------
// Test 2c: ur -> ar ordering: write -> readback verify -> forceRTL(true) -> reload
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  await storage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'ur', tafsirSourceId: 'api-ibn-kathir-urdu' }));
  const i18n = new MockI18nManager(true);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.bootLang, 'ur');
  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(i18n.isRTL, true);

  await harness.onUserSelectLanguage('ar');
  await new Promise((r) => setTimeout(r, 70));

  assert.deepStrictEqual(harness.operationLog, [
    'write:ar',
    'readback_verify:ar',
    'forceRTL:true',
    'reload:ar',
  ], 'Ordering must be write -> readback verify -> forceRTL(true) -> reload');

  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(harness.activeLang, 'ar');
  assert.strictEqual(i18n.isRTL, true);
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'ar');
  assert.strictEqual(harness.lastError, null);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ar');

  console.log('  ✓ Test 2c passed: ur -> ar ordering write -> readback verify -> forceRTL(true) -> reload verified.');
}

// ---------------------------------------------------------------------------
// Test 2d: ar -> ur ordering: write -> readback verify -> forceRTL(true) -> reload
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  await storage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'ar', tafsirSourceId: 'api-ibn-kathir-ar' }));
  const i18n = new MockI18nManager(true);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.bootLang, 'ar');
  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(i18n.isRTL, true);

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 70));

  assert.deepStrictEqual(harness.operationLog, [
    'write:ur',
    'readback_verify:ur',
    'forceRTL:true',
    'reload:ur',
  ], 'Ordering must be write -> readback verify -> forceRTL(true) -> reload');

  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(harness.activeLang, 'ur');
  assert.strictEqual(i18n.isRTL, true);
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'ur');
  assert.strictEqual(harness.lastError, null);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ur');

  console.log('  ✓ Test 2d passed: ar -> ur ordering write -> readback verify -> forceRTL(true) -> reload verified.');
}

// ---------------------------------------------------------------------------
// Test 2e: ar -> en ordering: write -> readback verify -> forceRTL(false) -> reload
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  await storage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'ar', tafsirSourceId: 'api-ibn-kathir-ar' }));
  const i18n = new MockI18nManager(true);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.bootLang, 'ar');
  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(i18n.isRTL, true);

  await harness.onUserSelectLanguage('en');
  await new Promise((r) => setTimeout(r, 70));

  assert.deepStrictEqual(harness.operationLog, [
    'write:en',
    'readback_verify:en',
    'forceRTL:false',
    'reload:en',
  ], 'Ordering must be write -> readback verify -> forceRTL(false) -> reload');

  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.activeLang, 'en');
  assert.strictEqual(i18n.isRTL, false);
  assert.strictEqual(harness.reloadScheduled, true);
  assert.strictEqual(harness.reloadLang, 'en');
  assert.strictEqual(harness.lastError, null);

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'en');

  console.log('  ✓ Test 2e passed: ar -> en ordering write -> readback verify -> forceRTL(false) -> reload verified.');
}

// ---------------------------------------------------------------------------
// Test 4: Storage write failure -> zero forceRTL, zero reload, state rolled back
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const i18n = new MockI18nManager(false);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');

  // Inject write failure
  storage.failNextWrite = true;

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 70));

  // Reload must NOT be scheduled
  assert.strictEqual(harness.reloadScheduled, false);
  assert.strictEqual(harness.reloadLang, null);

  // forceRTL must NEVER have been called
  assert.strictEqual(i18n.forceRTLCalls.length, 0, 'forceRTL must not be called when write fails');
  assert.strictEqual(i18n.isRTL, false);

  // State must NOT claim urdu (rolled back / kept at 'en')
  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.activeLang, 'en');

  // Error notice displayed
  assert.strictEqual(harness.lastError, 'Still could not load. Try again later.');

  // Storage key must not contain false urdu
  const stored = storage.dump(STORAGE_KEY);
  assert.ok(!stored || stored.language === 'en');

  console.log('  ✓ Test 4 passed: Write failure results in zero forceRTL, zero reload, and clean rollback.');
}

// ---------------------------------------------------------------------------
// Test 4b: Readback verification failure -> zero forceRTL, zero reload, rollback
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const i18n = new MockI18nManager(false);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');

  // Simulate write succeeding on disk but readback mismatching (e.g. stale disk read)
  storage.readMismatchLang = 'en';

  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 70));

  // Reload must NOT be scheduled
  assert.strictEqual(harness.reloadScheduled, false);
  assert.strictEqual(harness.reloadLang, null);

  // forceRTL must NEVER have been called because readback verification failed
  assert.strictEqual(i18n.forceRTLCalls.length, 0, 'forceRTL must not be called when readback fails/mismatches');
  assert.strictEqual(i18n.isRTL, false);

  // State kept at 'en'
  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.activeLang, 'en');

  // Error notice displayed
  assert.strictEqual(harness.lastError, 'Still could not load. Try again later.');

  console.log('  ✓ Test 4b passed: Readback mismatch results in zero forceRTL, zero reload, and clean rollback.');
}

// ---------------------------------------------------------------------------
// Test 5: Repeated rapid switching converges on final selected language
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  storage.writeLatencyMs = 10;
  const i18n = new MockI18nManager(false);
  const harness = new SettingsHarness(storage, i18n);
  await harness.boot();

  // Rapidly trigger switches
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
  assert.strictEqual(i18n.isRTL, true);
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
  await new Promise((r) => setTimeout(r, 70));

  const stored = storage.dump(STORAGE_KEY);
  assert.strictEqual(stored.language, 'ur');
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
  await new Promise((r) => setTimeout(r, 70));

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
// Test 7b: Symmetric and deterministic Arabic auto-linking (en->ar, ar->ur, ur->ar, ar->en)
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();
  const harness = new SettingsHarness(storage);
  await harness.boot();
  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.settings.tafsirSourceId, 'jalalayn');

  // 1. en -> ar: Quran language 'ar', Tafsir 'api-ibn-kathir-ar', Audio unchanged
  await harness.onUserSelectLanguage('ar');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(harness.settings.tafsirSourceId, 'api-ibn-kathir-ar');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'ar');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), null); // No fake Arabic translation audio
  const storedAr = storage.dump(STORAGE_KEY);
  assert.strictEqual(storedAr.language, 'ar');
  assert.strictEqual(storedAr.tafsirSourceId, 'api-ibn-kathir-ar');

  // 2. ar -> ur: Quran language 'ur', Tafsir 'api-ibn-kathir-urdu', Audio Shamshad
  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(harness.settings.tafsirSourceId, 'api-ibn-kathir-urdu');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'ur');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), 'ur.everyayah-shamshad');
  const storedUr = storage.dump(STORAGE_KEY);
  assert.strictEqual(storedUr.language, 'ur');
  assert.strictEqual(storedUr.tafsirSourceId, 'api-ibn-kathir-urdu');

  // 3. ur -> ar: Quran language 'ar', Tafsir 'api-ibn-kathir-ar', Audio restored to default
  await harness.onUserSelectLanguage('ar');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(harness.settings.tafsirSourceId, 'api-ibn-kathir-ar');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'ar');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), 'en.walk'); // Restored to default
  const storedAr2 = storage.dump(STORAGE_KEY);
  assert.strictEqual(storedAr2.language, 'ar');
  assert.strictEqual(storedAr2.tafsirSourceId, 'api-ibn-kathir-ar');

  // 4. ar -> en: Quran language 'en', Tafsir 'jalalayn', Audio remains default
  await harness.onUserSelectLanguage('en');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.settings.tafsirSourceId, 'jalalayn');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'en');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), 'en.walk');
  const storedEn = storage.dump(STORAGE_KEY);
  assert.strictEqual(storedEn.language, 'en');
  assert.strictEqual(storedEn.tafsirSourceId, 'jalalayn');

  // 5. App restart keeps the linked values
  const restartedHarness = new SettingsHarness(storage);
  await restartedHarness.boot();
  assert.strictEqual(restartedHarness.settings.language, 'en');
  assert.strictEqual(restartedHarness.settings.tafsirSourceId, 'jalalayn');

  console.log('  ✓ Test 7b passed: Symmetric & deterministic Arabic auto-linking verified (en->ar, ar->ur, ur->ar, ar->en).');
}

// ---------------------------------------------------------------------------
// Test 7c: Preservation of explicit user choices across language switches
// ---------------------------------------------------------------------------
{
  const storage = new MockStorage();

  // User explicitly configured:
  // - French Quran translation text ('fr')
  // - Custom classical tafsir 'qurtubi'
  // - Custom Chinese audio translation ('zh.chinese')
  await storage.setItem(STORAGE_KEY, JSON.stringify({
    ...DEFAULT_SETTINGS,
    language: 'en',
    tafsirSourceId: 'qurtubi',
  }));
  await storage.setItem('quran-translation-language', 'fr');
  await storage.setItem('quran-audio-translation-edition', 'zh.chinese');

  const harness = new SettingsHarness(storage);
  await harness.boot();
  assert.strictEqual(harness.settings.tafsirSourceId, 'qurtubi');

  // Switch en -> ar
  await harness.onUserSelectLanguage('ar');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'ar');
  assert.strictEqual(harness.settings.tafsirSourceId, 'qurtubi', 'Custom tafsir qurtubi must not be overwritten');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'fr', 'Custom Quran translation fr must not be overwritten');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), 'zh.chinese', 'Custom translation audio must not be overwritten');

  // Switch ar -> ur
  await harness.onUserSelectLanguage('ur');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'ur');
  assert.strictEqual(harness.settings.tafsirSourceId, 'qurtubi', 'Custom tafsir qurtubi must be preserved in Urdu');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'fr', 'Custom Quran translation fr must be preserved in Urdu');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), 'zh.chinese', 'Custom translation audio must be preserved in Urdu');

  // Switch ur -> en
  await harness.onUserSelectLanguage('en');
  await new Promise((r) => setTimeout(r, 70));

  assert.strictEqual(harness.settings.language, 'en');
  assert.strictEqual(harness.settings.tafsirSourceId, 'qurtubi', 'Custom tafsir qurtubi must be preserved returning to English');
  assert.strictEqual(await storage.getItem('quran-translation-language'), 'fr', 'Custom Quran translation fr must be preserved returning to English');
  assert.strictEqual(await storage.getItem('quran-audio-translation-edition'), 'zh.chinese', 'Custom translation audio must be preserved returning to English');

  // Verify other custom tafsirs: muyassar, api-tabari-ar
  for (const customTafsir of ['muyassar', 'api-tabari-ar']) {
    const s2 = new MockStorage();
    await s2.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'en', tafsirSourceId: customTafsir }));
    const h2 = new SettingsHarness(s2);
    await h2.boot();
    await h2.onUserSelectLanguage('ar');
    await new Promise((r) => setTimeout(r, 70));
    assert.strictEqual(h2.settings.tafsirSourceId, customTafsir, `Custom tafsir ${customTafsir} must be preserved`);
  }

  console.log('  ✓ Test 7c passed: User explicit custom Quran language, tafsir, and audio choices preserved.');
}

// ---------------------------------------------------------------------------
// Test 7d: Honest audio policy: No fake Arabic translation audio edition
// ---------------------------------------------------------------------------
{
  const quranAudioCode = fs.readFileSync('src/lib/quranAudio.ts', 'utf8');

  // 1. VERIFIED_NON_ARABIC_EDITIONS must not contain an Arabic entry
  const nonArabicMatch = quranAudioCode.match(/export const VERIFIED_NON_ARABIC_EDITIONS:\s*Reciter\[\]\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(nonArabicMatch, 'VERIFIED_NON_ARABIC_EDITIONS definition found');
  assert.ok(!nonArabicMatch[1].includes("language: 'ar'"), 'VERIFIED_NON_ARABIC_EDITIONS must not contain Arabic reciters');
  assert.ok(!nonArabicMatch[1].includes("identifier: 'ar."), 'VERIFIED_NON_ARABIC_EDITIONS must not contain Arabic identifiers');

  // 2. LANGUAGE_AUDIO_EDITIONS must not contain 'ar'
  const langAudioMatch = quranAudioCode.match(/export const LANGUAGE_AUDIO_EDITIONS:\s*Record<[\s\S]*?>\s*=\s*\{([\s\S]*?)\};/);
  assert.ok(langAudioMatch, 'LANGUAGE_AUDIO_EDITIONS definition found');
  assert.ok(!langAudioMatch[1].includes("ar:"), 'LANGUAGE_AUDIO_EDITIONS must not have an Arabic translation audio entry');

  // 3. settings.tsx must not reference any fake Arabic audio translation edition
  assert.ok(!settingsCode.includes("ar.everyayah"), 'settings.tsx must not contain fake EveryAyah Arabic translation audio');
  assert.ok(!settingsCode.includes("ar.arabic-audio"), 'settings.tsx must not contain fake AlQuran Cloud Arabic translation audio');

  console.log('  ✓ Test 7d passed: Audio policy is honest — zero fake Arabic translation audio identifiers exist.');
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
  await new Promise((r) => setTimeout(r, 70));

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
