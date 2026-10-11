import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_DONE_KEY = 'onboardingDone';

let cachedOnboardingDone: boolean | null = null;

/**
 * Reads onboarding status asynchronously.
 * Returns true if onboarding has been completed, false otherwise.
 */
export async function getOnboardingDone(): Promise<boolean> {
  if (cachedOnboardingDone !== null) {
    return cachedOnboardingDone;
  }
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
    cachedOnboardingDone = val === 'true';
    return cachedOnboardingDone;
  } catch {
    return false;
  }
}

/**
 * Persists that onboarding has been completed.
 */
export async function setOnboardingDone(done: boolean = true): Promise<void> {
  cachedOnboardingDone = done;
  try {
    if (done) {
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(ONBOARDING_DONE_KEY);
    }
  } catch {
    // Non-fatal
  }
}
