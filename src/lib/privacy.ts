/**
 * Privacy & Security utilities for Women's Worship data.
 * Zero-dependency local hashing and lock helpers.
 */

/**
 * Deterministic salted hash for local 4-digit PIN protection.
 * Privacy-focused local verification without external cryptography dependencies.
 */
export function hashPin(pin: string): string {
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

/** Verify entered PIN against stored hash */
export function verifyPin(pin: string, expectedHash: string | null): boolean {
  if (!expectedHash) return false;
  return hashPin(pin) === expectedHash;
}
