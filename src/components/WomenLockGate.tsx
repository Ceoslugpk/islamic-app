import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  AppState,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { t } from '../lib/i18n';
import { AppText } from './ui/AppText';

/**
 * System-biometric + device-credential gate for the Women's Worship screens.
 *
 * Uses Android/iOS SYSTEM authentication (fingerprint / face / device PIN-pattern
 * via LocalAuthentication). We NEVER touch biometric data ourselves — the OS does.
 *
 * Behavior:
 *  - If no lock is configured (womenLockEnabled false), children render freely.
 *  - Otherwise the user must pass system auth once per session.
 *  - Backgrounding re-locks after LOCK_TIMEOUT_MS (sensible default 45s).
 *  - App restart always requires auth (fresh state).
 *  - Internal navigation between women screens does NOT re-ask (gate stays
 *    unlocked for the session; App.tsx renders one gate across the 4 screens).
 */
const LOCK_TIMEOUT_MS = 45000;

export function WomenLockGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const lockEnabled = settings.womenLockEnabled || Boolean(settings.womenWorshipEnabled && settings.womenPinHash);

  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundAtRef = useRef<number | null>(null);

  // Re-lock when the app returns from background after the timeout.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'background' || next === 'inactive') {
        backgroundAtRef.current = Date.now();
      } else if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        const bg = backgroundAtRef.current;
        if (bg && Date.now() - bg >= LOCK_TIMEOUT_MS) {
          setUnlocked(false);
        }
        backgroundAtRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const authenticate = useAuthenticate(setUnlocked, setError, setChecking);

  // Ask once on mount if a lock is configured.
  useEffect(() => {
    if (lockEnabled) {
      authenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockEnabled]);

  if (!lockEnabled) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <AppText variant="subtitle" style={styles.message}>{t('Unlocking…')}</AppText>
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <View style={[styles.lockIconWrap, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="lock-closed" size={40} color={colors.accent} />
        </View>
        <AppText variant="title" style={styles.title}>{t('Protected')}</AppText>
        <AppText variant="subtitle" style={styles.message}>
          {t("Use your device security (fingerprint, face, or PIN) to view Women's Worship.")}
        </AppText>
        {error && <AppText variant="caption" tone="danger" style={styles.errorText}>{error}</AppText>}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          activeOpacity={0.75}
          onPress={() => authenticate()}
          accessibilityRole="button"
          accessibilityLabel={t("Unlock Women's Worship")}
        >
          <Ionicons name="finger-print" size={18} color={colors.onAccent} />
          <AppText variant="rowTitle" tone="onGold" style={styles.buttonText}>{t('Unlock')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

function useAuthenticate(
  setUnlocked: (v: boolean) => void,
  setError: (e: string | null) => void,
  setChecking: (v: boolean) => void
) {
  return async () => {
    setChecking(true);
    setError(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // No biometric hardware: try device credentials (PIN/pattern) as system fallback.
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          setChecking(false);
          setUnlocked(false);
          setError('No device security is set up. Enable a screen lock in your device settings.');
          return;
        }
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Women's Worship",
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // allow device PIN/pattern/password fallback
      });
      setChecking(false);
      if (result.success) {
        setUnlocked(true);
      } else {
        setUnlocked(false);
        if (result.error === 'user_cancel') {
          setError(null);
        } else {
          setError('Authentication failed. Try again.');
        }
      }
    } catch {
      setChecking(false);
      setUnlocked(false);
      setError('Authentication unavailable on this device.');
    }
  };
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 6,
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
});
