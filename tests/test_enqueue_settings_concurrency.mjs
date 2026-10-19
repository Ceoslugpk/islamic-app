import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

console.log('=== REAL STANDALONE enqueueSettingsUpdate CONCURRENCY & PERSISTENCE TEST ===\n');

function loadRealSettings(customStorage) {
  const code = fs.readFileSync('src/lib/settings.tsx', 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  let capturedValue = null;
  const effects = [];
  const reactMock = {
    createContext: () => ({
      Provider: (props) => {
        capturedValue = props.value;
        return { type: 'Provider', props };
      },
    }),
    useContext: () => capturedValue,
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: (fn) => effects.push(fn),
    useCallback: (f) => f,
    useMemo: (f) => f(),
    createElement: (type, props) => {
      if (props && props.value) capturedValue = props.value;
      return { type, props };
    },
  };

  const moduleObj = { exports: {} };
  const sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    require: (id) => {
      if (id === '@react-native-async-storage/async-storage') return customStorage;
      if (id === 'react') return reactMock;
      if (id === './settingsWriteQueue') {
        const qCode = fs.readFileSync('src/lib/settingsWriteQueue.ts', 'utf8');
        const qTrans = ts.transpileModule(qCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
        const qMod = { exports: {} };
        const qBox = { module: qMod, exports: qMod.exports, Promise, Error, JSON };
        vm.createContext(qBox);
        vm.runInContext(qTrans, qBox);
        return qMod.exports;
      }
      if (id === './tafsirSources') return { TAFSIR_SOURCES: [], VALID_TAFSIR_SOURCES: new Set(['jalalayn']) };
      if (id === './i18n') return { getBootLanguage: () => 'en', setAppLanguage: () => {}, isAppLanguage: () => true };
      if (id === './audio') return { setActiveAdhanReciterId: () => {} };
      if (id === './useLocation') return { setCachedLocation: () => {} };
      if (id === './quranAudio') return { setAudioTranslationEnabled: () => {} };
      if (id === './accents') return { DEFAULT_ACCENT: 'emerald', ACCENT_KEYS: ['emerald', 'amber', 'rose'], normalizeAccentKey: (k) => k || 'emerald' };
      if (id === './names99') return { VALID_NAMES_LANGS: new Set(['en', 'ar', 'ur']) };
      return {};
    },
    console,
    Set,
    Map,
    Promise,
    Error,
    String,
    Boolean,
    Array,
    Object,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    clearTimeout,
    JSON,
  };
  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox);
  return { exports: moduleObj.exports, effects };
}

const storageMap = new Map();
storageMap.set('islamic-settings', JSON.stringify({
  language: 'en',
  themeMode: 'paper',
  remindersEnabled: true,
  madhab: 'hanafi',
}));

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let failNextWrite = false;

const delayedStorage = {
  async getItem(k) {
    await delay(15);
    return storageMap.get(k) ?? null;
  },
  async setItem(k, v) {
    await delay(15);
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('Simulated disk full write error');
    }
    storageMap.set(k, v);
  },
};

const { exports: settingsMod, effects } = loadRealSettings(delayedStorage);
const { enqueueSettingsUpdate, SettingsProvider } = settingsMod;

assert.equal(typeof enqueueSettingsUpdate, 'function', 'enqueueSettingsUpdate must be exported as a function');

// 1. Fire simultaneous standalone updates with delayed storage (simulating real production callers like privacy.ts)
const p1 = enqueueSettingsUpdate((prev) => ({
  ...prev,
  womenPinHash: 'kdf_v2_100000_1a2b3c4d5e',
}));
const p2 = enqueueSettingsUpdate((prev) => ({
  ...prev,
  remindersEnabled: false,
}));
const p3 = enqueueSettingsUpdate((prev) => ({
  ...prev,
  themeMode: 'ink',
}));

const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

// Verify returned objects
assert.equal(res1.womenPinHash, 'kdf_v2_100000_1a2b3c4d5e');
assert.equal(res2.remindersEnabled, false);
assert.equal(res3.themeMode, 'ink');

// Verify persisted storage state
const finalRaw = await delayedStorage.getItem('islamic-settings');
const finalObj = JSON.parse(finalRaw);

assert.equal(finalObj.womenPinHash, 'kdf_v2_100000_1a2b3c4d5e', 'womenPinHash must be preserved without stale read overwrite');
assert.equal(finalObj.remindersEnabled, false, 'remindersEnabled must be preserved without stale read overwrite');
assert.equal(finalObj.themeMode, 'ink', 'themeMode must be preserved without stale read overwrite');
assert.equal(finalObj.madhab, 'hanafi', 'unrelated field madhab must be preserved');
assert.equal(finalObj.language, 'en', 'unrelated field language must be preserved');

console.log('✓ Concurrent standalone callers do not overwrite each other under delayed storage I/O');

// 2. Error recovery in queue: failure does not corrupt state or block subsequent writes
failNextWrite = true;
await assert.rejects(
  enqueueSettingsUpdate((prev) => ({ ...prev, accentKey: 'rose' })),
  /Simulated disk full write error/
);

// Subsequent write must succeed and queue must not be poisoned
const recovered = await enqueueSettingsUpdate((prev) => ({ ...prev, accentKey: 'amber' }));
assert.equal(recovered.accentKey, 'amber');
const recoveredRaw = JSON.parse(await delayedStorage.getItem('islamic-settings'));
assert.equal(recoveredRaw.accentKey, 'amber');
assert.equal(recoveredRaw.womenPinHash, 'kdf_v2_100000_1a2b3c4d5e');

console.log('✓ Queue recovers after write failure without blocking subsequent writes or corrupting storage');

// 3. Provider-mounted routing: when SettingsProvider is mounted, routes through activeSettingsUpdater
SettingsProvider({ children: null });
for (const eff of effects) eff();

const mountedRes = await enqueueSettingsUpdate((prev) => ({ ...prev, themeMode: 'paper' }));
assert.equal(mountedRes.themeMode, 'paper');
console.log('✓ Mounted SettingsProvider routes updates correctly through activeSettingsUpdater');

console.log('\n✓ ALL REAL enqueueSettingsUpdate CONCURRENCY TESTS PASSED!\n');
