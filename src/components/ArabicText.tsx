import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp, PixelRatio } from 'react-native';
import { useTheme } from '../lib/theme';
import type { QuranArabicFont } from '../lib/settings';

/**
 * Quran Arabic is a critical dense layout: fixed lineHeights (1.6x base) and
 * diacritics break when the system font scale pushes the rendered size past
 * the lineHeight. Cap the multiplier and scale lineHeight by the same factor
 * so glyphs always fit inside their line box.
 */
const MAX_ARABIC_FONT_SCALE = 1.4;

/**
 * Registered font families for each Quran Arabic font option.
 * KFGQPC is intentionally absent: it is a desktop-only King Fahd Quran Complex
 * font with no free bundlable file in expo-google-fonts.
 */
export const QURAN_FONT_FAMILIES: Record<QuranArabicFont, { regular: string; bold: string }> = {
  amiri: { regular: 'Amiri_400Regular', bold: 'Amiri_700Bold' },
  notonaskh: { regular: 'NotoNaskhArabic_400Regular', bold: 'NotoNaskhArabic_700Bold' },
};

interface ArabicTextProps {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  fontFamily?: string;
  lineHeight?: number;
}

/**
 * Arabic text rendered with a Naskh font (Amiri by default), right-aligned (RTL).
 * Used for Quran ayahs, surah names, and any Arabic UI.
 */
export function ArabicText({
  children,
  size = 28,
  bold = false,
  style,
  align = 'right',
  numberOfLines,
  fontFamily,
  lineHeight,
}: ArabicTextProps) {
  const { colors } = useTheme();
  const resolvedFamily = fontFamily ?? (bold ? QURAN_FONT_FAMILIES.amiri.bold : QURAN_FONT_FAMILIES.amiri.regular);
  // Clamp the system font multiplier: Quran Arabic must stay legible inside
  // its fixed 1.6x line boxes even at large accessibility font settings.
  const fontScale = Math.min(
    Math.max(PixelRatio.getFontScale() || 1, 1),
    MAX_ARABIC_FONT_SCALE,
  );
  // Arabic needs generous line-height (~1.6x) or diacritics/ascenders clip.
  // Callers may override via the `lineHeight` prop or a `style` lineHeight —
  // both win because `style` sits last in the array. The base lineHeight
  // scales with the font multiplier so glyphs keep fitting at larger sizes.
  const resolvedLineHeight = (lineHeight ?? Math.round(size * 1.6)) * fontScale;
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          fontFamily: resolvedFamily,
          color: colors.textPrimary,
          textAlign: align,
          lineHeight: resolvedLineHeight,
        },
        style,
      ]}
      numberOfLines={numberOfLines}
      allowFontScaling
      maxFontSizeMultiplier={MAX_ARABIC_FONT_SCALE}
    >
      {children}
    </Text>
  );
}

/**
 * Render an ayah with its Arabic end-marker (۝ + ayah number, the standard
 * Uthmani convention). Pass the ayah text and numberInSurah.
 */
export function AyahText({
  text,
  numberInSurah,
  size = 28,
  fontFamily,
  lineHeight,
}: {
  text: string;
  numberInSurah: number;
  size?: number;
  fontFamily?: string;
  lineHeight?: number;
}) {
  const markerFamily = fontFamily ?? QURAN_FONT_FAMILIES.amiri.regular;
  return (
    <ArabicText size={size} fontFamily={fontFamily} lineHeight={lineHeight}>
      {text}{' '}
      <Text style={[styles.ayahMarker, { fontFamily: markerFamily }]}>۝{numberInSurah}</Text>
    </ArabicText>
  );
}

const styles = StyleSheet.create({
  base: {
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  ayahMarker: {
    fontSize: 18,
    opacity: 0.85,
  },
});
