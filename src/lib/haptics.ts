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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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