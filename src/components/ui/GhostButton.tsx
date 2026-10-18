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

export interface GhostButtonProps {
  title?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

export function GhostButton({
  title,
  onPress,
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
  testID = 'btn-ghost',
  accessibilityLabel,
}: GhostButtonProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];
  const textColor = tokens.eyebrow;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={buttonTokens.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={15} color={textColor} />}
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
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: buttonTokens.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  text: {
    fontFamily: fontRoles.uiSemiBold,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
});
