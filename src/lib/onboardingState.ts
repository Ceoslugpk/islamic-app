import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_DONE_KEY = 'onboardingDone';

let cachedOnboardingDone: boolean | null = null;

const defaultStorage = (AsyncStorage as any)?.default || AsyncStorage;

let storageBackend: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
} = defaultStorage;

export function _setStorageBackendForTesting(custom: any) {
  storageBackend = custom || defaultStorage;
}

export function _resetOnboardingStateForTesting(customStorage?: any) {
  cachedOnboardingDone = null;
  storageBackend = customStorage || defaultStorage;
}

/**
 * Reads onboarding status asynchronously.
 * Returns true if onboarding has been completed, false otherwise.
 * Propagates storage read errors so unavailable storage is observable to callers.
 */
export async function getOnboardingDone(): Promise<boolean> {
  if (cachedOnboardingDone !== null) {
    return cachedOnboardingDone;
  }
  const val = await storageBackend.getItem(ONBOARDING_DONE_KEY);
  cachedOnboardingDone = val === 'true';
  return cachedOnboardingDone;
}

/**
 * Persists that onboarding has been completed with read-back verification and disk rollback.
 */
export async function setOnboardingDone(done: boolean = true): Promise<void> {
  const prev = cachedOnboardingDone;
  let prevPersisted: string | null = null;
  try {
    prevPersisted = await storageBackend.getItem(ONBOARDING_DONE_KEY);
  } catch {}
  cachedOnboardingDone = done;
  try {
    if (done) {
      await storageBackend.setItem(ONBOARDING_DONE_KEY, 'true');
      const readback = await storageBackend.getItem(ONBOARDING_DONE_KEY);
      if (readback !== 'true') {
        throw new Error(`Onboarding done read-back failed: expected "true", got "${readback}"`);
      }
    } else {
      await storageBackend.removeItem(ONBOARDING_DONE_KEY);
      const readback = await storageBackend.getItem(ONBOARDING_DONE_KEY);
      if (readback !== null) {
        throw new Error(`Onboarding done remove read-back failed: expected null, got "${readback}"`);
      }
    }
  } catch (err) {
    try {
      if (prevPersisted !== null) {
        await storageBackend.setItem(ONBOARDING_DONE_KEY, prevPersisted);
      } else {
        await storageBackend.removeItem(ONBOARDING_DONE_KEY);
      }
    } catch {}
    cachedOnboardingDone = prev;
    throw err;
  }
}
