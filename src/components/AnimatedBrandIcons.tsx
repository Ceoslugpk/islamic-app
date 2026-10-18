import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  AccessibilityInfo,
  Image,
} from 'react-native';
import Svg, { Path, G, Circle, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { getTokens, getAppLogoSource, ThemeMode } from '../theme/tokens';
import { t } from '../lib/i18n';

const AnimatedView = Animated.View;

/**
 * Hook to track whether the user prefers reduced motion (OS accessibility setting or web media query).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const listener = (e: MediaQueryListEvent) => {
          if (mounted) setReduced(e.matches);
        };
        if (typeof media.addEventListener === 'function') {
          media.addEventListener('change', listener);
          return () => {
            mounted = false;
            media.removeEventListener('change', listener);
          };
        }
      }
    } else {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((v) => {
          if (mounted) setReduced(!!v);
        })
        .catch(() => {});
      const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
        if (mounted) setReduced(!!v);
      });
      return () => {
        mounted = false;
        if (sub && typeof sub.remove === 'function') {
          sub.remove();
        }
      };
    }
    return () => {
      mounted = false;
    };
  }, []);

  return reduced;
}

// ---------------------------------------------------------------------------
// 1. MOTIF: Animated Crescent & Star Orbit
// ---------------------------------------------------------------------------

export interface AnimatedCrescentOrbitProps {
  size?: number;
  color?: string;
  starColor?: string;
  style?: ViewStyle;
  paused?: boolean;
}

/**
 * Animated Crescent & Star Orbit:
 * A delicate Islamic crescent moon with an orbiting 8-point star that gently
 * floats and breathes in a slow celestial loop (~3800ms).
 * Reduced-motion safe and memory-leak free.
 */
export function AnimatedCrescentOrbit({
  size = 40,
  color,
  starColor,
  style,
  paused = false,
}: AnimatedCrescentOrbitProps) {
  const { colors, mode } = useTheme();
  const reducedMotion = usePrefersReducedMotion();

  const primaryColor = color || (mode === 'ink' ? colors.forestGreen : '#105A4B');
  const secondaryColor = starColor || (mode === 'ink' ? colors.sage : colors.sage);

  const [loopAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion || paused) {
      loopAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(loopAnim, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(loopAnim, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reducedMotion, paused, loopAnim]);

  // Subtle floating and breathing range
  const floatY = loopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatY }],
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        {/* Crescent Moon Path */}
        <Path
          d="M 28 8 C 17.5 8 9 16.5 9 27 C 9 37.5 17.5 46 28 46 C 33.2 46 37.9 43.9 41.3 40.5 C 33.2 40.5 26.6 34 26.6 25.8 C 26.6 17.7 33 11.2 41 11 C 37.3 9.1 32.8 8 28 8 Z"
          fill={primaryColor}
        />
        {/* Orbiting 8-Point Star Group */}
        <G transform="translate(35, 18)">
          <Path
            d="M 0 -5 L 1.3 -1.5 L 4.8 -2.4 L 2.6 0.5 L 4.8 3.4 L 1.3 2.5 L 0 6 L -1.3 2.5 L -4.8 3.4 L -2.6 0.5 L -4.8 -2.4 L -1.3 -1.5 Z"
            fill={secondaryColor}
          />
        </G>
      </Svg>
    </AnimatedView>
  );
}

// ---------------------------------------------------------------------------
// 2. MOTIF: Animated Arabesque Khatim (8-Point Islamic Star)
// ---------------------------------------------------------------------------

export interface AnimatedArabesqueKhatimProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
  paused?: boolean;
}

/**
 * Animated Arabesque Khatim:
 * Classical 8-point geometric star (Rub el Hizb / Khatim al-Sulayman) with a calm,
 * breathing pulse and soft line resonance (~4200ms loop).
 */
export function AnimatedArabesqueKhatim({
  size = 40,
  color,
  strokeWidth = 1.8,
  style,
  paused = false,
}: AnimatedArabesqueKhatimProps) {
  const { colors, mode } = useTheme();
  const reducedMotion = usePrefersReducedMotion();

  const strokeColor = color || (mode === 'ink' ? colors.forestGreen : '#105A4B');
  const [loopAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion || paused) {
      loopAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(loopAnim, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(loopAnim, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reducedMotion, paused, loopAnim]);

  const scale = loopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.03],
  });

  const opacity = loopAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        {/* Square 1: Axis-aligned */}
        <Rect
          x={11}
          y={11}
          width={26}
          height={26}
          rx={3}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {/* Square 2: Rotated 45 degrees */}
        <G transform="translate(24, 24) rotate(45) translate(-24, -24)">
          <Rect
            x={11}
            y={11}
            width={26}
            height={26}
            rx={3}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </G>
        {/* Center dot / rosette */}
        <Circle cx={24} cy={24} r={3} fill={strokeColor} />
      </Svg>
    </AnimatedView>
  );
}

