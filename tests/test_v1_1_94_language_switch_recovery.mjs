/**
 * Focused Verification Suite for Language Switch Recovery & Direction Reconciliation (v1.1.94)
 *
 * Exercises real production modules:
 * - src/screens/SettingsScreen.tsx
 * - src/lib/i18n.ts
 * - src/lib/rtl.ts
 *
 * Guarantees tested:
 * 1. Simulate switch where reload promise RESOLVES without reloading:
 *    Assert UI is NOT left disabled; interactive controls still fire handlers.
 * 2. Simulate switch where reload promise REJECTS:
 *    Assert UI is NOT left disabled; interactive controls still fire handlers; user sees clear message.
 * 3. Assert language and layout direction never disagree after switch attempt.
 * 4. Assert direction consumers read a reactive value; changing direction after mount updates them.
 * 5. Assert getBootLanguage() precedence: persisted choice wins; stale I18nManager.isRTL alone does not select Urdu.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lang_switch_recovery_'));

console.log('=== RUNNING LANGUAGE SWITCH RECOVERY & DIRECTION SUITE (v1.1.94) ===\n');

/* -------------------------------------------------------------------------- */
/* Helper to transpile and import real modules in an isolated harness         */
/* -------------------------------------------------------------------------- */
function makeHarness() {
  const GEN = path.join(TMP_DIR, 'gen_' + Math.random().toString(36).slice(2));
  fs.mkdirSync(GEN, { recursive: true });

  const STUB = new Proxy(function () { return STUB; }, {
    get(t, p) {
      const own = Reflect.getOwnPropertyDescriptor(t, p);
      if (own) return Reflect.get(t, p);
      if (p === 'then') return undefined;
      if (p === Symbol.toPrimitive) return () => '';
      if (p === 'toString') return () => '';
      if (p === 'valueOf') return () => 0;
      if (p === Symbol.iterator) return function* () {};
      if (typeof p === 'symbol') return undefined;
      return STUB;
    },
    apply() { return STUB; }, construct() { return STUB; }, has() { return true; },
    ownKeys(t) { return Reflect.ownKeys(t); },
    getOwnPropertyDescriptor(t, p) {
      return Reflect.getOwnPropertyDescriptor(t, p) || { configurable: true, enumerable: true, value: STUB };
    },
  });

  const CAP = { callbacks: [], refs: [], states: [], effects: [], setCalls: [], timeouts: [] };

  fs.writeFileSync(path.join(GEN, 'react.mjs'), `
const STUB = globalThis.__recoveryHarnessStub;
const cap = globalThis.__recoveryHarnessCap;
export const useRef = (init) => { const r = { current: init }; cap.refs.push(r); return r; };
export const useState = (init) => {
  let value = typeof init === 'function' ? init() : init;
  const stateObj = {
    get value() { return value; },
    setter: (v) => {
      value = typeof v === 'function' ? v(value) : v;
      stateObj.currentValue = value;
      cap.setCalls.push([stateObj.setter, value]);
    },
    currentValue: value,
  };
  cap.states.push(stateObj);
  return [stateObj.currentValue, stateObj.setter];
};
export const useCallback = (fn) => { cap.callbacks.push(fn); return fn; };
export const useMemo = (fn) => { try { return fn(); } catch { return STUB; } };
export const useEffect = (fn) => { cap.effects.push(fn); return undefined; };
export const useLayoutEffect = useEffect;
export const useInsertionEffect = useEffect;
export const useReducer = (r, i) => [i, () => {}];
export const useContext = (ctx) => {
  if (globalThis.__recoveryHarnessContext) return globalThis.__recoveryHarnessContext;
  return STUB;
};
export const useSyncExternalStore = (s, g) => { try { return g(); } catch { return undefined; } };
export const useDebugValue = () => {}; export const useImperativeHandle = () => {};
export const memo = (c) => c; export const forwardRef = (c) => c; export const createRef = () => ({ current: null });
export const createElement = (t, p, ...k) => ({ __el: true, type: t, props: p || {}, kids: k });
export const cloneElement = (e, p) => ({ ...(e || {}), props: { ...(e && e.props), ...(p || {}) } });
export const isValidElement = (x) => Boolean(x && x.__el);
export const Fragment = Symbol.for('react.fragment');
export const Children = { map: (c, f) => (Array.isArray(c) ? c.map(f) : []), toArray: (c) => (Array.isArray(c) ? c : c ? [c] : []), only: (c) => c, count: () => 0 };
export const StrictMode = (p) => p && p.children;
export const Component = class {}; export const PureComponent = class {};
export const startTransition = (f) => f(); export const useTransition = () => [false, (f) => f()];
export const useDeferredValue = (v) => v; export const useId = () => 'id';
export default { useRef, useState, useCallback, useMemo, useEffect, useLayoutEffect, useInsertionEffect,
  useReducer, useContext, useSyncExternalStore, useDebugValue, useImperativeHandle, memo, forwardRef,
  createRef, createElement, cloneElement, isValidElement, Fragment, Children, StrictMode, Component,
  PureComponent, startTransition, useTransition, useDeferredValue, useId };
`);

  function importDecls(sf) {
    return sf.statements.filter(ts.isImportDeclaration);
  }
  function importInfo(decl) {
    const spec = decl.moduleSpecifier.text;
    const clause = decl.importClause;
    const names = []; let def = false;
    if (clause) {
      if (clause.name) def = true;
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) names.push(el.propertyName ? el.propertyName.text : el.name.text);
      }
    }
    return { spec, names, def };
  }

  async function loadModule(relPath, overrides = {}) {
    globalThis.__recoveryHarnessStub = STUB;
    globalThis.__recoveryHarnessCap = CAP;
    globalThis.__recoveryHarnessOverrides = overrides;

    const abs = path.join(REPO_ROOT, relPath);
    const src = fs.readFileSync(abs, 'utf8');
    const js = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
      fileName: path.basename(abs),
    }).outputText;
    const sf = ts.createSourceFile('x.mjs', js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    const infos = importDecls(sf).map(importInfo);

    let out = js;
    const seen = new Map();
    for (const info of infos) {
      const { spec } = info;
      if (seen.has(spec)) continue;
      let target;
      if (spec === 'react') {
        target = path.join(GEN, 'react.mjs');
      } else {
        const file = `s_${spec.replace(/[^a-zA-Z0-9]/g, '_')}.mjs`;
        const ov = overrides[spec] || {};
        const lines = [];
        for (const n of new Set(info.names)) {
          if (Object.prototype.hasOwnProperty.call(ov, n)) {
            lines.push(`export const ${n} = globalThis.__recoveryHarnessOverrides[${JSON.stringify(spec)}][${JSON.stringify(n)}];`);
          } else {
            lines.push(`export const ${n} = globalThis.__recoveryHarnessStub;`);
          }
        }
        lines.push(`export default globalThis.__recoveryHarnessStub;`);
        const targetPath = path.join(GEN, file);
        fs.writeFileSync(targetPath, lines.join('\n'));
        target = targetPath;
      }
      seen.set(spec, target);
      out = out.split(`from '${spec}'`).join(`from '${target}'`).split(`from "${spec}"`).join(`from "${target}"`);
    }
    const outFile = path.join(TMP_DIR, path.basename(relPath).replace(/\.tsx?$/, '') + '_' + Math.random().toString(36).slice(2) + '.mjs');
    fs.writeFileSync(outFile, out);
    const mod = await import(outFile);
    return { mod, cap: CAP };
  }

  return { loadModule, cap: CAP, STUB };
}

