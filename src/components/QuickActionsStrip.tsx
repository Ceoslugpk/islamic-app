import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { isRTL, t } from '../lib/i18n';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface QuickActionsStripProps {
  onOpenQibla?: () => void;
  onOpenDuas?: () => void;
  onOpenHadith?: () => void;
  onOpenTasbih?: () => void;
  style?: any;
}

interface ActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}

function ActionButton({ icon, label, onPress }: ActionItemProps) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // Calm press feedback: 120ms cubic-out scale, no springy overshoot.
    Animated.timing(scaleAnim, {
      toValue: 0.94,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePress = () => {
    haptic('light');
    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.actionCol}
      accessibilityRole="button"
      accessibilityLabel={t(label)}
    >
      <Animated.View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.iconCircleBg || colors.bgSurface,
            borderColor: colors.borderSubtle,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.iconCircleFg || colors.accent} />
      </Animated.View>
      <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>
        {t(label)}
      </Text>
    </TouchableOpacity>
  );
}

export function QuickActionsStrip({
  onOpenQibla,
  onOpenDuas,
  onOpenHadith,
  onOpenTasbih,
  style,
}: QuickActionsStripProps) {
  const actions: ActionItemProps[] = [
    {
      icon: 'compass-outline',
      label: 'Qibla',
      onPress: onOpenQibla,
    },
    {
      icon: 'book-outline',
      label: 'Duas',
      onPress: onOpenDuas,
    },
    {
      icon: 'library-outline',
      label: 'Hadith',
      onPress: onOpenHadith,
    },
    {
      icon: 'repeat-outline',
      label: 'Tasbih',
      onPress: onOpenTasbih,
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {actions.map((act) => (
        <ActionButton
          key={act.label}
          icon={act.icon}
          label={act.label}
          onPress={act.onPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
