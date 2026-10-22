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

const RESPONDER_SLOP = 10;
const CONTENT_LAYOUT_STYLE_KEYS: (keyof ViewStyle)[] = [
  'flexDirection',
  'flexWrap',
  'justifyContent',
  'alignItems',
  'alignContent',
  'gap',
  'rowGap',
  'columnGap',
];

function getContentLayoutStyle(style: StyleProp<ViewStyle>): Partial<ViewStyle> | undefined {
  const flattened = StyleSheet.flatten(style);
  if (!flattened) return undefined;

  const layoutStyle: Partial<ViewStyle> = {};
  for (const key of CONTENT_LAYOUT_STYLE_KEYS) {
    const value = flattened[key];
    if (value !== undefined) layoutStyle[key] = value as never;
  }
  return Object.keys(layoutStyle).length > 0 ? layoutStyle : undefined;
}

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
  const responderLongPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionCancelled = React.useRef(false);
  const longPressFired = React.useRef(false);
  const responderStartPoint = React.useRef<{ x: number; y: number } | null>(null);
  const hasPressFeedback = typeof activeOpacity === 'number' || typeof scaleOnPress === 'number';
  const usesResponderFallback = contentPointerEvents === 'box-none';
  const contentLayoutStyle = getContentLayoutStyle(style);

  const clearResponderLongPress = () => {
    if (responderLongPressTimer.current !== null) {
      clearTimeout(responderLongPressTimer.current);
      responderLongPressTimer.current = null;
    }
  };

  const getPoint = (event: GestureResponderEvent): { x: number; y: number } | null => {
    const nativeEvent = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
      locationX?: number;
      locationY?: number;
    };
    if (!nativeEvent) return null;
    const x = typeof nativeEvent.pageX === 'number' ? nativeEvent.pageX : nativeEvent.locationX;
    const y = typeof nativeEvent.pageY === 'number' ? nativeEvent.pageY : nativeEvent.locationY;
    return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
  };

  const beginInteraction = (event: GestureResponderEvent, useFallbackTimer: boolean) => {
    clearResponderLongPress();
    interactionCancelled.current = false;
    longPressFired.current = false;
    responderStartPoint.current = getPoint(event);
    if (hasPressFeedback) setPressed(true);
    if (useFallbackTimer && onLongPress) {
      responderLongPressTimer.current = setTimeout(() => {
        responderLongPressTimer.current = null;
        if (interactionCancelled.current) return;
        longPressFired.current = true;
        onLongPress(event);
      }, delayLongPress ?? 500);
    }
  };

  const cancelInteraction = () => {
    clearResponderLongPress();
    interactionCancelled.current = true;
    responderStartPoint.current = null;
    if (hasPressFeedback) setPressed(false);
  };

  const finishInteraction = (event: GestureResponderEvent) => {
    const shouldPress = !interactionCancelled.current && !longPressFired.current;
    clearResponderLongPress();
    responderStartPoint.current = null;
    if (hasPressFeedback) setPressed(false);
    interactionCancelled.current = false;
    longPressFired.current = false;
    if (shouldPress) onPress?.(event);
  };

  const handlePressIn = (event: GestureResponderEvent) => beginInteraction(event, false);

  const handlePressOut = () => {
    clearResponderLongPress();
    responderStartPoint.current = null;
    if (hasPressFeedback) setPressed(false);
  };

  const handleDirectPress = (event: GestureResponderEvent) => finishInteraction(event);

  const handleDirectLongPress = (event: GestureResponderEvent) => {
    clearResponderLongPress();
    if (interactionCancelled.current) return;
    longPressFired.current = true;
    onLongPress?.(event);
  };

  React.useEffect(() => clearResponderLongPress, []);

  const handleResponderGrant = (event: GestureResponderEvent) => {
    beginInteraction(event, true);
  };

  const handleResponderMove = (event: GestureResponderEvent) => {
    const start = responderStartPoint.current;
    const point = getPoint(event);
    if (!start || !point || interactionCancelled.current) return;
    if (Math.abs(point.x - start.x) > RESPONDER_SLOP || Math.abs(point.y - start.y) > RESPONDER_SLOP) {
      cancelInteraction();
    }
  };

  const handleResponderRelease = (event: GestureResponderEvent) => {
    finishInteraction(event);
  };

  const handleResponderTerminate = () => {
    cancelInteraction();
  };

  return (
    <View
      style={[
        style,
        pressed && typeof scaleOnPress === 'number' ? { transform: [{ scale: scaleOnPress }] } : null,
        pressed && typeof activeOpacity === 'number' ? { opacity: activeOpacity } : null,
      ]}
      onLayout={onLayout}
      onStartShouldSetResponder={usesResponderFallback ? () => true : undefined}
      onResponderGrant={usesResponderFallback ? handleResponderGrant : undefined}
      onResponderMove={usesResponderFallback ? handleResponderMove : undefined}
      onResponderRelease={usesResponderFallback ? handleResponderRelease : undefined}
      onResponderTerminationRequest={usesResponderFallback ? () => true : undefined}
      onResponderTerminate={usesResponderFallback ? handleResponderTerminate : undefined}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        testID={testID}
        onPress={handleDirectPress}
        onLongPress={handleDirectLongPress}
        delayLongPress={delayLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessible={accessible}
      />
      <View
        pointerEvents={contentPointerEvents}
        style={[contentLayoutStyle, contentStyle]}
      >
        {children}
      </View>
    </View>
  );
}
