import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

/** Editorial section header: eyebrow + serif title + optional subtitle. */
export function SectionHeader({ eyebrow, title, subtitle, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 520,
  },
});
