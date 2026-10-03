/**
 * Design tokens - "Warm Editorial Islamic"
 * Matches the Qashi portfolio: warm charcoal, amber accent, hairline borders.
 * No gradients, no glassmorphism, no AI-slop.
 */
export const palette = {
  ink: {
    bgBase: '#121110',
    bgSurface: '#181715',
    bgRaised: '#1e1d1a',
    borderSubtle: '#24221f',
    borderLine: '#2e2b26',
    borderStrong: '#3e3a34',
    textPrimary: '#F5F2EC',
    textSecondary: '#B3ADA2',
    textMuted: '#7A7469',
    destructive: '#EF4444',
    onAccent: '#121110',
  },
  paper: {
    bgBase: '#F5F1E8',
    bgSurface: '#EFE9DC',
    bgRaised: '#E7E0D0',
    borderSubtle: '#D8D0BC',
    borderLine: '#C9BFAA',
    borderStrong: '#A99E86',
    textPrimary: '#1F1B16',
    textSecondary: '#57503F',
    textMuted: '#8A8271',
    destructive: '#B91C1C',
    onAccent: '#FFFFFF',
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
};