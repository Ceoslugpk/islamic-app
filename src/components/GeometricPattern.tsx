import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
export const GeometricPattern = React.memo(function GeometricPattern({
  size = 300,
  tileSize = DEFAULT_TILE_SIZE,
  opacity = 0.05,
  color,
  style,
  variant = 'single',
}: GeometricPatternProps) {
  const { colors } = useTheme();
  const strokeColor = color || colors.accent;
  // One native drawing node instead of hundreds of Rect/Line/Group nodes per
  // card. Keep each original square and connector as a separate subpath.
  const tessellationPath = useMemo(() => {
    if (variant !== 'tessellation') return '';
    const radius = Math.round(tileSize * 0.27);
    const diagonal = radius * Math.SQRT2;
    const connectorRadius = Math.round(radius * 1.414);
    const paths: string[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let column = 0; column < COLS; column++) {
        const cx = column * tileSize + tileSize / 2;
        const cy = row * tileSize + tileSize / 2;
        paths.push(
          `M${cx - radius} ${cy - radius}L${cx + radius} ${cy - radius}L${cx + radius} ${cy + radius}L${cx - radius} ${cy + radius}Z`,
          `M${cx} ${cy - diagonal}L${cx + diagonal} ${cy}L${cx} ${cy + diagonal}L${cx - diagonal} ${cy}Z`,
        );
        if (column < COLS - 1) {
          paths.push(`M${cx + connectorRadius} ${cy}L${cx + tileSize - connectorRadius} ${cy}`);
        }
        if (row < ROWS - 1) {
          paths.push(`M${cx} ${cy + connectorRadius}L${cx} ${cy + tileSize - connectorRadius}`);
        }
      }
    }
    return paths.join('');
  }, [tileSize, variant]);

  if (variant === 'tessellation') {
    return (
      <View
        style={[styles.tessellationWrap, { opacity }, style]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox="0 0 448 336" fill="none" preserveAspectRatio="xMidYMid slice">
          <Path d={tessellationPath} stroke={strokeColor} strokeWidth={1} fill="none" />
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
});

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
