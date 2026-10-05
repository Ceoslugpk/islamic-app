/**
 * Canonical typography hierarchy - "Warm Editorial Islamic"
 * Enforces consistent scale, weights, letter spacing, and line heights.
 */

import { TextStyle } from 'react-native';

export const typography = {
  // --- Display & Screen Titles (Instrument Serif) ---
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
  } as TextStyle,

  screenTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,

  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 23,
    lineHeight: 27,
    letterSpacing: -0.2,
  } as TextStyle,

  subheading: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.1,
  } as TextStyle,

  // --- Section Headings & Overlines (Manrope 600 / 700) ---
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  eyebrowCompact: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,

  sectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,

  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0.15,
  } as TextStyle,

  // --- Body Copy (Manrope 400) ---
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0,
  } as TextStyle,

  bodyLarge: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  } as TextStyle,

  bodySmall: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  } as TextStyle,

  // --- Captions & Metadata (Manrope 500) ---
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  } as TextStyle,

  metadata: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
  } as TextStyle,

  chip: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  } as TextStyle,

  // --- Arabic Typography (Amiri / Noto Naskh) ---
  arabicHero: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 32,
    lineHeight: 52,
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,

  arabicVerse: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 26,
    lineHeight: 46,
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,

  arabicBody: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 20,
    lineHeight: 34,
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,

  arabicTitle: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
