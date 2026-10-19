import type { ImageSourcePropType } from 'react-native';
import { CARD_SHADOW, FLOATING_CARD_SHADOW, HERO_CARD_SHADOW, PILL_SHADOW, CardShadowTokens } from '../lib/homeThemeTokens';
import { ThemeMode } from '../lib/constants';
import {
  HEADER_ROW_HEIGHT,
  HEADER_FADE,
  NAV_HEIGHT,
  NAV_SIDE_MARGIN,
  NAV_RADIUS,
  SUBHEADER_HEIGHT,
  HEADER_ROW_TOP,
  HEADER_BOTTOM,
  SUBHEADER_BOTTOM,
  NAV_BOTTOM,
  NAV_TOP,
  SCRIM_HEIGHT,
  TAB_PAD_TOP,
  TAB_PAD_BOTTOM,
} from '../components/layout/layout.constants';
import { useTheme } from '../lib/theme';

export type { ThemeMode, CardShadowTokens };

/**
 * Canonical font roles aligned with project font assets:
 * Primary display / title: Lora / Instrument Serif (Amiri for RTL)
 * Eyebrow / categories: Poppins / Manrope SemiBold
 * Body / UI: Manrope
 */
export const fontRoles = {
  eyebrow: 'Poppins_500Medium',
  eyebrowFallback: 'Manrope_600SemiBold',
  title: 'Lora_500Medium',
  titleFallback: 'InstrumentSerif_400Regular',
  titleRtl: 'NotoNaskhArabic_700Bold',
  subtitle: 'Poppins_400Regular',
  ui: 'Poppins_400Regular',
  uiMedium: 'Poppins_500Medium',
  uiSemiBold: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  arabicNoto: 'NotoNaskhArabic_400Regular',
  arabicNotoBold: 'NotoNaskhArabic_700Bold',
} as const;

/**
 * Global shared gradients
 */
export const GOLD_GRADIENT = ['#EECA80', '#B88E46'] as const;
export const BRAND_GREEN = '#105A4B' as const;

/**
 * Canonical card styling constants.
 * Standard floating surfaces use an 18dp radius; compact list tiles use 16dp.
 */
export const cardTokens = {
  borderRadius: 18,
  innerRadius: 17,
  borderWidth: 0.75,
  variants: {
    standard: {
      borderRadius: 18,
      innerRadius: 17,
      borderWidth: 1,
    },
    hero: {
      borderRadius: 22,
      innerRadius: 19,
      innerBorderRadius: 19,
      borderWidth: 1,
    },
    listTile: {
      borderRadius: 16,
      innerRadius: 15,
      borderWidth: 1,
    },
    search: {
      borderRadius: 18.5,
      borderWidth: 1,
    },
    pill: {
      borderRadius: 14,
      borderWidth: 1,
    },
  },
  gradient: {
    paper: ['#FEFCF7', '#FAF6ED'] as const,
    ink: ['#2A2933', '#201F28'] as const,
  },
  goldBorder: {
    paper: '#E2CC9C',
    ink: '#8C7747',
  },
  shadow: CARD_SHADOW,
  floatingShadow: FLOATING_CARD_SHADOW,
  heroShadow: HERO_CARD_SHADOW,
  pillShadow: PILL_SHADOW,
} as const;

/**
 * Authoritative color tokens ensuring exact compliance with the approved palette.
 *
 * DARK (ink):
 *   bgTop #12121C, bgBottom #0C0C14, cardTop #2A2933, cardBottom #201F28,
 *   border #8C7747, text #F3EEDD, muted #A8A6AE, faint #6E6C78, gold #E6BE6C,
 *   onGold #1A1408, danger #E07A70, success #7CC4A0, overlay rgba(0,0,0,.65),
 *   hero #34323F→#1A1922.
 *
 * LIGHT (paper):
 *   bgTop #F8F4EA, bgBottom #F0EBDE, cardTop #FEFCF7, cardBottom #FAF6ED,
 *   inset #F0F6F2, border #E2CC9C, text #14221E, muted #647068, faint #A6AEA8,
 *   accent #105A4B (for icons/checks only), goldText #8A6420, onGold #092C25,
 *   danger #C0463C, success #2E8B64, overlay rgba(0,0,0,.45), hero #145C4D→#083028.
 *
 * BOTH:
 *   goldGradient #EECA80→#B88E46 for filled shapes; brand green #105A4B only for logo tile.
 */
