import React, { createContext, useContext } from 'react';
import { Text as RNText, View as RNView } from 'react-native';
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

type DiagErrorRecorder = (err: any, options?: any) => void;
let globalErrorRecorder: DiagErrorRecorder | null = null;

export function setDiagErrorRecorder(recorder: DiagErrorRecorder | null): void {
  globalErrorRecorder = recorder;
}

export function getDiagErrorRecorder(): DiagErrorRecorder | null {
  return globalErrorRecorder;
}

export interface DiagErrorBoundaryProps {
  screen?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface DiagErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class DiagErrorBoundary extends React.Component<DiagErrorBoundaryProps, DiagErrorBoundaryState> {
  constructor(props: DiagErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): DiagErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (!isDiagnosticModeEnabled()) return;
    const screen = this.props.screen || getGlobalActiveScreen() || 'App';
    if (globalErrorRecorder) {
      globalErrorRecorder(error, {
        screen,
        source: 'render',
        treeStillRenders: true,
      });
    }
  }

  render(): React.ReactNode {
    if (!isDiagnosticModeEnabled()) {
      return this.props.children;
    }

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const FallbackView: any = RNView;
      const FallbackText: any = RNText;

      return React.createElement(
        FallbackView,
        {
          testID: 'diag-render-error-fallback',
          style: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
        },
        React.createElement(
          FallbackText,
          { style: { fontSize: 16, fontWeight: '700', color: '#b91c1c', marginBottom: 8, textAlign: 'center' } },
          `Diagnostic: Render error in ${this.props.screen || 'Screen'}`
        ),
        React.createElement(
          FallbackText,
          { style: { fontSize: 12, color: '#4b5563', textAlign: 'center', lineHeight: 18 } },
          'Error was captured by the diagnostic ledger. The screen tree was preserved from crashing.'
        )
      );
    }

    return this.props.children;
  }
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
      <DiagErrorBoundary screen={name}>
        {children}
      </DiagErrorBoundary>
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
