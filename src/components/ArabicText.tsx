import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../lib/theme';

interface ArabicTextProps {
  children: React.ReactNode;
  size?: number;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
}

/**
 * Arabic text rendered with Amiri (Naskh) font, right-aligned (RTL).
 * Used for Quran ayahs, surah names, and any Arabic UI.
 */
export function ArabicText({
  children,
  size = 28,
  bold = false,
  style,
  align = 'right',
  numberOfLines,
}: ArabicTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          fontFamily: bold ? 'Amiri_700Bold' : 'Amiri_400Regular',
          color: colors.textPrimary,
          textAlign: align,
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
export function AyahText({ text, numberInSurah, size = 28 }: { text: string; numberInSurah: number; size?: number }) {
  return (
    <ArabicText size={size}>
      {text} <Text style={styles.ayahMarker}>۝{numberInSurah}</Text>
    </ArabicText>
  );
}

const styles = StyleSheet.create({
  base: {
    writingDirection: 'rtl',
    includeFontPadding: false,
  },
  ayahMarker: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 18,
    opacity: 0.85,
  },
});
