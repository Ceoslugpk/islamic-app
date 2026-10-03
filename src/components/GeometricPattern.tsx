import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

interface GeometricPatternProps {
  size?: number;
  opacity?: number;
  style?: ViewStyle;
}

/**
 * Subtle Islamic geometric pattern as background texture.
 * Pure View-based 8-point star (two rotated squares) - no SVG dependency.
 * Restrained: low opacity texture behind content, not a loud pattern.
 */
export function GeometricPattern({ size = 300, opacity = 0.05, style }: GeometricPatternProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { opacity }, style]} pointerEvents="none">
      <View
        style={[
          styles.square,
          {
            width: size * 0.45,
            height: size * 0.45,
            borderColor: colors.accent,
          },
        ]}
      />
      <View
        style={[
          styles.square,
          styles.rotated,
          {
            width: size * 0.45,
            height: size * 0.45,
            borderColor: colors.accent,
          },
        ]}
      />
      <View
        style={[
          styles.square,
          styles.inner,
          {
            width: size * 0.2,
            height: size * 0.2,
            borderColor: colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 2,
  },
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
  inner: {
    borderWidth: 1,
    borderRadius: 1,
  },
});
