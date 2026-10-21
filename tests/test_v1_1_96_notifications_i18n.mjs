import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setupHarness } from './test_harness_loader.mjs';

console.log('=== notifications i18n regression ===');

const harnessDir = setupHarness();
fs.writeFileSync(path.join(harnessDir, 'stubI18n.mjs'), `
  export const calls = [];
  export function t(key, options) {
    calls.push([key, options]);
    return 'localized:' + key;
  }
`);
fs.writeFileSync(path.join(harnessDir, 'stubContinuing.mjs'), `
  export const getContinueReadingPosition = async () => ({ surah: 2, ayah: 5 });
`);
fs.writeFileSync(path.join(harnessDir, 'stubSurahs.mjs'), `
  export const SURAHS_114 = [{ number: 2, englishName: 'Al-Baqarah' }];
`);
const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));
const i18nStub = await import(path.join(harnessDir, 'stubI18n.mjs'));
assert.equal(notif.isNotificationSchedulingSupported(), true);
const native = notifStub.default;
native.AndroidImportance = { MAX: 'max', HIGH: 'high', DEFAULT: 'default' };
const channels = [];
const categories = [];
native.setNotificationChannelAsync = async (id, options) => channels.push({ id, options });
native.setNotificationCategoryAsync = async (id, actions) => categories.push({ id, actions });

await notif.configureNotifications();
assert.equal(channels.length, 5, 'all Android channels must still be configured');
assert.ok(channels.every(({ options }) => options.name.startsWith('localized:')), 'Android channel names must come from t()');
assert.ok(
  categories.every(({ actions }) => actions.every((action) => action.buttonTitle.startsWith('localized:'))),
  'action titles must come from t()',
);

const timings = {
  timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:30', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' },
};
await notif.schedulePrayerNotifications(timings, 15, 'Makkah');
await notif.scheduleQuranReminder('20:00');
const responseSubscription = notif.setupNotificationResponseHandler();
notifStub.__emitResponse({
  actionIdentifier: 'prayer-snooze',
  notification: { request: { identifier: 'prayer-at', content: { data: { prayer: 'Asr', type: 'prayer-at' } } } },
});
notifStub.__emitResponse({
  actionIdentifier: 'quran-snooze',
  notification: { request: { identifier: 'quran-reminder', content: { data: { type: 'quran-reminder' } } } },
});
await notif.snoozePrayer('Fajr', 10);
await notif.sendTestPrayerNotification('Dhuhr');
await notif.sendTestPrePrayerNotification('Maghrib', 15);
await notif.sendTestQuranNotification();
await new Promise((resolve) => setImmediate(resolve));
responseSubscription?.remove();

const expectedKeys = [
  'Mark Prayed',
  'Open Prayer',
  'Notification channel — Prayer times (Adhan & Vibration)',
  'Notification channel — Prayer times (Sound only)',
  'Notification channel — Prayer times (Vibration only)',
  'Notification channel — Prayer times (Silent)',
  'Notification channel — Quran reminders',
  '🕌 {{prayer}} in {{minutes}} minutes',
  '{{location}} · {{time}}',
  '🕌 {{prayer}}',
  "It's time for {{prayer}}.",
  '📖 Continue your Quran',
  'You stopped at {{surah}} {{reference}}.',
  'Open the Quran and keep your daily reading habit alive.',
  '🕌 {{prayer}} (Snoozed {{minutes}}m)',
  'Reminder for {{prayer}} prayer.',
  '📖 Continue your Quran (Snoozed 10m)',
  'Test: {{prayer}} Prayer Alert',
  'This is a test notification for {{prayer}} to verify sound, vibration & action buttons.',
  '🕌 Test: {{prayer}} in {{minutes}} minutes',
  'Upcoming prayer notice to prepare for Salah.',
  '📖 Test: Quran Reading Reminder',
];
for (const key of expectedKeys) {
  assert.ok(i18nStub.calls.some(([calledKey]) => calledKey === key), `notification text must use t(${JSON.stringify(key)})`);
}

console.log('PASS: notification channels, actions, scheduled copy, snoozes, and test alerts use the locale');
