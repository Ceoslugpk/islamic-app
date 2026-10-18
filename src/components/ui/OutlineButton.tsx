import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { themeTokens, buttonTokens, fontRoles } from '../../theme/tokens';
import { AppText } from './AppText';

export interface OutlineButtonProps {
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
}

export function OutlineButton({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
  testID = 'btn-outline',
  accessibilityLabel,
  accessibilityHint,
}: OutlineButtonProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];

  const borderColor = tokens.goldBorder;
  const textColor = tokens.eyebrow;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={buttonTokens.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.button,
        {
          borderColor,
          backgroundColor: 'transparent',
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={15} color={textColor} style={styles.leftIcon} />
          )}
          {children ? (
            children
          ) : title ? (
            <AppText
              variant="link"
              style={[styles.text, textStyle]}
            >
              {title}
            </AppText>
          ) : null}
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={15} color={textColor} style={styles.rightIcon} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: buttonTokens.minHeight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: buttonTokens.borderRadius,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontFamily: fontRoles.uiSemiBold,
    fontSize: 13.5,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  leftIcon: {
    marginEnd: 2,
  },
  rightIcon: {
    marginStart: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
