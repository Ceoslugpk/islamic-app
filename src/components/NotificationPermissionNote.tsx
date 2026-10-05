import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export interface NotificationPermissionNoteProps {
  status?: 'denied' | 'undetermined' | 'granted' | string | null;
  onOpenSettings?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  customTitle?: string;
  customMessage?: string;
}

/**
 * Reusable banner/note displayed when notification permission is denied or needed.
 * Explains the value of prayer & adhan notifications and provides a direct "Open Settings" button.
 * Never repeatedly re-prompts the user with native dialogs.
 */
export function NotificationPermissionNote({
  status = 'denied',
  onOpenSettings,
  compact = false,
  style,
  customTitle,
  customMessage,
}: NotificationPermissionNoteProps) {
  const { colors } = useTheme();

  // If granted or null, do not render
  if (status === 'granted') {
    return null;
  }

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      Linking.openSettings().catch(() => {});
    }
  };

  const isUndetermined = status !== 'denied' && status !== 'granted' && status != null;
  const title = customTitle || (isUndetermined ? 'Notifications not allowed yet' : 'Notifications are turned off');
  const description =
    customMessage ||
    (isUndetermined
      ? 'Allow notifications so Islamic can play the Adhan at prayer time and remind you to read the Quran daily.'
      : 'To receive Adhan calls, timely prayer alerts, and daily dhikr reminders, please enable notifications for Islamic in your device settings.');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
        },
        compact && styles.containerCompact,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.accentDim,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Ionicons
            name="notifications-off-outline"
            size={compact ? 16 : 18}
            color={colors.accent}
          />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.settingsBtn,
            {
              backgroundColor: colors.accent,
            },
          ]}
          onPress={handleOpenSettings}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open device settings to enable notifications"
        >
          <Ionicons name="settings-outline" size={14} color={colors.onAccent} />
          <Text style={[styles.settingsBtnText, { color: colors.onAccent }]}>
            Open Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  containerCompact: {
    padding: 12,
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
  },
  settingsBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
});
