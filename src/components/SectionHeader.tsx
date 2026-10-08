import React from 'react';
import { StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';

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
  const subtitleFontSize = isCompact ? 11.5 : isTiny ? 12 : 14;
  const subtitleLineHeight = isCompact ? 16 : isTiny ? 18 : 21;
  const marginBottom = isCompact ? 12 : 24;

  return (
    <View style={[styles.wrap, { marginBottom }, style]}>
      {eyebrow ? (
        <Text
          style={[
            styles.eyebrow,
            { color: colors.accent, fontSize: eyebrowFontSize, marginBottom: isCompact ? 4 : 10 },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {t(eyebrow)}
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
        accessibilityRole="header"
        maxFontSizeMultiplier={1.4}
      >
        {t(title)}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              fontSize: subtitleFontSize,
              lineHeight: subtitleLineHeight,
              marginTop: isCompact ? 4 : 8,
            },
          ]}
          maxFontSizeMultiplier={1.4}
        >
          {t(subtitle)}
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
