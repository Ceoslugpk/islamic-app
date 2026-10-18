import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  Platform,
  TouchableOpacity,
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
}

/**
 * PremiumCard: Floating card with two-layer theme-aware outer shadow,
 * thin gold border, 13–14.5dp border radius, and clipped inner gradient surface.
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
}: PremiumCardProps) {
  const { mode } = useTheme();
  const currentTokens = themeTokens[mode];
  const shadowToken = cardTokens.shadow[mode];
  const innerRadius = Math.max(0, borderRadius - 1);

  const finalBorderColor = borderColor || currentTokens.goldBorder;
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
      borderRadius,
      borderColor: finalBorderColor,
      backgroundColor: currentTokens.cardTop,
    },
    shadowToken as any,
    Platform.OS === 'web' && {
      // Two-layer rich ambient + direct shadow for web
      boxShadow:
        mode === 'ink'
          ? '0 6px 20px rgba(0,0,0,0.60), 0 2px 6px rgba(0,0,0,0.40)'
          : '0 4px 14px rgba(40,35,24,0.12), 0 1px 3px rgba(40,35,24,0.06)',
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        activeOpacity={activeOpacity}
        onPress={onPress}
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
