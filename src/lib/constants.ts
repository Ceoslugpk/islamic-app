/**
 * Design tokens - "Warm Editorial Islamic"
 * Reference brand system: warm ivory/paper surfaces, deep forest green primary,
 * muted sage accents, white elevated surfaces, warm borders, editorial serif display type
 * plus clean sans UI type.
 */
export const palette = {
  ink: {
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
  },
  paper: {
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
  },
} as const;

export { HOME_THEME_TOKENS, getHomeTokens, CARD_SHADOW, PILL_SHADOW, getCardShadow, getPillShadow } from './homeThemeTokens';
export type { HomeMode, CardShadowTokens } from './homeThemeTokens';

export type ThemeMode = 'ink' | 'paper';

export type ThemeColors = {
  bgBase: string;
  bgSurface: string;
  bgRaised: string;
  borderSubtle: string;
  borderLine: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentDim: string;
  success: string;
  destructive: string;
  onAccent: string;
  forestGreen: string;
  forestDark: string;
  sage: string;
  sageDim: string;
  sagePill: string;
  cardElevated: string;
  iconCircleBg: string;
  iconCircleFg: string;
};