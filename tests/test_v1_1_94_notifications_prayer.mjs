import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { setupHarness } from './test_harness_loader.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-v1-1-94-'));

function transpileProduction(relativePath, outputName, replacements = []) {
  let source = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText;
  const filePath = path.join(TMP_DIR, outputName);
  fs.writeFileSync(filePath, output);
  return filePath;
}

function writeStub(name, source) {
  const filePath = path.join(TMP_DIR, name);
  fs.writeFileSync(filePath, source);
  return filePath;
}

console.log('=== v1.1.94 notifications/prayer regression suite ===');

/* F-08/F-10: the real notifications module through the repository harness. */
const harnessDir = setupHarness();

// Keep the production module real while making its dynamic prayer-time seam
// mutable so the day-1/day-2 stale-trigger reproduction is deterministic.
fs.writeFileSync(path.join(harnessDir, 'stubPrayerTimes.mjs'), `
  let current = { Fajr: '05:00', Dhuhr: '12:30', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' };
  let hangNext = false;
  export function __setTimings(next) { current = { ...current, ...next }; }
  export function __hangNextFetch() { hangNext = true; }
  export async function fetchPrayerTimes() {
    if (hangNext) {
      hangNext = false;
      return new Promise(() => {});
    }
    return { timings: { ...current, Sunrise: '06:20' } };
  }
`);
const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));
const storageStub = await import(path.join(harnessDir, 'stubAsyncStorage.mjs'));
const prayerTimesStub = await import(path.join(harnessDir, 'stubPrayerTimes.mjs'));

console.log('F-08: central response subscription dispatches by type and cleans up');
notifStub.__clear();
let nowPlayingDispatches = 0;
const responseSubscription = notif.setupNotificationResponseHandler((action, data) => {
  assert.equal(data.type, 'now-playing');
  assert.equal(action, 'play-pause');
  nowPlayingDispatches += 1;
});
assert.ok(responseSubscription && typeof responseSubscription.remove === 'function');
notifStub.__emitResponse({
  actionIdentifier: 'play-pause',
  notification: { request: { content: { data: { type: 'now-playing' } } } },
});
notifStub.__emitResponse({
  actionIdentifier: 'mark-complete',
  notification: { request: { content: { data: { type: 'prayer-at', prayer: 'Fajr' } } } },
});
assert.equal(nowPlayingDispatches, 1, 'only now-playing responses reach the media dispatcher');
responseSubscription.remove();
notifStub.__emitResponse({
  actionIdentifier: 'play-pause',
  notification: { request: { content: { data: { type: 'now-playing' } } } },
});
assert.equal(nowPlayingDispatches, 1, 'removed response subscription must not receive later taps');

console.log('QA-1: changed computed prayer times refresh daily triggers without date churn');
notifStub.__clear();
storageStub.__resetStorage();
const qaLocation = { latitude: 21.4225, longitude: 39.8262, label: 'Makkah' };
const qaConfigs = {
  Fajr: { enabled: true, adhan: true, vibration: true },
  Dhuhr: { enabled: true, adhan: true, vibration: true },
  Asr: { enabled: true, adhan: true, vibration: true },
  Maghrib: { enabled: true, adhan: true, vibration: true },
  Isha: { enabled: true, adhan: true, vibration: true },
};
prayerTimesStub.__setTimings({ Fajr: '05:00' });
const day1Result = await notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00');
assert.equal(day1Result, true, 'day 1 must schedule prayer notifications');
const getFajrAtTrigger = () => [...notifStub.store.values()].find(
  (n) => n.content?.data?.type === 'prayer-at' && n.content?.data?.prayer === 'Fajr'
)?.trigger;
assert.deepEqual(
  { hour: getFajrAtTrigger()?.hour, minute: getFajrAtTrigger()?.minute },
  { hour: 5, minute: 0 },
  'day 1 must store the day 1 Fajr trigger',
);
const day1OperationCount = notifStub.log.length;
prayerTimesStub.__setTimings({ Fajr: '03:30' });
const day2Result = await notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00');
assert.equal(day2Result, true, 'changed computed times must force a day 2 refresh');
assert.deepEqual(
  { hour: getFajrAtTrigger()?.hour, minute: getFajrAtTrigger()?.minute },
  { hour: 3, minute: 30 },
  'day 2 must not retain the stale day 1 Fajr trigger',
);
assert.ok(notifStub.log.length > day1OperationCount, 'day 2 refresh must perform native cancel/schedule work');
const day2OperationCount = notifStub.log.length;
const RealNotificationDate = globalThis.Date;
globalThis.Date = class extends RealNotificationDate {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 21, 12, 0, 0]));
  }
  static now() {
    return new RealNotificationDate(2026, 9, 21, 12, 0, 0).getTime();
  }
};
const nextDaySameTimesResult = await notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00');
globalThis.Date = RealNotificationDate;
assert.equal(nextDaySameTimesResult, false, 'a new date with unchanged computed times must not churn native schedules');
assert.equal(notifStub.log.length, day2OperationCount, 'unchanged computed times must leave native operations untouched');

