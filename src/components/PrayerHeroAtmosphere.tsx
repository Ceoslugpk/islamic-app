import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { AnimatedPattern } from './AnimatedPattern';

export type PrayerSegment = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export const PRAYER_ATMOSPHERE_CONFIG: Record<
  PrayerSegment,
  { color: string; opacity: number; label: string }
> = {
  Fajr: { color: '#1a2340', opacity: 0.12, label: 'Pre-Dawn Deep Blue' },
  Sunrise: { color: '#d99b60', opacity: 0.09, label: 'Early Golden Glow' },
  Dhuhr: { color: '#e8decb', opacity: 0.07, label: 'Bright Neutral Daylight' },
  Asr: { color: '#c47832', opacity: 0.10, label: 'Warm Amber Afternoon' },
  Maghrib: { color: '#251b3e', opacity: 0.12, label: 'Twilight Deep Indigo' },
  Isha: { color: '#0e1017', opacity: 0.12, label: 'Night Sky Deep Charcoal' },
};

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function checkReducedMotion(cb: (reduced: boolean) => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      cb(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      return;
    }
    cb(false);
    return;
  }
  AccessibilityInfo.isReduceMotionEnabled()
    .then((val) => cb(!!val))
    .catch(() => cb(false));
}

interface PrayerHeroAtmosphereProps {
  segment: PrayerSegment;
  size?: number;
  style?: ViewStyle;
}

export function PrayerHeroAtmosphere({
  segment,
  size = 320,
  style,
}: PrayerHeroAtmosphereProps) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Time-of-day wash crossfade state
  const [displayedSegment, setDisplayedSegment] = useState<PrayerSegment>(segment);
  const [prevSegment, setPrevSegment] = useState<PrayerSegment>(segment);
  const crossfadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkReducedMotion(setReducedMotion);
  }, []);

  useEffect(() => {
    if (segment !== displayedSegment) {
      setPrevSegment(displayedSegment);
      setDisplayedSegment(segment);
      // Calm 300ms crossfade; skip animation entirely under reduce-motion.
      crossfadeAnim.setValue(0);
      Animated.timing(crossfadeAnim, {
        toValue: 1,
        duration: reducedMotion ? 0 : 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [segment, displayedSegment, crossfadeAnim, reducedMotion]);

  const prevConfig = PRAYER_ATMOSPHERE_CONFIG[prevSegment];
  const currConfig = PRAYER_ATMOSPHERE_CONFIG[displayedSegment];

  const prevOpacity = crossfadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevConfig.opacity, 0],
  });

  const currOpacity = crossfadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, currConfig.opacity],
  });

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* 1. Subtle time-of-day atmosphere color wash layers with smooth crossfade */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: prevConfig.color,
            opacity: prevOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: currConfig.color,
            opacity: currOpacity,
          },
        ]}
      />

      {/* 2. Faint Islamic star pattern behind (~0.05 opacity) */}
      <View style={[StyleSheet.absoluteFill, styles.starWrapper]} pointerEvents="none">
      </View>

      {/* 3. Static floating orbs (barely noticeable: 0.03 - 0.05 opacity).
          ponytail: static — perpetual native-driver Animated.loop nodes across
          every Home card starve the Fabric renderer commit while scrolling. */}
      <View
        style={[
          styles.orb,
          {
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: currConfig.color,
            opacity: 0.045,
            top: '8%',
            right: '6%',
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: colors.accent,
            opacity: 0.035,
            bottom: '12%',
            left: '8%',
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.accent,
            opacity: 0.04,
            top: '45%',
            left: '42%',
          },
        ]}
      />

      {/* 4. Tiny static geometric particles (drifting parallax removed — same reason) */}
      <View
        style={[
          styles.particle,
          {
            width: 7,
            height: 7,
            borderColor: colors.accent,
            opacity: 0.035,
            top: '18%',
            left: '14%',
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.particle,
          {
            width: 6,
            height: 6,
            borderColor: colors.accent,
            opacity: 0.03,
            bottom: '22%',
            right: '16%',
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.particle,
          {
            width: 5,
            height: 5,
            borderColor: colors.accent,
            opacity: 0.025,
            top: '32%',
            right: '30%',
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 16,
  },
  starWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.42, // scales AnimatedPattern's ~0.12 down to ~0.05
  },
  orb: {
    position: 'absolute',
  },
  particle: {
    position: 'absolute',
    borderWidth: 1,
  },
});
