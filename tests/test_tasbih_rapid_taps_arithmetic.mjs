/**
 * Rapid-tap arithmetic regression — TasbihScreen "Today" total.
 *
 * Executes the REAL production module (transpiled) and invokes the REAL
 * `handleTap` closure captured from the binding Pressable element returned by a
 * render. Three taps are fired before any commit — React's closure semantics:
 * the callback reference from the last render is reused. Reproduces the report's
 * scenario (stale closure under-counts to 11; correct code reaches 13).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/TasbihScreen.tsx');
process.env.TZ = 'Asia/Karachi';

const NOW = new Date(2026, 9, 21, 12, 0, 0);
const TODAY = '2026-10-21';

function loadTasbih() {
  const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: SOURCE,
  }).outputText;

  const nowMs = NOW.getTime();
  const RealDate = Date;
  class ControlledDate extends RealDate {
    constructor(...args) {
      super(args.length === 0 ? nowMs : args.length === 1 ? args[0] : args);
    }
    static now() {
      return nowMs;
    }
  }

  const dayTotals = new Map();
  const db = {
    saveTasbihCountAsync: async () => {},
    loadTasbihCounts: () => ({}),
    saveTasbihDayTotalAsync: async (date, delta) => {
      dayTotals.set(date, Math.max(0, (dayTotals.get(date) || 0) + delta));
    },
    saveTasbihDayTotal: (date, delta) => {
      dayTotals.set(date, Math.max(0, (dayTotals.get(date) || 0) + delta));
    },
    loadTasbihDayTotal: (date) => dayTotals.get(date) || 0,
  };

  // Faithful hook store: a render re-runs the component body with hooks reading
  // the stored values; taps fired with no intervening render reuse the previous
  // callback reference (the stale-closure condition).
  const hooks = [];
  const refs = [];
  let hookIndex = 0;
  let created = [];
  const React = {
    __esModule: true,
    default: {
      createElement: (type, props, ...children) => {
        const element = { type, props: props || {}, children };
        created.push(element);
        return element;
      },
      memo: (c) => c,
    },
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], (next) => {
        hooks[index] = typeof next === 'function' ? next(hooks[index]) : next;
      }];
    },
    useEffect() {
      hookIndex++;
    },
    useCallback: (callback) => callback,
    useRef(initial) {
      const index = hookIndex++;
      if (!(index in refs)) refs[index] = { current: initial };
      return refs[index];
    },
  };

  const rn = {
    AppState: { addEventListener: () => ({ remove() {} }) },
    StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    View: 'View',
    TouchableOpacity: 'TouchableOpacity',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    useWindowDimensions: () => ({ width: 390 }),
  };
  const fallback = new Proxy({}, { get: () => () => null });
  const dateKeyOutput = ts.transpileModule(
    fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: path.join(ROOT, 'src/lib/dateKey.ts'),
    },
  ).outputText;
  const dateKeyObject = { exports: {} };
  const dateKeySandbox = {
    module: dateKeyObject,
    exports: dateKeyObject.exports,
    require: () => fallback,
    console,
    Date: ControlledDate,
  };
  vm.createContext(dateKeySandbox);
  vm.runInContext(dateKeyOutput, dateKeySandbox, { filename: 'dateKey.ts' });

  const modules = {
    react: React,
    'react-native': rn,
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '../lib/db': db,
    '../lib/dateKey': dateKeyObject.exports,
    '../theme/tokens': { useThemeTokens: () => ({ tokens: { bgTop: '#fff', gold: '#b8862f', cardTop: '#fff', cardBorder: '#eee', ringFill: '#eee', ringBorder: '#eee', text: '#000', muted: '#888', onGold: '#fff' }, mode: 'paper' }) },
    '../lib/homeThemeTokens': { getCardShadow: () => ({}), getPillShadow: () => ({}) },
    '../lib/haptics': { useHaptics: () => ({ haptic: () => {} }) },
    '../lib/i18n': { getCurrentLanguage: () => 'en', t: (key) => key },
    '../lib/rtl': { hScrollRTLStyle: () => ({}) },
    // Passthrough so the default export is the bare screen component.
    '../lib/undoToast': {
      useUndoToast: () => ({ saveUndoState: () => {} }),
      withUndoToast: (component) => component,
    },
  };
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => modules[request] || fallback,
    console,
    process,
    Date: ControlledDate,
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: SOURCE });

  const Component = moduleObject.exports.default;

  // A render re-runs the body. The counter Pressable's onPress is the live
  // handleTap for that render; the "Today" summary numeral is the AppText whose
  // children is a bare number (the summary card renders `<AppText ...>{todayTotal}</AppText>`).
  function render() {
    hookIndex = 0;
    created = [];
    Component({});
    const counter = created.find((el) => el.props && el.props.testID === 'tasbih-counter-button');
    assert.ok(counter, 'render must produce the Tasbih counter Pressable');
    const summary = created.find(
      (el) => el.props
        && el.props.style
        && el.props.style.fontSize === 24
        && Array.isArray(el.children)
        && el.children.length === 1
        && typeof el.children[0] === 'number',
    );
    return {
      onPress: counter.props.onPress,
      displayedToday: summary ? summary.children[0] : undefined,
    };
  }

  return {
    Component,
    dayTotals,
    render,
  };
}

const t = loadTasbih();
assert.equal(typeof t.Component, 'function', 'TasbihScreen default export must be callable');

// Seed the persisted "Today" total at 10 and render once.
t.dayTotals.set(TODAY, 10);
const first = t.render();
assert.equal(typeof first.onPress, 'function', 'the counter Pressable must bind a tap handler');
assert.equal(first.displayedToday, 10, 'the rendered Today total must start at the seeded 10');

// Fire three rapid taps using the SAME captured callback (no re-render between).
first.onPress();
first.onPress();
first.onPress();

// The persisted day row must be correct: 10 + 3 = 13.
assert.equal(
  t.dayTotals.get(TODAY),
  13,
  `3 rapid taps must persist day total 10 -> 13 (got ${t.dayTotals.get(TODAY)})`,
);

// The next render must DISPLAY 13 (state advanced to the latest ref value,
// not the stale closure's 11).
const after = t.render();
assert.equal(after.displayedToday, 13, `displayed Today after 3 rapid taps must be 13 (got ${after.displayedToday})`);

console.log('Tasbih rapid-tap arithmetic test passed: day total 10 -> 13 after 3 fast taps');
