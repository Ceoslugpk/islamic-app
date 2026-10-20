import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  Platform,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { cardTokens, themeTokens } from '../../theme/tokens';

export interface PremiumCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
  onPress?: () => void;
  activeOpacity?: number;
  gradientColors?: readonly [string, string];
  borderColor?: string;
  borderRadius?: number;
  accessibilityRole?: 'button' | 'link' | 'none' | 'text' | 'header' | 'switch' | 'image' | undefined;
  accessibilityLabel?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * PremiumCard: Floating card with two-layer theme-aware outer shadow,
 * thin gold border, 18dp border radius (cardTokens.borderRadius), and clipped inner gradient surface.
 */
export function PremiumCard({
  children,
  style,
  contentStyle,
  padded = true,
  testID = 'card',
  onPress,
  activeOpacity = 0.85,
  gradientColors,
  borderColor,
  borderRadius = cardTokens.borderRadius,
  accessibilityRole,
  accessibilityLabel,
  onLayout,
}: PremiumCardProps) {
  const { mode } = useTheme();
  const currentTokens = themeTokens[mode];
  const shadowToken = cardTokens.shadow[mode];
  const requestedRadius = StyleSheet.flatten(style)?.borderRadius;
  const resolvedRadius = Math.max(
    cardTokens.borderRadius,
    borderRadius,
    typeof requestedRadius === 'number' ? requestedRadius : 0,
  );
  const innerRadius = Math.max(0, resolvedRadius - 1);

  const finalBorderColor = borderColor || currentTokens.cardBorder;
  const colors = gradientColors || currentTokens.cardGradient;

  const cardContent = (
    <View
      style={[
        styles.innerClip,
        {
          borderRadius: innerRadius,
        },
      ]}
    >
      <LinearGradient
        colors={colors as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.gradientSurface,
          padded && styles.padded,
          contentStyle,
        ]}
      >
        {children}
      </LinearGradient>
    </View>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.outerCard,
    {
      borderRadius: resolvedRadius,
      borderColor: finalBorderColor,
      backgroundColor: currentTokens.cardTop,
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
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        activeOpacity={activeOpacity}
        onPress={onPress}
        onLayout={onLayout}
        style={containerStyle}
        accessibilityRole={accessibilityRole || 'button'}
        accessibilityLabel={accessibilityLabel}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={containerStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  outerCard: {
    borderWidth: cardTokens.borderWidth,
    position: 'relative',
  },
  innerClip: {
    overflow: 'hidden',
    width: '100%',
  },
  gradientSurface: {
    width: '100%',
  },
  padded: {
    padding: 16,
  },
});
