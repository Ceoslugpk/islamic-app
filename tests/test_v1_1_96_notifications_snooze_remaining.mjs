import assert from 'node:assert/strict';
import path from 'node:path';
import { setupHarness } from './test_harness_loader.mjs';

console.log('=== notifications snooze remaining-time regression ===');

const harnessDir = setupHarness();
const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));
const native = notifStub.default;
const originalGetAll = native.getAllScheduledNotificationsAsync;
const originalSchedule = native.scheduleNotificationAsync;

notifStub.__clear();
const created = await notif.snoozePrayer('Asr', 10);
assert.equal(created, true);
const createdSnooze = [...notifStub.store.values()].find((n) => n.content?.data?.type === 'prayer-snooze');
assert.ok(createdSnooze, 'the real snooze creator must schedule a prayer snooze');
assert.equal(typeof createdSnooze.content.data.snoozeTargetEpochMs, 'number', 'snooze target must be persisted in notification data');

notifStub.__clear();
const targetEpochMs = Date.now() + 30_000;
notifStub.__seed('dropped-snooze', {
  ...createdSnooze.content,
  data: { ...createdSnooze.content.data, snoozeTargetEpochMs: targetEpochMs },
}, { seconds: 600 });

let schedulingStarted = false;
let dropped = false;
native.scheduleNotificationAsync = async (input) => {
  if (input.content?.data?.type !== 'prayer-snooze') schedulingStarted = true;
  return originalSchedule.call(native, input);
};
native.getAllScheduledNotificationsAsync = async () => {
  if (schedulingStarted && !dropped) {
    dropped = true;
    notifStub.store.delete('dropped-snooze');
  }
  return originalGetAll.call(native);
};

const configs = {
  Fajr: { enabled: true, adhan: true, vibration: true },
  Dhuhr: { enabled: true, adhan: true, vibration: true },
  Asr: { enabled: true, adhan: true, vibration: true },
  Maghrib: { enabled: true, adhan: true, vibration: true },
  Isha: { enabled: true, adhan: true, vibration: true },
};
await notif.rescheduleIfNeeded(
  { latitude: 21.4225, longitude: 39.8262, label: 'Makkah' },
  16,
  true,
  0,
  false,
  'shafi',
  configs,
  '20:00',
);

const rearmed = [...notifStub.store.values()].find((n) => n.content?.data?.type === 'prayer-snooze');
assert.ok(rearmed, 'a dropped pending snooze must be re-armed');
assert.ok(rearmed.trigger.seconds >= 1 && rearmed.trigger.seconds <= 30, 're-armed snooze must use remaining time, not another full ten minutes');
assert.equal(rearmed.content.data.snoozeTargetEpochMs, targetEpochMs, 'the absolute target must survive re-arming');

native.getAllScheduledNotificationsAsync = originalGetAll;
native.scheduleNotificationAsync = originalSchedule;
console.log('PASS: snooze re-arming preserves the absolute target and schedules only the remaining interval');
