import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Rect, G, Line } from 'react-native-svg';
import { useTheme } from '../lib/theme';

export interface GeometricPatternProps {
  size?: number;
  tileSize?: number;
  opacity?: number;
  color?: string;
  style?: ViewStyle;
  variant?: 'single' | 'tessellation';
}

const DEFAULT_TILE_SIZE = 44;
const COLS = 10;
const ROWS = 8;

/**
 * Subtle Islamic geometric pattern as background texture.
 * Supports:
 * - 'single': Pure View-based 8-point star (two rotated squares)
 * - 'tessellation': Repeating Islamic 8-pointed star lattice filling card width/height
 */
export function GeometricPattern({
  size = 300,
  tileSize = DEFAULT_TILE_SIZE,
  opacity = 0.05,
  color,
  style,
  variant = 'single',
}: GeometricPatternProps) {
  const { colors } = useTheme();
  const strokeColor = color || colors.accent;
  const STEP = tileSize;
  const R = Math.round(STEP * 0.27);
  const R_DIAG = Math.round(R * 1.414);


  if (variant === 'tessellation') {
    return (
      <View
        style={[styles.tessellationWrap, { opacity }, style]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox="0 0 448 336" fill="none" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: ROWS }).map((_, rIdx) =>
            Array.from({ length: COLS }).map((_, cIdx) => {
              const cx = cIdx * STEP + STEP / 2;
              const cy = rIdx * STEP + STEP / 2;
              const key = `${rIdx}-${cIdx}`;
              return (
                <G key={key}>
                  {/* Axis-aligned square */}
                  <Rect
                    x={cx - R}
                    y={cy - R}
                    width={2 * R}
                    height={2 * R}
                    stroke={strokeColor}
                    strokeWidth={1}
                    fill="none"
                  />
                  {/* 45-degree rotated square */}
                  <G transform={`translate(${cx}, ${cy}) rotate(45) translate(-${cx}, -${cy})`}>
                    <Rect
                      x={cx - R}
                      y={cy - R}
                      width={2 * R}
                      height={2 * R}
                      stroke={strokeColor}
                      strokeWidth={1}
                      fill="none"
                    />
                  </G>
                  {/* Horizontal connector to next column */}
                  {cIdx < COLS - 1 && (
                    <Line
                      x1={cx + R_DIAG}
                      y1={cy}
                      x2={cx + STEP - R_DIAG}
                      y2={cy}
                      stroke={strokeColor}
                      strokeWidth={1}
                    />
                  )}
                  {/* Vertical connector to next row */}
                  {rIdx < ROWS - 1 && (
                    <Line
                      x1={cx}
                      y1={cy + R_DIAG}
                      x2={cx}
                      y2={cy + STEP - R_DIAG}
                      stroke={strokeColor}
                      strokeWidth={1}
                    />
                  )}
                </G>
              );
            })
          )}
        </Svg>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { opacity }, style]} pointerEvents="none">
      <View
        style={[
          styles.square,
          {
            width: size * 0.45,
            height: size * 0.45,
            borderColor: strokeColor,
          },
        ]}
      />
      <View
        style={[
          styles.square,
          styles.rotated,
          {
            width: size * 0.45,
            height: size * 0.45,
            borderColor: strokeColor,
          },
        ]}
      />
      <View
        style={[
          styles.square,
          styles.inner,
          {
            width: size * 0.2,
            height: size * 0.2,
            borderColor: strokeColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tessellationWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
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
});
