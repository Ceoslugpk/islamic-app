import { I18nManager, StyleProp, ViewStyle } from 'react-native';

/**
 * RTL fix for horizontal ScrollViews / rows.
 *
 * React Native does NOT auto-flip the content direction of a `horizontal`
 * ScrollView in RTL: the row starts at the physical left and overflows off the
 * LEFT edge (off-screen) when the layout direction is RTL. Applying this style
 * to the contentContainerStyle reverses the row so it starts at the
 * direction-start (right in RTL) edge and scrolls correctly.
 *
 * Usage:
 *   <ScrollView horizontal contentContainerStyle={[styles.row, hScrollRTLStyle()]}>
 */
export function hScrollRTLStyle(): StyleProp<ViewStyle> | null {
  return I18nManager.isRTL ? { flexDirection: 'row-reverse' as const } : null;
}

export const isRTL = I18nManager.isRTL;
