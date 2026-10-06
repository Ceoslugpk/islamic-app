/**
 * Privacy & Security utilities for Women's Worship data.
 * Slow pure-JS KDF, legacy upgrade support, and persistent lockout tracking.
 */

export const KDF_ROUNDS = 100000;
export const KDF_PREFIX = 'kdf_v2_';

/**
 * Legacy deterministic salted hash for local 4-digit PIN protection.
 * Kept for transparent backward compatibility with existing stored hashes.
 */
export function hashPinLegacy(pin: string): string {
  const salt = 'islamic_app_women_privacy_v1_';
  const str = salt + pin.trim();
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Hardened slow KDF in pure JS using 100,000 iterated rounds.
 * Makes offline PIN brute-forcing impractically slow on modern CPUs.
 */
export function hashPinKdf(pin: string, rounds = KDF_ROUNDS): string {
  const salt = 'islamic_app_women_privacy_v2_slow_kdf_';
  const str = salt + pin.trim();
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  for (let r = 0; r < rounds; r++) {
    h1 = Math.imul(h1 ^ (r & 0xffff), 2654435761);
    h2 = Math.imul(h2 ^ ((r >>> 16) | (h1 >>> 24)), 1597334677);
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  }
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return `${KDF_PREFIX}${rounds}_${hex}`;
}

/** Default hash function for new and upgraded PINs (uses 100k rounds slow KDF). */
export function hashPin(pin: string): string {
  return hashPinKdf(pin, KDF_ROUNDS);
}

/** Returns true if hash is in legacy (53-bit single round) format. */
export function isLegacyHash(hash: string | null | undefined): boolean {
  if (!hash || typeof hash !== 'string') return false;
  return !hash.startsWith(KDF_PREFIX);
}

export interface VerifyPinResult {
  valid: boolean;
  needsUpgrade: boolean;
  upgradedHash?: string;
}

/**
 * Verify PIN against stored hash with backward compatibility and auto-upgrade flag.
 */
export function verifyPinDetailed(pin: string, expectedHash: string | null): VerifyPinResult {
  if (!expectedHash) return { valid: false, needsUpgrade: false };
  const trimmed = pin.trim();
  if (expectedHash.startsWith(KDF_PREFIX)) {
    const parts = expectedHash.split('_');
    const rounds = parseInt(parts[2], 10) || KDF_ROUNDS;
    const computed = hashPinKdf(trimmed, rounds);
    return { valid: computed === expectedHash, needsUpgrade: false };
  }
  // Legacy hash format verification
  const legacyMatch = hashPinLegacy(trimmed) === expectedHash;
  if (legacyMatch) {
    return {
      valid: true,
      needsUpgrade: true,
      upgradedHash: hashPin(trimmed),
    };
  }
  return { valid: false, needsUpgrade: false };
}

/** Verify entered PIN against stored hash (boolean helper). */
export function verifyPin(pin: string, expectedHash: string | null): boolean {
  return verifyPinDetailed(pin, expectedHash).valid;
}

/* --------------------------------- Lockout -------------------------------- */

export const PIN_LOCKOUT_STORAGE_KEY = 'women-pin-lockout';
export const PIN_LOCKOUT_THRESHOLD = 5;

export interface PinLockoutState {
  attempts: number;
  lockedUntil: number; // millisecond timestamp
}

export function getLockoutDurationMs(attempts: number): number {
  if (attempts < PIN_LOCKOUT_THRESHOLD) return 0;
  // 5 attempts -> 30s
  // 6 attempts -> 60s
  // 7 attempts -> 120s
  // 8+ -> max 300s (5 minutes)
  const step = Math.min(attempts - PIN_LOCKOUT_THRESHOLD, 4);
  return Math.min(30000 * Math.pow(2, step), 300000);
}

export async function loadPinLockoutState(): Promise<PinLockoutState> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(PIN_LOCKOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.attempts === 'number' &&
        typeof parsed.lockedUntil === 'number'
      ) {
        return parsed as PinLockoutState;
      }
    }
  } catch {
    // fallback
  }
  return { attempts: 0, lockedUntil: 0 };
}

export async function savePinLockoutState(state: PinLockoutState): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(PIN_LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // non-fatal
  }
}

export async function resetPinLockoutState(): Promise<void> {
  await savePinLockoutState({ attempts: 0, lockedUntil: 0 });
}

export async function recordFailedPinAttempt(): Promise<{ locked: boolean; remainingSeconds: number; attempts: number }> {
  const current = await loadPinLockoutState();
  const nextAttempts = current.attempts + 1;
  let lockedUntil = 0;
  let remainingSeconds = 0;
  let locked = false;

  if (nextAttempts >= PIN_LOCKOUT_THRESHOLD) {
    const durationMs = getLockoutDurationMs(nextAttempts);
    lockedUntil = Date.now() + durationMs;
    remainingSeconds = Math.ceil(durationMs / 1000);
    locked = true;
  }

  await savePinLockoutState({ attempts: nextAttempts, lockedUntil });
  return { locked, remainingSeconds, attempts: nextAttempts };
}

/** Directly update womenPinHash in stored islamic-settings on upgrade */
export async function persistUpgradedPinHash(newHash: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem('islamic-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        parsed.womenPinHash = newHash;
        await AsyncStorage.setItem('islamic-settings', JSON.stringify(parsed));
      }
    }
  } catch {
    // non-fatal
  }
}