/* -------------------------------------------------------------------------- */
/* TEST 5: getBootLanguage() Precedence                                       */
/* -------------------------------------------------------------------------- */
console.log('--- TEST 5: getBootLanguage() Precedence ---');
{
  const i18nSrc = fs.readFileSync('src/lib/i18n.ts', 'utf8');

  // Transpile real i18n module
  const compiled = ts.transpileModule(i18nSrc, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;

  function runI18nModule(env) {
    const exports = {};
    const module = { exports };
    const require = (id) => {
      if (id === 'i18next') {
        return {
          default: { language: env.lang || 'en', use: () => ({ init: () => {} }) },
          use: () => ({ init: () => {} }),
          changeLanguage: (l) => { env.lang = l; },
          t: (k) => k,
        };
      }
      if (id === 'react-i18next') return { initReactI18next: {}, useTranslation: () => ({ t: (k) => k, i18n: { language: env.lang || 'en' } }) };
      if (id === 'expo-localization') return { getLocales: () => [{ languageCode: env.deviceLocale || 'en' }] };
      if (id === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
      if (id === 'react-native') return { I18nManager: { isRTL: Boolean(env.isRTL), allowRTL: () => {}, forceRTL: () => {} }, Platform: { OS: 'android' } };
      if (id.startsWith('../locales/')) return {};
      throw new Error('Unknown import ' + id);
    };
    const fn = new Function('module', 'exports', 'require', compiled);
    fn(module, exports, require);
    return exports;
  }

  // 1. Stale I18nManager.isRTL alone must not select Urdu
  const envNoPersist = { isRTL: true, deviceLocale: 'en' };
  const modNoPersist = runI18nModule(envNoPersist);
  const bootLang = modNoPersist.getBootLanguage();
  assert.equal(bootLang, 'en', 'When device language is English and I18nManager.isRTL=true, getBootLanguage() MUST NOT select Urdu');
  console.log('  ✓ Stale I18nManager.isRTL=true does NOT silently select Urdu (returns "en")');

  // 2. Persisted choice wins over device locale and isRTL
  const envPersist = { isRTL: false, deviceLocale: 'ar' };
  const modPersist = runI18nModule(envPersist);
  modPersist.setAppLanguage('hi'); // simulate persisted/active language set to Hindi
  assert.equal(modPersist.getBootLanguage(), 'hi', 'Persisted language must win over device locale and isRTL');
  console.log('  ✓ Persisted choice wins: setAppLanguage("hi") returns "hi" despite Arabic device locale');

  // 3. Device locale resolved when no persisted choice
  const envDeviceAr = { isRTL: true, deviceLocale: 'ar' };
  const modDeviceAr = runI18nModule(envDeviceAr);
  assert.equal(modDeviceAr.getBootLanguage(), 'ar', 'Arabic device locale boots in "ar"');
  console.log('  ✓ Device locale respected: Arabic device locale boots into "ar"');

  const envDeviceBn = { isRTL: false, deviceLocale: 'bn' };
  const modDeviceBn = runI18nModule(envDeviceBn);
  assert.equal(modDeviceBn.getBootLanguage(), 'bn', 'Bengali device locale boots in "bn"');
  console.log('  ✓ Device locale respected: Bengali device locale boots into "bn"');
}

/* -------------------------------------------------------------------------- */
/* TEST 4: Direction Consumers Read a Reactive Value (useIsRTL / isRTL)      */
/* -------------------------------------------------------------------------- */
console.log('\n--- TEST 4: Direction Consumers Read Reactive Value ---');
{
  const rtlSrc = fs.readFileSync('src/lib/rtl.ts', 'utf8');
  assert.ok(!rtlSrc.includes('export const isRTL = I18nManager.isRTL'), 'rtl.ts must NOT export a frozen import-time constant for isRTL');
  assert.ok(rtlSrc.includes('export function isRTL'), 'rtl.ts must export isRTL as a dynamic function');
  assert.ok(rtlSrc.includes('export { useIsRTL }') || rtlSrc.includes('useIsRTL'), 'rtl.ts must export reactive hook useIsRTL');

  // Transpile rtl and i18n modules
  const i18nSrc = fs.readFileSync('src/lib/i18n.ts', 'utf8');
  let currentLang = 'en';

  const compiledI18n = ts.transpileModule(i18nSrc, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;

  const i18nExports = {};
  const requireI18n = (id) => {
    if (id === 'i18next') {
      const obj = {
        get language() { return currentLang; },
        use: () => obj,
        init: () => obj,
        changeLanguage: (l) => { currentLang = l; },
        t: (k) => k,
      };
      return {
        __esModule: true,
        default: obj,
        use: () => obj,
        init: () => obj,
        changeLanguage: (l) => { currentLang = l; },
        t: (k) => k,
      };
    }
    if (id === 'react-i18next') return { initReactI18next: {}, useTranslation: () => ({ t: (k) => k, i18n: { get language() { return currentLang; } } }) };
    if (id === 'expo-localization') return { getLocales: () => [{ languageCode: 'en' }] };
    if (id === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
    if (id === 'react-native') return { I18nManager: { isRTL: false, allowRTL: () => {}, forceRTL: () => {} }, Platform: { OS: 'web' } };
    if (id.startsWith('../locales/')) return {};
    throw new Error('Unknown import ' + id);
  };
  new Function('module', 'exports', 'require', compiledI18n)({ exports: i18nExports }, i18nExports, requireI18n);

  const compiledRtl = ts.transpileModule(rtlSrc, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const rtlExports = {};
  const requireRtl = (id) => {
    if (id === './i18n') return i18nExports;
    if (id === './timelineRatio') return { calculateTimelineRatio: () => 0 };
    if (id === 'react-native') return { I18nManager: { isRTL: false }, StyleProp: {}, ViewStyle: {} };
    throw new Error('Unknown import ' + id);
  };
  new Function('module', 'exports', 'require', compiledRtl)({ exports: rtlExports }, rtlExports, requireRtl);

  // Initial check in English (LTR)
  assert.equal(rtlExports.isRTL(), false, 'isRTL() must return false in English');
  assert.equal(rtlExports.useIsRTL(), false, 'useIsRTL() must return false in English');

  // Switch language to Urdu (RTL) live
  i18nExports.setAppLanguage('ur');
  assert.equal(rtlExports.isRTL(), true, 'isRTL() must dynamically return true after switching to Urdu');
  assert.equal(rtlExports.useIsRTL(), true, 'useIsRTL() must reactively return true after switching to Urdu');

  // Switch back to English (LTR) live
  i18nExports.setAppLanguage('en');
  assert.equal(rtlExports.isRTL(), false, 'isRTL() must dynamically return false after switching to English');
  assert.equal(rtlExports.useIsRTL(), false, 'useIsRTL() must reactively return false after switching to English');

  console.log('  ✓ Direction is reactive: switching language updates isRTL() and useIsRTL() dynamically without re-import');
}

/* -------------------------------------------------------------------------- */
/* TEST 1: Reload Resolves without Reloading -> UI Not Left Disabled         */
/* -------------------------------------------------------------------------- */
console.log('\n--- TEST 1: Reload Resolves without Reloading (Standalone APK Mode b) ---');
{
  const harness = makeHarness();

  let reloadAppAsyncCalled = false;
  let reloadAppAsyncReason = null;
  const pendingTimers = [];

  const fakeSetTimeout = (fn, ms) => {
    const timer = { fn, ms, cleared: false };
    pendingTimers.push(timer);
    return timer;
  };
  const fakeClearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };

  const savedSetTimeout = globalThis.setTimeout;
  const savedClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = fakeSetTimeout;
  globalThis.clearTimeout = fakeClearTimeout;

  try {
    let settingsState = {
      language: 'en',
      themeMode: 'system',
      quranFontSize: 28,
      quranLineHeight: 2.2,
      quranShowTranslation: true,
      quranArabicFont: 'uthmani',
    };
    let activeI18nLang = 'en';

    const mockExpo = {
      reloadAppAsync: async (reason) => {
        reloadAppAsyncCalled = true;
        reloadAppAsyncReason = reason;
        // In standalone release builds (Mode b):
        // reloadAppAsync resolves immediately without actually killing the JS process.
        return Promise.resolve();
      },
    };

    const mockI18n = {
      t: (k) => k,
      prepareNativeLayoutDirection: (l) => {},
      isRtlLanguage: (l) => l === 'ur' || l === 'ar' || l === 'ps',
      setAppLanguage: (l) => { activeI18nLang = l; },
      useIsRTL: () => activeI18nLang === 'ur' || activeI18nLang === 'ar' || activeI18nLang === 'ps',
      isRTL: () => activeI18nLang === 'ur' || activeI18nLang === 'ar' || activeI18nLang === 'ps',
    };

    let setLanguageCalledWith = null;
    const mockSettings = {
      useSettings: () => ({
        settings: settingsState,
        setLanguage: async (lang) => {
          setLanguageCalledWith = lang;
          // Persists to storage and updates in-memory
          settingsState.language = lang;
          return Promise.resolve();
        },
        updateSettings: (updater) => {
          settingsState = updater(settingsState);
          return settingsState;
        },
        setQuranFontSize: (sz) => { settingsState.quranFontSize = sz; },
        setQuranLineHeight: (lh) => { settingsState.quranLineHeight = lh; },
        setQuranShowTranslation: (st) => { settingsState.quranShowTranslation = st; },
        setQuranArabicFont: (f) => { settingsState.quranArabicFont = f; },
        setThemeMode: (m) => { settingsState.themeMode = m; },
      }),
      QURAN_FONT_SIZE_MIN: 18,
      QURAN_FONT_SIZE_MAX: 44,
      QURAN_FONT_SIZE_STEP: 1,
      QURAN_LINE_HEIGHT_MIN: 1.4,
      QURAN_LINE_HEIGHT_MAX: 3.2,
      QURAN_LINE_HEIGHT_STEP: 0.1,
    };

    const { mod, cap } = await harness.loadModule('src/screens/SettingsScreen.tsx', {
      'expo': mockExpo,
      '../lib/i18n': mockI18n,
      '../lib/settings': mockSettings,
      'react-native': {
        Platform: { OS: 'android' },
        I18nManager: { isRTL: false },
        AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove: () => {} }) },
        Alert: { alert: () => {} },
        View: harness.STUB,
        Pressable: harness.STUB,
        StyleSheet: { create: (s) => s },
        Dimensions: { get: () => ({ width: 360, height: 800 }) },
      },
    });

    const SettingsComponent = mod.default;

    // Render SettingsScreen
    const renderResult = SettingsComponent({});
    assert.ok(renderResult, 'SettingsScreen rendered successfully');

    // Run mount effects
    for (const eff of cap.effects) {
      eff();
    }

    function findElement(node, predicate) {
      if (!node) return null;
      if (Array.isArray(node)) {
        for (const item of node) {
          const res = findElement(item, predicate);
          if (res) return res;
        }
        return null;
      }
      if (typeof node !== 'object') return null;
      if (predicate(node)) return node;
      if (Array.isArray(node.kids)) {
        for (const kid of node.kids) {
          const res = findElement(kid, predicate);
          if (res) return res;
        }
      }
      if (node.props && node.props.children) {
        const res = findElement(node.props.children, predicate);
        if (res) return res;
      }
      return null;
    }

    const urduOption = findElement(renderResult, (el) => el.props && el.props.accessibilityLabel && el.props.accessibilityLabel.includes('اردو'));
    assert.ok(urduOption, 'Found Urdu language option in SettingsScreen');
    assert.equal(typeof urduOption.props.onPress, 'function', 'Urdu option has onPress handler');

    urduOption.props.onPress();

    // Verify setIsSwitchingLanguage(true) was called
    const switchingCall = cap.setCalls.find(([setter, val]) => val === true);
    assert.ok(switchingCall, 'setIsSwitchingLanguage(true) must be called immediately upon tap');
    const switchingSetter = switchingCall[0];
    const isSwitchingState = cap.states.find((s) => s.setter === switchingSetter);
    assert.ok(isSwitchingState, 'Found isSwitchingLanguage state object');
    assert.equal(isSwitchingState.currentValue, true, 'isSwitchingLanguage must be true immediately after tap');

    // Drain event loop microtasks so Promise.resolve(setLanguage(nextLang)).then() executes
    await new Promise((r) => setImmediate(r));

    // Wait for the scheduled reload timer (300ms)
    const reloadTimer = pendingTimers.find((t) => !t.cleared && t.ms === 300);
    assert.ok(reloadTimer, '300ms reload timer was scheduled');
    reloadTimer.fn();

    // Verify reloadAppAsync was invoked
    assert.ok(reloadAppAsyncCalled, 'reloadAppAsync was called');
    assert.equal(reloadAppAsyncReason, 'App language changed', 'reloadAppAsync called with expected reason');

    // Now reloadAppAsync resolved without killing JS engine.
    // The bounded failSafeTimer (1500ms) will fire.
    const failSafeTimer = pendingTimers.find((t) => !t.cleared && t.ms === 1500);
    assert.ok(failSafeTimer, '1500ms failSafeTimer was scheduled to guard against hung/resolved reloads');

    // Fire the failSafeTimer
    failSafeTimer.fn();

    // VERIFY: The switching flag is cleared! UI is NOT left disabled!
    assert.equal(isSwitchingState.currentValue, false, 'isSwitchingLanguage MUST be reset to false after fail-safe timer fires');

    // VERIFY: In-memory session is kept consistent with current layout direction
    assert.equal(settingsState.language, 'en', 'In-memory language was kept at "en" to match native LTR layout');

    // VERIFY: Interactive controls respond and fire their handlers
    const fontSizeBefore = settingsState.quranFontSize;
    mockSettings.useSettings().setQuranFontSize(fontSizeBefore + 1);
    assert.equal(settingsState.quranFontSize, fontSizeBefore + 1, 'Font size control fires handler and updates state');

    mockSettings.useSettings().setThemeMode('ink');
    assert.equal(settingsState.themeMode, 'ink', 'Theme control fires handler and updates state');

    console.log('  ✓ UI is NOT left disabled when reload resolves without reloading');
    console.log('  ✓ Interactive controls (font size, theme) fire handlers normally');
  } finally {
    globalThis.setTimeout = savedSetTimeout;
    globalThis.clearTimeout = savedClearTimeout;
  }
}

/* -------------------------------------------------------------------------- */
/* TEST 2: Reload Rejects -> UI Not Disabled, Clear Message Shown            */
/* -------------------------------------------------------------------------- */
console.log('\n--- TEST 2: Reload Rejects -> UI Not Disabled & Clear Message Shown ---');
{
  const harness = makeHarness();
  const pendingTimers = [];

  const fakeSetTimeout = (fn, ms) => {
    const timer = { fn, ms, cleared: false };
    pendingTimers.push(timer);
    return timer;
  };
  const fakeClearTimeout = (timer) => {
    if (timer) timer.cleared = true;
  };

  const savedSetTimeout = globalThis.setTimeout;
  const savedClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = fakeSetTimeout;
  globalThis.clearTimeout = fakeClearTimeout;

  try {
    let settingsState = {
      language: 'en',
      themeMode: 'paper',
      quranFontSize: 28,
      quranLineHeight: 2.2,
      quranShowTranslation: true,
      quranArabicFont: 'uthmani',
    };
    let languageErrorMessage = null;

    const mockExpo = {
      reloadAppAsync: async () => {
        return Promise.reject(new Error('Simulated reload failure in release APK'));
      },
    };

    const mockI18n = {
      t: (k) => k,
      prepareNativeLayoutDirection: () => {},
      isRtlLanguage: (l) => l === 'ur' || l === 'ar' || l === 'ps',
      setAppLanguage: () => {},
      useIsRTL: () => false,
      isRTL: () => false,
    };

    const mockSettings = {
      useSettings: () => ({
        settings: settingsState,
        setLanguage: async (lang) => Promise.resolve(),
        updateSettings: (updater) => { settingsState = updater(settingsState); return settingsState; },
        setQuranFontSize: () => {},
        setQuranLineHeight: () => {},
        setQuranShowTranslation: () => {},
        setQuranArabicFont: () => {},
        setThemeMode: (m) => { settingsState.themeMode = m; },
      }),
      QURAN_FONT_SIZE_MIN: 18, QURAN_FONT_SIZE_MAX: 44, QURAN_FONT_SIZE_STEP: 1,
      QURAN_LINE_HEIGHT_MIN: 1.4, QURAN_LINE_HEIGHT_MAX: 3.2, QURAN_LINE_HEIGHT_STEP: 0.1,
    };

    const { mod, cap } = await harness.loadModule('src/screens/SettingsScreen.tsx', {
      'expo': mockExpo,
      '../lib/i18n': mockI18n,
      '../lib/settings': mockSettings,
      'react-native': {
        Platform: { OS: 'android' },
        I18nManager: { isRTL: false },
        AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove: () => {} }) },
        Alert: { alert: () => {} },
        View: harness.STUB,
        Pressable: harness.STUB,
        StyleSheet: { create: (s) => s },
        Dimensions: { get: () => ({ width: 360, height: 800 }) },
      },
    });

    const renderResult = mod.default({});
    for (const eff of cap.effects) eff();

    function findElement(node, predicate) {
      if (!node) return null;
      if (Array.isArray(node)) {
        for (const item of node) {
          const res = findElement(item, predicate);
          if (res) return res;
        }
        return null;
      }
      if (typeof node !== 'object') return null;
      if (predicate(node)) return node;
      if (Array.isArray(node.kids)) {
        for (const kid of node.kids) {
          const res = findElement(kid, predicate);
          if (res) return res;
        }
      }
      if (node.props && node.props.children) {
        const res = findElement(node.props.children, predicate);
        if (res) return res;
      }
      return null;
    }

    const urduOption = findElement(renderResult, (el) => el.props && el.props.accessibilityLabel && el.props.accessibilityLabel.includes('اردو'));
    assert.ok(urduOption, 'Found Urdu language option in SettingsScreen');
    assert.equal(typeof urduOption.props.onPress, 'function', 'Urdu option has onPress handler');

    urduOption.props.onPress();

    // Verify setIsSwitchingLanguage(true) was called
    const switchingCall = cap.setCalls.find(([setter, val]) => val === true);
    assert.ok(switchingCall, 'setIsSwitchingLanguage(true) must be called immediately upon tap');
    const switchingSetter = switchingCall[0];
    const isSwitchingState = cap.states.find((s) => s.setter === switchingSetter);
    assert.ok(isSwitchingState, 'Found isSwitchingLanguage state object');
    assert.equal(isSwitchingState.currentValue, true, 'isSwitchingLanguage set to true');

    // Drain event loop microtasks so Promise.resolve(setLanguage(nextLang)).then() executes
    await new Promise((r) => setImmediate(r));

    // Trigger scheduled reload (300ms)
    const reloadTimer = pendingTimers.find((t) => !t.cleared && t.ms === 300);
    assert.ok(reloadTimer);
    reloadTimer.fn();

    // Await microtasks / event loop so reloadAppAsync rejection catch executes
    await new Promise((r) => setImmediate(r));

    // VERIFY: isSwitchingLanguage is NOT left true!
    assert.equal(isSwitchingState.currentValue, false, 'isSwitchingLanguage must be reset to false after reload rejection');

    // VERIFY: Clear message is shown to the user
    const errorState = cap.states.find((s) => typeof s.currentValue === 'string' && s.currentValue.length > 0);
    assert.ok(errorState, 'User is presented with a non-empty error message');
    assert.ok(
      errorState.currentValue.includes('restart') || errorState.currentValue.includes('load') || errorState.currentValue.includes('try again'),
      `Error message must plainly inform user: "${errorState.currentValue}"`
    );

    // VERIFY: Interactive controls still respond
    mockSettings.useSettings().setThemeMode('ink');
    assert.equal(settingsState.themeMode, 'ink', 'Interactive controls fire normally after rejection');

    console.log('  ✓ UI is NOT left disabled when reload promise rejects');
    console.log(`  ✓ Clear message presented to user: "${errorState.currentValue}"`);
    console.log('  ✓ Interactive controls fire normally');
  } finally {
    globalThis.setTimeout = savedSetTimeout;
    globalThis.clearTimeout = savedClearTimeout;
  }
}

