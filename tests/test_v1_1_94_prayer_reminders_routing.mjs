import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { setupHarness } from './test_harness_loader.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const harnessDir = setupHarness();

const qaLocation = { latitude: 21.4225, longitude: 39.8262, label: 'Makkah' };
const qaConfigs = {
  Fajr: { enabled: true, adhan: true, vibration: true },
  Dhuhr: { enabled: true, adhan: true, vibration: true },
  Asr: { enabled: true, adhan: true, vibration: true },
  Maghrib: { enabled: true, adhan: true, vibration: true },
  Isha: { enabled: true, adhan: true, vibration: true },
};

fs.writeFileSync(path.join(harnessDir, 'screenDeps.mjs'), `
  const colors = new Proxy({}, { get: () => '#105A4B' });
  const tokens = { bgGradient: ['#F4EEDE', '#F4EEDE'] };
  const calls = [];
  export const screenCalls = calls;

  const settingsState = {
    manualLocation: ${JSON.stringify(qaLocation)},
    methodId: 16,
    madhab: 'shafi',
    remindersEnabled: true,
    reminderOffsetMinutes: 15,
    prayerConfigs: ${JSON.stringify(qaConfigs)},
    adhanReciterId: 'alafasy',
    quranReminderEnabled: false,
    quranReminderTime: '20:00',
    quranGoal: { type: 'minutes', target: 15 },
  };

  export function __getSettings() { return settingsState; }
  export function useSettings() {
    return {
      settings: settingsState,
      setReminders: (value) => { settingsState.remindersEnabled = value; calls.push(['setReminders', value]); },
      setReminderOffsetMinutes: (value) => { settingsState.reminderOffsetMinutes = value; calls.push(['setOffset', value]); },
      setPrayerConfig: (prayer, update) => {
        settingsState.prayerConfigs = {
          ...settingsState.prayerConfigs,
          [prayer]: { ...settingsState.prayerConfigs[prayer], ...update },
        };
        calls.push(['setPrayerConfig', prayer, update]);
      },
      setAdhanReciterId: (value) => { settingsState.adhanReciterId = value; },
      setQuranReminderEnabled: (value) => { settingsState.quranReminderEnabled = value; },
      setQuranReminderTime: (value) => { settingsState.quranReminderTime = value; },
      setQuranGoal: (value) => { settingsState.quranGoal = value; },
    };
  }

  export const StyleSheet = { create: (value) => value, absoluteFill: {} };
  export const View = 'View';
  export const TouchableOpacity = 'TouchableOpacity';
  export const ActivityIndicator = 'ActivityIndicator';
  export const Ionicons = 'Ionicons';
  export const LinearGradient = 'LinearGradient';
  export const SubHeader = 'SubHeader';
  export const DetailScreen = 'DetailScreen';
  export const PremiumCard = 'PremiumCard';
  export const OutlineButton = 'OutlineButton';
  export const Chip = 'Chip';
  export const AppText = 'AppText';
  export const Hairline = 'Hairline';
  export const AdhanReciterModal = 'AdhanReciterModal';
  export const DETAIL_PAD_BOTTOM = () => 0;

  export const React = {
    createElement(type, props, ...children) {
      const nextProps = props ? { ...props } : {};
      nextProps.children = children.length === 1 ? children[0] : children;
      return { type, props: nextProps };
    },
  };
  export default React;
  export function useState(value) {
    let current = value;
    return [current, (next) => { current = typeof next === 'function' ? next(current) : next; }];
  }
  export function useEffect() {}
  export function useCallback(fn) { return fn; }
  export function useRef(value) { return { current: value }; }
  export function useWindowDimensions() { return { width: 390, height: 844 }; }
  export function useSafeAreaInsets() { return { top: 0, right: 0, bottom: 0, left: 0 }; }
  export function useTheme() { return { colors }; }
  export function useThemeTokens() { return { tokens }; }
  export const cardTokens = { borderRadius: 16 };
  export function useAudioMiniPlayer() { return { playback: null }; }
  export function useDiagnosticTarget() { return { recordNamed() {}, recordNamedUnavailable() {}, markTargetStale() {} }; }
  export function isDiagnosticModeEnabled() { return false; }
  export function getTargetMeasurement() { return null; }
  export const fetchPrayerTimes = async () => ({
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:30', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' },
  });
  export const notificationsRescheduled = () => 'Notifications rescheduled';
  export const notificationsRescheduleFailed = () => 'Reschedule failed';
  export const snoozedTenMinutes = () => 'Snoozed';
  export const testAlertSent = () => 'Test sent';
  export const dailyGoalDone = () => 'Goal done';
  export const dailyGoalReopened = () => 'Goal reopened';
  export const notificationPermissionDenied = () => 'Permission denied';
  export const testAlertPermission = () => 'Permission unavailable';
  export const t = (value) => value;
  export const addAdhanPlaybackListener = () => () => {};
  export const playAdhan = async () => {};
  export const getAdhanReciter = () => ({ name: 'Alafasy', arabicName: 'العفاسي' });
  export const loadQuranDailyProgress = async () => null;
  export const setQuranDailyGoalCompleted = async (value) => ({ completed: value, minutesRead: 0, pagesRead: 0, customCompleted: value ? 1 : 0 });
  export const getContinueReadingPosition = async () => null;
  export const buildDeepLink = () => 'salah://tracker';
  export const getForwardIcon = () => 'chevron-forward';
  export const Linking = { openSettings: async () => {} };
  export const Alert = { alert() {} };
`);

