/**
 * Midnight-rollover regression — VocabTrainerScreen (finding b4-F7).
 *
 * Guarantee proven by executing the REAL production module:
 *  - "TODAY'S WORD" is re-derived when the local day changes; it is not frozen
 *    on the value captured at mount. The screen feeds the reactive local day
 *    into getDailyWord/getDailyWords, and the underlying selection is genuinely
 *    day-dependent (day A and day B pick different words).
 *
 * Run: node tests/test_midnight_vocab_daily.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/VocabTrainerScreen.tsx');
process.env.TZ = 'Asia/Karachi';

/* ── Part A: the underlying selection is genuinely day-dependent ─────────── */

function loadVocab() {
  const output = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'src/lib/vocab.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: path.join(ROOT, 'src/lib/vocab.ts'),
  }).outputText;
  const moduleObject = { exports: {} };
  const sandbox = { module: moduleObject, exports: moduleObject.exports, require: () => ({}), console };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: 'vocab.ts' });
  return moduleObject.exports;
}

const DAILY_A = '2026-10-20';
const DAILY_B = '2026-10-21';
const vocabReal = loadVocab();
const wordA = vocabReal.getDailyWord(new Date(`${DAILY_A}T12:00:00`));
const wordB = vocabReal.getDailyWord(new Date(`${DAILY_B}T12:00:00`));
assert.notEqual(wordA.arabic, wordB.arabic, 'guard: the real daily-word selection must differ between two adjacent days');

/* ── Part B: the screen re-derives the daily word on day rollover ────────── */

function loadScreen() {
  const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: SOURCE,
  }).outputText;

  let currentMs = new Date(2026, 9, 20, 23, 58, 0).getTime();
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

  const dailyWordDates = [];
  const realVocab = loadVocab();
  const vocabModule = {
    VOCAB_WORDS: realVocab.VOCAB_WORDS,
    TIER_LABELS: realVocab.TIER_LABELS,
    VocabWord: undefined,
    getDailyWord: (date) => {
      dailyWordDates.push(date);
      return realVocab.getDailyWord(date);
    },
    getDailyWords: (count, date) => realVocab.getDailyWords(count, date),
  };

  const stateSlots = [];
  const effectSlots = new Set();
  const pendingEffects = [];
  let hookIndex = 0;
  const React = {
    __esModule: true,
    default: { createElement: () => null, memo: (c) => c, Fragment: 'Fragment' },
    useState(initial) {
      const index = hookIndex++;
      if (!(index in stateSlots)) stateSlots[index] = typeof initial === 'function' ? initial() : initial;
      return [stateSlots[index], (next) => {
        stateSlots[index] = typeof next === 'function' ? next(stateSlots[index]) : next;
      }];
    },
    useEffect(effect) {
      const index = hookIndex++;
      if (!effectSlots.has(index)) {
        effectSlots.add(index);
        pendingEffects.push(effect);
      }
    },
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
  };
  const rn = {
    StyleSheet: { create: (styles) => styles },
    View: 'View',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    AppState,
    useWindowDimensions: () => ({ width: 390 }),
  };
  const deep = new Proxy(function () {}, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? () => '' : deep),
    apply: () => deep,
    has: () => true,
  });
  const fallback = new Proxy({}, { get: () => () => null });
  const dateKeyOutput = ts.transpileModule(
    fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: path.join(ROOT, 'src/lib/dateKey.ts'),
    },
  ).outputText;
  const dateKeyObject = { exports: {} };
  const dateKeySandbox = { module: dateKeyObject, exports: dateKeyObject.exports, require: () => fallback, console, Date: ControlledDate };
  vm.createContext(dateKeySandbox);
  vm.runInContext(dateKeyOutput, dateKeySandbox, { filename: 'dateKey.ts' });

  const modules = {
    react: React,
    'react-native': rn,
    'react-i18next': { useTranslation: () => ({ t: (k) => k }) },
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
    '../lib/vocab': vocabModule,
    '../lib/dateKey': dateKeyObject.exports,
    '../components/ui': { PremiumCard: 'PremiumCard' },
    '../theme/tokens': { useThemeTokens: () => ({ tokens: new Proxy({}, { get: () => '#000' }), mode: 'paper' }), cardTokens: { borderWidth: 1 } },
    '../lib/homeThemeTokens': { getPillShadow: () => ({}) },
    '../lib/rtl': { hScrollRTLStyle: () => ({}) },
    '../lib/iconMap': { getBackIcon: () => 'chevron', getForwardIcon: () => 'chevron' },
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
    globalThis: undefined,
    __DEV__: false,
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: SOURCE });

  return {
    exports: moduleObject.exports,
    dailyWordDates,
    render() {
      hookIndex = 0;
      moduleObject.exports.VocabTrainerScreen({ onBack: () => {}, backLabel: 'Library' });
    },
    flushEffects() {
      return pendingEffects.splice(0).map((effect) => effect());
    },
    setNow(date) {
      currentMs = date.getTime();
    },
    getTimerIds() {
      return [...timers.keys()];
    },
    getTimer(id) {
      return timers.get(id);
    },
    get appStateListener() {
      return appStateListener;
    },
  };
}

const screen = loadScreen();
assert.equal(typeof screen.exports.VocabTrainerScreen, 'function', 'the screen must be exported');

screen.render();
screen.flushEffects();
const firstDate = screen.dailyWordDates[screen.dailyWordDates.length - 1];
assert.equal(
  new Date(firstDate).getDate(),
  20,
  'the initial "TODAY\'S WORD" must be derived from the current local day (Oct 20)',
);

// Local midnight passes while the screen stays mounted.
screen.setNow(new Date(2026, 9, 21, 0, 2, 0));
assert.equal(typeof screen.appStateListener, 'function', 'the screen must observe foreground resume to refresh the day');
screen.appStateListener('active');
screen.render();

const afterDates = screen.dailyWordDates.slice(-2);
const lastDate = afterDates[afterDates.length - 1];
assert.equal(
  new Date(lastDate).getDate(),
  21,
  'after the local day rolls over, "TODAY\'S WORD" must be re-derived from the NEW day (Oct 21)',
);
const frozenWord = vocabReal.getDailyWord(new Date('2026-10-20T12:00:00'));
const rolledWord = vocabReal.getDailyWord(lastDate);
assert.notEqual(
  rolledWord.arabic,
  frozenWord.arabic,
  'the displayed word must actually change when the day changes',
);

console.log('midnight VocabTrainer daily-word production test passed');
