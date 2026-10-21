import assert from 'node:assert/strict';
import path from 'node:path';
import { setupHarness } from './test_harness_loader.mjs';

const tmpDir = setupHarness();
const privacy = await import(path.join(tmpDir, 'privacy.mjs'));

const {
  resolveWomenSettingsAccess,
  isWomenLocked,
  isWomenGateArmed,
} = privacy;

assert.equal(typeof resolveWomenSettingsAccess, 'function');

const pinHash = 'kdf_v2_100000_test_hash';

const cases = [
  {
    name: 'feature off',
    settings: { womenWorshipEnabled: false, womenLockEnabled: false, womenPinHash: null },
    unlocked: false,
    expected: 'feature-disabled',
  },
  {
    name: 'lock on with no PIN',
    settings: { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: null },
    unlocked: false,
    expected: 'set-pin',
  },
  {
    name: 'lock on with PIN and locked session',
    settings: { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    unlocked: false,
    expected: 'pin-required',
  },
  {
    name: 'lock on with PIN and already unlocked session',
    settings: { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    unlocked: true,
    expected: 'open',
  },
];

for (const testCase of cases) {
  assert.equal(
    resolveWomenSettingsAccess(testCase.settings, testCase.unlocked),
    testCase.expected,
    `Settings Qada access policy: ${testCase.name}`,
  );
}

// A PIN-protected locked session must remain blocked at both the pre-navigation
// decision and the screen-level gate; the session can only become open after unlock.
assert.equal(
  resolveWomenSettingsAccess(
    { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    false,
  ),
  'pin-required',
);
assert.equal(
  isWomenLocked(
    { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    false,
  ),
  true,
);
assert.equal(
  isWomenGateArmed(
    { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    false,
  ),
  true,
);
assert.equal(
  resolveWomenSettingsAccess(
    { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    true,
  ),
  'open',
);
assert.equal(
  isWomenGateArmed(
    { womenWorshipEnabled: true, womenLockEnabled: true, womenPinHash: pinHash },
    true,
  ),
  false,
);

console.log('Qada Fasts access policy: all production-path cases passed');
