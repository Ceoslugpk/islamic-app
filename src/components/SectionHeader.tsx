import React from 'react';
import { I18nManager, StyleSheet, Text, View, ViewStyle, TextStyle, useWindowDimensions } from 'react-native';
import { useTheme } from '../lib/theme';
import { isRTL, t } from '../lib/i18n';

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
  const rtl = isRTL();

  const eyebrowFontSize = isTiny ? 9.5 : isCompact ? 10 : 11;
  const titleFontSize = isTiny ? 26 : isCompact ? 28 : 34;
  const titleLineHeight = isTiny ? 30 : isCompact ? 32 : 38;
  const subtitleFontSize = isCompact ? 11.5 : isTiny ? 12 : 14;
  const subtitleLineHeight = isCompact ? 16 : isTiny ? 18 : 21;
  const marginBottom = isCompact ? 12 : 24;

  // Font/direction-dependent styles are computed at RENDER time (not in the
  // module-level StyleSheet) so they follow the ACTIVE language: the module
  // body runs before the persisted language resolves at boot, and live web
  // switches re-render the tree. Fixes Urdu UI showing LTR fonts.
  const rtlEyebrow: TextStyle = { fontFamily: rtl ? 'Amiri_400Regular' : 'Manrope_600SemiBold', letterSpacing: rtl ? 0 : 2, textTransform: rtl ? 'none' : 'uppercase' };
  const rtlTitle: TextStyle = { fontFamily: rtl ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular', letterSpacing: rtl ? 0 : -0.3 };
  const rtlSubtitle: TextStyle = { fontFamily: rtl ? 'Amiri_400Regular' : 'Manrope_400Regular' };

  return (
    <View style={[styles.wrap, { marginBottom }, style]}>
      {eyebrow ? (
        <Text
          style={[
            styles.eyebrow,
            rtlEyebrow,
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
          rtlTitle,
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
            rtlSubtitle,
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
  eyebrow: {},
  title: {},
  subtitle: {
    maxWidth: 520,
  },
});
