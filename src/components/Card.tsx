import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { themeTokens, cardTokens } from '../theme/tokens';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
}

/**
 * Floating surface card with theme-aware drop shadow, 14dp radius,
 * thin gold border, and subtle clipped gradient surface.
 */
export function Card({ children, style, padded = true, testID = 'card' }: CardProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];
  const shadowToken = cardTokens.shadow[mode];
  const flatStyle = StyleSheet.flatten(style);
  const customRadius = flatStyle?.borderRadius;
  const innerRadius = typeof customRadius === 'number'
    ? Math.max(0, customRadius - 1)
    : cardTokens.innerRadius;

  return (
    <View
      testID={testID}
      style={[
        styles.cardOuter,
        {
          borderColor: tokens.goldBorder,
          backgroundColor: tokens.cardTop,
        },
        shadowToken as any,
        Platform.OS === 'web' && {
          boxShadow:
            mode === 'ink'
              ? '0 6px 20px rgba(0,0,0,0.60), 0 2px 6px rgba(0,0,0,0.40)'
              : '0 4px 14px rgba(40,35,24,0.12), 0 1px 3px rgba(40,35,24,0.06)',
        },
        style,
      ]}
    >
      <View style={[styles.cardInner, { borderRadius: innerRadius }]}>
        <LinearGradient
          colors={tokens.cardGradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, padded && styles.padded]}
        >
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    borderRadius: cardTokens.borderRadius,
    borderWidth: cardTokens.borderWidth,
  },
  cardInner: {
    borderRadius: cardTokens.innerRadius,
    overflow: 'hidden',
    width: '100%',
  },
  gradient: {
    width: '100%',
  },
  padded: {
    padding: 16,
  },
});
