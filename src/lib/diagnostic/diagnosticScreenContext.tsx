import React, { createContext, useContext } from 'react';
import { isDiagnosticModeEnabled } from './diagnosticConfig';

export const DiagScreenContext = createContext<string>('App');
export const DiagParentContext = createContext<string | undefined>(undefined);

let globalCurrentScreen = 'App';

export function setGlobalActiveScreen(screen: string): void {
  globalCurrentScreen = screen || 'App';
}

export function getGlobalActiveScreen(): string {
  return globalCurrentScreen || 'App';
}

export function useDiagParent(): string | undefined {
  return useContext(DiagParentContext);
}

export interface DiagParentProviderProps {
  testID: string;
  children: React.ReactNode;
}

export function DiagParentProvider({ testID, children }: DiagParentProviderProps): React.ReactElement {
  if (!isDiagnosticModeEnabled()) {
    return <>{children}</>;
  }
  return (
    <DiagParentContext.Provider value={testID}>
      {children}
    </DiagParentContext.Provider>
  );
}

export interface DiagScreenProviderProps {
  name: string;
  children: React.ReactNode;
}

/**
 * Gated screen-context provider.
 * When the diagnostic gate is false, renders children directly without context overhead.
 */
export function DiagScreenProvider({ name, children }: DiagScreenProviderProps): React.ReactElement {
  if (!isDiagnosticModeEnabled()) {
    return <>{children}</>;
  }

  // Sync global screen reference for non-hook diagnostic listeners.
  // Static modals rendered alongside the active screen hierarchy (such as AudioPlayerModal)
  // must not overwrite globalCurrentScreen when another screen is actively routed.
  if (name && (name !== 'AudioPlayerModal' || globalCurrentScreen === 'App' || globalCurrentScreen === 'AudioPlayerModal')) {
    setGlobalActiveScreen(name);
  }

  return (
    <DiagScreenContext.Provider value={name}>
      {children}
    </DiagScreenContext.Provider>
  );
}

/**
 * Reads the active diagnostic screen name from context.
 * Falls back to 'App' if no provider is active or when diagnostics are disabled.
 */
export function useDiagScreen(): string {
  const currentScreen = useContext(DiagScreenContext);
  if (!isDiagnosticModeEnabled()) {
    return 'App';
  }
  return currentScreen || 'App';
}
