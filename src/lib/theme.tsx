import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { palette, ThemeColors, ThemeMode } from './constants';
import { nextThemeMode } from './themeMode';
import {
  HOME_THEME_TOKENS,
  CARD_SHADOW,
  HERO_CARD_SHADOW,
  ACTIVE_PRAYER_CARD_SHADOW,
  PILL_SHADOW,
} from './homeThemeTokens';
import { useSettings } from './settings';
import { textTokens, SemanticTextTokens } from '../theme/tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  tokens: SemanticTextTokens;
  textTokens: SemanticTextTokens;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(
  themeMode: 'system' | 'ink' | 'paper',
  systemScheme: ReturnType<typeof useColorScheme>,
): ThemeMode {
  if (themeMode === 'ink' || themeMode === 'paper') return themeMode;
  // 'system' — follow OS; default to 'paper' (reference brand system) if indeterminate
  return systemScheme === 'dark' ? 'ink' : 'paper';
}

function getAccentColors(mode: ThemeMode) {
  if (mode === 'ink') {
    return {
      accent: HOME_THEME_TOKENS.ink.gold,
      accentHover: HOME_THEME_TOKENS.ink.gold,
      accentDim: HOME_THEME_TOKENS.ink.ringFill,
      success: HOME_THEME_TOKENS.ink.gold,
    };
  }
  return {
    accent: HOME_THEME_TOKENS.paper.accent,
    accentHover: HOME_THEME_TOKENS.paper.accent,
    accentDim: HOME_THEME_TOKENS.paper.ringFill,
    success: HOME_THEME_TOKENS.paper.accent,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { settings, setThemeMode } = useSettings();

  // Resolve the effective ink/paper mode from the three-way setting
  const mode = resolveMode(settings.themeMode, systemScheme);

  // Toggle the visible mode directly. Cycling through "system" could leave
  // the screen looking unchanged when the device already uses the same scheme.
  const toggle = useCallback(() => {
    setThemeMode(nextThemeMode(mode));
  }, [mode, setThemeMode]);

  const colors: ThemeColors = useMemo(
    () => ({ ...palette[mode], ...getAccentColors(mode) }),
    [mode],
  );

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const scheme = mode === 'ink' ? 'dark' : 'light';
      document.documentElement.style.colorScheme = scheme;
      document.documentElement.setAttribute('data-theme', scheme);
    }
  }, [mode]);

  const scheme: 'light' | 'dark' = mode === 'ink' ? 'dark' : 'light';
  const semanticTokens = textTokens[mode];
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      colors,
      tokens: semanticTokens,
      textTokens: semanticTokens,
      toggle,
    }),
    [mode, scheme, colors, semanticTokens, toggle],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useSemanticTextTokens(): SemanticTextTokens {
  const { tokens } = useTheme();
  return tokens;
}

export {
  textTokens,
  getBrandLogoSource,
  useBrandLogoSource,
  getAppLogoSource,
  useAppLogoSource,
} from '../theme/tokens';
export type { SemanticTextTokens, BrandLogoVariant } from '../theme/tokens';

export function useHomeTokens() {
  const { mode } = useTheme();
  return HOME_THEME_TOKENS[mode];
}

export {
  CARD_SHADOW,
  HERO_CARD_SHADOW,
  ACTIVE_PRAYER_CARD_SHADOW,
  PILL_SHADOW,
  getCardShadow,
  getHeroCardShadow,
  getActivePrayerShadow,
  getPillShadow,
} from './homeThemeTokens';
export type { CardShadowTokens } from './homeThemeTokens';

export function useCardShadow() {
  const { mode } = useTheme();
  return CARD_SHADOW[mode];
}

export function useHeroCardShadow() {
  const { mode } = useTheme();
  return HERO_CARD_SHADOW[mode];
}

export function useActivePrayerShadow() {
  const { mode } = useTheme();
  return ACTIVE_PRAYER_CARD_SHADOW[mode];
}

export function usePillShadow() {
  const { mode } = useTheme();
  return PILL_SHADOW[mode];
}