/**
 * Canonical semantic text roles ensuring exact contrast and readability compliance:
 *
 * DARK (ink):
 *   heading/body: #F3EEDD, subtle: #A8A6AE, eyebrow: #E6BE6C, numeralAccent: #EECA80,
 *   onGold: #1A1408, onHeading: #F6F0E1, onHeroMuted: #B0AEB8, danger: #E07A70, faint: #6E6C78
 *
 * LIGHT (paper):
 *   heading/body: #14221E, subtle: #647068, eyebrow: #8A6420, numeralAccent: #105A4B,
 *   onGold: #092C25, onHeading: #F6F0E1, onHeroMuted: #B4D6CA, danger: #C0463C, faint: #A6AEA8
 */
export const textTokens = {
  paper: {
    heading: '#14221E',
    body: '#14221E',
    subtle: '#647068',
    eyebrow: '#8A6420',
    numeralAccent: '#105A4B',
    onGold: '#092C25',
    onHeading: '#F6F0E1',
    onHeroMuted: '#B4D6CA',
    danger: '#C0463C',
    faint: '#A6AEA8',
  },
  ink: {
    heading: '#F3EEDD',
    body: '#F3EEDD',
    subtle: '#A8A6AE',
    eyebrow: '#E6BE6C',
    numeralAccent: '#EECA80',
    onGold: '#1A1408',
    onHeading: '#F6F0E1',
    onHeroMuted: '#B0AEB8',
    danger: '#E07A70',
    faint: '#6E6C78',
  },
} as const;

export type SemanticTextRole =
  | 'heading'
  | 'body'
  | 'subtle'
  | 'eyebrow'
  | 'numeralAccent'
  | 'onGold'
  | 'onHeading'
  | 'onHeroMuted'
  | 'danger'
  | 'faint';

export type SemanticTextTokens = {
  readonly [K in SemanticTextRole]: string;
};

export const themeTokens = {
  paper: {
    // Semantic text roles
    heading: textTokens.paper.heading,
    body: textTokens.paper.body,
    subtle: textTokens.paper.subtle,
    eyebrow: textTokens.paper.eyebrow,
    numeralAccent: textTokens.paper.numeralAccent,
    onHeading: textTokens.paper.onHeading,
    onHeroMuted: textTokens.paper.onHeroMuted,

    bgTop: '#F8F4EA',
    bgBottom: '#F0EBDE',
    cardTop: '#FEFCF7',
    cardBottom: '#FAF6ED',
    inset: '#F0F6F2',
    border: '#E2CC9C',
    cardBorder: '#DCE4DB',
    goldBorder: '#E2CC9C',
    text: '#14221E',
    muted: '#647068',
    faint: '#A6AEA8',
    accent: '#105A4B', // for icons/checks only
    accentDim: '#F0F6F2',
    gold: '#EECA80',
    goldText: '#8A6420',
    onGold: '#092C25',
    danger: '#C0463C',
    success: '#2E8B64',
    overlay: 'rgba(0,0,0,.45)',
    heroGradient: ['#145C4D', '#083028'] as const,
    cardGradient: ['#FEFCF7', '#FAF6ED'] as const,
    bgGradient: ['#F8F4EA', '#F0EBDE'] as const,
    goldGradient: GOLD_GRADIENT,
    brandGreen: BRAND_GREEN,
    ringFill: '#F0F6F2',
    ringBorder: '#E2CC9C',
    arabicName: '#8A6420',
    // Compatibility aliases so legacy keys resolve to approved palette
    bgBase: '#F8F4EA',
    bgSurface: '#FEFCF7',
    bgRaised: '#FAF6ED',
    borderSubtle: '#E2CC9C',
    borderLine: '#E2CC9C',
    borderStrong: '#E2CC9C',
    textPrimary: '#14221E',
    textSecondary: '#647068',
    textMuted: '#647068',
    destructive: '#C0463C',
    onAccent: '#092C25',
    forestGreen: '#2E8B64',
    forestDark: '#2E8B64',
    sage: '#647068',
    sageDim: '#F0F6F2',
    sagePill: '#FAF6ED',
    cardElevated: '#FEFCF7',
    iconCircleBg: '#F0F6F2',
    iconCircleFg: '#8A6420',
    trackColor: '#E2CC9C',
  },
  ink: {
    // Semantic text roles
    heading: textTokens.ink.heading,
    body: textTokens.ink.body,
    subtle: textTokens.ink.subtle,
    eyebrow: textTokens.ink.eyebrow,
    numeralAccent: textTokens.ink.numeralAccent,
    onHeading: textTokens.ink.onHeading,
    onHeroMuted: textTokens.ink.onHeroMuted,

    bgTop: '#12121C',
    bgBottom: '#0C0C14',
    cardTop: '#2A2933',
    cardBottom: '#201F28',
    inset: '#201F28',
    border: '#8C7747',
    cardBorder: '#48484B',
    goldBorder: '#8C7747',
    text: '#F3EEDD',
    muted: '#A8A6AE',
    faint: '#6E6C78',
    accent: '#E6BE6C',
    accentDim: 'rgba(230, 190, 108, 0.15)',
    gold: '#E6BE6C',
    goldText: '#E6BE6C',
    onGold: '#1A1408',
    danger: '#E07A70',
    success: '#7CC4A0',
    overlay: 'rgba(0,0,0,.65)',
    heroGradient: ['#34323F', '#1A1922'] as const,
    cardGradient: ['#2A2933', '#201F28'] as const,
    bgGradient: ['#12121C', '#0C0C14'] as const,
    goldGradient: GOLD_GRADIENT,
    brandGreen: BRAND_GREEN,
    ringFill: '#201F28',
    ringBorder: '#8C7747',
    arabicName: '#E6BE6C',
    // Compatibility aliases so legacy keys resolve to approved palette
    bgBase: '#12121C',
    bgSurface: '#2A2933',
    bgRaised: '#201F28',
    borderSubtle: '#8C7747',
    borderLine: '#8C7747',
    borderStrong: '#8C7747',
    textPrimary: '#F3EEDD',
    textSecondary: '#A8A6AE',
    textMuted: '#A8A6AE',
    destructive: '#E07A70',
    onAccent: '#1A1408',
    forestGreen: '#7CC4A0',
    forestDark: '#7CC4A0',
    sage: '#A8A6AE',
    sageDim: 'rgba(230, 190, 108, 0.15)',
    sagePill: '#201F28',
    cardElevated: '#2A2933',
    iconCircleBg: '#201F28',
    iconCircleFg: '#E6BE6C',
    trackColor: '#8C7747',
  },
} as const;

