/**
 * Real app-lock PIN behavior.
 *
 * This suite compiles and imports src/lib/privacy.ts itself. The only seams are
 * the platform storage module and settings queue side effect; KDF, verification,
 * lockout serialization, and upgrade decisions remain production code.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-pin-kdf-'));

fs.writeFileSync(path.join(TMP, 'async-storage.mjs'), `
  const store = new Map();
  export default {
    async getItem(key) { return store.has(key) ? store.get(key) : null; },
    async setItem(key, value) { store.set(key, value); },
  };
`);

fs.writeFileSync(path.join(TMP, 'settings.mjs'), `
  export const updates = [];
  export async function enqueueSettingsUpdate(updater) {
    const next = updater({ womenPinHash: null, womenLockEnabled: true });
    updates.push(next);
    return next;
  }
`);

const privacyPath = compileEsmProductionModule({
  root: ROOT,
  tmpDir: TMP,
  sourceRelativePath: 'src/lib/privacy.ts',
  source: fs.readFileSync(path.join(ROOT, 'src/lib/privacy.ts'), 'utf8'),
  outputName: 'privacy.mjs',
  replacements: [
    ["from '@react-native-async-storage/async-storage'", "from './async-storage.mjs'"],
    ["from './settings'", "from './settings.mjs'"],
  ],
});

const privacy = await import(privacyPath);
const settingsStub = await import(path.join(TMP, 'settings.mjs'));

class MemoryStorage {
  #values = new Map();

  async getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  async setItem(key, value) {
    this.#values.set(key, value);
  }
}

const pin = '4826';
const storedHash = privacy.hashPin(pin);
assert.match(storedHash, /^kdf_v2_100000_[0-9a-f]+$/, 'hashPin must return the current KDF format');
assert.equal(privacy.verifyPin(pin, storedHash), true, 'the real hash must verify the correct PIN');
console.log('  ✓ hashPin -> verifyPin accepts the correct PIN');

assert.equal(privacy.verifyPin('4827', storedHash), false, 'a wrong PIN must be rejected');
assert.equal(privacy.verifyPin(pin, storedHash), true, 'a correct PIN must still verify after a wrong PIN');
assert.equal(privacy.verifyPin('4827', storedHash), false, 'a wrong PIN must still be rejected after a correct PIN');
console.log('  ✓ wrong/correct/wrong verification sequence returns false/true/false');

const sameInputHash = privacy.hashPin(pin);
assert.equal(
  sameInputHash,
  storedHash,
  'the current format is deterministic by design: fixed v2 salt and identical input produce the same value',
);
assert.notEqual(privacy.hashPin('4827'), storedHash, 'different PIN input must not collide in this path');
console.log('  ✓ deterministic fixed-salt property and distinct-PIN result verified');

const legacyHash = privacy.hashPinLegacy(pin);
assert.equal(privacy.isLegacyHash(legacyHash), true, 'hashPinLegacy must produce the older format');
const legacyVerification = privacy.verifyPinDetailed(pin, legacyHash);
assert.equal(legacyVerification.valid, true, 'the correct PIN must verify against the legacy value');
assert.equal(legacyVerification.needsUpgrade, true, 'a successful legacy verification must request an upgrade');
assert.match(legacyVerification.upgradedHash, /^kdf_v2_100000_[0-9a-f]+$/);
assert.equal(privacy.isLegacyHash(legacyVerification.upgradedHash), false);
assert.notEqual(legacyVerification.upgradedHash, legacyHash, 'the weaker legacy value must be replaced by the current KDF');
assert.equal(privacy.verifyPinDetailed('4827', legacyHash).valid, false, 'wrong PIN must not upgrade a legacy value');
await privacy.persistUpgradedPinHash(legacyVerification.upgradedHash);
assert.equal(settingsStub.updates.length, 1, 'the real upgrade persistence path must enqueue one settings update');
assert.equal(settingsStub.updates[0].womenPinHash, legacyVerification.upgradedHash);
console.log('  ✓ legacy verify flags and persists a current-format KDF upgrade');

const lockoutStorage = new MemoryStorage();
await privacy.resetPinLockoutState(lockoutStorage);
assert.deepEqual(await privacy.loadPinLockoutState(lockoutStorage), { attempts: 0, lockedUntil: 0 });

const failures = [];
for (let attempt = 1; attempt <= privacy.PIN_LOCKOUT_THRESHOLD; attempt += 1) {
  const result = await privacy.recordFailedPinAttempt(lockoutStorage);
  failures.push(result);
  assert.equal(result.attempts, attempt, `failure counter must reach ${attempt}`);
  assert.equal(result.locked, attempt >= privacy.PIN_LOCKOUT_THRESHOLD);
}
assert.equal(failures[4].remainingSeconds, 30, 'the threshold attempt must engage the 30 second lock');
const lockedState = await privacy.loadPinLockoutState(lockoutStorage);
assert.equal(lockedState.attempts, privacy.PIN_LOCKOUT_THRESHOLD);
assert.ok(lockedState.lockedUntil > Date.now(), 'threshold lock must store a future release time');
assert.equal(privacy.getLockoutDurationMs(privacy.PIN_LOCKOUT_THRESHOLD), 30000);
assert.equal(privacy.getLockoutDurationMs(privacy.PIN_LOCKOUT_THRESHOLD + 1), 60000);
assert.equal(privacy.getLockoutDurationMs(privacy.PIN_LOCKOUT_THRESHOLD + 2), 120000);
assert.equal(privacy.getLockoutDurationMs(privacy.PIN_LOCKOUT_THRESHOLD + 3), 240000);
assert.equal(privacy.getLockoutDurationMs(privacy.PIN_LOCKOUT_THRESHOLD + 4), 300000);
console.log('  ✓ failure counter, threshold engagement, and real duration ladder verified');

assert.equal(privacy.verifyPin(pin, storedHash), true, 'the correct PIN still verifies cryptographically during lockout');
assert.deepEqual(
  await privacy.loadPinLockoutState(lockoutStorage),
  lockedState,
  'correct verification must not clear or bypass the active lockout state',
);
await privacy.resetPinLockoutState(lockoutStorage);
assert.deepEqual(
  await privacy.loadPinLockoutState(lockoutStorage),
  { attempts: 0, lockedUntil: 0 },
  'the designed successful-unlock reset must release the lockout',
);
const afterRelease = await privacy.recordFailedPinAttempt(lockoutStorage);
assert.deepEqual(afterRelease, { locked: false, remainingSeconds: 0, attempts: 1 });
console.log('  ✓ correct PIN cannot bypass an active lockout; explicit production reset releases it');

console.log('REAL PIN KDF/verify/upgrade/lockout behavioral test passed');
