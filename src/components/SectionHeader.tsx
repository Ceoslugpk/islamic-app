import React from 'react';
import { StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useTheme } from '../lib/theme';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  compact?: boolean;
}

/** Editorial section header: eyebrow + serif title + optional subtitle. Responsive across small screens and tablets. */
export function SectionHeader({ eyebrow, title, subtitle, style, compact }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = compact ?? width < 380;
  const isTiny = width <= 340;

  const eyebrowFontSize = isTiny ? 9.5 : isCompact ? 10 : 11;
  const titleFontSize = isTiny ? 26 : isCompact ? 28 : 34;
  const titleLineHeight = isTiny ? 30 : isCompact ? 32 : 38;
  const subtitleFontSize = isTiny ? 12 : isCompact ? 13 : 14;
  const subtitleLineHeight = isTiny ? 18 : isCompact ? 19 : 21;
  const marginBottom = isCompact ? 16 : 24;

  return (
    <View style={[styles.wrap, { marginBottom }, style]}>
      {eyebrow ? (
        <Text
          style={[
            styles.eyebrow,
            { color: colors.accent, fontSize: eyebrowFontSize, marginBottom: isCompact ? 6 : 10 },
          ]}
          numberOfLines={1}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            fontSize: titleFontSize,
            lineHeight: titleLineHeight,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              fontSize: subtitleFontSize,
              lineHeight: subtitleLineHeight,
              marginTop: isCompact ? 6 : 8,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: 680,
    width: '100%',
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    maxWidth: 520,
  },
});
