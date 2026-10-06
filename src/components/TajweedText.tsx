import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { parseTajweedHtml, TajweedRule, TAJWEED_RULES, TajweedSpan } from '../lib/tajweed';

/**
 * Renders islamic.app tajweed HTML with rule colors.
 * Each rule's color is applied per span; unmarked text uses the theme color.
 */
export function TajweedText({
  text,
  size = 24,
  lineHeight,
}: {
  text: string;
  size?: number;
  lineHeight?: number;
}) {
  const { colors } = useTheme();
  const spans: TajweedSpan[] = parseTajweedHtml(text);
  const resolvedLineHeight = lineHeight ?? Math.round(size * 1.6);

  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          lineHeight: resolvedLineHeight,
          color: colors.textPrimary,
          writingDirection: 'rtl',
        },
      ]}
      allowFontScaling
      maxFontSizeMultiplier={1.4}
    >
      {spans.map((span, i) =>
        span.rule ? (
          <Text
            key={i}
            style={{ color: TAJWEED_RULES[span.rule].color, fontSize: size }}
          >
            {span.text}
          </Text>
        ) : (
          <Text key={i} style={{ color: colors.textPrimary }}>
            {span.text}
          </Text>
        )
      )}
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
    includeFontPadding: false,
    textAlign: 'right',
  },
  legendWrap: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendRowCompact: { alignItems: 'flex-start' },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  legendHint: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 15, marginTop: 1 },
});
