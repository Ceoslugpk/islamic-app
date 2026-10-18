import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from '../lib/theme';
import { parseTajweedAny, TajweedRule, TAJWEED_RULES, TajweedSpan } from '../lib/tajweed';

/**
 * Renders islamic.app tajweed HTML with rule colors.
 * Each rule's color is applied per span; unmarked text uses the theme color.
 */
export function TajweedText({
  text,
  size = 24,
  lineHeight,
  fontFamily,
  numberInSurah,
  maxFontSizeMultiplier = 1.3,
}: {
  text: string;
  size?: number;
  lineHeight?: number;
  fontFamily?: string;
  numberInSurah?: number;
  maxFontSizeMultiplier?: number;
}) {
  const { colors } = useTheme();
  // Strip end marker tag if numberInSurah is provided so we can append standard ۝{numberInSurah}
  const cleanText =
    numberInSurah != null
      ? text.replace(/<span class=end>[^<]*<\/span>/g, '').replace(/<end[^>]*\/?>/g, '').trim()
      : text;
  const spans: TajweedSpan[] = parseTajweedAny(cleanText);
  const resolvedLineHeight = lineHeight ?? Math.round(size * 1.8);
  const resolvedFamily = fontFamily ?? 'Amiri_400Regular';

  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          fontFamily: resolvedFamily,
          lineHeight: resolvedLineHeight,
          color: colors.textPrimary,
          writingDirection: 'rtl',
        },
      ]}
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier}
    >
      {spans.map((span, i) =>
        span.rule ? (
          <Text
            key={i}
            style={{
              color: TAJWEED_RULES[span.rule].color,
              fontSize: size,
              fontFamily: resolvedFamily,
            }}
          >
            {span.text}
          </Text>
        ) : (
          <Text
            key={i}
            style={{
              color: colors.textPrimary,
              fontFamily: resolvedFamily,
            }}
          >
            {span.text}
          </Text>
        )
      )}
      {numberInSurah != null ? (
        <Text
          style={[
            styles.ayahMarker,
            { color: colors.accent, fontFamily: resolvedFamily },
          ]}
        >
          {' '}۝{numberInSurah}
        </Text>
      ) : null}
    </Text>
  );
}

/** Legend for the tajweed color rules. */
export function TajweedLegend({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const rules = Object.entries(TAJWEED_RULES) as [TajweedRule, { label: string; color: string; hint: string }][];

  return (
    <View style={styles.legendWrap}>
      {rules.map(([rule, info]) => (
        <View key={rule} style={[styles.legendRow, compact && styles.legendRowCompact]}>
          <View style={[styles.legendDot, { backgroundColor: info.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.legendLabel, { color: colors.textPrimary }]}>{info.label}</Text>
            {!compact && <Text style={[styles.legendHint, { color: colors.textMuted }]}>{info.hint}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Amiri_400Regular',
    ...Platform.select({
      android: {
        includeFontPadding: true,
      },
      default: {},
    }),
    textAlign: 'right',
  },
  legendWrap: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendRowCompact: { alignItems: 'flex-start' },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  legendHint: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 17, marginTop: 1 },
  ayahMarker: {
    fontSize: 18,
    opacity: 0.85,
  },
});
