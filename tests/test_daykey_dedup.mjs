/**
 * Local calendar day-key de-duplication regression (v1.1.88).
 *
 * Guarantees proven here, behaviourally (transpile + execute the REAL module):
 *  1. Every converted day-KEY site derives its value from the single shared
 *     authority `src/lib/dateKey.ts` (`getLocalDateKey`). We prove this by
 *     replacing `dateKey` with a spy that returns a unique sentinel: a site
 *     that hand-rolls the arithmetic never touches the spy, so the sentinel is
 *     absent and the assertion is RED.
 *  2. With the REAL helper, the output equals `getLocalDateKey(date)` even when
 *     the device-local calendar day differs from the UTC day (TZ=Asia/Karachi,
 *     2026-10-20T21:00Z is local 2026-10-21). A UTC-derived key would fail this.
 *
 * Run: node tests/test_daykey_dedup.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
process.env.TZ = 'Asia/Karachi';

// 2026-10-20T21:00Z === 2026-10-21 02:00 local (UTC+5) -> local day != UTC day.
const TZ_SHIFT_ISO = '2026-10-20T21:00:00.000Z';
const SHIFTED_LOCAL_KEY = '2026-10-21';
const SENTINEL = 'SENTINEL-DAYKEY-0000-00-00';

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function transpile(relativePath) {
  return ts.transpileModule(readSource(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: path.join(ROOT, relativePath),
  }).outputText;
}

/** A spy `dateKey` module that records every call and returns the sentinel. */
function makeSpy() {
  const calls = [];
  return {
    calls,
    module: {
      __esModule: true,
      getLocalDateKey: (date = new Date()) => {
        calls.push(date);
        return SENTINEL;
      },
    },
  };
}

/**
 * Execute a transpiled production module in a VM sandbox with a spy `dateKey`.
 * `modules` overrides are applied after the spy, and a Proxy supplies any other
 * import so module load cannot fail on an unrelated dependency.
 */
function loadWithSpy(relativePath, dateKeyModule, extraModules = {}) {
  const output = transpile(relativePath);
  // Self-referential proxy: any property is callable and any call returns the
  // same proxy, so unrelated imports can be dereferenced arbitrarily deep.
  const fallback = new Proxy(function () {}, {
    get: (_target, prop) => (prop === Symbol.toPrimitive ? () => '' : fallback),
    apply: () => fallback,
    has: () => true,
  });
  const require = (request) => {
    if (Object.prototype.hasOwnProperty.call(extraModules, request)) return extraModules[request];
    if (request === './dateKey' || request === '../lib/dateKey') return dateKeyModule;
    return fallback;
  };
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require,
    console,
    process,
    Date,
    Array,
    Error,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    Map,
    WeakMap,
    Symbol,
    Proxy,
    Reflect,
    globalThis: undefined,
    __DEV__: false,
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: relativePath });
  return moduleObject.exports;
}

/* ── 1. Exported day-key helpers: delegation + real-helper equivalence ───── */

const realDateKey = loadCommonJsModule({ root: ROOT, relativePath: 'src/lib/dateKey.ts' });
const shiftedDate = new Date(TZ_SHIFT_ISO);
assert.equal(
  realDateKey.getLocalDateKey(shiftedDate),
  SHIFTED_LOCAL_KEY,
  'guard: the shared helper must resolve the local (not UTC) calendar day',
);

function assertDelegatesAndMatches({ label, relativePath, call }) {
  // (a) delegation: sentinel must flow through the production symbol.
  const spy = makeSpy();
  const mod = loadWithSpy(relativePath, spy.module);
  const observed = call(mod);
  assert.equal(
    observed,
    SENTINEL,
    `${label} must derive its day key through getLocalDateKey (hand-rolled arithmetic never reaches the shared helper)`,
  );

  // (b) equivalence with the real helper, including the UTC/local-day split.
  const realMod = loadWithSpy(relativePath, realDateKey);
  assert.equal(
    call(realMod),
    SHIFTED_LOCAL_KEY,
    `${label} must equal getLocalDateKey for a date whose local day differs from its UTC day`,
  );
  return spy.calls.length;
}

assertDelegatesAndMatches({
  label: 'usePrayerWatcher.getPrayerDateKey',
  relativePath: 'src/lib/usePrayerWatcher.ts',
  call: (mod) => mod.getPrayerDateKey(shiftedDate),
});