let screenSource = fs.readFileSync(path.join(REPO_ROOT, 'src/screens/PrayerRemindersScreen.tsx'), 'utf8');
for (const source of [
  'react',
  'react-native',
  '@expo/vector-icons',
  'expo-linear-gradient',
  '../lib/theme',
  '../theme/tokens',
  '../lib/settings',
  'react-native-safe-area-context',
  '../lib/useAudioMiniPlayer',
  '../components/layout/SubHeader',
  '../components/layout/DetailScreen',
  '../components/layout/layout.constants',
  '../components/ui',
  '../components/ui/AppText',
  '../components/Hairline',
  '../lib/strings',
  '../lib/i18n',
  '../lib/diagnostic',
  '../lib/prayerTimes',
  '../lib/audio',
  '../components/AdhanReciterModal',
  '../lib/quranProgress',
  '../lib/continuing',
  '../lib/deeplinks',
  '../lib/iconMap',
]) {
  screenSource = screenSource.replaceAll(`from '${source}'`, "from './screenDeps.mjs'");
}
screenSource = screenSource.replaceAll("from '../lib/notifications'", "from './notifications.mjs'");
const screenOutput = ts.transpileModule(screenSource, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'src/screens/PrayerRemindersScreen.tsx',
}).outputText;
const screenPath = path.join(harnessDir, 'prayer-reminders-screen.mjs');
fs.writeFileSync(screenPath, screenOutput);

const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));
const storageStub = await import(path.join(harnessDir, 'stubAsyncStorage.mjs'));
const screenDeps = await import(path.join(harnessDir, 'screenDeps.mjs'));
const screenModule = await import(screenPath);

function collectNodes(node, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) {
    for (const child of node) collectNodes(child, result);
    return result;
  }
  result.push(node);
  collectNodes(node.props?.children, result);
  return result;
}

console.log('QA: rendered Maghrib toggle routes through the serialized notification reschedule');
notifStub.__clear();
storageStub.__resetStorage();

const native = notifStub.default;
const originalSchedule = native.scheduleNotificationAsync;
let firstSchedule = true;
let releaseFirstSchedule;
const firstScheduleHeld = new Promise((resolve) => {
  releaseFirstSchedule = resolve;
});
let secondScheduleStartedResolve;
const secondScheduleStarted = new Promise((resolve) => {
  secondScheduleStartedResolve = resolve;
});
let scheduleCalls = 0;
native.scheduleNotificationAsync = async (input) => {
  scheduleCalls += 1;
  if (firstSchedule) {
    firstSchedule = false;
    await firstScheduleHeld;
  } else if (scheduleCalls === 2) {
    secondScheduleStartedResolve();
  }
  return originalSchedule.call(native, input);
};

const staleReschedule = notif.rescheduleIfNeeded(
  qaLocation,
  16,
  true,
  15,
  false,
  'shafi',
  qaConfigs,
  '20:00',
);
await new Promise((resolve) => setTimeout(resolve, 0));

const screenTree = screenModule.default({ onBack: () => {} });
const switches = collectNodes(screenTree).filter(
  (node) => node.type === 'TouchableOpacity' && node.props?.accessibilityRole === 'switch',
);
assert.equal(switches.length, 7, 'the real screen should render the prayer and Quran switch controls');
const maghribSwitch = switches[4];
assert.equal(maghribSwitch.props.accessibilityState.checked, true, 'Maghrib starts enabled in the fixture');

const userToggle = maghribSwitch.props.onPress();
await Promise.race([
  secondScheduleStarted,
  new Promise((resolve) => setTimeout(resolve, 50)),
]);
releaseFirstSchedule();
await Promise.all([staleReschedule, userToggle]);

const maghribNotifications = [...notifStub.store.values()].filter(
  (notification) => notification.content?.data?.prayer === 'Maghrib',
);
assert.equal(
  maghribNotifications.length,
  0,
  'a user-disabled Maghrib prayer must not be restored by stale app-start scheduling',
);
assert.deepEqual(
  screenDeps.screenCalls.find((call) => call[0] === 'setPrayerConfig'),
  ['setPrayerConfig', 'Maghrib', { enabled: false }],
  'the rendered Maghrib action must persist the intended disabled state',
);

native.scheduleNotificationAsync = originalSchedule;
console.log('  ✓ stale queued scheduling cannot undo the rendered Maghrib toggle');
