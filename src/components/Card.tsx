import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

/** Warm surface card with hairline border - no glass, no gradient. */
export function Card({ children, style, padded = true }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: { padding: 20 },
});