console.log('QA-3: a hung reschedule must not poison later queued work');
prayerTimesStub.__hangNextFetch();
const hungReschedule = notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00').catch(() => false);
await new Promise((resolve) => setTimeout(resolve, 0));
const healthyAfterHang = notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00');
const timeoutBudget = notif.NOTIFICATION_RESCHEDULE_TIMEOUT_MS ?? 200;
const healthyOutcome = await Promise.race([
  healthyAfterHang.then(() => 'settled'),
  new Promise((resolve) => setTimeout(() => resolve('timed-out'), timeoutBudget + 500)),
]);
assert.equal(healthyOutcome, 'settled', 'later queued reschedule must advance after a hung predecessor');
void hungReschedule;

console.log('F-10: concurrent reschedules never overlap native cancel/schedule operations');
notifStub.__clear();
storageStub.__resetStorage();
const native = notifStub.default;
const originalNative = {
  getAll: native.getAllScheduledNotificationsAsync,
  cancel: native.cancelScheduledNotificationAsync,
  schedule: native.scheduleNotificationAsync,
};
const originalGetItem = storageStub.default.getItem;
let activeNativeOperations = 0;
let maxNativeOperations = 0;
const withNativeOverlapProbe = (operation) => async (...args) => {
  activeNativeOperations += 1;
  maxNativeOperations = Math.max(maxNativeOperations, activeNativeOperations);
  await new Promise((resolve) => setTimeout(resolve, 2));
  try {
    return await operation(...args);
  } finally {
    activeNativeOperations -= 1;
  }
};
native.getAllScheduledNotificationsAsync = withNativeOverlapProbe(originalNative.getAll);
native.cancelScheduledNotificationAsync = withNativeOverlapProbe(originalNative.cancel);
native.scheduleNotificationAsync = withNativeOverlapProbe(originalNative.schedule);
// Make both callers observe the same pre-reschedule state before either stores a fingerprint.
storageStub.default.getItem = async (key) => {
  await new Promise((resolve) => setTimeout(resolve, 2));
  return originalGetItem.call(storageStub.default, key);
};
await Promise.all([
  notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00'),
  notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00'),
]);
assert.equal(maxNativeOperations, 1, 'reschedules must be serialized end-to-end');
const storedFingerprint = await notif.getStoredFingerprint();
assert.ok(storedFingerprint?.includes('|times='), 'fingerprint must include computed prayer times, not a daily date');
native.getAllScheduledNotificationsAsync = originalNative.getAll;
native.cancelScheduledNotificationAsync = originalNative.cancel;
native.scheduleNotificationAsync = originalNative.schedule;
storageStub.default.getItem = originalGetItem;

