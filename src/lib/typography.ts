/**
 * Canonical typography hierarchy - "Warm Editorial Islamic"
 * Enforces consistent scale, weights, letter spacing, and line heights.
 */

import type { TextStyle } from 'react-native';

export type TypographyScript = 'latin' | 'arabic' | 'urdu' | 'hindi';

export const MIN_SCRIPT_MULTIPLIERS = {
  latin: {
    ui: 1.5,
    title: 1.3,
    numeral: 1.2,
  },
  arabic: 1.8,
  urdu: 2.2,
  hindi: 1.6,
} as const;

export const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;
const ASCII_ONLY_REGEX = /^[\x00-\x7F]*$/;

export function detectScriptFromContent(
  content?: string | null,
  currentLanguage?: string | null,
): TypographyScript {
  const isAscii = content ? ASCII_ONLY_REGEX.test(content) : false;
  if (!isAscii && content && ARABIC_SCRIPT_REGEX.test(content)) {
    return currentLanguage === 'ur' || currentLanguage?.startsWith('ur-') || currentLanguage?.startsWith('ur_')
      ? 'urdu'
      : 'arabic';
  }
  if (!isAscii && content && DEVANAGARI_SCRIPT_REGEX.test(content)) {
    return 'hindi';
  }
  // Times, counts, Latin transliteration and API translations retain their own
  // typography even when the surrounding interface uses an RTL language.
  if (content?.trim()) return 'latin';
  if (currentLanguage === 'ur' || currentLanguage?.startsWith('ur-') || currentLanguage?.startsWith('ur_')) {
    return 'urdu';
  }
  if (
    currentLanguage === 'ar' || currentLanguage?.startsWith('ar-') || currentLanguage?.startsWith('ar_') ||
    currentLanguage === 'ps' || currentLanguage?.startsWith('ps-') || currentLanguage?.startsWith('ps_')
  ) {
    return 'arabic';
  }
  if (currentLanguage === 'hi' || currentLanguage?.startsWith('hi-') || currentLanguage?.startsWith('hi_')) {
    return 'hindi';
  }
  return 'latin';
}

export function calculateScriptLineHeight(
  fontSize: number,
  script: TypographyScript,
  category: 'ui' | 'title' | 'numeral' = 'ui',
): number {
  if (script === 'urdu') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.urdu);
  }
  if (script === 'arabic') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.arabic);
  }
  if (script === 'hindi') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.hindi);
  }
  // Latin
  const mult = MIN_SCRIPT_MULTIPLIERS.latin[category];
  return Math.ceil(fontSize * mult);
}

export const typography = {
  // --- Display & Screen Titles (Instrument Serif) ---
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 45, // 34 * 1.3 = 44.2 -> 45
    letterSpacing: -0.4,
  } as TextStyle,

  screenTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    lineHeight: 37, // 28 * 1.3 = 36.4 -> 37
    letterSpacing: -0.3,
  } as TextStyle,

  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 23,
    lineHeight: 30, // 23 * 1.3 = 29.9 -> 30
    letterSpacing: -0.2,
  } as TextStyle,

  subheading: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    lineHeight: 26, // 20 * 1.3 = 26
    letterSpacing: -0.1,
  } as TextStyle,

  // --- Section Headings & Overlines (Manrope 600 / 700) ---
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    lineHeight: 17, // 11 * 1.5 = 16.5 -> 17
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

  eyebrowCompact: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    lineHeight: 15, // 10 * 1.5 = 15
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,

  sectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    lineHeight: 23, // 15 * 1.5 = 22.5 -> 23
    letterSpacing: 0.2,
  } as TextStyle,

  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5 = 21
    letterSpacing: 0.15,
  } as TextStyle,

  // --- Body Copy (Manrope 400) ---
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5 = 21
    letterSpacing: 0,
  } as TextStyle,

  bodyLarge: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 23, // 15 * 1.5 = 22.5 -> 23
    letterSpacing: 0,
  } as TextStyle,

  bodySmall: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20, // 13 * 1.5 = 19.5 -> 20
    letterSpacing: 0,
  } as TextStyle,

  // --- Captions & Metadata (Manrope 500) ---
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 18, // 12 * 1.5 = 18
    letterSpacing: 0.1,
  } as TextStyle,

  metadata: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 17, // 11 * 1.5 = 16.5 -> 17
    letterSpacing: 0.1,
  } as TextStyle,

  chip: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    lineHeight: 18, // 12 * 1.5 = 18
    letterSpacing: 0.1,
  } as TextStyle,

  // --- Arabic Typography (Amiri / Noto Naskh) ---
  arabicHero: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 32,
    lineHeight: 58, // 32 * 1.8 = 57.6 -> 58
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,

  arabicVerse: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 26,
    lineHeight: 47, // 26 * 1.8 = 46.8 -> 47
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,

  arabicBody: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 20,
    lineHeight: 36, // 20 * 1.8 = 36
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,

  arabicTitle: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 22,
    lineHeight: 40, // 22 * 1.8 = 39.6 -> 40
    textAlign: 'right',
    writingDirection: 'rtl',
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
