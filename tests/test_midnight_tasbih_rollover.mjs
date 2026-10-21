/**
 * Midnight-rollover regression — TasbihScreen (findings b4-F5 / verifier M1).
 *
 * Guarantees proven by executing the REAL production module:
 *  1. A tap after the local day advances is credited to the NEW day's key, and
 *     the displayed "Today" total is re-based to the new day instead of carrying
 *     yesterday's cumulative value.
 *  2. The reactive day-key hook re-derives at local midnight and on foreground
 *     resume.
 *  3. The one-time migration adopts a pre-existing UTC-keyed day total into the
 *     local key (and moves, not copies, the legacy row).
 *
 * TZ=Asia/Karachi (UTC+5) makes the device-local day differ from the UTC day.
 *
 * Run: node tests/test_midnight_tasbih_rollover.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/TasbihScreen.tsx');
process.env.TZ = 'Asia/Karachi';

const YESTERDAY_LOCAL = '2026-10-20';
const TODAY_LOCAL = '2026-10-21';
const LEGACY_UTC_FOR_TODAY = '2026-10-20';

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

  let currentMs = new Date(2026, 9, 21, 2, 0, 0).getTime();
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

  const dayTotals = new Map();
  const savedWrites = [];
  const db = {
    saveTasbihCountAsync: async () => {},
    loadTasbihCounts: () => ({}),
    saveTasbihDayTotalAsync: async (date, delta) => {
      savedWrites.push({ date, delta });
      dayTotals.set(date, (dayTotals.get(date) || 0) + delta);
    },
    saveTasbihDayTotal: (date, delta) => {
      dayTotals.set(date, (dayTotals.get(date) || 0) + delta);
    },
    loadTasbihDayTotal: (date) => dayTotals.get(date) || 0,
  };

  const stateSlots = [];
  const effectSlots = new Set();
  const pendingEffects = [];
  let hookIndex = 0;
  const React = {
    __esModule: true,
    default: { createElement: () => null, memo: (c) => c },
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
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
  };
  const rn = {
    StyleSheet: { create: (styles) => styles },
    View: 'View',
    TouchableOpacity: 'TouchableOpacity',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    AppState,
    useWindowDimensions: () => ({ width: 390 }),
  };
  const fallback = new Proxy({}, { get: () => () => null });
  const dateKeyOutput = ts.transpileModule(
    fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
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
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: SOURCE });
  return {
    exports: moduleObject.exports,
    dayTotals,
    savedWrites,
    renderHook() {
      hookIndex = 0;
      return moduleObject.exports.useTasbihTodayKey
        ? moduleObject.exports.useTasbihTodayKey()
        : undefined;
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

/* ── 1. First tap after local midnight lands on the NEW day ─────────────── */

{
  const t = loadTasbih();
  assert.equal(typeof t.exports.computeTasbihTapRollover, 'function', 'Tasbih must expose the production rollover resolver');

  // State as it was at 23:59 the previous local day.
  const rollover = t.exports.computeTasbihTapRollover({
    stateKey: YESTERDAY_LOCAL,
    stateTotal: 5,
    now: new Date(2026, 9, 21, 0, 1, 0),
  });

  assert.equal(rollover.rolled, true, 'advancing the local day must be recognised as a rollover');
  assert.equal(rollover.key, TODAY_LOCAL, 'the post-midnight tap must be keyed to the NEW local day');
  assert.equal(
    rollover.nextTotal,
    1,
    'the displayed Today total must re-base to the new day, not carry yesterday\'s value',
  );
  assert.notEqual(rollover.nextTotal, 6, 'yesterday\'s total must NOT be carried across midnight');
}

/* ── 2. The reactive day key re-derives at midnight / foreground resume ──── */

{
  const t = loadTasbih();
  assert.equal(typeof t.exports.useTasbihTodayKey, 'function', 'Tasbih must expose its reactive day-key hook');

  const initial = t.renderHook();
  assert.equal(initial, TODAY_LOCAL, 'the hook must start on the current local day');
  t.flushEffects();
  const firstTimerId = t.getTimerIds()[0];
  assert.ok(firstTimerId, 'the hook must schedule a local-midnight refresh');

  // Local midnight passes: the scheduled boundary callback must re-derive.
  t.setNow(new Date(2026, 9, 22, 0, 0, 5));
  const nextTimerId = t.getTimerIds()[0];
  t.getTimer(nextTimerId).callback();
  assert.equal(t.renderHook(), '2026-10-22', 'the scheduled midnight boundary must re-derive the local day key');

  // Foreground resume after sleeping through midnight must also re-derive.
  t.setNow(new Date(2026, 9, 23, 0, 5, 0));
  assert.equal(typeof t.appStateListener, 'function', 'the hook must observe foreground resume');
  t.appStateListener('active');
  assert.equal(t.renderHook(), '2026-10-23', 'foreground resume must re-derive the local day key');
}

/* ── 3. One-time migration adopts a pre-existing UTC-keyed day total ─────── */

{
  const t = loadTasbih();
  assert.equal(typeof t.exports.loadTasbihDayTotalWithMigration, 'function', 'Tasbih must expose its migration read path');

  // The old app persisted the in-progress total under the UTC date.
  t.dayTotals.set(LEGACY_UTC_FOR_TODAY, 5);

  const adopted = t.exports.loadTasbihDayTotalWithMigration(TODAY_LOCAL, new Date(2026, 9, 21, 2, 0, 0));
  assert.equal(adopted, 5, 'the pre-existing UTC-keyed total must be adopted, not lost');
  assert.equal(t.dayTotals.get(TODAY_LOCAL), 5, 'the adopted total must now live under the local key');
  assert.equal(t.dayTotals.get(LEGACY_UTC_FOR_TODAY), 0, 'the legacy row must be moved (zeroed), not left to double-count');

  // A second read must not re-adopt (the legacy row is now empty).
  assert.equal(
    t.exports.loadTasbihDayTotalWithMigration(TODAY_LOCAL, new Date(2026, 9, 21, 3, 0, 0)),
    5,
    'migration must be idempotent — the local row is now authoritative',
  );

  // If a local row already exists, migration must not touch the legacy row.
  t.dayTotals.set('2026-10-25', 9);
  t.dayTotals.set('2026-10-24', 3);
  assert.equal(
    t.exports.loadTasbihDayTotalWithMigration('2026-10-25', new Date(2026, 9, 25, 2, 0, 0)),
    9,
    'an existing local total must win over the legacy row',
  );
  assert.equal(t.dayTotals.get('2026-10-24'), 3, 'an existing local row must leave the legacy row untouched');
}

console.log('midnight Tasbih rollover production test passed');
