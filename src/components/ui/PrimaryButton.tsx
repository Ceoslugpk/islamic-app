import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { themeTokens, buttonTokens, fontRoles } from '../../theme/tokens';
import { AppText } from './AppText';

export interface PrimaryButtonProps {
  title?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  onGradientLayout?: (e: LayoutChangeEvent) => void;
  gradientTestID?: string;
  onLabelLayout?: (e: LayoutChangeEvent) => void;
  labelTestID?: string;
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
  testID = 'btn-primary',
  accessibilityLabel,
  accessibilityHint,
  onLayout,
  onGradientLayout,
  gradientTestID,
  onLabelLayout,
  labelTestID,
}: PrimaryButtonProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];

  const gradientColors = tokens.goldGradient;
  const textColor = tokens.onGold;
  const { padding, paddingHorizontal, paddingVertical, paddingStart, paddingEnd, paddingTop, paddingBottom, paddingLeft, paddingRight, ...outerStyle } = StyleSheet.flatten(style) ?? {};
  const contentPadding = { padding, paddingHorizontal, paddingVertical, paddingStart, paddingEnd, paddingTop, paddingBottom, paddingLeft, paddingRight };
  const radius = outerStyle.borderRadius ?? buttonTokens.borderRadius;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.8}
      onPress={onPress}
      onLayout={onLayout}
      disabled={disabled || loading}
      hitSlop={buttonTokens.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.buttonWrap,
        (disabled || loading) && styles.disabled,
        outerStyle,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        testID={gradientTestID}
        onLayout={onGradientLayout}
        style={[styles.gradient, { borderRadius: radius }, Object.fromEntries(Object.entries(contentPadding).filter(([, value]) => value !== undefined))]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Ionicons name={icon} size={16} color={textColor} style={styles.leftIcon} />
            )}
            {children ? (
              children
            ) : title ? (
              <AppText
                testID={labelTestID}
                onLayout={onLabelLayout}
                variant="link"
                tone="onGold"
                style={[styles.text, textStyle]}
              >
                {title}
              </AppText>
            ) : null}
            {icon && iconPosition === 'right' && (
              <Ionicons name={icon} size={16} color={textColor} style={styles.rightIcon} />
            )}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    minHeight: buttonTokens.minHeight,
    borderRadius: buttonTokens.borderRadius,
    overflow: 'hidden',
  },
  gradient: {
    alignSelf: 'stretch',
    minHeight: buttonTokens.minHeight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontRoles.uiSemiBold,
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  leftIcon: {
    marginEnd: 2,
  },
  rightIcon: {
    marginStart: 2,
  },
  disabled: {
    opacity: 0.6,
  },
});
