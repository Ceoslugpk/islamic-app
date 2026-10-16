import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
  Insets,
  GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { HOME_THEME_TOKENS } from '../../lib/homeThemeTokens';
import { touchTargetTokens } from '../../lib/buttonTokens';

export interface HeaderRingButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  variant?: 'ring' | 'card';
  badge?: boolean;
  badgeColor?: string;
  accessibilityLabel?: string;
  accessibilityRole?: 'button';
  hitSlop?: Insets;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  activeOpacity?: number;
  disabled?: boolean;
  asView?: boolean;
  children?: React.ReactNode;
}

/**
 * Authoritative 32dp circular header button primitive.
 * Used for back buttons in SubHeader/ReaderHeader and action buttons in AppHeader/SheetHeader.
 *
 * Dimensions: 32x32dp, radius 16dp.
 * Variants:
 * - 'ring' (default): SubHeader back ring (tokens.ringFill, tokens.ringBorder / colors.borderSubtle, colors.accent)
 * - 'card': AppHeader action buttons (tokens.cardTop, tokens.cardBorder 0.75, tokens.gold)
 */
export function HeaderRingButton({
  onPress,
  iconName,
  iconSize,
  iconColor,
  variant = 'ring',
  badge = false,
  badgeColor,
  accessibilityLabel,
  accessibilityRole = 'button',
  hitSlop,
  style,
  testID,
  activeOpacity = 0.7,
  disabled = false,
  asView = false,
  children,
}: HeaderRingButtonProps) {
  const { colors, mode } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];

  const isCard = variant === 'card';
  const resolvedBorderColor = isCard
    ? tokens.cardBorder
    : mode === 'ink'
    ? tokens.ringBorder
    : tokens.cardBorder;
  const resolvedBackgroundColor = isCard ? tokens.cardTop : tokens.ringFill;
  const resolvedBorderWidth = 0.75;
  const resolvedIconColor = iconColor ?? (isCard ? tokens.gold : colors.accent);
  const resolvedIconSize = iconSize ?? (isCard ? 14 : 16);
  const resolvedHitSlop =
    hitSlop ?? { top: 6, bottom: 6, left: 6, right: 6 };
  const resolvedBadgeColor = badgeColor ?? tokens.gold;

  const content = (
    <>
      {children ? (
        children
      ) : iconName ? (
        <Ionicons name={iconName} size={resolvedIconSize} color={resolvedIconColor} />
      ) : null}
      {badge ? (
        <View style={[styles.badgeDot, { backgroundColor: resolvedBadgeColor }]} />
      ) : null}
    </>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.ring,
    {
      borderColor: resolvedBorderColor,
      backgroundColor: resolvedBackgroundColor,
      borderWidth: resolvedBorderWidth,
    },
    style,
  ];

  if (asView || !onPress) {
    return (
      <View testID={testID} style={containerStyle}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      style={containerStyle}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={activeOpacity}
      hitSlop={resolvedHitSlop}
      disabled={disabled}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
