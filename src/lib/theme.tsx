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
  // 'system' — follow OS; default to 'ink' if indeterminate
  return systemScheme === 'light' ? 'paper' : 'ink';
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

  const toggle = () => setThemeMode(mode === 'ink' ? 'paper' : 'ink');

  const setAccent = (key: AccentKey) => {
    setAccentKey(key);
  };

  const base = palette[mode];
  const accentColors = getAccentColors(mode, accentKey);

  const colors: ThemeColors = useMemo(
    () => ({ ...base, ...accentColors }),
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