assertDelegatesAndMatches({
  label: 'TasbihScreen.getTasbihTodayKey',
  relativePath: 'src/screens/TasbihScreen.tsx',
  call: (mod) => mod.getTasbihTodayKey(shiftedDate),
});

assertDelegatesAndMatches({
  label: 'ToolsScreen.getTodayIso',
  relativePath: 'src/screens/ToolsScreen.tsx',
  call: (mod) => mod.getTodayIso(shiftedDate),
});

/* ── 2. weeklySummary.buildWeeklySummary (observable weekStart/weekEnd) ──── */

const summaryReal = loadWithSpy('src/lib/weeklySummary.ts', realDateKey, {
  './db': {
    getSalahHistory: () => ({}),
    computeStreak: () => 0,
    getSalahStreak: () => 0,
    loadHifzStatuses: () => ({}),
  },
  './study': { getNotes: () => [] },
  '@react-native-async-storage/async-storage': { getItem: async () => null },
});
const summaryResult = await summaryReal.buildWeeklySummary(shiftedDate);
assert.equal(
  summaryResult.weekEnd,
  SHIFTED_LOCAL_KEY,
  'weeklySummary weekEnd must be the local calendar day key',
);
const weekStartLocal = new Date(shiftedDate);
weekStartLocal.setDate(weekStartLocal.getDate() - 6);
assert.equal(
  summaryResult.weekStart,
  realDateKey.getLocalDateKey(weekStartLocal),
  'weeklySummary weekStart must be derived with the same local calendar rule',
);

// Delegation proof: with a spy dateKey, every one of the 7 day strings must be the sentinel.
const summarySpy = makeSpy();
const summarySpied = loadWithSpy('src/lib/weeklySummary.ts', summarySpy.module, {
  './db': {
    getSalahHistory: () => ({}),
    computeStreak: () => 0,
    getSalahStreak: () => 0,
    loadHifzStatuses: () => ({}),
  },
  './study': { getNotes: () => [] },
  '@react-native-async-storage/async-storage': { getItem: async () => null },
});
const spiedResult = await summarySpied.buildWeeklySummary(shiftedDate);
assert.equal(spiedResult.weekEnd, SENTINEL, 'weeklySummary must build its day keys through getLocalDateKey');
assert.equal(spiedResult.weekStart, SENTINEL, 'weeklySummary must build its day keys through getLocalDateKey');
assert.equal(summarySpy.calls.length, 7, 'weeklySummary must call the shared helper once per day in the 7-day window');

/* ── 3. Cache-key paths: useAyahOfDay & useHadithOfDay ───────────────────── */

/** Render a hook with a minimal hook engine; return captured AsyncStorage keys. */
async function driveHookCacheKey(relativePath, hookName, dateKeyModule, extraModules) {
  const seenKeys = [];
  const AsyncStorage = {
    __esModule: true,
    default: {
      getItem: async (key) => {
        seenKeys.push(key);
        return null;
      },
      setItem: async () => {},
      removeItem: async () => {},
    },
  };
  const stateSlots = [];
  const refSlots = [];
  const effects = [];
  let idx = 0;
  const React = {
    __esModule: true,
    default: { createElement: () => null },
    useState(initial) {
      const i = idx++;
      if (!(i in stateSlots)) stateSlots[i] = typeof initial === 'function' ? initial() : initial;
      return [stateSlots[i], () => {}];
    },
    useRef(value) {
      const i = idx++;
      if (!(i in refSlots)) refSlots[i] = { current: value };
      return refSlots[i];
    },
    useCallback(fn) {
      return fn;
    },
    useEffect(effect) {
      effects.push(effect);
    },
    useMemo(fn) {
      return fn();
    },
  };
  const modules = {
    react: React,
    './dateKey': dateKeyModule,
    '@react-native-async-storage/async-storage': AsyncStorage,
    ...extraModules,
  };
  const output = transpile(relativePath);
  const fallback = new Proxy({}, { get: () => () => null, has: () => true });
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) =>
      Object.prototype.hasOwnProperty.call(modules, request) ? modules[request] : fallback,
    console,
    process,
    Date,
    Array,
    Error,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    Map,
    fetch: () => Promise.reject(new Error('offline in test')),
    AbortController: class {
      abort() {}
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: relativePath });
  const hook = moduleObject.exports[hookName];
  assert.equal(typeof hook, 'function', `${relativePath} must export ${hookName}`);
  const api = hook();
  assert.equal(typeof api.refresh, 'function', `${hookName} must expose refresh (its load path)`);
  // Run the mount effect so the production `load()` path executes, plus refresh
  // so both key-writing paths are exercised. Then drain microtasks.
  for (const effect of effects) effect();
  await api.refresh();
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
  return seenKeys;
}

