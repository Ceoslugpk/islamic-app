import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  AccessibilityInfo,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../lib/theme';

type Variant = 'star' | 'rings' | 'arch' | 'bloom' | 'star-small';

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
  const rotation = useMemo(() => new Animated.Value(0), []);

  useEffect(
    () =>
      startLoopIfMotionAllowed(
        () =>
          Animated.timing(rotation, {
            toValue: reverse ? -1 : 1,
            duration: rotationSpeed,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        () => rotation.setValue(0)
      ),
    [rotation, rotationSpeed, reverse]
  );

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const starSize = size * 0.45;

  return (
    <Animated.View
      style={[
        styles.layer,
        {
          width: starSize,
          height: starSize,
          borderColor: color,
          opacity,
          transform: [{ rotate }],
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
    </Animated.View>
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
  const rotation = useMemo(() => new Animated.Value(0), []);

  useEffect(
    () =>
      startLoopIfMotionAllowed(
        () =>
          Animated.timing(rotation, {
            toValue: reverse ? -1 : 1,
            duration: rotationSpeed,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        () => rotation.setValue(0)
      ),
    [rotation, rotationSpeed, reverse]
  );

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={styles.layer} pointerEvents="none">
      {Array.from({ length: ringCount }, (_, i) => {
        const ringSize = size * (0.25 + i * 0.18);
        const ringOpacity = opacity * (1 - i * 0.12);
        return (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderColor: color,
                opacity: ringOpacity,
                transform: [{ rotate }],
              },
            ]}
          />
        );
      })}
    </Animated.View>
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
  const scale = useMemo(() => new Animated.Value(1), []);
  const opacityAnim = useMemo(() => new Animated.Value(opacity), [opacity]);

  useEffect(
    () =>
      startLoopIfMotionAllowed(
        () =>
          Animated.sequence([
            Animated.parallel([
              Animated.timing(scale, {
                toValue: 1.08,
                duration: pulseSpeed / 2,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(opacityAnim, {
                toValue: Math.min(opacity * 1.5, 0.22),
                duration: pulseSpeed / 2,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]),
            Animated.parallel([
              Animated.timing(scale, {
                toValue: 1,
                duration: pulseSpeed / 2,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(opacityAnim, {
                toValue: opacity,
                duration: pulseSpeed / 2,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]),
          ]),
        () => {
          scale.setValue(1);
          opacityAnim.setValue(opacity);
        }
      ),
    [scale, opacityAnim, pulseSpeed, opacity]
  );

  const archSize = size * 0.5;

  return (
    <Animated.View
      style={[
        styles.layer,
        {
          width: archSize,
          height: archSize,
          opacity: opacityAnim,
          transform: [{ scale }],
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
    </Animated.View>
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
  const rotation = useMemo(() => new Animated.Value(0), []);
  const scale = useMemo(() => new Animated.Value(1), []);

  useEffect(
    () =>
      startLoopIfMotionAllowed(
        () =>
          Animated.parallel([
            Animated.timing(rotation, {
              toValue: 1,
              duration: pulseSpeed * 4,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.sequence([
              Animated.timing(scale, {
                toValue: 1.12,
                duration: pulseSpeed / 2,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(scale, {
                toValue: 1,
                duration: pulseSpeed / 2,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]),
          ]),
        () => {
          rotation.setValue(0);
          scale.setValue(1);
        }
      ),
    [rotation, scale, pulseSpeed]
  );

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bloomSize = size * 0.45;
  const petalSize = bloomSize * 0.35;

  return (
    <Animated.View
      style={[
        styles.layer,
        {
          width: bloomSize,
          height: bloomSize,
          transform: [{ rotate }],
        },
      ]}
      pointerEvents="none"
    >
      {Array.from({ length: petalCount }, (_, i) => (
        <Animated.View
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
                { scale },
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
    </Animated.View>
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
  };

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      {config[variant].layers}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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