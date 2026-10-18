import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, AccessibilityInfo } from 'react-native';
import { PRAYER_ATMOSPHERE_CONFIG, PrayerSegment } from './PrayerHeroAtmosphere';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function checkReducedMotion(cb: (reduced: boolean) => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      cb(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      return;
    }
    cb(false);
  } else {
    AccessibilityInfo.isReduceMotionEnabled().then(cb);
  }
}

interface PhaseWashProps {
  segment: PrayerSegment;
  /** How strongly the phase tint shows across the whole screen (0..1). */
  intensity?: number;
  style?: object;
}

/**
 * Part 10 — Time-of-day system: a very subtle, full-screen color wash that
 * reflects the current Islamic day phase (Fajr deep blue -> Isha deep night).
 * Transitions GRADUALLY (crossfade over ~1.2s), never snapping at prayer time.
 * Sits absolutely behind the scroll content; pointerEvents none.
 */
export function PhaseWash({ segment, intensity = 0.5, style }: PhaseWashProps) {
  const [displayed, setDisplayed] = useState<PrayerSegment>(segment);
  const [prev, setPrev] = useState<PrayerSegment>(segment);
  const [reduced, setReduced] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const isInitialMount = useRef(true);

  if (segment !== displayed) {
    setPrev(displayed);
    setDisplayed(segment);
  }

  useEffect(() => {
    checkReducedMotion(setReduced);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fade.setValue(0);
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: reduced ? 0 : 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [displayed, fade, reduced]);

  if (reduced) {
    const cfg = PRAYER_ATMOSPHERE_CONFIG[segment];
    return (
      <View
        pointerEvents="none"
        style={[
          styles.wash,
          {
            backgroundColor: cfg.color,
            opacity: cfg.opacity * intensity,
          },
          style,
        ]}
      />
    );
  }

  const prevCfg = PRAYER_ATMOSPHERE_CONFIG[prev];
  const currCfg = PRAYER_ATMOSPHERE_CONFIG[displayed];
  const currOpacity = currCfg.opacity * intensity;

  return (
    <View pointerEvents="none" style={[styles.wash, style]}>
      <Animated.View
        style={[
          styles.layer,
          {
            backgroundColor: prevCfg.color,
            opacity: prevCfg.opacity * intensity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.layer,
          {
            backgroundColor: currCfg.color,
            // ponytail: interpolate instead of Animated.multiply — multiply nodes
            // in style opacity abort rendering on Fabric/native driver (SDK 57).
            opacity: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [0, currOpacity],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wash: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
});
