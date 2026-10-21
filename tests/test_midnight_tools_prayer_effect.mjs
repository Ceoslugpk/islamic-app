/**
 * Midnight-rollover regression — ToolsScreen prayer-timings effect (finding b4-F6).
 *
 * Guarantee proven by executing the REAL production module:
 *  - The prayer-timings fetch effect re-runs when the local day rolls over
 *    (`todayIso` is a dependency). On foreground resume after midnight the
 *    day key changes, and the effect whose output depends on the day must
 *    re-execute; with the dep omitted it is skipped and next-prayer keeps
 *    yesterday's solar timings.
 *
 * The harness is a minimal dependency-aware hook engine: it records each
 * effect's dependency array across renders and re-runs an effect only when its
 * deps change — exactly React's contract — so omitting `todayIso` from the dep
 * list is observable as a stale (not re-run) effect.
 *
 * Run: node tests/test_midnight_tools_prayer_effect.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/ToolsScreen.tsx');
process.env.TZ = 'Asia/Karachi';

function loadTools() {
  const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: SOURCE,
  }).outputText;

  let currentMs = new Date(2026, 9, 20, 23, 59, 0).getTime();
  const RealDate = Date;
  class ControlledDate extends RealDate {
    constructor(...args) {
      super(args.length === 0 ? currentMs : args.length === 1 ? args[0] : args);
    }
    static now() {
      return currentMs;
    }
  }

  const timers = new Map();
  let nextTimerId = 1;
  const setTimeoutStub = (callback, delay) => {
    const id = nextTimerId++;
    timers.set(id, { callback, delay });
    return id;
  };
  const clearTimeoutStub = (id) => timers.delete(id);

  let appStateListener = null;
  const AppState = {
    addEventListener(type, listener) {
      assert.equal(type, 'change');
      appStateListener = listener;
      return { remove() { if (appStateListener === listener) appStateListener = null; } };
    },
  };

  let fetchCalls = 0;
  const stableSettings = {
    methodId: 1,
    locationMode: 'manual',
    manualLocation: { latitude: 24.86, longitude: 67.0 },
    autoLocation: null,
  };
  const modules = {
    react: null,
    'react-native': {
      AppState,
      Pressable: 'Pressable',
      StyleSheet: { absoluteFill: {}, create: (styles) => styles, flatten: (s) => s },
      View: 'View',
      useWindowDimensions: () => ({ width: 390 }),
      AccessibilityRole: {},
      Animated: { Value: class { constructor() {} }, timing: () => ({ start: () => {} }), loop: () => ({ start: () => {} }) },
      AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
      Platform: { OS: 'android', select: (o) => o.android ?? o.default },
    },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Path' },
    '@expo/vector-icons': { Ionicons: { glyphMap: {} } },
    '../lib/theme': { useTheme: () => ({ mode: 'paper' }) },
    '../lib/homeThemeTokens': {
      HOME_THEME_TOKENS: { hero: { outerBorder: '#111', innerBorder: '#222' } },
      getCardShadow: () => ({}),
      getHeroCardShadow: () => ({}),
    },
    '../theme/tokens': (() => {
      const tokenValue = new Proxy({}, {
        get: (_t, prop) => {
          if (prop === 'heroGradient' || prop === 'goldGradient') return ['#b8862f', '#b8862f'];
          return '#000000';
        },
      });
      return { themeTokens: { paper: tokenValue, ink: tokenValue }, GOLD_GRADIENT: ['#b8862f', '#b8862f'] };
    })(),
    '../lib/settings': {
      useSettings: () => ({ settings: stableSettings }),
    },
    '../lib/i18n': { isRTL: () => false, t: (k) => k },
    '../lib/iconMap': { getForwardIcon: () => 'chevron' },
    '../lib/useLocation': { useLocation: () => ({ location: null }) },
    '../lib/qibla': { qiblaBearing: () => 258 },
    '../lib/db': {
      getSalahEntries: () => ({}),
      getSalahStreak: () => 0,
      markSalahCompleted: () => {},
    },
    '../lib/prayerTimes': {
      fetchPrayerTimes: async () => {
        fetchCalls += 1;
        return { timings: { Fajr: '05:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '18:00', Isha: '19:00' } };
      },
      getCachedPrayerTimes: () => null,
      getNextPrayer: () => ({ name: 'Fajr', time: '05:00' }),
      parseHm: () => 0,
    },
    '../lib/fasting': { getHijriDate: () => ({ month: 1, day: 1 }) },
  };

  const fallback = new Proxy(function () {}, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? () => '' : deep),
    apply: () => deep,
    has: () => true,
  });
  const deep = fallback;

  const dateKeyOutput = ts.transpileModule(
    fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: 'dateKey.ts' },
  ).outputText;
  const dateKeyObject = { exports: {} };
  const dateKeySandbox = { module: dateKeyObject, exports: dateKeyObject.exports, require: () => fallback, console, Date: ControlledDate };
  vm.createContext(dateKeySandbox);
  vm.runInContext(dateKeyOutput, dateKeySandbox, { filename: 'dateKey.ts' });
  modules['../lib/dateKey'] = dateKeyObject.exports;

  // Dependency-aware hook engine.
  const hookState = [];
  const effectRecords = [];
  let hookIndex = 0;
  let dirty = false;
  const depsShallowEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  };
  const React = {
    __esModule: true,
    default: { createElement: () => null, memo: (c) => c, forwardRef: (c) => c, Fragment: 'Fragment' },
    useState(initial) {
      const idx = hookIndex++;
      if (!(idx in hookState)) hookState[idx] = typeof initial === 'function' ? initial() : initial;
      return [hookState[idx], (next) => {
        const value = typeof next === 'function' ? next(hookState[idx]) : next;
        if (!Object.is(value, hookState[idx])) {
          hookState[idx] = value;
          dirty = true;
        }
      }];
    },
    useRef(value) {
      const idx = hookIndex++;
      if (!(idx in hookState)) hookState[idx] = { current: value };
      return hookState[idx];
    },
    useCallback: (fn) => fn,
    useMemo(fn, deps) {
      const idx = hookIndex++;
      const slotKey = `memo:${idx}`;
      const prev = hookState[slotKey];
      if (prev && depsShallowEqual(prev.deps, deps)) return prev.value;
      const value = fn();
      hookState[slotKey] = { value, deps: deps ? [...deps] : undefined };
      return value;
    },
    useReducer: (state) => [state, () => {}],
    useEffect(effect, deps) {
      const idx = hookIndex++;
      let record = effectRecords[idx];
      if (!record) {
        record = { effect, deps: undefined, cleanup: undefined, ran: false };
        effectRecords[idx] = record;
      }
      const changed = !record.ran || !depsShallowEqual(record.deps, deps);
      if (changed) {
        if (typeof record.cleanup === 'function') {
          try { record.cleanup(); } catch { /* ignore */ }
        }
        try {
          record.cleanup = effect();
        } catch {
          record.cleanup = undefined;
        }
        record.ran = true;
        record.deps = deps ? [...deps] : undefined;
      }
    },
    createContext: () => ({ Provider: 'P', Consumer: 'C' }),
    useContext: () => deep,
  };
  modules.react = React;

  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => modules[request] || fallback,
    console,
    process,
    Date: ControlledDate,
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
    setInterval: () => 0,
    clearInterval: () => {},
    globalThis: undefined,
    __DEV__: false,
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: SOURCE });

  const component = moduleObject.exports.default;
  assert.equal(typeof component, 'function', 'ToolsScreen default export must be a component');

  const render = () => {
    hookIndex = 0;
    component({ onOpen: () => {}, isActive: true });
  };

  return {
    exports: moduleObject.exports,
    render,
    async settle() {
      // Let the fetch promise resolve and any follow-up state updates apply.
      for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
    },
    wasDirty: () => dirty,
    clearDirty: () => { dirty = false; },
    setNow(date) { currentMs = date.getTime(); },
    fireAppState(state) { if (appStateListener) appStateListener(state); },
    now() { return new ControlledDate(); },
    fetchCalls: () => fetchCalls,
  };
}

const tools = loadTools();

// Initial render + effects at 23:59 local.
tools.render();
await tools.settle();
assert.ok(tools.fetchCalls() >= 1, 'the prayer-timings effect must fetch on mount');

// Local midnight passes while the screen stays mounted; foreground resume.
tools.setNow(new Date(2026, 9, 21, 0, 1, 0));
tools.clearDirty();
tools.fireAppState('active');
assert.equal(tools.wasDirty(), true, 'the reactive todayIso hook must schedule a re-render after midnight');

const before = tools.fetchCalls();
tools.render();
await tools.settle();
assert.ok(
  tools.fetchCalls() > before,
  `the prayer-timings effect must re-run when todayIso changes (before=${before}, after=${tools.fetchCalls()})`,
);

console.log('midnight ToolsScreen prayer-timings effect production test passed');
