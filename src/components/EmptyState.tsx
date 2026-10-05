import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSize?: number;
}

/** Compact, muted empty/offline state with an optional action (e.g. Retry). */
export function EmptyState({ icon, title, subtitle, actionLabel, onAction, iconSize = 56 }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={iconSize} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.actionBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          activeOpacity={0.75}
        >
          <Text style={[styles.actionText, { color: colors.accent }]}>{actionLabel}</Text>
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
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginTop: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 300,
  },
  actionBtn: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
