import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

/** Thin hairline divider - the architectural signature of the design. */
export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[styles.line, { backgroundColor: colors.borderSubtle }, style]} />;
}

const styles = StyleSheet.create({
  line: { height: 1, width: '100%' },
});
