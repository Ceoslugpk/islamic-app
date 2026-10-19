import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { themeTokens, cardTokens } from '../theme/tokens';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
}

/**
 * Floating surface card with a neutral theme-aware border and soft clipped surface.
 */
export function Card({ children, style, contentStyle, padded = true, testID = 'card' }: CardProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];
  const shadowToken = cardTokens.shadow[mode];
  const flatStyle = StyleSheet.flatten(style);
  const customRadius = flatStyle?.borderRadius;
  const resolvedRadius = Math.max(cardTokens.borderRadius, typeof customRadius === 'number' ? customRadius : 0);
  const innerRadius = Math.max(0, resolvedRadius - 1);

  return (
    <View
      testID={testID}
      style={[
        styles.cardOuter,
        {
          borderColor: tokens.cardBorder,
          backgroundColor: tokens.cardTop,
          borderRadius: resolvedRadius,
        },
        shadowToken as any,
        Platform.OS === 'web' && {
          boxShadow:
            mode === 'ink'
              ? '0 8px 22px rgba(0,0,0,0.34)'
              : '0 8px 22px rgba(40,55,44,0.09)',
        },
        style,
        { borderRadius: resolvedRadius },
      ]}
    >
      <View style={[styles.cardInner, { borderRadius: innerRadius }]}>
        <LinearGradient
          colors={tokens.cardGradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradient, padded && styles.padded, contentStyle]}
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