const ayahModules = {
  './useConnectivity': { isAppOnline: () => false },
};
const ayahKeys = await driveHookCacheKey('src/lib/useAyahOfDay.ts', 'useAyahOfDay', realDateKey, ayahModules);
// NOTE: this assertion used to require the day key at the END of the cache key. That shape changed legitimately:
// the Ayah-of-the-Day key is now scoped by language and edition too (so one language's fetch cannot satisfy
// another's), which puts the day mid-string: `ayah-of-the-day-<day>-<lang>-<edition>`. The INTENT is unchanged -
// the cache must be keyed by the LOCAL day - so assert containment of the day as a delimited segment, not a suffix.
assert.ok(
  ayahKeys.some((key) => key.includes(`-${realDateKey.getLocalDateKey(new Date())}-`)),
  `useAyahOfDay must key its cache with getLocalDateKey(new Date()) (saw ${JSON.stringify(ayahKeys)})`,
);
const ayahSpy = makeSpy();
const ayahSpyKeys = await driveHookCacheKey('src/lib/useAyahOfDay.ts', 'useAyahOfDay', ayahSpy.module, ayahModules);
assert.ok(
  ayahSpyKeys.some((key) => key.includes(SENTINEL)),
  `useAyahOfDay must build its cache key through getLocalDateKey (saw ${JSON.stringify(ayahSpyKeys)})`,
);

const hadithModules = {
  './hadith': { HADITHS: [], Hadith: {} },
  './useConnectivity': { isAppOnline: () => false },
};
const hadithKeys = await driveHookCacheKey('src/lib/useHadithOfDay.ts', 'useHadithOfDay', realDateKey, hadithModules);
assert.ok(
  hadithKeys.some((key) => key.endsWith(realDateKey.getLocalDateKey(new Date()))),
  `useHadithOfDay must key its cache with getLocalDateKey(new Date()) (saw ${JSON.stringify(hadithKeys)})`,
);
const hadithSpy = makeSpy();
const hadithSpyKeys = await driveHookCacheKey('src/lib/useHadithOfDay.ts', 'useHadithOfDay', hadithSpy.module, hadithModules);
assert.ok(
  hadithSpyKeys.some((key) => key.endsWith(SENTINEL)),
  `useHadithOfDay must build its cache key through getLocalDateKey (saw ${JSON.stringify(hadithSpyKeys)})`,
);

/* ── 4. Screen inline sites: HomeScreen & SalahTrackerScreen ─────────────── */

/**
 * Render a screen component with a minimal hook engine, a deep auto-stub for
 * unrelated imports, and a spy `../lib/dateKey`. Returns every value passed to
 * `db.getSalahEntries` and the recorded dateKey call count.
 */
