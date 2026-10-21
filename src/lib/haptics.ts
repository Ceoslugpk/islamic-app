import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from './settings';

export type HapticKind = 'light' | 'success' | 'selection' | 'warning' | 'error';

let hapticsEnabledModuleFlag = true;

export function setHapticsModuleFlag(enabled: boolean): void {
  hapticsEnabledModuleFlag = enabled;
}

function triggerHaptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  if (!hapticsEnabledModuleFlag) return;

  try {
    switch (kind) {
      case 'light':
        void Promise.resolve(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {});
        break;
      case 'success':
        void Promise.resolve(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)).catch(() => {});
        break;
      case 'selection':
        void Promise.resolve(Haptics.selectionAsync()).catch(() => {});
        break;
      case 'warning':
        void Promise.resolve(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)).catch(() => {});
        break;
      case 'error':
        void Promise.resolve(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)).catch(() => {});
        break;
    }
  } catch {
    // no-op on unsupported platforms
  }
}

export function useHaptics() {
  const { settings } = useSettings();
  const enabled = settings.hapticsEnabled;

  const haptic = (kind: HapticKind) => {
    if (!enabled) return;
    triggerHaptic(kind);
  };

  return { haptic };
}
