import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  AccessibilityInfo,
  Image,
} from 'react-native';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../lib/theme';
import { getAppLogoSource } from '../theme/tokens';
import { isRTL, t } from '../lib/i18n';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const BG_DARK = '#0E1214';
const BG_DARK_TOP = '#12121C';
const BG_DARK_BOTTOM = '#0C0C14';
export const BG_LIGHT = '#F4EEDE';
const BG_LIGHT_TOP = '#F8F4EA';
const BG_LIGHT_BOTTOM = '#F0EBDE';
const IVORY = '#F4EEDE';
const INK = '#14221E';
export const BRAND_GREEN_LIGHT = '#105A4B';
export const BRAND_GREEN_DARK = '#10B981';
const SPLASH_ACCENT_DARK = '#E6BE6C';

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
  const gradient = isDark ? [BG_DARK_TOP, BG_DARK_BOTTOM] as const : [BG_LIGHT_TOP, BG_LIGHT_BOTTOM] as const;
  const logoColor = isDark ? IVORY : INK;
  const accentColor = isDark ? SPLASH_ACCENT_DARK : BRAND_GREEN_LIGHT;

  const [isFading, setIsFading] = useState(false);
  const [slit] = useState(() => new Animated.Value(0));
  const [grow] = useState(() => new Animated.Value(0));
  const [sweep] = useState(() => new Animated.Value(0));
  const [fadeOut] = useState(() => new Animated.Value(1));
  const [reduced, setReduced] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      AccessibilityInfo.isReduceMotionEnabled().then((v) => setReduced(!!v)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setIsFading(true);
      onDoneRef.current();
    };

    if (reduced) {
      // Reduced motion: show the logo immediately, hold briefly, done.
      slit.setValue(1);
      grow.setValue(1);
      const t = setTimeout(finish, 700);
      return () => clearTimeout(t);
    }

    const timings: [number, () => void][] = [];
    // Safety fallback: if anything prevents animation sequence from completing, ensure app reveals within 1600ms
    const safetyTimer = setTimeout(finish, 1600);
    timings.push([1, () => clearTimeout(safetyTimer)]);

    // 0-260ms: slit appears (animates height and opacity; height requires useNativeDriver: false)
    const slitAnim = Animated.timing(slit, {
      toValue: 1,
      duration: 260,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    // 260-650ms: grow outward from the slit (animates SVG x & width; requires useNativeDriver: false)
    const growAnim = Animated.timing(grow, {
      toValue: 1,
      duration: 390,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    // 650-975ms: hold + wordmark "ISLAMIC" appears
    // 975-1175ms: light sweep across the logo once (animates left property; requires useNativeDriver: false)
    const sweepAnim = Animated.timing(sweep, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    // 1175-1335ms: fade into Today (animates View opacity; native driver supported)
    const fadeAnim = Animated.timing(fadeOut, {
      toValue: 0,
      duration: 160,
      useNativeDriver: USE_NATIVE_DRIVER,
    });

    slitAnim.start(() => {
      growAnim.start(() => {
        const hold = setTimeout(() => {
          sweepAnim.start(() => {
            const hold2 = setTimeout(() => {
              setIsFading(true);
              fadeAnim.start(() => {
                clearTimeout(safetyTimer);
                finish();
              });
            }, 160);
            timings.push([1, () => clearTimeout(hold2)]);
          });
        }, 325);
        timings.push([1, () => clearTimeout(hold)]);
      });
    });

    return () => timings.forEach(([, c]) => c());
  }, [reduced, slit, grow, sweep, fadeOut]);

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
      pointerEvents={isFading ? 'none' : 'auto'}
      style={[
        styles.root,
        {
          backgroundColor: isDark ? BG_DARK_TOP : BG_LIGHT_TOP,
          opacity: fadeOut,
        },
      ]}
      accessibilityLabel={t('Islamic app splash')}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        {/* The symbol grows from the slit via an SVG mask (light mode) or smooth dark tile reveal (dark mode) */}
        <View style={styles.logoWrap}>
          {isDark ? (
            <Animated.View
              style={[
                styles.darkLogoWrap,
                {
                  opacity: grow,
                  transform: [
                    {
                      scale: grow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1],
                      }),
                    },
                  ],
                },
              ]}
              testID="splash-dark-logo"
            >
              <Image
                source={getAppLogoSource('ink')}
                style={styles.darkLogoImage}
                resizeMode="cover"
              />
            </Animated.View>
          ) : (
            <AnimatedSvg width={140} height={140} viewBox="0 0 100 100">
              <Defs>
                <Mask id="reveal">
                  <AnimatedRect x={maskX} y={0} width={maskWidth} height={100} fill="#fff" />
                </Mask>
              </Defs>
              <Path d={LOGO_PATH} fill={logoColor} mask="url(#reveal)" />
            </AnimatedSvg>
          )}

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
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : logoColor,
              },
            ]}
          />
        </View>

        {/* Wordmark — appears after the symbol is fully revealed */}
        <Animated.Text
          style={[
            styles.wordmark,
            {
              opacity: wordmarkOpacity,
              color: logoColor,
              fontFamily: isRTL() ? 'Amiri_700Bold' : 'SourceSans3_500Medium',
              letterSpacing: isRTL() ? 0 : 8,
            },
          ]}
        >
          {isRTL() ? 'اسلامک' : 'ISLAMIC'}
        </Animated.Text>

        {/* Tagline — appears at the very end (phase 2) */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              color: accentColor,
              opacity: wordmarkOpacity,
              fontFamily: isRTL() ? 'Amiri_400Regular' : 'Manrope_500Medium',
              letterSpacing: isRTL() ? 0 : 3,
              textTransform: isRTL() ? 'none' : 'uppercase',
            },
          ]}
        >
          {t('Your Daily Companion')}
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
  darkLogoWrap: {
    width: 140,
    height: 140,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkLogoImage: {
    width: 140,
    height: 140,
    borderRadius: 35,
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
  tagline: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 12,
    textTransform: 'uppercase',
  },
});
