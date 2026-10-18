import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/** Keep native tab layouts warm without exposing inactive screens to input. */
export function PersistentTabPane({ active, children }: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.pane, active ? styles.active : styles.inactive]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      aria-hidden={!active}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { flex: 1 },
  active: { opacity: 1, zIndex: 1 },
  // display:none discards native layout and makes every tab return relayout its
  // whole screen. Zero opacity skips drawing while keeping those measurements.
  inactive: Platform.OS === 'web' ? { display: 'none' } : { opacity: 0, zIndex: 0 },
});