// ---------------------------------------------------------------------------
// 3. MOTIF: Animated Brand Badge (Pulsing Arch Squircle)
// ---------------------------------------------------------------------------

export interface AnimatedBrandBadgeProps {
  size?: number;
  color?: string;
  archColor?: string;
  style?: ViewStyle;
  paused?: boolean;
  mode?: ThemeMode;
}

/**
 * Animated Brand Badge:
 * The signature Islamic arch squircle logo with a gentle ambient breathing aura ring.
 * In dark mode, renders the approved crisp dark brand tile without duplicated borders.
 */
export function AnimatedBrandBadge({
  size = 36,
  color,
  archColor = '#FFFFFF',
  style,
  paused = false,
  mode: propMode,
}: AnimatedBrandBadgeProps) {
  const { colors, mode: themeMode } = useTheme();
  const mode = propMode || themeMode;
  const isDark = mode !== 'paper';
  const reducedMotion = usePrefersReducedMotion();

  const badgeColor = color || (mode === 'ink' ? colors.forestGreen : '#105A4B');
  const auraColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(16, 90, 75, 0.16)';

  const [pulseAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion || paused) {
      pulseAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [reducedMotion, paused, pulseAnim]);

  const auraScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  const auraOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.1],
  });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Ambient Breathing Aura Ring */}
      <AnimatedView
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            backgroundColor: auraColor,
            opacity: auraOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />

      {/* Crisp Brand Squircle / Dark Brand Tile */}
      {isDark ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.25),
            overflow: 'hidden',
            backgroundColor: 'transparent',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 4,
            elevation: 2,
          }}
          testID="onboarding-brand-badge-tile"
        >
          <Image
            source={getAppLogoSource('ink')}
            style={{
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.25),
            }}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.25),
            backgroundColor: badgeColor,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 4C8 4 6 7 6 11V20H18V11C18 7 16 4 12 4Z"
              stroke={archColor}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 10C10.5 10 9.5 11.5 9.5 13.5V20H14.5V13.5C14.5 11.5 13.5 10 12 10Z"
              fill={archColor}
            />
          </Svg>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4. ONBOARDING THEME TOGGLE BUTTON
// ---------------------------------------------------------------------------

export interface OnboardingThemeToggleProps {
  onToggle: () => void;
  isDark: boolean;
  style?: ViewStyle;
}

/**
 * Onboarding Theme Toggle:
 * A compact, accessible top-right toggle button (min 44x44pt touch target).
 * Features an animated rotation + scale transition when switching between Dark (Moon)
 * and Light (Sun) themes.
 */
export function OnboardingThemeToggle({
  onToggle,
  isDark,
  style,
}: OnboardingThemeToggleProps) {
  const { colors } = useTheme();
  const reducedMotion = usePrefersReducedMotion();

  const [iconAnim] = useState(() => new Animated.Value(isDark ? 1 : 0));

  useEffect(() => {
    if (reducedMotion) {
      iconAnim.setValue(isDark ? 1 : 0);
      return;
    }

    Animated.spring(iconAnim, {
      toValue: isDark ? 1 : 0,
      friction: 7,
      tension: 60,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isDark, reducedMotion, iconAnim]);

  const rotation = iconAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const scale = iconAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.82, 1],
  });

  const effectiveMode = isDark ? 'ink' : 'paper';
  const tokens = getTokens(effectiveMode);
  const iconColor = isDark ? tokens.gold : (tokens.accent || '#105A4B');

  return (
    <TouchableOpacity
      testID="onboarding-theme-toggle"
      accessibilityRole="button"
      accessibilityLabel={`${t('Theme')}: ${isDark ? t('Light') : t('Dark')}`}
      onPress={onToggle}
      activeOpacity={0.75}
      style={[
        styles.themeToggleBtn,
        {
          backgroundColor: colors.cardElevated || colors.bgSurface,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <AnimatedView
        style={{
          transform: [{ rotate: rotation }, { scale }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          size={20}
          color={iconColor}
        />
      </AnimatedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  themeToggleBtn: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
});
