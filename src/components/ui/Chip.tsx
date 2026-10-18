import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { themeTokens, fontRoles } from '../../theme/tokens';
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
}: ChipProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];

  const actualTestId = testID || (selected ? 'chip-selected' : 'chip');

  const textColor = selected ? tokens.onGold : tokens.heading;

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
        numberOfLines={1}
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

  return (
    <TouchableOpacity
      testID={actualTestId}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={[
        styles.chip,
        {
          borderColor: selected ? tokens.goldBorder : tokens.cardBorder,
          backgroundColor: selected ? undefined : tokens.cardTop,
        },
        !selected && styles.unselectedChip,
        disabled && styles.disabled,
        style,
      ]}
    >
      {selected ? (
        <LinearGradient
          colors={tokens.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
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
    minHeight: 32,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    height: '100%',
  },
  label: {
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
