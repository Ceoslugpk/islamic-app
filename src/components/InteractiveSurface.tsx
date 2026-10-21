import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type {
  AccessibilityRole,
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';

type PointerEvents = 'auto' | 'box-none' | 'box-only' | 'none';

export interface InteractiveSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  delayLongPress?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  activeOpacity?: number;
  scaleOnPress?: number;
  contentPointerEvents?: PointerEvents;
  accessible?: boolean;
  testID?: string;
}

/**
 * Keeps a card's hit target and its inner controls as siblings. The content
 * layer is deliberately not rendered inside the Pressable, so Android does
 * not expose or dispatch a control-inside-a-control hierarchy.
 */
export function InteractiveSurface({
  children,
  style,
  contentStyle,
  onPress,
  onLongPress,
  delayLongPress,
  onLayout,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  activeOpacity,
  scaleOnPress,
  contentPointerEvents = 'box-none',
  accessible,
  testID,
}: InteractiveSurfaceProps) {
  const [pressed, setPressed] = React.useState(false);
  const hasPressFeedback = typeof activeOpacity === 'number' || typeof scaleOnPress === 'number';

  return (
    <View
      style={[
        style,
        pressed && typeof scaleOnPress === 'number' ? { transform: [{ scale: scaleOnPress }] } : null,
        pressed && typeof activeOpacity === 'number' ? { opacity: activeOpacity } : null,
      ]}
      onLayout={onLayout}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        onPressIn={hasPressFeedback ? () => setPressed(true) : undefined}
        onPressOut={hasPressFeedback ? () => setPressed(false) : undefined}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessible={accessible}
      />
      <View
        pointerEvents={contentPointerEvents}
        style={contentStyle}
      >
        {children}
      </View>
    </View>
  );
}