export type ThemeTokens = (typeof themeTokens)[ThemeMode];

export const buttonTokens = {
  minHeight: 44,
  borderRadius: 22,
  touchTargetMin: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export const layoutTokens = {
  HEADER_ROW_HEIGHT,
  HEADER_FADE,
  NAV_HEIGHT,
  NAV_SIDE_MARGIN,
  NAV_RADIUS,
  SUBHEADER_HEIGHT,
  HEADER_ROW_TOP,
  HEADER_BOTTOM,
  SUBHEADER_BOTTOM,
  NAV_BOTTOM,
  NAV_TOP,
  SCRIM_HEIGHT,
  TAB_PAD_TOP,
  TAB_PAD_BOTTOM,
} as const;

export type BrandLogoVariant = 'master' | 'small' | 'app';

export function getBrandLogoSource(
  mode: ThemeMode,
  variant: BrandLogoVariant = 'master'
): ImageSourcePropType {
  if (variant === 'app') {
    return mode === 'paper'
      ? require('../../assets/icon.png')
      : require('../../assets/logo-dark.jpg');
  }
  if (variant === 'small') {
    return mode === 'paper'
      ? require('../../assets/logo-small-black.png')
      : require('../../assets/logo-small-ivory.png');
  }
  return mode === 'paper'
    ? require('../../assets/logo-master-black.png')
    : require('../../assets/logo-master-white.png');
}

export function getAppLogoSource(mode: ThemeMode): ImageSourcePropType {
  return getBrandLogoSource(mode, 'app');
}

export function useAppLogoSource(): ImageSourcePropType {
  const { mode } = useTheme();
  return getAppLogoSource(mode);
}

export function useBrandLogoSource(
  variant: BrandLogoVariant = 'master'
): ImageSourcePropType {
  const { mode } = useTheme();
  return getBrandLogoSource(mode, variant);
}

export function getTokens(mode: ThemeMode): ThemeTokens {
  return themeTokens[mode] || themeTokens.paper;
}

export function useThemeTokens(): { tokens: ThemeTokens; mode: ThemeMode } {
  const { mode } = useTheme();
  return { tokens: getTokens(mode), mode };
}
