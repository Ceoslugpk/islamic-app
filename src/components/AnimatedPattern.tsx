import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle, AccessibilityInfo, Dimensions, Animated } from 'react-native';
import { useTheme } from '../lib/theme';

type Variant = 'star' | 'rings' | 'arch' | 'bloom' | 'star-small';

interface AnimatedPatternProps {
  variant?: Variant;
  style?: ViewStyle;
  size?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 600;

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

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      rotation.setValue(0);
      Animated.loop(
        Animated.timing(rotation, {
          toValue: reverse ? -1 : 1,
          duration: rotationSpeed,
          useNativeDriver: true,
        })
      ).start();
    });
    return () => rotation.setValue(0);
  }, [rotation, rotationSpeed, reverse]);

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

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      rotation.setValue(0);
      Animated.loop(
        Animated.timing(rotation, {
          toValue: reverse ? -1 : 1,
          duration: rotationSpeed,
          useNativeDriver: true,
        })
      ).start();
    });
    return () => rotation.setValue(0);
  }, [rotation, rotationSpeed, reverse]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={styles.layer} pointerEvents="none">
      {Array.from({ length: ringCount }, (_, i) => {
        const ringSize = size * (0.25 + i * 0.18);
        const ringOpacity = opacity * (0.6 - i * 0.12);
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

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.08,
              duration: pulseSpeed / 2,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: opacity * 1.5,
              duration: pulseSpeed / 2,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: pulseSpeed / 2,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: opacity,
              duration: pulseSpeed / 2,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
    return () => {
      scale.setValue(1);
      opacityAnim.setValue(opacity);
    };
  }, [scale, opacityAnim, pulseSpeed, opacity]);

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
            opacity: opacity * 0.7,
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
            opacity: opacity * 0.5,
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

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      rotation.setValue(0);
      scale.setValue(1);
      Animated.loop(
        Animated.parallel([
          Animated.timing(rotation, {
            toValue: 1,
            duration: pulseSpeed * 2,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.12,
              duration: pulseSpeed / 2,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: pulseSpeed / 2,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
    return () => {
      rotation.setValue(0);
      scale.setValue(1);
    };
  }, [rotation, scale, pulseSpeed]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bloomSize = size * 0.45;

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
              width: bloomSize * 0.35,
              height: bloomSize * 0.35,
              borderColor: color,
              opacity: opacity * (0.5 + (i % 2) * 0.2),
              transform: [
                { rotate: `${(360 / petalCount) * i}deg` },
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
            opacity: opacity * 1.5,
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

  const config = {
    star: {
      layers: [
        <StarLayer
          key="star-main"
          size={size}
          color={colors.accent}
          opacity={0.055}
          rotationSpeed={45000}
        />,
        <StarLayer
          key="star-inner"
          size={size * 0.6}
          color={colors.borderSubtle}
          opacity={0.035}
          rotationSpeed={60000}
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
          opacity={0.05}
          rotationSpeed={50000}
        />,
      ],
    },
    rings: {
      layers: [
        <RingLayer
          key="rings-main"
          size={size}
          color={colors.accent}
          opacity={0.045}
          rotationSpeed={40000}
          ringCount={4}
        />,
        <RingLayer
          key="rings-inner"
          size={size * 0.65}
          color={colors.borderSubtle}
          opacity={0.03}
          rotationSpeed={55000}
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
          opacity={0.04}
          pulseSpeed={8000}
        />,
        <ArchLayer
          key="arch-inner"
          size={size * 0.7}
          color={colors.borderSubtle}
          opacity={0.025}
          pulseSpeed={10000}
        />,
      ],
    },
    bloom: {
      layers: [
        <BloomLayer
          key="bloom-main"
          size={size}
          color={colors.accent}
          opacity={0.05}
          pulseSpeed={7000}
          petalCount={8}
        />,
        <BloomLayer
          key="bloom-inner"
          size={size * 0.6}
          color={colors.borderSubtle}
          opacity={0.03}
          pulseSpeed={9000}
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
    borderWidth: 1,
    borderRadius: 2,
  },
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
  inner: {
    borderWidth: 1,
    borderRadius: 1,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  arch: {
    position: 'absolute',
    borderWidth: 1.5,
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
    borderWidth: 1,
    borderRadius: 999,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    top: 0,
    left: '50%',
    marginLeft: -9999,
  },
});