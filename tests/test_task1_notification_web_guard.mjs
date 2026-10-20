/**
 * Behavioral regression coverage for the real notifications module.
 *
 * The harness transpiles src/lib/notifications.ts and replaces only native
 * seams. This test deliberately does not mirror production guards or inspect
 * source strings: it changes the real Platform object and observes the real
 * exported functions.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { setupHarness } from './test_harness_loader.mjs';

console.log('=== RUNNING TASK 1 NOTIFICATION WEB GUARD REGRESSION TEST ===');

const harnessDir = setupHarness();
const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));
const rnStub = await import(path.join(harnessDir, 'stubRN.mjs'));

const prayerTimes = {
  timings: {
    Fajr: '05:00',
    Sunrise: '06:20',
    Dhuhr: '12:30',
    Asr: '15:45',
    Maghrib: '18:20',
    Isha: '19:45',
  },
};

console.log('Web behavior: all scheduler and listener entry points no-op safely');
rnStub.Platform.OS = 'web';
notifStub.__clear();

assert.equal(notif.isNotificationSchedulingSupported(), false);
assert.equal(await notif.snoozePrayer('Asr', 10), false);
assert.deepEqual(notifStub.log, [], 'web snooze must not call the native scheduler');

await notif.cancelPrayerNotifications();
assert.deepEqual(notifStub.log, [], 'web cancel must not query or cancel native notifications');
assert.deepEqual(
  await notif.getScheduledNotificationsHealth(),
  { today: 0, tomorrow: 0 },
  'web health must report no native schedules',
);
assert.deepEqual(
  await notif.schedulePrayerNotifications(prayerTimes, 15, 'Makkah'),
  [],
  'web prayer scheduling must return no ids',
);
assert.equal(await notif.sendTestPrayerNotification(), null);
assert.equal(await notif.sendTestPrePrayerNotification(), null);
assert.equal(await notif.sendTestQuranNotification(), null);
assert.equal(notif.setupNotificationResponseHandler(), null, 'web must not register a response listener');
assert.deepEqual(notifStub.log, [], 'web notification APIs must remain untouched');

console.log('Native behavior: the same real exports remain available');
rnStub.Platform.OS = 'android';
notifStub.__clear();

assert.equal(notif.isNotificationSchedulingSupported(), true);
assert.equal(await notif.snoozePrayer('Fajr', 10), true);
assert.ok(notifStub.log.some(([kind]) => kind === 'schedule'), 'native snooze must schedule');

let nowPlayingDispatches = 0;
const firstSubscription = notif.setupNotificationResponseHandler(() => {
  nowPlayingDispatches += 1;
});
const secondSubscription = notif.setupNotificationResponseHandler(() => {
  nowPlayingDispatches += 1;
});
assert.ok(firstSubscription && typeof firstSubscription.remove === 'function');
assert.equal(secondSubscription, firstSubscription, 'registration must be idempotent');
notifStub.__emitResponse({
  actionIdentifier: 'play-pause',
  notification: { request: { content: { data: { type: 'now-playing' } } } },
});
assert.equal(nowPlayingDispatches, 1, 'one response must dispatch once');
notifStub.__emitResponse({
  actionIdentifier: 'default',
  notification: { request: { content: { data: {} } } },
});
assert.equal(nowPlayingDispatches, 2, 'a payload-less default media tap must use the playback fallback');
notifStub.__emitResponse({
  actionIdentifier: 'next',
  notification: { request: { content: { data: {} } } },
});
assert.equal(nowPlayingDispatches, 3, 'a payload-less media action must reach the dispatcher');
firstSubscription.remove();

notifStub.__seed('prayer-1', { data: { type: 'prayer-at', prayer: 'Fajr' } }, { hour: 23, minute: 59 });
await notif.cancelPrayerNotifications();
assert.ok(notifStub.log.some(([kind]) => kind === 'cancel'), 'native cancel must cancel owned notifications');
assert.ok((await notif.sendTestPrayerNotification()) !== null, 'native test notification must schedule');

console.log('=== ALL NOTIFICATION WEB GUARD TESTS PASSED ===');
