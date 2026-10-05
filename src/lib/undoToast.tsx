import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface UndoToastSaveParams {
  id: string;
  action: 'bookmark' | 'note' | 'salah';
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

const UndoToast: React.FC<{
  actionDescription: string;
  onUndo: () => void;
  onClose: () => void;
  duration?: number;
}> = ({
  actionDescription,
  onUndo,
  onClose,
  duration = 4000,
}) => {
  const { visible, pendingUndo } = useContext(UndoToastContext);
  const [internalTimeoutId, setInternalTimeoutId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      if (internalTimeoutId !== null) clearTimeout(internalTimeoutId);
      const t = setTimeout(() => {
        onClose();
      }, 4000);
      setInternalTimeoutId(t);
    }
    return () => {
      if (internalTimeoutId !== null) clearTimeout(internalTimeoutId);
    };
  }, [visible, 4000, onClose, internalTimeoutId]);

  return visible ? (
    <View style={styles.toastContainer}>
      <Text style={styles.toastText}>{actionDescription}</Text>
      <TouchableOpacity style={styles.undoBtn} onPress={onUndo}>
        <Text style={styles.undoBtnText}>Undo</Text>
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
    backgroundColor: 'rgba(0,0,0,0.86)',
    borderRadius: 12,
    padding: 12,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  toastText: {
    color: 'white',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  } as const,
  undoBtn: {
    padding: 6,
  } as const,
  undoBtnText: {
    color: '#facc15',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  } as const,
};

export { UndoToast };