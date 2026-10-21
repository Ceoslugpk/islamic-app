import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/ToolsScreen.tsx');

function loadToolsModule() {
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
    currentState: 'active',
    addEventListener(type, listener) {
      assert.equal(type, 'change');
      appStateListener = listener;
      return { remove() { if (appStateListener === listener) appStateListener = null; } };
    },
  };

  const effectSlots = new Map();
  const pendingEffects = [];
  const stateValues = [];
  let hookIndex = 0;
  const runner = {
    useState(initial) {
      const index = hookIndex++;
      if (!(index in stateValues)) stateValues[index] = typeof initial === 'function' ? initial() : initial;
      return [stateValues[index], (next) => {
        stateValues[index] = typeof next === 'function' ? next(stateValues[index]) : next;
      }];
    },
    useEffect(effect) {
      const index = hookIndex++;
      if (!effectSlots.has(index)) {
        effectSlots.set(index, effect);
        pendingEffects.push(effect);
      }
    },
    render(moduleObject) {
      hookIndex = 0;
      return moduleObject.exports.useTodayIso();
    },
    flushEffects() {
      return pendingEffects.splice(0).map((effect) => effect());
    },
    setNow(date) {
      currentMs = date.getTime();
    },
    getTimer(id) {
      return timers.get(id);
    },
    getTimerIds() {
      return [...timers.keys()];
    },
    get appStateListener() {
      return appStateListener;
    },
  };

  const React = {
    __esModule: true,
    default: { memo: (component) => component, createElement: () => null },
    useState: (...args) => runner.useState(...args),
    useEffect: (...args) => runner.useEffect(...args),
    useMemo: (factory) => factory(),
  };
  const rn = {
    AppState,
    Pressable: 'Pressable',
    StyleSheet: {
      absoluteFill: {},
      create: (styles) => styles,
    },
    View: 'View',
    useWindowDimensions: () => ({ width: 390 }),
    AccessibilityRole: {},
    Animated: {},
    AccessibilityInfo: {},
  };
  const fallback = new Proxy({}, { get: () => () => null });
  const dateKeyOutput = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.join(ROOT, 'src/lib/dateKey.ts'),
  }).outputText;
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
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Path' },
    '@expo/vector-icons': { Ionicons: { glyphMap: {} } },
    '../lib/dateKey': dateKeyObject.exports,
    '../lib/homeThemeTokens': {
      HOME_THEME_TOKENS: { hero: { outerBorder: '#111', innerBorder: '#222' } },
      getCardShadow: () => ({}),
      getHeroCardShadow: () => ({}),
    },
    '../theme/tokens': {
      themeTokens: { paper: { gold: '#b8862f' }, ink: {}, },
      GOLD_GRADIENT: ['#b8862f', '#b8862f'],
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
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
    setInterval,
    clearInterval,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: SOURCE });
  return { moduleObject, runner };
}

process.env.TZ = 'Asia/Karachi';
const { moduleObject, runner } = loadToolsModule();
assert.equal(typeof moduleObject.exports.useTodayIso, 'function', 'Tools must expose the production today-date hook');

const initial = runner.render(moduleObject);
assert.equal(initial, '2026-10-20');
runner.flushEffects();
const firstTimerId = runner.getTimerIds()[0];
assert.ok(firstTimerId, 'the production hook must schedule a local-midnight refresh');

runner.setNow(new Date(2026, 9, 21, 0, 1, 0));
assert.equal(typeof runner.appStateListener, 'function', 'the production hook must observe foreground resume');
runner.appStateListener('active');
assert.equal(runner.getTimerIds().length, 1, 'foreground refresh must replace, not duplicate, the midnight timer');
assert.equal(runner.render(moduleObject), '2026-10-21', 'foreground resume must re-derive the local date key');

runner.setNow(new Date(2026, 9, 22, 0, 1, 0));
const nextTimerId = runner.getTimerIds()[0];
runner.getTimer(nextTimerId).callback();
assert.equal(runner.render(moduleObject), '2026-10-22', 'the scheduled date boundary must re-derive the local date key');

console.log('v1.1.96 Tools today-rollover production test passed');
