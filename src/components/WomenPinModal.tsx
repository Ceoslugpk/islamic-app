import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import {
  hashPin,
  verifyPinDetailed,
  loadPinLockoutState,
  recordFailedPinAttempt,
  resetPinLockoutState,
  persistUpgradedPinHash,
} from '../lib/privacy';

export type PinModalMode = 'verify' | 'set' | 'change';

interface WomenPinModalProps {
  visible: boolean;
  mode: PinModalMode;
  currentHash: string | null;
  onSuccess: () => void;
  onCancel: () => void;
  onSetPin?: (newHash: string) => void;
}

export function WomenPinModal({
  visible,
  mode,
  currentHash,
  onSuccess,
  onCancel,
  onSetPin,
}: WomenPinModalProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 380);

  // Flow step state:
  // For 'verify': step is 'verify'
  // For 'set': step is 'enter_new' | 'confirm_new'
  // For 'change': step is 'verify_old' | 'enter_new' | 'confirm_new'
  const [step, setStep] = useState<'verify' | 'verify_old' | 'enter_new' | 'confirm_new'>('verify');
  const [pin, setPin] = useState<string>('');
  const [firstPin, setFirstPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      setPin('');
      setFirstPin('');
      setErrorMsg(null);
      if (mode === 'verify') setStep('verify');
      else if (mode === 'set') setStep('enter_new');
      else if (mode === 'change') setStep('verify_old');

      loadPinLockoutState().then((state) => {
        const diffMs = state.lockedUntil - Date.now();
        if (diffMs > 0) {
          const secs = Math.ceil(diffMs / 1000);
          setLockoutSeconds(secs);
          setErrorMsg(`Too many attempts. Try again in ${secs}s.`);
        } else {
          setLockoutSeconds(0);
        }
      });
    }
  }, [visible, mode]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMsg(null);
          return 0;
        }
        const next = prev - 1;
        setErrorMsg(`Too many attempts. Try again in ${next}s.`);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const triggerHaptic = (type: 'light' | 'error') => {
    try {
      if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // non-fatal
    }
  };

  const handleDigit = (d: string) => {
    if (lockoutSeconds > 0) return;
    if (pin.length >= 4) return;
    triggerHaptic('light');
    const next = pin + d;
    setPin(next);
    setErrorMsg(null);

    if (next.length === 4) {
      processCompletedPin(next);
    }
  };

  const handleDelete = () => {
    if (lockoutSeconds > 0) return;
    if (pin.length > 0) {
      triggerHaptic('light');
      setPin(pin.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const processCompletedPin = async (entered: string) => {
    if (lockoutSeconds > 0) return;

    if (step === 'verify') {
      const res = verifyPinDetailed(entered, currentHash);
      if (res.valid) {
        await resetPinLockoutState();
        if (res.needsUpgrade && res.upgradedHash) {
          if (onSetPin) onSetPin(res.upgradedHash);
          await persistUpgradedPinHash(res.upgradedHash);
        }
        onSuccess();
      } else {
        triggerHaptic('error');
        const lockInfo = await recordFailedPinAttempt();
        if (lockInfo.locked) {
          setLockoutSeconds(lockInfo.remainingSeconds);
          setErrorMsg(`Too many attempts. Try again in ${lockInfo.remainingSeconds}s.`);
        } else {
          setErrorMsg('Incorrect PIN. Please try again.');
        }
        setTimeout(() => setPin(''), 300);
      }
    } else if (step === 'verify_old') {
      const res = verifyPinDetailed(entered, currentHash);
      if (res.valid) {
        await resetPinLockoutState();
        if (res.needsUpgrade && res.upgradedHash) {
          if (onSetPin) onSetPin(res.upgradedHash);
          await persistUpgradedPinHash(res.upgradedHash);
        }
        setPin('');
        setStep('enter_new');
      } else {
        triggerHaptic('error');
        const lockInfo = await recordFailedPinAttempt();
        if (lockInfo.locked) {
          setLockoutSeconds(lockInfo.remainingSeconds);
          setErrorMsg(`Too many attempts. Try again in ${lockInfo.remainingSeconds}s.`);
        } else {
          setErrorMsg('Current PIN is incorrect.');
        }
        setTimeout(() => setPin(''), 300);
      }
    } else if (step === 'enter_new') {
      setFirstPin(entered);
      setPin('');
      setStep('confirm_new');
    } else if (step === 'confirm_new') {
      if (entered === firstPin) {
        const newHash = hashPin(entered);
        await resetPinLockoutState();
        if (onSetPin) onSetPin(newHash);
        await persistUpgradedPinHash(newHash);
        onSuccess();
      } else {
        triggerHaptic('error');
        setErrorMsg('PINs did not match. Please try again.');
        setTimeout(() => {
          setFirstPin('');
          setPin('');
          setStep('enter_new');
        }, 600);
      }
    }
  };

  // Titles and descriptions
  let headerTitle = t('PIN Protection');
  let headerSub = t('Enter your 4-digit PIN');

  if (step === 'verify') {
    headerTitle = t("Women's Worship Locked");
    headerSub = t('Enter your 4-digit PIN to access');
  } else if (step === 'verify_old') {
    headerTitle = t('Change PIN');
    headerSub = t('Enter your current 4-digit PIN');
  } else if (step === 'enter_new') {
    headerTitle = mode === 'change' ? t('Enter New PIN') : t('Create 4-Digit PIN');
    headerSub = t('Choose a 4-digit PIN to lock sensitive tools');
  } else if (step === 'confirm_new') {
    headerTitle = t('Confirm PIN');
    headerSub = t('Re-enter your 4-digit PIN to confirm');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              width: maxW,
            },
          ]}
        >
          {/* Header Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
            <Ionicons name="lock-closed" size={26} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{headerTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{headerSub}</Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => {
              const filled = pin.length > i;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      borderColor: colors.accent,
                      backgroundColor: filled ? colors.accent : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          <View style={styles.errorContainer}>
            {errorMsg ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{errorMsg}</Text>
            ) : (
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                {step === 'confirm_new' ? t('Confirming PIN') : t('Strictly on-device lock')}
              </Text>
            )}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['cancel', '0', 'del'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((item) => {
                  if (item === 'cancel') {
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.keyBtn, styles.specialKey]}
                        onPress={onCancel}
                        accessibilityRole="button"
                        accessibilityLabel={t('Cancel')}
                      >
                        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t('Cancel')}</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (item === 'del') {
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.keyBtn, styles.specialKey, { opacity: lockoutSeconds > 0 ? 0.4 : 1 }]}
                        onPress={handleDelete}
                        disabled={lockoutSeconds > 0}
                        accessibilityRole="button"
                        accessibilityLabel={t('Delete last digit')}
                      >
                        <Ionicons name="backspace-outline" size={22} color={colors.textPrimary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.keyBtn,
                        {
                          backgroundColor: colors.bgBase,
                          borderColor: colors.borderSubtle,
                          opacity: lockoutSeconds > 0 ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => handleDigit(item)}
                      disabled={lockoutSeconds > 0}
                      accessibilityRole="button"
                      accessibilityLabel={`Digit ${item}`}
                    >
                      <Text
                        style={[styles.keyDigit, { color: colors.textPrimary }]}
                        maxFontSizeMultiplier={1.4}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorContainer: {
    height: 22,
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  hintText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  keyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialKey: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keyDigit: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
  },
  cancelText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
