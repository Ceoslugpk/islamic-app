import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../lib/theme';
import { HOME_THEME_TOKENS } from '../../lib/homeThemeTokens';

/** Opaque system-bar surfaces; existing screen owners retain all inset spacing. */
export function SystemBarBackgrounds({ topInset, bottomInset }: {
  topInset: number;
  bottomInset: number;
}) {
  const { mode } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  return (
    <>
      {topInset > 0 && (
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          testID="system-status-bar-background"
          style={[styles.bar, { top: 0, height: topInset, backgroundColor: tokens.bgTop }]}
        />
      )}
      {bottomInset > 0 && (
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          testID="system-navigation-bar-background"
          style={[styles.bar, { bottom: 0, height: bottomInset, backgroundColor: tokens.bgBottom }]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 100,
    shadowColor: 'transparent',
  },
});
