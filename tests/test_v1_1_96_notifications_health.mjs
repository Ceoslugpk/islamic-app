import assert from 'node:assert/strict';
import path from 'node:path';
import { setupHarness } from './test_harness_loader.mjs';

console.log('=== notifications health accounting regression ===');

const harnessDir = setupHarness();
const notif = await import(path.join(harnessDir, 'notifications.mjs'));
const notifStub = await import(path.join(harnessDir, 'stubNotif.mjs'));

notifStub.__clear();
const tomorrow = new Date(Date.now() + 86_400_000 + 60_000);
notifStub.__seed('real-daily', { data: { type: 'prayer-at', prayer: 'Fajr' } }, {
  date: tomorrow,
});
notifStub.__seed('snooze', { data: { type: 'prayer-snooze' } }, { seconds: 600 });
notifStub.__seed('unknown', { data: { type: 'legacy' } }, { type: 'unknown-trigger' });

assert.deepEqual(
  await notif.getScheduledNotificationsHealth(),
  { today: 0, tomorrow: 1 },
  'snooze and unknown triggers must not masquerade as daily coverage',
);

console.log('PASS: health counts only date and daily-repeat triggers');
