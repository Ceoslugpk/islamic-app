import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface UndoToastSaveParams {
  id: string;
  action: string;
  revert: () => void;
}

interface UndoToastContextValue {
  saveUndoState: (params: UndoToastSaveParams) => void;
  clear: () => void;
  visible: boolean;
  pendingUndo: { id: string; action: string; revert: () => void } | null;
}

const UndoToastContext = createContext<UndoToastContextValue>({
  saveUndoState: () => {},
  clear: () => {},
  visible: false,
  pendingUndo: null,
});

export const UndoToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [pendingUndo, setPendingUndo] = useState<
    | { id: string; action: string; revert: () => void }
    | null
  >(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const saveUndoState = useCallback(
    ({ id, action, revert }: UndoToastSaveParams) => {
      setPendingUndo({ id, action, revert });
      setVisible(true);

      if (timeoutId !== null) clearTimeout(timeoutId);
      const t = setTimeout(() => {
        setVisible(false);
        setPendingUndo(null);
      }, 4000);
      setTimeoutId(t);

      return () => {
        clearTimeout(t);
      };
    },
    [timeoutId]
  );

  const clear = useCallback(() => {
    setVisible(false);
    setPendingUndo(null);
    if (timeoutId !== null) clearTimeout(timeoutId);
  }, [timeoutId]);

  return (
    <UndoToastContext.Provider
      value={{ saveUndoState, clear, visible, pendingUndo }}
    >
      {children}
    </UndoToastContext.Provider>
  );
};

export const useUndoToast = (): {
  saveUndoState: (params: UndoToastSaveParams) => void;
  clear: () => void;
  visible: boolean;
  pendingUndo: { id: string; action: string; revert: () => void } | null;
} => {
  const context = useContext(UndoToastContext);
  if (!context) {
    throw new Error('useUndoToast must be used within UndoToastProvider');
  }
  return context;
};

import { useTheme } from './theme';
import { t } from './i18n';

const UndoToast: React.FC<{
  actionDescription: string;
  onUndo: () => void;
  onClose: () => void;
}> = ({ actionDescription, onUndo, onClose }) => {
  const { visible, pendingUndo } = useContext(UndoToastContext);
  const { colors } = useTheme();

  return visible ? (
    <View
      style={[
        styles.toastContainer,
        {
          backgroundColor: colors.bgRaised,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[styles.toastText, { color: colors.textPrimary }]}>{actionDescription}</Text>
      <TouchableOpacity
        style={styles.undoBtn}
        onPress={onUndo}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.undoBtnText, { color: colors.accent }]}>{t('Undo')}</Text>
      </TouchableOpacity>
    </View>
  ) : null;
};

const styles = {
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 12,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  toastText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  } as const,
  undoBtn: {
    minHeight: 40,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  } as const,
  undoBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  } as const,
};

export { UndoToast };

/* ─── Screen-level undo wrapper ────────────────────────────────────────
 * withUndoToast mounts the provider + toast around a screen so the screen
 * can call useUndoToast().saveUndoState({ id, action, revert }) and get a
 * 4s "Undo" toast with a revert callback — no App.tsx wiring needed.
 * action doubles as the toast label ("Bookmark deleted", "Note deleted", …).
 */
function UndoToastBridge() {
  const { pendingUndo, clear } = useContext(UndoToastContext);
  const onUndo = useCallback(() => {
    pendingUndo?.revert();
    clear();
  }, [pendingUndo, clear]);
  const onClose = useCallback(() => clear(), [clear]);
  return (
    <UndoToast
      actionDescription={pendingUndo?.action ?? ''}
      onUndo={onUndo}
      onClose={onClose}
    />
  );
}

export function withUndoToast<P extends object>(
  Screen: React.ComponentType<P>
): React.FC<P> {
  return function UndoToastScreen(props: P) {
    return (
      <UndoToastProvider>
        <View style={{ flex: 1 }}>
          <Screen {...props} />
          <UndoToastBridge />
        </View>
      </UndoToastProvider>
    );
  };
}