console.log('QA-2: a user prayer disable survives an in-flight reschedule');
notifStub.__clear();
storageStub.__resetStorage();
let delayedFirstSchedule = true;
native.scheduleNotificationAsync = async (input) => {
  if (delayedFirstSchedule) {
    delayedFirstSchedule = false;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  return originalNative.schedule.call(native, input);
};
const userDisabledConfigs = {
  ...qaConfigs,
  Maghrib: { ...qaConfigs.Maghrib, enabled: false },
};
const staleReschedule = notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', qaConfigs, '20:00');
await new Promise((resolve) => setTimeout(resolve, 0));
const userToggleReschedule = notif.rescheduleIfNeeded(qaLocation, 16, true, 15, false, 'shafi', userDisabledConfigs, '20:00');
await Promise.all([staleReschedule, userToggleReschedule]);
const maghribAfterToggle = [...notifStub.store.values()].filter(
  (n) => n.content?.data?.prayer === 'Maghrib',
);
assert.equal(maghribAfterToggle.length, 0, 'the user-disabled Maghrib prayer must not be restored by stale work');
native.scheduleNotificationAsync = originalNative.schedule;

console.log('QA-9: old six-to-eight-field fingerprints remain readable');
for (const [fieldCount, fingerprint] of [
  [6, '21.0000,39.0000|16|1|15|0|hanafi'],
  [7, '21.0000,39.0000|16|1|15|0|hanafi|Europe/London'],
  [8, '21.0000,39.0000|16|1|15|0|hanafi|Europe/London|20-10-2026'],
]) {
  storageStub.__store.set('notification-fingerprint', fingerprint);
  const health = await notif.getNotificationHealth(null, qaLocation, 16, true);
  assert.ok(health.fingerprint, `${fieldCount}-field fingerprints must parse into health data`);
  assert.equal(health.fingerprint?.methodId, 16);
  assert.equal(health.fingerprint?.madhab, 'hanafi');
}

/* F-09: execute the real hook and its exported decision helper with stubs only at native seams. */
writeStub('watcherReact.mjs', `
  export function useRef(value) { return { current: value }; }
  export function useEffect(effect) { globalThis.__watcherCleanup = effect(); }
`);
writeStub('watcherPrayerTimes.mjs', `export function getNextPrayer() { return null; }`);
writeStub('watcherAudio.mjs', `
  export const calls = [];
  let rejectNext = false;
  export function __rejectNext() { rejectNext = true; }
  export function playAdhan(...args) {
    calls.push(args);
    if (rejectNext) {
      rejectNext = false;
      return Promise.reject(new Error('simulated adhan failure'));
    }
    return Promise.resolve();
  }
`);
writeStub('watcherSettings.mjs', `
  export const state = { settings: {
    adhanReciterId: 'alafasy',
    prayerConfigs: {
      Fajr: { enabled: true, adhan: false, vibration: true },
      Dhuhr: { enabled: true, adhan: true, vibration: true },
      Asr: { enabled: true, adhan: true, vibration: true },
      Maghrib: { enabled: true, adhan: true, vibration: true },
      Isha: { enabled: true, adhan: true, vibration: true },
    },
  }};
  export function useSettings() { return state; }
`);
const watcherDateKey = transpileProduction('src/lib/dateKey.ts', 'watcherDateKey.mjs', []);
void watcherDateKey;

const watcherFile = transpileProduction('src/lib/usePrayerWatcher.ts', 'watcher.mjs', [
  ["from 'react'", "from './watcherReact.mjs'"],
  ["from './dateKey'", "from './watcherDateKey.mjs'"],
  ["from './prayerTimes'", "from './watcherPrayerTimes.mjs'"],
  ["from './audio'", "from './watcherAudio.mjs'"],
  ["from './settings'", "from './watcherSettings.mjs'"],
]);
const watcher = await import(watcherFile);
const watcherAudio = await import(path.join(TMP_DIR, 'watcherAudio.mjs'));
const dayTimings = {
  timings: { Fajr: '05:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '18:00', Isha: '19:00' },
};
assert.equal(
  watcher.shouldFirePrayer(
    { name: 'Fajr', time: '05:00' },
    new Date(2026, 9, 20, 5, 0, 30),
    { name: 'Fajr', dateKey: '2026-10-19' },
    { enabled: true, adhan: true, vibration: true },
  ),
  true,
  'same prayer name must be fireable again on a new local date',
);
assert.equal(
  watcher.shouldFirePrayer(
    { name: 'Fajr', time: '05:00' },
    new Date(2026, 9, 20, 5, 0, 30),
    { name: 'Fajr', dateKey: '2026-10-20' },
    { enabled: true, adhan: true, vibration: true },
  ),
  false,
  'the same prayer must fire at most once per local date',
);
const RealDate = globalThis.Date;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 20, 5, 0, 30]));
  }
  static now() {
    return new RealDate(2026, 9, 20, 5, 0, 30).getTime();
  }
};
watcher.usePrayerWatcher(dayTimings, true);
assert.equal(watcherAudio.calls.length, 0, 'disabled per-prayer adhan must not play');
globalThis.__watcherCleanup?.();
globalThis.Date = RealDate;
const unhandledRejections = [];
const onUnhandledRejection = (reason) => unhandledRejections.push(reason);
process.on('unhandledRejection', onUnhandledRejection);
watcherAudio.__rejectNext();
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 20, 12, 0, 30]));
  }
  static now() {
    return new RealDate(2026, 9, 20, 12, 0, 30).getTime();
  }
};
watcher.usePrayerWatcher(dayTimings, true);
globalThis.__watcherCleanup?.();
await new Promise((resolve) => setImmediate(resolve));
globalThis.Date = RealDate;
process.off('unhandledRejection', onUnhandledRejection);
assert.equal(unhandledRejections.length, 0, 'adhan playback rejection must be consumed by the watcher');

