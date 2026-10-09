import React, { useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  AccessibilityInfo,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';

type Variant = 'star' | 'rings' | 'arch' | 'bloom' | 'star-small' | 'loading-star';

interface AnimatedPatternProps {
  variant?: Variant;
  style?: ViewStyle;
  size?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 600;

/** RN-web has no native animated module, so the JS driver drives the loop there. */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function isReducedMotionRequested(): boolean {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }
  return false;
}

/** Never throws: a failed reduce-motion query must not kill the animation. */
async function prefersReducedMotion(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return isReducedMotionRequested();
  }
  try {
    const query = AccessibilityInfo?.isReduceMotionEnabled;
    if (typeof query !== 'function') return false;
    return (await query.call(AccessibilityInfo)) === true;
  } catch {
    return false;
  }
}

/**
 * Runs `create()` as an infinite loop unless the user prefers reduced motion.
 * Returns a cleanup that stops the loop (and resets the layers).
 */
function startLoopIfMotionAllowed(
  create: () => Animated.CompositeAnimation,
  onStopped?: () => void
): () => void {
  let cancelled = false;
  let running: Animated.CompositeAnimation | null = null;

  const start = () => {
    if (cancelled || running) return;
    try {
      running = Animated.loop(create());
      running.start();
    } catch {
      // Graceful fallback
    }
  };

  if (Platform.OS === 'web') {
    if (!isReducedMotionRequested()) {
      start();
    }
  } else {
    prefersReducedMotion().then(
      (reduce) => {
        if (!cancelled && !reduce) start();
      },
      () => {
        if (!cancelled) start();
      }
    );
  }

  return () => {
    cancelled = true;
    if (running) {
      running.stop();
      running = null;
      onStopped?.();
    }
  };
}

