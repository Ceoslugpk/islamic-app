import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp, PixelRatio, Platform } from 'react-native';
import { useTheme } from '../lib/theme';
import type { QuranArabicFont } from '../lib/settings';
import { useAutoProbe } from '../lib/diagnostic';

/**
 * Quran Arabic is a critical dense layout: fixed lineHeights (1.8x base) and
 * diacritics break when the system font scale pushes the rendered size past
 * the lineHeight. Cap the multiplier and scale lineHeight by the same factor
 * so glyphs always fit inside their line box.
 */
const DEFAULT_MAX_ARABIC_FONT_SCALE = 1.3;

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
  maxFontSizeMultiplier?: number;
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
  maxFontSizeMultiplier = DEFAULT_MAX_ARABIC_FONT_SCALE,
}: ArabicTextProps) {
  const { colors } = useTheme();
  const resolvedFamily = fontFamily ?? (bold ? QURAN_FONT_FAMILIES.amiri.bold : QURAN_FONT_FAMILIES.amiri.regular);
  // Clamp the system font multiplier: Quran Arabic must stay legible inside
  // its fixed line boxes even at large accessibility font settings.
  const resolvedMaxMultiplier = maxFontSizeMultiplier ?? DEFAULT_MAX_ARABIC_FONT_SCALE;
  const flattenedStyle = StyleSheet.flatten(style);
  const effectiveSize = typeof flattenedStyle?.fontSize === 'number' ? flattenedStyle.fontSize : size;
  const fontScale = Math.min(
    Math.max(PixelRatio.getFontScale() || 1, 1),
    resolvedMaxMultiplier,
  );
  // Keep caller styling while enforcing enough room for Arabic marks and ascenders.
  // Several legacy screens set a smaller static line height, which clips Naskh glyphs.
  const requestedLineHeight = Math.max(lineHeight ?? 0, flattenedStyle?.lineHeight ?? 0);
  const minimumLineHeight = Math.ceil(effectiveSize * 1.8);
  const resolvedLineHeight = Math.max(requestedLineHeight ?? 0, minimumLineHeight) * fontScale;

  const autoProbe = useAutoProbe(undefined, 'ArabicText', {
    isText: true,
    numberOfLines,
    style,
    resolvedFontSize: effectiveSize,
    resolvedLineHeight,
    explicitLineHeight: typeof lineHeight === 'number'
      ? lineHeight
      : (typeof flattenedStyle?.lineHeight === 'number' ? flattenedStyle.lineHeight : resolvedLineHeight),
    fontFamily: resolvedFamily,
    textScript: 'arabic',
    textCategory: 'ui',
    textAlign: align,
    writingDirection: 'rtl',
  });

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
        { lineHeight: resolvedLineHeight },
      ]}
      numberOfLines={numberOfLines}
      allowFontScaling
      maxFontSizeMultiplier={resolvedMaxMultiplier}
      onLayout={autoProbe.onLayout}
      onTextLayout={autoProbe.onTextLayout}
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
  maxFontSizeMultiplier,
}: {
  text: string;
  numberInSurah: number;
  size?: number;
  fontFamily?: string;
  lineHeight?: number;
  maxFontSizeMultiplier?: number;
}) {
  const markerFamily = fontFamily ?? QURAN_FONT_FAMILIES.amiri.regular;
  return (
    <ArabicText
      size={size}
      fontFamily={fontFamily}
      lineHeight={lineHeight}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
    >
      {text}{' '}
      <Text style={[styles.ayahMarker, { fontFamily: markerFamily }]}>۝{numberInSurah}</Text>
    </ArabicText>
  );
}

const styles = StyleSheet.create({
  base: {
    writingDirection: 'rtl',
    ...Platform.select({
      android: {
        includeFontPadding: true,
      },
      default: {},
    }),
  },
  ayahMarker: {
    fontSize: 18,
    opacity: 0.85,
  },
});