/* F-26/F-27: execute the real helpers from the production component/screen. */
writeStub('countdownStubs.mjs', `
  const React = { createElement() { return null; }, Fragment: Symbol('Fragment') };
  export default React;
  export const useEffect = () => {};
  export const useRef = (v) => ({ current: v });
  export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}];
  export const StyleSheet = { create: (v) => v };
  export const View = () => null;
  export const Animated = { View: () => null, Value: class {}, timing: () => ({ start() {}, stop() {} }) };
  export const Easing = { out: (v) => v, cubic: () => 0 };
  export const Platform = { OS: 'web' };
  export const AccessibilityInfo = { isReduceMotionEnabled: async () => false };
  export const useTheme = () => ({ colors: { accent: '#000', textMuted: '#000' } });
  export const AppText = () => null;
  export const t = (key) => key;
`);
const countdownFile = transpileProduction('src/components/PrayerCountdown.tsx', 'countdown.mjs', [
  ["from 'react'", "from './countdownStubs.mjs'"],
  ["from 'react-native'", "from './countdownStubs.mjs'"],
  ["from '../lib/theme'", "from './countdownStubs.mjs'"],
  ["from '../lib/i18n'", "from './countdownStubs.mjs'"],
  ["from './ui/AppText'", "from './countdownStubs.mjs'"],
]);
const countdown = await import(countdownFile);
assert.equal(
  countdown.getPrayerCountdownMilliseconds('12:00', new Date(2026, 9, 20, 12, 0, 30)),
  0,
  'the exact prayer minute must be treated as now/in progress, not tomorrow',
);
assert.equal(
  countdown.getPrayerCountdownMilliseconds('12:00', new Date(2026, 9, 20, 11, 59, 59)),
  1000,
  'the countdown must retain the final second before prayer',
);

writeStub('zakatStubs.mjs', `
  const React = { createElement() { return null; }, Fragment: Symbol('Fragment') };
  export default React;
  export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}];
  export const useEffect = () => {};
  export const useCallback = (v) => v;
  export const useMemo = (v) => v();
  export const useRef = (v) => ({ current: v });
  export const StyleSheet = { create: (v) => v };
  export const View = () => null;
  export const TouchableOpacity = () => null;
  export const TouchableWithoutFeedback = () => null;
  export const ScrollView = () => null;
  export const TextInput = () => null;
  export const useWindowDimensions = () => ({ width: 390 });
  export const Modal = () => null;
  export const Alert = { alert() {} };
  export const AppText = () => null;
  export const Ionicons = {};
  export const useTranslation = () => ({ t: (v) => v });
  export const isRTL = () => false;
  export const useThemeTokens = () => ({ tokens: {}, mode: 'paper' });
  export const LinearGradient = () => null;
  export const getCardShadow = () => ({});
  export const getPillShadow = () => ({});
  export const SubHeader = () => null;
  export const DetailScreen = () => null;
  export const Hairline = () => null;
  export const Card = () => null;
  export const EmptyState = () => null;
  export const useUndoToast = () => ({ saveUndoState() {} });
  export const withUndoToast = (v) => v;
  export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
  export const SUPPORTED_CURRENCIES = [];
  export const getCurrencyConfig = () => ({ goldPricePerGram: 1, silverPricePerGram: 1 });
  export const calculateZakat = () => ({ totalGrossAssets: 0 });
  export const formatCurrencyAmount = (v) => String(v);
  export const saveZakatCalculation = () => {};
  export const loadZakatCalculations = () => [];
  export const deleteZakatCalculation = () => {};
  export const formatYMD = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
`);
const zakatFile = transpileProduction('src/screens/ZakatScreen.tsx', 'zakat.mjs', [
  ["from 'react'", "from './zakatStubs.mjs'"],
  ["from 'react-native'", "from './zakatStubs.mjs'"],
  ["from '../components/ui/AppText'", "from './zakatStubs.mjs'"],
  ["from 'expo-haptics'", "from './zakatStubs.mjs'"],
  ["from '@expo/vector-icons'", "from './zakatStubs.mjs'"],
  ["from 'react-i18next'", "from './zakatStubs.mjs'"],
  ["from '../lib/i18n'", "from './zakatStubs.mjs'"],
  ["from '../theme/tokens'", "from './zakatStubs.mjs'"],
  ["from 'expo-linear-gradient'", "from './zakatStubs.mjs'"],
  ["from '../lib/homeThemeTokens'", "from './zakatStubs.mjs'"],
  ["from '../components/layout/SubHeader'", "from './zakatStubs.mjs'"],
  ["from '../components/layout/DetailScreen'", "from './zakatStubs.mjs'"],
  ["from '../components/Hairline'", "from './zakatStubs.mjs'"],
  ["from '../components/Card'", "from './zakatStubs.mjs'"],
  ["from '../components/EmptyState'", "from './zakatStubs.mjs'"],
  ["from '../lib/undoToast'", "from './zakatStubs.mjs'"],
  ["from 'react-native-safe-area-context'", "from './zakatStubs.mjs'"],
  ["from '../lib/zakat'", "from './zakatStubs.mjs'"],
  ["from '../lib/db'", "from './zakatStubs.mjs'"],
  ["from '../lib/womensFiqh'", "from './zakatStubs.mjs'"],
]);
const zakat = await import(zakatFile);
const localZakatDate = new Date(2026, 9, 20, 23, 30);
localZakatDate.toISOString = () => '2026-10-21T05:30:00.000Z';
assert.equal(zakat.getZakatRecordDate(localZakatDate), '2026-10-20');

console.log('ALL v1.1.94 notifications/prayer checks passed');