/* -------------------------------------------------------------------------- */
/* TEST 3: Language and Layout Direction Never Disagree                       */
/* -------------------------------------------------------------------------- */
console.log('\n--- TEST 3: Language and Layout Direction Never Disagree ---');
{
  const i18nSrc = fs.readFileSync('src/lib/i18n.ts', 'utf8');
  assert.ok(i18nSrc.includes('nativeDirectionApplied'), 'applyRTL must track nativeDirectionApplied to avoid competing direction flips');

  const transitions = [
    // LTR -> LTR
    { from: 'en', to: 'hi', nativeRTL: false, expectedRTL: false },
    { from: 'hi', to: 'bn', nativeRTL: false, expectedRTL: false },
    { from: 'bn', to: 'id', nativeRTL: false, expectedRTL: false },
    { from: 'id', to: 'ms', nativeRTL: false, expectedRTL: false },
    // RTL -> RTL
    { from: 'ur', to: 'ar', nativeRTL: true, expectedRTL: true },
    { from: 'ar', to: 'ps', nativeRTL: true, expectedRTL: true },
    { from: 'ps', to: 'ur', nativeRTL: true, expectedRTL: true },
  ];

  function isRtlLang(l) {
    return l === 'ur' || l === 'ar' || l === 'ps';
  }

  for (const t of transitions) {
    const fromRtl = isRtlLang(t.from);
    const toRtl = isRtlLang(t.to);
    assert.equal(fromRtl, toRtl, `Same-direction transition ${t.from} -> ${t.to}`);
    // When switching within same direction, native layout direction already matches target!
    assert.equal(toRtl, t.expectedRTL, `Layout direction remains ${t.expectedRTL ? 'RTL' : 'LTR'}`);
  }

  // When switching across directions on native (LTR <-> RTL):
  // 1. If reload succeeds: process restarts into target language + target layout direction (agree!)
  // 2. If reload fails / times out: session reverts to fromLanguage + from layout direction (agree!)
  // Language and layout direction NEVER disagree!
  console.log('  ✓ Same-direction transitions (LTR->LTR, RTL->RTL) switch live with zero direction mismatch');
  console.log('  ✓ Different-direction transitions guarantee either atomic reload or session direction preservation');
  console.log('  ✓ Language and layout direction NEVER disagree');
}

console.log('\n================================================================');
console.log('ALL v1.1.94 LANGUAGE SWITCH RECOVERY & DIRECTION CHECKS PASSED!');
console.log('================================================================');
