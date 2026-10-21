import assert from 'node:assert/strict';
import path from 'node:path';
import { setupHarness } from './test_harness_loader.mjs';

console.log('=== notifications reschedule timeout/serialization regression ===');

const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, delay, ...args) =>
  realSetTimeout(callback, delay >= 10_000 ? 250 : delay, ...args);

const harnessDir = setupHarness();
const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));
const storageStub = await import(path.join(harnessDir, 'stubAsyncStorage.mjs'));
const native = notifStub.default;
const originalCancel = native.cancelScheduledNotificationAsync;
const originalSchedule = native.scheduleNotificationAsync;

const location = { latitude: 21.4225, longitude: 39.8262, label: 'Makkah' };
const configs = {
  Fajr: { enabled: true, adhan: true, vibration: true },
  Dhuhr: { enabled: true, adhan: true, vibration: true },
  Asr: { enabled: true, adhan: true, vibration: true },
  Maghrib: { enabled: true, adhan: true, vibration: true },
  Isha: { enabled: true, adhan: true, vibration: true },
};

notifStub.__clear();
storageStub.__resetStorage();
notifStub.__seed('old-prayer', { data: { type: 'prayer-at', prayer: 'Fajr' } }, { hour: 5, minute: 0 });

let activeNativeOperations = 0;
let maxNativeOperations = 0;
const delayed = (operation) => async (...args) => {
  activeNativeOperations += 1;
  maxNativeOperations = Math.max(maxNativeOperations, activeNativeOperations);
  await new Promise((resolve) => realSetTimeout(resolve, 75));
  try {
    return await operation(...args);
  } finally {
    activeNativeOperations -= 1;
  }
};
native.cancelScheduledNotificationAsync = delayed(originalCancel);
native.scheduleNotificationAsync = delayed(originalSchedule);

const first = notif.rescheduleIfNeeded(location, 16, true, 15, false, 'shafi', configs, '20:00')
  .then(() => 'resolved', () => 'timed-out');
await new Promise((resolve) => realSetTimeout(resolve, 5));
const second = notif.rescheduleIfNeeded(location, 16, true, 15, false, 'shafi', configs, '20:00')
  .then(() => 'resolved', () => 'rejected');

assert.equal(await first, 'timed-out', 'the caller must observe the bounded timeout');
assert.equal(await second, 'resolved', 'a later call must settle after the timed-out native work reconciles');
assert.equal(maxNativeOperations, 1, 'a timed-out native run must remain serialized with the next run');

const prayerNotifications = [...notifStub.store.values()].filter((n) => {
  const type = n.content?.data?.type;
  return type === 'prayer-before' || type === 'prayer-at';
});
assert.equal(prayerNotifications.length, 10, 'the timed-out run must finish cancel-then-schedule reconciliation');

native.cancelScheduledNotificationAsync = originalCancel;
native.scheduleNotificationAsync = originalSchedule;
globalThis.setTimeout = realSetTimeout;
console.log('PASS: timeout returns to the caller without abandoning or overlapping native reconciliation');