function renderScreen(relativePath, dateKeyModule, dbModule) {
  const salahIsoCalls = [];
  const noop = () => {};
  const stateSlots = [];
  const refSlots = [];
  const effects = [];
  let idx = 0;
  const hook = {
    useState(init) {
      const i = idx++;
      if (!(i in stateSlots)) stateSlots[i] = typeof init === 'function' ? init() : init;
      return [stateSlots[i], noop];
    },
    useEffect(effect) {
      effects.push(effect);
    },
    useCallback(fn) {
      return fn;
    },
    useMemo(fn) {
      return fn();
    },
    useRef(value) {
      const i = idx++;
      if (!(i in refSlots)) refSlots[i] = { current: value };
      return refSlots[i];
    },
    useReducer(state) {
      return [state, noop];
    },
  };
  const deep = new Proxy(function () {}, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? () => '' : deep),
    apply: () => deep,
    has: () => true,
  });
  const React = {
    __esModule: true,
    default: { createElement: () => null, memo: (c) => c, forwardRef: (c) => c },
    ...hook,
    createContext: () => ({ Provider: 'P', Consumer: 'C' }),
    useContext: () => deep,
    useLayoutEffect: hook.useEffect,
    useImperativeHandle: noop,
  };
  const AsyncStorage = {
    __esModule: true,
    default: {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
      getAllKeys: async () => [],
    },
  };
  const db = {
    markSalahCompleted: noop,
    getSalahEntries: (iso) => {
      salahIsoCalls.push(iso);
      return {};
    },
    computeStreak: () => 0,
    getSalahHistory: () => ({}),
    getSalahStreak: () => 0,
    loadHifzStatuses: () => ({}),
    ...dbModule,
  };
  const modules = {
    react: React,
    'react-native': deep,
    '@react-native-async-storage/async-storage': AsyncStorage,
    'react-native-safe-area-context': {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      SafeAreaView: 'SA',
    },
    'expo-linear-gradient': { LinearGradient: 'LG' },
    '@expo/vector-icons': { Ionicons: 'I' },
    'react-native-svg': { __esModule: true, default: 'S', Path: 'P' },
    'react-i18next': { useTranslation: () => ({ t: (k) => k }) },
    '../lib/dateKey': dateKeyModule,
    '../lib/db': db,
    '../lib/prayerTimes': {
      fetchPrayerTimes: async () => null,
      getCachedPrayerTimes: () => null,
      todayDdmmyyyy: () => '2026-10-21',
      getNextPrayer: () => null,
      parseHm: () => 0,
    },
    '../lib/names99': { NAMES_99: [] },
    '../lib/afterPrayerDuas': {
      useAfterPrayerDuas: () => [],
      getAllAfterPrayerDuas: () => [],
      isDuaForPrayer: () => false,
    },
    '../lib/settings': {
      useSettings: () => ({
        settings: {
          methodId: 1,
          madhab: 'shafi',
          locationMode: 'manual',
          manualLocation: null,
          autoLocation: null,
          prayerConfigs: {},
        },
      }),
    },
    '../lib/haptics': { useHaptics: () => ({ haptic: noop }) },
    '../lib/useLocation': { useLocation: () => ({ location: null }) },
    '../lib/usePrayerWatcher': { usePrayerWatcher: noop },
    '../lib/audio': { configureAudio: noop },
    '../lib/useAyahOfDay': { useAyahOfDay: () => ({ ayah: null, refresh: noop }), getDayOfYear: () => 1 },
    '../lib/useHadithOfDay': { useHadithOfDay: () => ({ hadith: null, refresh: noop }) },
  };
  const require = (request) =>
    Object.prototype.hasOwnProperty.call(modules, request) ? modules[request] : deep;
  const output = transpile(relativePath);
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require,
    console,
    process,
    Date,
    Array,
    Error,
    JSON,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    Map,
    WeakMap,
    Symbol,
    Reflect,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    __DEV__: false,
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: relativePath });
  const component = moduleObject.exports.default;
  assert.equal(typeof component, 'function', `${relativePath} must default-export its screen`);
  component({ onBack: noop, backLabel: 'Tools', isActive: true });
  for (const effect of effects) {
    try {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanup();
    } catch {
      // unrelated effects may touch stubbed APIs; the key path already ran
    }
  }
  return salahIsoCalls;
}

// SalahTrackerScreen: its private getTodayIso must delegate and pass the key to db.
const salahSpy = makeSpy();
const salahIsoSpy = renderScreen('src/screens/SalahTrackerScreen.tsx', salahSpy.module);
assert.ok(
  salahIsoSpy.includes(SENTINEL),
  `SalahTrackerScreen must key getSalahEntries through getLocalDateKey (saw ${JSON.stringify(salahIsoSpy)})`,
);
assert.ok(salahSpy.calls.length >= 1, 'SalahTrackerScreen must call the shared helper');
const salahIsoReal = renderScreen('src/screens/SalahTrackerScreen.tsx', realDateKey);
assert.ok(
  salahIsoReal.includes(realDateKey.getLocalDateKey(new Date())),
  'SalahTrackerScreen must key getSalahEntries with the real local day',
);

// HomeScreen: three inline sites all derive through the shared helper.
const homeSpy = makeSpy();
const homeIsoSpy = renderScreen('src/screens/HomeScreen.tsx', homeSpy.module);
assert.ok(
  homeIsoSpy.includes(SENTINEL),
  `HomeScreen's completed initializer must key getSalahEntries through getLocalDateKey (saw ${JSON.stringify(homeIsoSpy)})`,
);
assert.ok(
  homeSpy.calls.length >= 8,
  `HomeScreen's initializer + 7-day star grid must all route through getLocalDateKey (saw ${homeSpy.calls.length} calls)`,
);
const homeIsoReal = renderScreen('src/screens/HomeScreen.tsx', realDateKey);
assert.ok(
  homeIsoReal.includes(realDateKey.getLocalDateKey(new Date())),
  'HomeScreen must key getSalahEntries with the real local day',
);

console.log('test_daykey_dedup passed');
