import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle, useWindowDimensions } from 'react-native';
import { isRTL, t } from '../lib/i18n';
import { AppText } from './ui/AppText';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  compact?: boolean;
  maxFontSizeMultiplier?: number;
}

/** Editorial section header: eyebrow + serif title + optional subtitle. Responsive across small screens and tablets. */
export function SectionHeader({ eyebrow, title, subtitle, style, compact, maxFontSizeMultiplier = 1.4 }: SectionHeaderProps) {
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
        <AppText
          variant="eyebrow"
          style={[
            styles.eyebrow,
            rtlEyebrow,
            { fontSize: eyebrowFontSize, marginBottom: isCompact ? 4 : 10 },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {t(eyebrow)}
        </AppText>
      ) : null}
      <AppText
        variant="sectionTitle"
        style={[
          styles.title,
          rtlTitle,
          {
            fontSize: titleFontSize,
            lineHeight: titleLineHeight,
          },
        ]}
        accessibilityRole="header"
        aria-level={2}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {t(title)}
      </AppText>
      {subtitle ? (
        <AppText
          variant="subtitle"
          style={[
            styles.subtitle,
            rtlSubtitle,
            {
              fontSize: subtitleFontSize,
              lineHeight: subtitleLineHeight,
              marginTop: isCompact ? 4 : 8,
            },
          ]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {t(subtitle)}
        </AppText>
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
