import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { offlineUsingSavedData } from '../lib/strings';
import { AppText } from './ui/AppText';

export function OfflineBanner({ topInset = 0 }: { topInset?: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.banner, {
        backgroundColor: colors.accentDim,
        borderBottomColor: colors.borderSubtle,
        // The following screen already owns the top inset: lift this notice
        // below the status bar while preserving its existing flow height.
        paddingTop: 6 + topInset,
        marginBottom: -topInset,
      }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.accent} style={styles.icon} />
        <AppText variant="caption" style={styles.text}>{offlineUsingSavedData()}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    zIndex: 1,
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
