import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { getTokens } from '../theme/tokens';
import { AppText } from './ui/AppText';
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
  const { mode } = useTheme();
  const tokens = getTokens(mode);

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, borderWidth: 1 }]}>
        <Ionicons name={icon} size={iconSize} color={tokens.accent} />
      </View>
      <AppText variant="title" style={styles.title}>{t(title)}</AppText>
      <AppText variant="subtitle" style={styles.subtitle}>{t(subtitle)}</AppText>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={t(actionLabel)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={tokens.goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.actionBtnGradient}
          >
            <AppText variant="rowTitle" tone="onGold" style={styles.actionText}>{t(actionLabel)}</AppText>
          </LinearGradient>
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
    borderRadius: 22,
    overflow: 'hidden',
  },
  actionBtnGradient: {
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
