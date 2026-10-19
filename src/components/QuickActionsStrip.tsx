import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, getCardShadow } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { HOME_THEME_TOKENS } from '../lib/constants';
import { isRTL, t } from '../lib/i18n';
import { AppText } from './ui/AppText';

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
  subtitle: string;
  onPress?: () => void;
}

function ActionButton({ icon, label, subtitle, onPress }: ActionItemProps) {
  const { mode } = useTheme();
  const homeTokens = HOME_THEME_TOKENS[mode];
  const { haptic } = useHaptics();
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePress = () => {
    haptic('light');
    onPress?.();
  };

  return (
    <Animated.View
      style={[
        styles.cardWrap,
        {
          transform: [{ scale: scaleAnim }],
          borderRadius: 18,
          backgroundColor: homeTokens.cardTop,
          ...getCardShadow(mode),
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.actionCard,
          {
            backgroundColor: homeTokens.cardTop,
            borderColor: homeTokens.cardBorder,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${t(label)}, ${t(subtitle)}`}
        focusable={true}
        {...(Platform.OS === 'web'
          ? ({
              tabIndex: 0,
              onKeyDown: (e: any) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault?.();
                  handlePress();
                }
              },
            } as any)
          : {})}
      >
        <LinearGradient
          colors={[homeTokens.cardTop, homeTokens.cardBottom]}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: homeTokens.ringFill,
              borderColor: homeTokens.ringBorder,
            },
          ]}
        >
          <Ionicons name={icon} size={16} color={homeTokens.accent} />
        </View>
        <AppText
          variant="rowTitle"
          style={[
            styles.actionLabel,
            {
              fontFamily: isRTL() ? 'Amiri_700Bold' : 'Manrope_700Bold',
              textAlign: isRTL() ? 'right' : 'left',
            },
          ]}
          numberOfLines={2}
        >
          {t(label)}
        </AppText>
        <AppText
          variant="caption"
          style={[
            styles.actionSubtitle,
            {
              textAlign: isRTL() ? 'right' : 'left',
            },
          ]}
          numberOfLines={2}
        >
          {t(subtitle)}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const QuickActionsStrip = React.memo(function QuickActionsStrip({
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
      subtitle: 'Direction of Prayer',
      onPress: onOpenQibla,
    },
    {
      icon: 'repeat-outline',
      label: 'Tasbih',
      subtitle: 'Digital dhikr counter',
      onPress: onOpenTasbih,
    },
    {
      icon: 'hand-left-outline',
      label: 'Duas',
      subtitle: 'Authentic Adhkar',
      onPress: onOpenDuas,
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {actions.map((act) => (
        <ActionButton
          key={act.label}
          icon={act.icon}
          label={act.label}
          subtitle={act.subtitle}
          onPress={act.onPress}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 7,
    marginBottom: 14.5,
    width: '100%',
  },
  cardWrap: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  actionCard: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 13.5,
    letterSpacing: 0.2,
    marginBottom: 1,
    flexShrink: 1,
  },
  actionSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
    flexShrink: 1,
  },
});
