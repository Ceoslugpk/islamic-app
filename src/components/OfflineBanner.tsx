import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { offlineUsingSavedData } from '../lib/strings';
import { t } from '../lib/i18n';

export function OfflineBanner() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.accentDim, borderBottomColor: colors.borderSubtle }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.accent} style={styles.icon} />
        <Text style={[styles.text, { color: colors.textPrimary }]}>{t(offlineUsingSavedData)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: 680,
    alignSelf: 'center',
  },
  icon: {
    marginTop: 1,
  },
  text: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});