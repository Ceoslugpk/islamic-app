/**
 * Design tokens - "Warm Editorial Islamic"
 * Reference brand system: warm ivory/paper surfaces, deep forest green primary,
 * muted sage accents, white elevated surfaces, warm borders, editorial serif display type
 * plus clean sans UI type.
 */
export const palette = {
  ink: {
    bgBase: '#111614',
    bgSurface: '#18201D',
    bgRaised: '#202A26',
    borderSubtle: '#26332E',
    borderLine: '#31413B',
    borderStrong: '#44574F',
    textPrimary: '#F2F5F3',
    textSecondary: '#B2BEB8',
    textMuted: '#74847D',
    destructive: '#EF4444',
    onAccent: '#111614',
    forestGreen: '#34D399',
    forestDark: '#24A877',
    sage: '#7BB099',
    sageDim: 'rgba(52, 211, 153, 0.15)',
    sagePill: 'rgba(52, 211, 153, 0.18)',
    cardElevated: '#18201D',
    iconCircleBg: '#202A26',
    iconCircleFg: '#34D399',
  },
  paper: {
    bgBase: '#F4EEDE',
    bgSurface: '#FFFFFF',
    bgRaised: '#ECE5D2',
    borderSubtle: '#E6DFC9',
    borderLine: '#DCD3BC',
    borderStrong: '#BFB499',
    textPrimary: '#112620',
    textSecondary: '#4A5B53',
    textMuted: '#708279',
    destructive: '#BA2D2D',
    onAccent: '#FFFFFF',
    forestGreen: '#105A4B',
    forestDark: '#0B3F34',
    sage: '#3F6E5F',
    sageDim: '#E0EAE5',
    sagePill: '#DBE7E1',
    cardElevated: '#FFFFFF',
    iconCircleBg: '#E0EAE5',
    iconCircleFg: '#105A4B',
  },
} as const;

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