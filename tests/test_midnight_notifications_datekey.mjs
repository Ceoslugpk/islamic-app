/**
 * Day-key de-duplication regression — notifications mark-complete (finding: the
 * last hand-rolled YYYY-MM-DD builder in src/, src/lib/notifications.ts:1125).
 *
 * Guarantee proven by executing the REAL production module: when a "mark
 * complete" notification action carries no explicit date, the completion is
 * persisted via the shared day-key authority `getLocalDateKey` (a spy sentinel
 * flows through), not a hand-rolled YYYY-MM-DD copy. This was the last
 * remaining hand-rolled day-key builder in src/.
 *
 * Run: node tests/test_midnight_notifications_datekey.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/notifications.ts');
process.env.TZ = 'Asia/Karachi';

// 2026-10-20T21:00Z === 2026-10-21 02:00 local (UTC+5): local day != UTC day.
const SHIFTED_ISO = '2026-10-20T21:00:00.000Z';
const LOCAL_KEY = '2026-10-21';
const SENTINEL = 'SENTINEL-DAYKEY-0000-00-00';

function buildSandbox(dateKeyModule) {
  const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: SOURCE,
  }).outputText;

  const realDate = new Date(SHIFTED_ISO);
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      super(args.length === 0 ? realDate.getTime() : args.length === 1 ? args[0] : args);
    }
    static now() {
      return realDate.getTime();
    }
  }

  let responseListener = null;
  const marked = [];
  const Notifications = {
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
    addNotificationResponseReceivedListener(listener) {
      responseListener = listener;
      return { remove() { responseListener = null; } };
    },
  };

  const fallback = new Proxy(function () {}, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? () => '' : fallback),
    apply: () => fallback,
    has: () => true,
  });

  const dbModule = {
    markSalahCompleted: (dateStr, prayer, done) => {
      marked.push({ dateStr, prayer, done });
    },
  };

  const modules = {
    'expo-notifications': Notifications,
    'expo-haptics': { notificationAsync: async () => {}, NotificationFeedbackType: { Success: 'success' } },
    'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Linking: { openURL: async () => {} }, Alert: { alert: () => {} } },
    '@react-native-async-storage/async-storage': { default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } },
    './db': dbModule,
    './dateKey': dateKeyModule,
  };
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => (Object.prototype.hasOwnProperty.call(modules, request) ? modules[request] : fallback),
    console,
    process,
    Date: FixedDate,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    globalThis: undefined,
    __DEV__: false,
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: SOURCE });
  return { moduleObject, getListener: () => responseListener, marked };
}

// Real shared helper, transplanted so we can also use it for the guard.
const dateKeyOutput = ts.transpileModule(
  fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: 'dateKey.ts' },
).outputText;
const realDateKeyObject = { exports: {} };
const realDateKeySandbox = { module: realDateKeyObject, exports: realDateKeyObject.exports, require: () => ({}), console, Date };
vm.createContext(realDateKeySandbox);
vm.runInContext(dateKeyOutput, realDateKeySandbox, { filename: 'dateKey.ts' });
const realDateKey = realDateKeyObject.exports;
assert.equal(realDateKey.getLocalDateKey(new Date(SHIFTED_ISO)), LOCAL_KEY, 'guard: local day differs from UTC day');

/* ── 1. Delegation: a spy day-key sentinel must flow into the write ──────── */

{
  const spyCalls = [];
  const spyModule = {
    getLocalDateKey: (date = new Date()) => {
      spyCalls.push(date);
      return SENTINEL;
    },
  };
  const { moduleObject, getListener, marked } = buildSandbox(spyModule);
  assert.equal(typeof moduleObject.exports.setupNotificationResponseHandler, 'function', 'module must export the response handler setup');
  assert.ok(moduleObject.exports.setupNotificationResponseHandler(), 'the handler must register a native listener');
  const listener = getListener();
  assert.equal(typeof listener, 'function', 'the native listener must be captured');

  listener({
    actionIdentifier: 'mark-complete',
    notification: { request: { content: { data: { prayer: 'Fajr' } } } },
  });

  assert.equal(marked.length, 1, 'the mark-complete action must persist exactly one completion');
  assert.equal(
    marked[0].dateStr,
    SENTINEL,
    'markSalahCompleted must receive the day key produced by getLocalDateKey (a hand-rolled copy never reaches the shared helper)',
  );
  assert.ok(spyCalls.length >= 1, 'the production path must call the shared helper');
}

/* ── 2. With the real helper, the local day key is written ───────────────── */

{
  const { moduleObject, getListener, marked } = buildSandbox(realDateKey);
  moduleObject.exports.setupNotificationResponseHandler();
  const listener = getListener();
  listener({
    actionIdentifier: 'mark-complete',
    notification: { request: { content: { data: { prayer: 'Fajr' } } } },
  });
  assert.equal(marked[0].dateStr, LOCAL_KEY, 'the completion must be keyed to the device-local calendar day');

  // An explicit date supplied by the sender must still win.
  listener({
    actionIdentifier: 'mark-complete',
    notification: { request: { content: { data: { prayer: 'Asr', date: '2020-01-02' } } } },
  });
  assert.equal(marked[1].dateStr, '2020-01-02', 'an explicit data.date must be preserved');
}

console.log('notifications local day-key production test passed');
