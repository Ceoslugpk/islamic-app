import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { themeTokens, fontRoles } from '../../theme/tokens';
import { useAutoProbe } from '../../lib/diagnostic';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string | number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  interactive?: boolean;
  numberOfLines?: number;
  onLayout?: (e: LayoutChangeEvent) => void;
  onGradientLayout?: (e: LayoutChangeEvent) => void;
  gradientTestID?: string;
  onLabelLayout?: (e: LayoutChangeEvent) => void;
  labelTestID?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  badge,
  style,
  textStyle,
  testID,
  disabled = false,
  accessibilityLabel,
  interactive,
  numberOfLines,
  onLayout: onLayoutProp,
  onGradientLayout,
  gradientTestID,
  onLabelLayout,
  labelTestID,
}: ChipProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];

  const actualTestId = testID || (selected ? 'chip-selected' : 'chip');
  const textColor = selected ? tokens.onGold : tokens.heading;
  const isInteractive = interactive !== undefined ? interactive : typeof onPress === 'function';

  const autoProbe = useAutoProbe(actualTestId, 'Chip');
  const onLayout = autoProbe.onLayout
    ? (e: LayoutChangeEvent) => {
        autoProbe.onLayout?.(e);
        onLayoutProp?.(e);
      }
    : onLayoutProp;

  const innerContent = (
    <>
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={textColor}
          style={styles.icon}
        />
      )}
      <AppText
        testID={labelTestID}
        onLayout={onLabelLayout}
        variant="caption"
        tone={selected ? 'onGold' : undefined}
        style={[
          styles.label,
          {
            fontFamily: selected ? fontRoles.uiSemiBold : fontRoles.ui,
            color: textColor,
          },
          textStyle,
        ]}
        numberOfLines={numberOfLines === 0 ? undefined : (numberOfLines ?? 1)}
      >
        {label}
      </AppText>
      {badge !== undefined && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: selected ? tokens.onGold : tokens.cardBorder,
            },
          ]}
        >
          <AppText
            variant="caption"
            highlight={selected}
            style={styles.badgeText}
          >
            {badge}
          </AppText>
        </View>
      )}
    </>
  );

  let contentPadding: ViewStyle | undefined;
  let outerStyle: ViewStyle | undefined;
  let effectiveMinHeight: ViewStyle['minHeight'] = styles.chip.minHeight;
  let effectiveHeight: ViewStyle['height'] = undefined;
  let radius: ViewStyle['borderRadius'] = styles.chip.borderRadius;

  if (style) {
    const flattened = StyleSheet.flatten(style);
    if (flattened) {
      const {
        padding,
        paddingHorizontal,
        paddingVertical,
        paddingStart,
        paddingEnd,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
        minHeight,
        height,
        borderRadius,
        ...rest
      } = flattened;

      outerStyle = rest;
      if (minHeight !== undefined) {
        effectiveMinHeight = isInteractive
          ? (typeof minHeight === 'number' ? Math.max(44, minHeight) : minHeight)
          : minHeight;
      }
      if (height !== undefined) {
        effectiveHeight = isInteractive
          ? (typeof height === 'number' ? Math.max(44, height) : height)
          : height;
      }
      if (borderRadius !== undefined) {
        radius = borderRadius;
      }

      const pad: ViewStyle = {};
      if (padding !== undefined) pad.padding = padding;
      if (paddingHorizontal !== undefined) pad.paddingHorizontal = paddingHorizontal;
      if (paddingVertical !== undefined) pad.paddingVertical = paddingVertical;
      if (paddingStart !== undefined) pad.paddingStart = paddingStart;
      if (paddingEnd !== undefined) pad.paddingEnd = paddingEnd;
      if (paddingTop !== undefined) pad.paddingTop = paddingTop;
      if (paddingBottom !== undefined) pad.paddingBottom = paddingBottom;
      if (paddingLeft !== undefined) pad.paddingLeft = paddingLeft;
      if (paddingRight !== undefined) pad.paddingRight = paddingRight;
      if (Object.keys(pad).length > 0) contentPadding = pad;
    }
  }

  const outerContainerStyle: StyleProp<ViewStyle> = [
    styles.chip,
    {
      minHeight: effectiveMinHeight,
      ...(effectiveHeight !== undefined ? { height: effectiveHeight } : null),
      borderRadius: radius,
      borderColor: selected ? tokens.goldBorder : tokens.cardBorder,
      backgroundColor: selected ? undefined : tokens.cardTop,
    },
    !selected && styles.unselectedChip,
    !selected && contentPadding,
    disabled && styles.disabled,
    outerStyle,
  ];

  const gradientStyle: StyleProp<ViewStyle> = [
    styles.gradientFill,
    {
      minHeight: effectiveMinHeight,
      ...(effectiveHeight !== undefined ? { height: effectiveHeight } : null),
      borderRadius: radius,
      alignSelf: 'stretch',
    },
    contentPadding,
  ];

  if (!isInteractive) {
    return (
      <View
        testID={actualTestId}
        accessibilityLabel={accessibilityLabel}
        onLayout={onLayout}
        style={outerContainerStyle}
      >
        {selected ? (
          <LinearGradient
            colors={tokens.goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            testID={gradientTestID}
            onLayout={onGradientLayout}
            style={gradientStyle}
          >
            {innerContent}
          </LinearGradient>
        ) : (
          innerContent
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={actualTestId}
      activeOpacity={0.75}
      onPress={onPress}
      onLayout={onLayout}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={outerContainerStyle}
    >
      {selected ? (
        <LinearGradient
          colors={tokens.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          testID={gradientTestID}
          onLayout={onGradientLayout}
          style={gradientStyle}
        >
          {innerContent}
        </LinearGradient>
      ) : (
        innerContent
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  gradientFill: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
  },
  label: {
    flexShrink: 1,
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  icon: {
    marginEnd: 1,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontRoles.uiBold,
  },
  disabled: {
    opacity: 0.5,
  },
});
