/**
 * Canonical typography hierarchy - "Warm Editorial Islamic"
 * Enforces consistent scale, weights, letter spacing, and line heights.
 */

import type { TextStyle } from 'react-native';

export type TypographyScript =
  | 'latin'
  | 'arabic'
  | 'urdu'
  | 'hindi'
  | 'bengali'
  | 'malayalam'
  | 'sinhala'
  | 'tamil';

export const MIN_SCRIPT_MULTIPLIERS = {
  latin: {
    ui: 1.5,
    title: 1.3,
    numeral: 1.2,
  },
  arabic: 1.8,
  urdu: 2.2,
  hindi: 1.6,
  bengali: 1.6,
  malayalam: 1.6,
  sinhala: 1.6,
  tamil: 1.6,
} as const;

export const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;
export const BENGALI_SCRIPT_REGEX = /[\u0980-\u09FF]/;
export const TAMIL_SCRIPT_REGEX = /[\u0B80-\u0BFF]/;
export const MALAYALAM_SCRIPT_REGEX = /[\u0D00-\u0D7F]/;
export const SINHALA_SCRIPT_REGEX = /[\u0D80-\u0DFF]/;
const ASCII_ONLY_REGEX = /^[\x00-\x7F]*$/;

export function detectScriptFromContent(
  content?: string | null,
  currentLanguage?: string | null,
): TypographyScript {
  const isAscii = content ? ASCII_ONLY_REGEX.test(content) : false;
  if (!isAscii && content) {
    if (ARABIC_SCRIPT_REGEX.test(content)) {
      return currentLanguage === 'ur' || currentLanguage?.startsWith('ur-') || currentLanguage?.startsWith('ur_')
        ? 'urdu'
        : 'arabic';
    }
    if (DEVANAGARI_SCRIPT_REGEX.test(content)) {
      return 'hindi';
    }
    if (BENGALI_SCRIPT_REGEX.test(content)) {
      return 'bengali';
    }
    if (MALAYALAM_SCRIPT_REGEX.test(content)) {
      return 'malayalam';
    }
    if (SINHALA_SCRIPT_REGEX.test(content)) {
      return 'sinhala';
    }
    if (TAMIL_SCRIPT_REGEX.test(content)) {
      return 'tamil';
    }
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
  if (currentLanguage === 'bn' || currentLanguage?.startsWith('bn-') || currentLanguage?.startsWith('bn_')) {
    return 'bengali';
  }
  if (currentLanguage === 'ml' || currentLanguage?.startsWith('ml-') || currentLanguage?.startsWith('ml_')) {
    return 'malayalam';
  }
  if (currentLanguage === 'si' || currentLanguage?.startsWith('si-') || currentLanguage?.startsWith('si_')) {
    return 'sinhala';
  }
  if (currentLanguage === 'ta' || currentLanguage?.startsWith('ta-') || currentLanguage?.startsWith('ta_')) {
    return 'tamil';
  }
  return 'latin';
}

export interface TypographyTextAlignment {
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
}

function isRtlLanguageCode(language?: string | null): boolean {
  if (!language) return false;
  const normalized = language.toLowerCase().trim();
  const matches = (code: string) =>
    normalized === code || normalized.startsWith(`${code}-`) || normalized.startsWith(`${code}_`);

  return ['ur', 'ar', 'ps', 'ckb', 'fa', 'ug', 'he', 'sd', 'dv'].some(matches) || normalized === 'ku-arab';
}

/**
 * Resolve the text alignment contract for a rendered string.
 *
 * Script wins over locale: Arabic/Perso-Arabic content is always right-aligned
 * and RTL-directed, even when it appears in an LTR locale or uses the numeral
 * variant. Latin and numeric content in an RTL locale intentionally stays
 * right-aligned while remaining LTR-directed, so times, counts, and Latin
 * names retain their natural ordering. LTR locales keep their normal left/LTR
 * treatment. The variant is part of the shared contract so callers can pass
 * the same semantic variant as AppText; it only makes the numeric-LTR intent
 * explicit after script detection.
 */
export function getTextAlignment(
  content: string | null | undefined,
  language: string | null | undefined,
  variant: string = 'body',
): TypographyTextAlignment {
  const normalizedLanguage = language?.toLowerCase().trim() || null;
  const script = detectScriptFromContent(content, normalizedLanguage);
  const isTallScript = script === 'arabic' || script === 'urdu';
  const isRtlLocale = isRtlLanguageCode(normalizedLanguage);
  const isNumericVariant = variant === 'numeral' && script === 'latin';

  if (isTallScript) {
    return { textAlign: 'right', writingDirection: 'rtl' };
  }

  return {
    textAlign: isRtlLocale ? 'right' : 'left',
    writingDirection: isNumericVariant || script === 'latin'
      ? 'ltr'
      : (isRtlLocale ? 'rtl' : 'ltr'),
  };
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
  if (script === 'bengali') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.bengali);
  }
  if (script === 'malayalam') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.malayalam);
  }
  if (script === 'sinhala') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.sinhala);
  }
  if (script === 'tamil') {
    return Math.ceil(fontSize * MIN_SCRIPT_MULTIPLIERS.tamil);
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
