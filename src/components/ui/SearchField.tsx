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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { themeTokens, fontRoles } from '../../theme/tokens';
import { isRTL, t } from '../../lib/i18n';

export interface SearchFieldProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  style,
  inputStyle,
  testID = 'search',
  ...rest
}: SearchFieldProps) {
  const { mode, colors } = useTheme();
  const tokens = themeTokens[mode];
  const rtl = isRTL();

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View
      testID={testID}
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
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            textAlign: rtl ? 'right' : 'left',
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    height: 44,
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
    fontFamily: fontRoles.ui,
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
});
