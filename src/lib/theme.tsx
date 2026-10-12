import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palette, ThemeColors, ThemeMode } from './constants';
import { accentThemes, AccentKey, DEFAULT_ACCENT } from './accents';
import { useSettings } from './settings';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  accentKey: AccentKey;
  setAccent: (key: AccentKey) => void;
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

function getAccentColors(mode: ThemeMode, accentKey: AccentKey) {
  const accent = accentThemes[accentKey];
  if (mode === 'ink') {
    return {
      accent: accent.darkAccent,
      accentHover: accent.darkAccent,
      accentDim: accent.darkDim,
      success: accent.darkAccent,
    };
  }
  return {
    accent: accent.lightAccent,
    accentHover: accent.lightAccent,
    accentDim: accent.lightDim,
    success: accent.lightAccent,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { settings, setThemeMode, setAccentKey } = useSettings();

  // Resolve the effective ink/paper mode from the three-way setting
  const mode = resolveMode(settings.themeMode, systemScheme);
  const accentKey = settings.accentKey ?? DEFAULT_ACCENT;

  const toggle = () => {
  if (settings.themeMode === 'system') setThemeMode('ink');
  else if (settings.themeMode === 'ink') setThemeMode('paper');
  else setThemeMode('system');
};

  const setAccent = (key: AccentKey) => {
    setAccentKey(key);
  };

  const colors: ThemeColors = useMemo(
    () => ({ ...palette[mode], ...getAccentColors(mode, accentKey) }),
    [mode, accentKey],
  );

  return (
    <ThemeContext.Provider value={{ mode, colors, accentKey, setAccent, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}