function StarLayer({
  size,
  color,
  opacity,
  rotationSpeed,
  reverse = false,
}: {
  size: number;
  color: string;
  opacity: number;
  rotationSpeed: number;
  reverse?: boolean;
}) {
  // ponytail: static — no Animated.loop. Perpetual native-driver rotation loops
  // in every card starve the Fabric renderer commit while scrolling (SDK 57).
  const starSize = size * 0.45;
  const rotate = reverse ? '-360deg' : '360deg';

  return (
    <View
      style={[
        styles.layer,
        {
          width: starSize,
          height: starSize,
          borderColor: color,
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.square,
          {
            width: starSize,
            height: starSize,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.square,
          styles.rotated,
          {
            width: starSize,
            height: starSize,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.square,
          styles.inner,
          {
            width: starSize * 0.44,
            height: starSize * 0.44,
            borderColor: color,
          },
        ]}
      />
    </View>
  );
}

function RingLayer({
  size,
  color,
  opacity,
  rotationSpeed,
  reverse = false,
  ringCount = 3,
}: {
  size: number;
  color: string;
  opacity: number;
  rotationSpeed: number;
  reverse?: boolean;
  ringCount?: number;
}) {
  // ponytail: static — no Animated.loop (Fabric starvation, see StarLayer).
  return (
    <View style={styles.layer} pointerEvents="none">
      {Array.from({ length: ringCount }, (_, i) => {
        const ringSize = size * (0.25 + i * 0.18);
        const ringOpacity = opacity * (1 - i * 0.12);
        return (
          <View
            key={i}
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderColor: color,
                opacity: ringOpacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function ArchLayer({
  size,
  color,
  opacity,
  pulseSpeed,
}: {
  size: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
}) {
  // ponytail: static — no Animated.loop (Fabric starvation, see StarLayer).
  const archSize = size * 0.5;

  return (
    <View
      style={[
        styles.layer,
        {
          width: archSize,
          height: archSize,
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.arch,
          {
            width: archSize,
            height: archSize,
            borderColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.arch,
          styles.archRotated,
          {
            width: archSize * 0.7,
            height: archSize * 0.7,
            borderColor: color,
            opacity: 0.75,
          },
        ]}
      />
      <View
        style={[
          styles.arch,
          {
            width: archSize * 0.4,
            height: archSize * 0.4,
            borderColor: color,
            opacity: 0.55,
          },
        ]}
      />
    </View>
  );
}

function BloomLayer({
  size,
  color,
  opacity,
  pulseSpeed,
  petalCount = 8,
}: {
  size: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
  petalCount?: number;
}) {
  // ponytail: static — no Animated.loop (Fabric starvation, see StarLayer).
  const bloomSize = size * 0.45;
  const petalSize = bloomSize * 0.35;

  return (
    <View
      style={[
        styles.layer,
        {
          width: bloomSize,
          height: bloomSize,
        },
      ]}
      pointerEvents="none"
    >
      {Array.from({ length: petalCount }, (_, i) => (
        <View
          key={i}
          style={[
            styles.petal,
            {
              width: petalSize,
              height: petalSize,
              marginLeft: -petalSize / 2,
              marginTop: -petalSize / 2,
              borderColor: color,
              opacity: opacity * (0.8 + (i % 2) * 0.25),
              transform: [
                { rotate: `${(360 / petalCount) * i}deg` },
                { translateY: -bloomSize * 0.32 },
              ],
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.square,
          styles.inner,
          {
            width: bloomSize * 0.25,
            height: bloomSize * 0.25,
            borderColor: color,
            opacity: Math.min(opacity * 1.3, 0.20),
          },
        ]}
      />
    </View>
  );
}

export function AnimatedPattern({
  variant = 'star',
  style,
  size = IS_TABLET ? 340 : 280,
}: AnimatedPatternProps) {
  const { colors } = useTheme();

  // Opacities are clearly visible yet tasteful (~0.08 - 0.12)
  const config = {
    star: {
      layers: [
        <StarLayer
          key="star-main"
          size={size}
          color={colors.accent}
          opacity={0.12}
          rotationSpeed={22000}
        />,
        <StarLayer
          key="star-inner"
          size={size * 0.6}
          color={colors.accent}
          opacity={0.085}
          rotationSpeed={30000}
          reverse
        />,
      ],
    },
    'star-small': {
      layers: [
        <StarLayer
          key="star-small-main"
          size={size * 0.7}
          color={colors.accent}
          opacity={0.11}
          rotationSpeed={26000}
        />,
      ],
    },
    rings: {
      layers: [
        <RingLayer
          key="rings-main"
          size={size}
          color={colors.accent}
          opacity={0.12}
          rotationSpeed={20000}
          ringCount={4}
        />,
        <RingLayer
          key="rings-inner"
          size={size * 0.65}
          color={colors.accent}
          opacity={0.085}
          rotationSpeed={28000}
          reverse
          ringCount={3}
        />,
      ],
    },
    arch: {
      layers: [
        <ArchLayer
          key="arch-main"
          size={size}
          color={colors.accent}
          opacity={0.12}
          pulseSpeed={5000}
        />,
        <ArchLayer
          key="arch-inner"
          size={size * 0.7}
          color={colors.accent}
          opacity={0.085}
          pulseSpeed={6500}
        />,
      ],
    },
    bloom: {
      layers: [
        <BloomLayer
          key="bloom-main"
          size={size}
          color={colors.accent}
          opacity={0.12}
          pulseSpeed={5000}
          petalCount={8}
        />,
        <BloomLayer
          key="bloom-inner"
          size={size * 0.6}
          color={colors.accent}
          opacity={0.085}
          pulseSpeed={6500}
          petalCount={6}
        />,
      ],
    },
    'loading-star': {
      layers: [
        <StarLayer
          key="star-loading"
          size={size * 2}
          color={colors.accent}
          opacity={0.8}
          rotationSpeed={2400}
        />,
      ],
    },
  };

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      {config[variant].layers}
    </View>
  );
}

/**
 * A tiny rotating 8-point geometric Islamic star for pull-to-refresh & subtle loading states.
 */
export function GeometricLoadingStar({
  size = 28,
  color,
  style,
}: {
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const starColor = color || colors.accent;
  const rotation = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    return startLoopIfMotionAllowed(
      () =>
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      () => rotation.setValue(0)
    );
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const starSize = size;
  const squareSize = starSize * 0.68;

  return (
    <View
      style={[
        {
          width: starSize,
          height: starSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('Loading...')}
    >
      <Animated.View
        style={{
          width: starSize,
          height: starSize,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate }],
        }}
      >
        <View
          style={[
            styles.square,
            {
              width: squareSize,
              height: squareSize,
              borderColor: starColor,
              borderWidth: 1.5,
              borderRadius: 2,
            },
          ]}
        />
        <View
          style={[
            styles.square,
            styles.rotated,
            {
              width: squareSize,
              height: squareSize,
              borderColor: starColor,
              borderWidth: 1.5,
              borderRadius: 2,
            },
          ]}
        />
        <View
          style={[
            styles.square,
            {
              width: squareSize * 0.4,
              height: squareSize * 0.4,
              borderColor: starColor,
              backgroundColor: starColor,
              borderWidth: 1,
              borderRadius: 1,
              opacity: 0.9,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

export const IslamicLoadingMark = GeometricLoadingStar;

export function IslamicPullToRefreshIndicator({
  refreshing,
  style,
}: {
  refreshing: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: refreshing ? 1 : 0,
      duration: 180,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [refreshing, fadeAnim]);

  if (!refreshing) return null;

  return (
    <Animated.View
      style={[
        {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          opacity: fadeAnim,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <GeometricLoadingStar size={24} color={colors.accent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // ponytail: absolute + zIndex:-1 — an absolute full-card wrapper with no
    // zIndex paints ABOVE later in-flow siblings inside overflow:hidden cards,
    // visually hiding the card content (reproduced: container visible, content
    // missing). zIndex:-1 forces the decoration behind the content without
    // taking layout space. Content wrappers get zIndex:1 (see callers).
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: -1,
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    position: 'absolute',
    borderWidth: 1.75,
    borderRadius: 2,
  },
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
  inner: {
    borderWidth: 1.75,
    borderRadius: 1,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.75,
    borderRadius: 999,
  },
  arch: {
    position: 'absolute',
    borderWidth: 2.25,
    borderRadius: 999,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  archRotated: {
    transform: [{ rotate: '180deg' }],
  },
  petal: {
    position: 'absolute',
    borderWidth: 1.75,
    borderRadius: 999,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    top: '50%',
    left: '50%',
  },
});