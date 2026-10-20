import React, { createContext, useContext } from 'react';
import { isDiagnosticModeEnabled } from './diagnosticConfig';

export const DiagScreenContext = createContext<string>('App');

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
