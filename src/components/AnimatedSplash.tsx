import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
} from 'react-native';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';

import { useTheme } from '../lib/theme';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BG_DARK = '#0E1214';
const BG_LIGHT = '#F4EEE1';
const IVORY = '#F4EEE1';
const INK = '#0E1214';
const GOLD = '#B8975A';

// Exact approved symbol geometry (viewBox 100x100, from the brand SVGs)
const LOGO_PATH = 'M20 93V37A32 32 0 0 1 52 5H65A15 15 0 0 1 80 20V93H65.4L65 37.5A6.5 6.5 0 0 0 52 37.5L51.6 93Z';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface AnimatedSplashProps {
  onDone: () => void;
}

/**
 * Brand splash: dark #0E1214 → a thin vertical slit of light appears where the
 * logo's opening is → the symbol grows outward from the slit → hold → one very
 * subtle light sweep → fade into the app (Today).
 * No crescent, no patterns, no spinner, no tagline. Just the identity.
 */
export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const { mode } = useTheme();
  const isDark = mode !== 'paper';
  const bg = isDark ? BG_DARK : BG_LIGHT;
  const logoColor = isDark ? IVORY : INK;
  const accentColor = isDark ? GOLD : INK;

  // Phase progress (0..1 drives the timeline, we step phases manually)
  const [phase, setPhase] = useState(0);
  const slit = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then((v) => setReduced(!!v)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (reduced) {
      // Reduced motion: show the logo immediately, hold briefly, done.
      slit.setValue(1);
      grow.setValue(1);
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }

    const timings: Array<[number, () => void]> = [];
    // Safety fallback: if anything prevents animation sequence from completing, ensure app reveals within 1200ms
    const safetyTimer = setTimeout(() => {
      onDone();
    }, 1200);
    timings.push([1, () => clearTimeout(safetyTimer)]);

    // 0-200ms: slit appears (animates height and opacity; height requires useNativeDriver: false)
    const slitAnim = Animated.timing(slit, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
      easing: Easing.out(Easing.quad),
    });
    // 200-500ms: grow outward from the slit (animates SVG x & width; requires useNativeDriver: false)
    const growAnim = Animated.timing(grow, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    // 500-750ms: hold + wordmark "ISLAMIC" appears
    // 750-900ms: light sweep across the logo once (animates left property; requires useNativeDriver: false)
    const sweepAnim = Animated.timing(sweep, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.sin),
    });
    // 900-1000ms: fade into Today (animates View opacity; native driver supported)
    const fadeAnim = Animated.timing(fadeOut, {
      toValue: 0,
      duration: 120,
      useNativeDriver: USE_NATIVE_DRIVER,
    });

    slitAnim.start(() => {
      growAnim.start(() => {
        setPhase(1); // wordmark + hold
        const hold = setTimeout(() => {
          sweepAnim.start(() => {
            const hold2 = setTimeout(() => {
              fadeAnim.start(() => {
                clearTimeout(safetyTimer);
                onDone();
              });
            }, 120);
            timings.push([1, () => clearTimeout(hold2)]);
          });
        }, 250);
        timings.push([1, () => clearTimeout(hold)]);
      });
    });

    return () => timings.forEach(([, c]) => c());
  }, [reduced, slit, grow, sweep, fadeOut, onDone]);

  // Mask: a rectangle that grows SYMMETRICALLY from the slit (x≈58, the true
  // center of the logo's open-base gap between x=51.6 and x=65.4) outward both ways
  const maskX = grow.interpolate({ inputRange: [0, 1], outputRange: [58, 0] });
  const maskWidth = grow.interpolate({ inputRange: [0, 1], outputRange: [0, 116] });

  // Slit: thin vertical line at x≈58 (center of the opening), subtle gold/ivory
  const slitOpacity = slit.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const slitHeight = slit.interpolate({ inputRange: [0, 1], outputRange: [20, 88] });

  // Light sweep: a soft vertical band moving left→right across the logo
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, 130] });
  const sweepOpacity = sweep.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.18, 0.18, 0] });

  const wordmarkOpacity = grow.interpolate({ inputRange: [0.7, 1], outputRange: [0, 1] });

  return (
    <Animated.View
      style={[styles.root, { backgroundColor: bg, opacity: fadeOut }]}
      accessibilityLabel="Islamic app splash"
    >
      <View style={styles.center}>
        {/* The symbol grows from the slit via an SVG mask */}
        <View style={styles.logoWrap}>
          <AnimatedSvg width={140} height={140} viewBox="0 0 100 100">
            <Defs>
              <Mask id="reveal">
                <AnimatedRect x={maskX} y={0} width={maskWidth} height={100} fill="#fff" />
              </Mask>
            </Defs>
            <Path d={LOGO_PATH} fill={logoColor} mask="url(#reveal)" />
          </AnimatedSvg>

          {/* Slit light (the vertical opening that starts the reveal) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slit,
              {
                opacity: slitOpacity,
                height: slitHeight,
                backgroundColor: accentColor,
              },
            ]}
          />

          {/* Light sweep */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sweep,
              {
                left: sweepX,
                opacity: sweepOpacity,
                backgroundColor: logoColor,
              },
            ]}
          />
        </View>

        {/* Wordmark — appears after the symbol is fully revealed */}
        <Animated.Text
          style={[styles.wordmark, { opacity: wordmarkOpacity, color: logoColor }]}
        >
          ISLAMIC
        </Animated.Text>

        {/* "Today" hint — appears at the very end (phase 2) */}
        <Animated.Text
          style={[styles.todayHint, { color: accentColor, opacity: wordmarkOpacity }]}
        >
          ↓ Today
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slit: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
    // x≈58 units → 81px in the 140px wrap (1 unit = 1.4px); centered on the opening
    left: 80,
    top: 52, // y≈37 units → 52px (where the slit gap begins)
  },
  sweep: {
    position: 'absolute',
    width: 26,
    height: 140,
    top: 0,
    borderRadius: 26,
  },
  wordmark: {
    fontFamily: 'SourceSans3_500Medium',
    fontSize: 18,
    letterSpacing: 8,
    marginTop: 18,
  },
  todayHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 12,
    textTransform: 'uppercase',
  },
});
