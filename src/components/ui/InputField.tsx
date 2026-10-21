import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { themeTokens, fontRoles } from '../../theme/tokens';
import { getCurrentLanguage } from '../../lib/i18n';
import { getTextAlignment } from '../../lib/typography';
import { useAutoProbe } from '../../lib/diagnostic';
import { AppText } from './AppText';

export interface InputFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function InputField({
  label,
  helperText,
  errorText,
  containerStyle,
  inputStyle,
  labelStyle,
  testID,
  value,
  onChangeText,
  onLayout,
  ...rest
}: InputFieldProps) {
  const { mode, colors } = useTheme();
  const tokens = themeTokens[mode];
  const currentLanguage = getCurrentLanguage();
  const labelAlignment = getTextAlignment(label, currentLanguage, 'caption');
  const inputAlignment = getTextAlignment(value || rest.placeholder || label, currentLanguage, 'body');
  const feedbackAlignment = getTextAlignment(errorText || helperText, currentLanguage, 'caption');

  const borderColor = errorText
    ? colors.destructive
    : mode === 'ink'
    ? tokens.cardBorder
    : colors.borderSubtle;

  const backgroundColor = mode === 'ink' ? tokens.bgTop : colors.bgBase;

  const autoProbe = useAutoProbe(testID, 'InputField', { isInteractive: true });
  const combinedOnLayout = autoProbe.onLayout
    ? (e: LayoutChangeEvent) => {
        autoProbe.onLayout?.(e);
        onLayout?.(e);
      }
    : onLayout;

  return (
    <View style={[styles.container, containerStyle]} onLayout={combinedOnLayout}>
      {label ? (
        <AppText
          variant="caption"
          style={[
            styles.label,
            {
              ...labelAlignment,
            },
            labelStyle,
          ]}
        >
          {label}
        </AppText>
      ) : null}

      <TextInput
        testID={testID}
        style={[
          styles.input,
          {
            backgroundColor,
            borderColor,
            color: colors.textPrimary,
            ...inputAlignment,
          },
          inputStyle,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={rest.accessibilityLabel ?? (label || rest.placeholder)}
        {...rest}
      />

      {errorText ? (
        <AppText
          variant="caption"
          tone="danger"
          style={[
            styles.errorText,
            {
              ...feedbackAlignment,
            },
          ]}
        >
          {errorText}
        </AppText>
      ) : helperText ? (
        <AppText
          variant="caption"
          style={[
            styles.helperText,
            {
              ...feedbackAlignment,
            },
          ]}
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    fontFamily: fontRoles.uiSemiBold,
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fontRoles.ui,
    fontSize: 14,
  },
  helperText: {
    fontFamily: fontRoles.ui,
    fontSize: 11,
    marginTop: 4,
  },
  errorText: {
    fontFamily: fontRoles.uiSemiBold,
    fontSize: 11.5,
    marginTop: 4,
  },
});
