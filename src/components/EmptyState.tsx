import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';

export interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSize?: number;
}

/** Compact, muted empty/offline state with an optional action (e.g. Retry). */
export function EmptyState({ icon, title, subtitle, actionLabel, onAction, iconSize = 28 }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: colors.iconCircleBg || '#E0EAE5' }]}>
        <Ionicons name={icon} size={iconSize} color={colors.forestGreen || colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t(title)}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(subtitle)}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { backgroundColor: colors.forestGreen || colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={t(actionLabel)}
          activeOpacity={0.85}
        >
          <Text style={[styles.actionText, { color: colors.onAccent || '#FFFFFF' }]}>{t(actionLabel)}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionBtn: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
