import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { themeTokens, fontRoles } from '../../theme/tokens';
import { isRTL, t } from '../../lib/i18n';
import { useAutoProbe } from '../../lib/diagnostic';

export interface SearchFieldProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  inputOnLayout?: (e: LayoutChangeEvent) => void;
  inputTestID?: string;
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  style,
  inputStyle,
  testID = 'search',
  onLayout: onLayoutProp,
  inputOnLayout,
  inputTestID,
  ...rest
}: SearchFieldProps) {
  const { mode, colors } = useTheme();
  const tokens = themeTokens[mode];
  const rtl = isRTL();

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  const autoProbe = useAutoProbe(testID, 'SearchField');
  const onLayout = autoProbe.onLayout
    ? (e: LayoutChangeEvent) => {
        autoProbe.onLayout?.(e);
        onLayoutProp?.(e);
      }
    : onLayoutProp;

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: mode === 'ink' ? tokens.cardTop : colors.bgSurface,
          borderColor: mode === 'ink' ? tokens.cardBorder : colors.borderSubtle,
          flexDirection: 'row',
        },
        style,
      ]}
    >
      <Ionicons
        name="search"
        size={17}
        color={colors.textMuted}
        style={rtl ? styles.iconRtl : styles.iconLtr}
      />
      <TextInput
        testID={inputTestID}
        onLayout={inputOnLayout}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            textAlign: rtl ? 'right' : 'left',
            fontFamily: rtl ? fontRoles.arabicNoto : fontRoles.ui,
            writingDirection: rtl ? 'rtl' : 'ltr',
            fontSize: rtl ? 15 : 14,
          },
          inputStyle,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('Search…')}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={rest.accessibilityLabel ?? (placeholder ?? t('Search…'))}
        autoCorrect={false}
        clearButtonMode="never"
        {...rest}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel={t('Clear search')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    marginEnd: 8,
  },
  iconLtr: {
    marginEnd: 8,
  },
  iconRtl: {
    marginEnd: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontRoles.ui,
    fontSize: 14,
    minHeight: 36,
  },
  clearBtn: {
    padding: 4,
  },
});
