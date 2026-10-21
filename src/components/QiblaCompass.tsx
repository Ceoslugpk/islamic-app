import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { shortestAngleDelta } from '../lib/qibla';
import { isRTL, t } from '../lib/i18n';
import { AppText } from './ui/AppText';

interface QiblaCompassProps {
  rotation: number; // degrees (bearing - heading)
  bearing: number | null;
  heading: number | null;
  isAligned: boolean;
  isStaticMode: boolean;
  size?: number;
}

const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);
const CARDINAL_EDGE_OFFSET = 22;

export function getCompassCardinalPosition(
  cardinal: 'east' | 'west',
  rtl: boolean
): { start?: number; end?: number } {
  if (cardinal === 'east') return rtl ? { start: CARDINAL_EDGE_OFFSET } : { end: CARDINAL_EDGE_OFFSET };
  return rtl ? { end: CARDINAL_EDGE_OFFSET } : { start: CARDINAL_EDGE_OFFSET };
}

export function resolveQiblaNeedleRotation(
  rotation: number,
  bearing: number | null,
  heading: number | null,
  isStaticMode: boolean
): number {
  return isStaticMode || heading === null ? (bearing ?? 0) : rotation;
}

export function QiblaCompass({
  rotation,
  bearing,
  heading,
  isAligned,
  isStaticMode,
  size = 280,
}: QiblaCompassProps) {
  const { colors } = useTheme();
  const rtl = isRTL();

  // Continuous angle tracker to prevent 360-degree wrap spins
  const targetRotation = resolveQiblaNeedleRotation(rotation, bearing, heading, isStaticMode);
  const currentAngleRef = useRef(targetRotation);
  const [animRotation] = useState(() => new Animated.Value(targetRotation));

  useEffect(() => {
    const delta = shortestAngleDelta(targetRotation, currentAngleRef.current);
    const nextAngle = currentAngleRef.current + delta;
    currentAngleRef.current = nextAngle;

    Animated.spring(animRotation, {
      toValue: nextAngle,
      friction: 8,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [targetRotation, animRotation]);

  const spin = animRotation.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  const radius = size / 2;
  const tickRadius = radius - 16;
  const innerRing1 = size - 56;
  const innerRing2 = size - 110;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer bezel ring */}
      <View
        style={[
          styles.outerRing,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: isAligned ? colors.accent : colors.borderLine,
            backgroundColor: colors.bgSurface,
          },
        ]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          bearing === null
            ? t('Qibla compass')
            : t('Qibla compass. Bearing {{bearing}} degrees. {{state}}', {
                bearing: Math.round(bearing),
                state: isAligned ? t('Facing Qibla') : t('Not facing Qibla'),
              })
        }
      >
        {/* Top device alignment marker (phone top notch) */}
        <View style={styles.topAlignmentMarker}>
          <View
            style={[
              styles.markerTriangle,
              {
                borderTopColor: isAligned ? colors.accent : colors.textMuted,
              },
            ]}
          />
        </View>

        {/* Concentric inner ring 1 */}
        <View
          style={[
            styles.innerRing,
            {
              width: innerRing1,
              height: innerRing1,
              borderRadius: innerRing1 / 2,
              borderColor: colors.borderSubtle,
            },
          ]}
        />

        {/* Concentric inner ring 2 */}
        <View
          style={[
            styles.innerRing,
            {
              width: innerRing2,
              height: innerRing2,
              borderRadius: innerRing2 / 2,
              borderColor: colors.borderSubtle,
              opacity: 0.6,
            },
          ]}
        />

        {/* 15-degree Tick Marks */}
        {TICKS.map((deg) => {
          const isCardinal = deg % 90 === 0;
          const isIntercardinal = deg % 45 === 0 && !isCardinal;
          const tickHeight = isCardinal ? 10 : isIntercardinal ? 7 : 4;
          const tickWidth = isCardinal ? 2 : 1;
          const tickColor = isCardinal
            ? deg === 0
              ? colors.accent
              : colors.textSecondary
            : isIntercardinal
            ? colors.textMuted
            : colors.borderStrong;

          return (
            <View
              key={deg}
              style={[
                styles.tick,
                {
                  height: tickHeight,
                  width: tickWidth,
                  backgroundColor: tickColor,
                  transform: [
                    { rotate: `${deg}deg` },
                    { translateY: -tickRadius },
                  ],
                },
              ]}
            />
          );
        })}

        {/* Cardinal Letters */}
        <AppText
          variant="eyebrow"
          highlight
          style={[
            styles.cardinal,
            styles.north,
          ]}
        >
          {t('N')}
        </AppText>
        <AppText
          variant="eyebrow"
          tone="faint"
          style={[
            styles.cardinal,
            styles.east,
            getCompassCardinalPosition('east', rtl),
          ]}
        >
          {t('E')}
        </AppText>
        <AppText
          variant="eyebrow"
          tone="faint"
          style={[
            styles.cardinal,
            styles.south,
          ]}
        >
          {t('S')}
        </AppText>
        <AppText
          variant="eyebrow"
          tone="faint"
          style={[
            styles.cardinal,
            styles.west,
            getCompassCardinalPosition('west', rtl),
          ]}
        >
          {t('W')}
        </AppText>

        {/* Rotating Needle Assembly */}
        <Animated.View
          style={[
            styles.needleWrap,
            {
              width: size,
              height: size,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          {/* North/Qibla Pointer (Amber Arrow) */}
          <View style={styles.pointerWrap}>
            {/* Arrowhead */}
            <View
              style={[
                styles.arrowHead,
                {
                  borderBottomColor: colors.accent,
                },
              ]}
            />
            {/* Upper needle stem */}
            <View
              style={[
                styles.needleStem,
                {
                  height: radius - 55,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>

          {/* Tail / Opposite Pointer (Muted) */}
          <View style={styles.tailWrap}>
            <View
              style={[
                styles.needleTail,
                {
                  height: radius - 75,
                  backgroundColor: colors.borderStrong,
                },
              ]}
            />
          </View>

          {/* Center Hub / Pivot Pin */}
          <View
            style={[
              styles.hubOuter,
              {
                backgroundColor: colors.bgRaised,
                borderColor: isAligned ? colors.accent : colors.borderStrong,
              },
            ]}
          >
            <View
              style={[
                styles.hubInner,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Aligned Badge */}
      {isAligned && !isStaticMode && heading !== null && (
        <View style={[styles.alignedBadge, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
          <AppText variant="rowTitle" highlight style={styles.alignedBadgeText}>{t('Facing Qibla')}</AppText>
        </View>
      )}

      {/* Calibration hint badge when live heading is not yet available */}
      {heading === null && !isStaticMode && (
        <View style={[styles.alignedBadge, { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle }]}>
          <Ionicons name="compass-outline" size={14} color={colors.accent} />
          <AppText variant="rowTitle" tone="faint" style={styles.alignedBadgeText}>{t('Rotate device to calibrate')}</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRing: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topAlignmentMarker: {
    position: 'absolute',
    top: 3,
    alignSelf: 'center',
    zIndex: 5,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  tick: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -5,
    marginLeft: -1,
  },
  cardinal: {
    position: 'absolute',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  north: {
    top: 22,
    alignSelf: 'center',
  },
  east: {
    top: '50%',
    marginTop: -9,
  },
  south: {
    bottom: 22,
    alignSelf: 'center',
  },
  west: {
    top: '50%',
    marginTop: -9,
  },
  needleWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerWrap: {
    position: 'absolute',
    bottom: '50%',
    alignItems: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  needleStem: {
    width: 3.5,
    borderRadius: 1.75,
  },
  tailWrap: {
    position: 'absolute',
    top: '50%',
    alignItems: 'center',
  },
  needleTail: {
    width: 3,
    borderRadius: 1.5,
  },
  hubOuter: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  hubInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alignedBadge: {
    position: 'absolute',
    bottom: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 20,
  },
  alignedBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
