import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  Animated,
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

function FloatingOrb({
  size,
  color,
  opacity,
  xRange,
  yRange,
  duration,
  top,
  left,
  right,
  bottom,
  reducedMotion,
}: {
  size: number;
  color: string;
  opacity: number;
  xRange: [number, number];
  yRange: [number, number];
  duration: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  reducedMotion: boolean;
}) {
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      animX.setValue(0.5);
      animY.setValue(0.5);
      return;
    }

    const loopX = Animated.loop(
      Animated.sequence([
        Animated.timing(animX, {
          toValue: 1,
          duration: duration * 0.52,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(animX, {
          toValue: 0,
          duration: duration * 0.48,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    const loopY = Animated.loop(
      Animated.sequence([
        Animated.timing(animY, {
          toValue: 1,
          duration: duration * 0.46,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(animY, {
          toValue: 0,
          duration: duration * 0.54,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    loopX.start();
    loopY.start();

    return () => {
      loopX.stop();
      loopY.stop();
    };
  }, [animX, animY, duration, reducedMotion]);

  const translateX = animX.interpolate({
    inputRange: [0, 1],
    outputRange: xRange,
  });

  const translateY = animY.interpolate({
    inputRange: [0, 1],
    outputRange: yRange,
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          top: top as any,
          left: left as any,
          right: right as any,
          bottom: bottom as any,
          transform: [{ translateX }, { translateY }],
        },
      ]}
      pointerEvents="none"
    />
  );
}

function DiamondParticle({
  size,
  color,
  opacity,
  xRange,
  yRange,
  duration,
  top,
  left,
  right,
  bottom,
  reducedMotion,
}: {
  size: number;
  color: string;
  opacity: number;
  xRange: [number, number];
  yRange: [number, number];
  duration: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  reducedMotion: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, reducedMotion]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: xRange,
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: yRange,
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderColor: color,
          opacity,
          top: top as any,
          left: left as any,
          right: right as any,
          bottom: bottom as any,
          transform: [{ translateX }, { translateY }, { rotate: '45deg' }],
        },
      ]}
      pointerEvents="none"
    />
  );
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
      crossfadeAnim.setValue(0);
      Animated.timing(crossfadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }
  }, [segment, displayedSegment, crossfadeAnim]);

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
        <AnimatedPattern variant="star" size={size} />
      </View>

      {/* 3. Extremely slow floating orbs (barely noticeable: 0.03 - 0.05 opacity) */}
      <FloatingOrb
        size={84}
        color={currConfig.color}
        opacity={0.045}
        xRange={[-14, 20]}
        yRange={[-10, 16]}
        duration={48000}
        top="8%"
        right="6%"
        reducedMotion={reducedMotion}
      />
      <FloatingOrb
        size={70}
        color={colors.accent}
        opacity={0.035}
        xRange={[18, -16]}
        yRange={[14, -12]}
        duration={54000}
        bottom="12%"
        left="8%"
        reducedMotion={reducedMotion}
      />
      <FloatingOrb
        size={48}
        color={colors.accent}
        opacity={0.04}
        xRange={[-12, 14]}
        yRange={[-16, 12]}
        duration={40000}
        top="45%"
        left="42%"
        reducedMotion={reducedMotion}
      />

      {/* 4. Tiny geometric particles drifting with slow parallax */}
      <DiamondParticle
        size={7}
        color={colors.accent}
        opacity={0.035}
        xRange={[-10, 8]}
        yRange={[10, -8]}
        duration={34000}
        top="18%"
        left="14%"
        reducedMotion={reducedMotion}
      />
      <DiamondParticle
        size={6}
        color={colors.accent}
        opacity={0.03}
        xRange={[12, -10]}
        yRange={[-12, 10]}
        duration={42000}
        bottom="22%"
        right="16%"
        reducedMotion={reducedMotion}
      />
      <DiamondParticle
        size={5}
        color={colors.accent}
        opacity={0.025}
        xRange={[-8, 8]}
        yRange={[-8, 8]}
        duration={38000}
        top="32%"
        right="30%"
        reducedMotion={reducedMotion}
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
