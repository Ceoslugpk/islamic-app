import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../lib/theme';
import type { QuranArabicFont } from '../lib/settings';

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
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          fontFamily: resolvedFamily,
          color: colors.textPrimary,
          textAlign: align,
          lineHeight,
        },
        style,
      ]}
      numberOfLines={numberOfLines}
      allowFontScaling
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
