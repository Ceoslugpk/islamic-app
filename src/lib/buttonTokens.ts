/**
 * Canonical button and card design tokens.
 * Enforces consistent heights, border radiuses, typography, icon sizes, and pressed states
 * across all screens in accordance with the "Warm Editorial Islamic" aesthetic.
 */

import { ViewStyle, TextStyle } from 'react-native';
import { ThemeColors } from './constants';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'destructive' | 'icon';

export interface ButtonDimensionToken {
  minHeight: number;
  paddingHorizontal: number;
  paddingVertical: number;
  borderRadius: number;
  fontSize: number;
  iconSize: number;
  fontFamily: string;
  letterSpacing: number;
}

export const buttonTokens: Record<ButtonSize, ButtonDimensionToken> = {
  sm: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    fontSize: 12.5,
    iconSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.1,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    iconSize: 16,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.2,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 15,
    iconSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.3,
  },
};

export const cardTokens = {
  borderRadius: 12,
  borderWidth: 1,
  paddingPadded: 16,
  paddingCompact: 12,
} as const;

export const pressedStateTokens = {
  activeOpacity: 0.75,
  feedbackScale: 0.98,
} as const;

export const touchTargetTokens = {
  minTarget: 44,
  compactTarget: 40,
  hitSlop8: { top: 8, bottom: 8, left: 8, right: 8 },
  hitSlop10: { top: 10, bottom: 10, left: 10, right: 10 },
  hitSlop12: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;

/**
 * Returns standard style objects for container and text given variant, size, and theme colors.
 */
export function getButtonStyles(
  colors: ThemeColors,
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md'
): { container: ViewStyle; text: TextStyle } {
  const dim = buttonTokens[size];

  const baseContainer: ViewStyle = {
    minHeight: dim.minHeight,
    paddingHorizontal: dim.paddingHorizontal,
    paddingVertical: dim.paddingVertical,
    borderRadius: dim.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };

  const baseText: TextStyle = {
    fontFamily: dim.fontFamily,
    fontSize: dim.fontSize,
    letterSpacing: dim.letterSpacing,
  };

  switch (variant) {
    case 'primary':
      return {
        container: {
          ...baseContainer,
          backgroundColor: colors.accent,
        },
        text: {
          ...baseText,
          color: colors.onAccent,
        },
      };

    case 'secondary':
      return {
        container: {
          ...baseContainer,
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        },
        text: {
          ...baseText,
          color: colors.textPrimary,
        },
      };

    case 'subtle':
      return {
        container: {
          ...baseContainer,
          backgroundColor: colors.accentDim,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        },
        text: {
          ...baseText,
          color: colors.accent,
        },
      };

    case 'ghost':
      return {
        container: {
          ...baseContainer,
          backgroundColor: 'transparent',
        },
        text: {
          ...baseText,
          color: colors.accent,
        },
      };

    case 'destructive':
      return {
        container: {
          ...baseContainer,
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.destructive,
        },
        text: {
          ...baseText,
          color: colors.destructive,
        },
      };

    case 'icon':
      return {
        container: {
          minHeight: Math.max(dim.minHeight, touchTargetTokens.compactTarget),
          minWidth: Math.max(dim.minHeight, touchTargetTokens.compactTarget),
          paddingHorizontal: 0,
          paddingVertical: 0,
          borderRadius: dim.borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        },
        text: {
          ...baseText,
          color: colors.textPrimary,
        },
      };
  }
}

