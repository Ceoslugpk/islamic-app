import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import {
  View,
  ScrollView,
  ScrollViewProps,
  FlatList,
  FlatListProps,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_PAD_BOTTOM, SUBHEADER_BOTTOM } from './layout.constants';

export interface DetailScreenContextValue {
  padTop: number;
  padBottom: number;
  safeTop: number;
  safeBottom: number;
  header?: React.ReactNode;
  headerRenderedOutside?: boolean;
}

const defaultContextValue: DetailScreenContextValue = {
  padTop: 0,
  padBottom: TAB_PAD_BOTTOM(0),
  safeTop: 0,
  safeBottom: 0,
  headerRenderedOutside: false,
};

export const DetailScreenContext = createContext<DetailScreenContextValue>(defaultContextValue);

export function useDetailScreen(): DetailScreenContextValue {
  return useContext(DetailScreenContext);
}

export interface DetailScreenProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  /** Whether to enable keyboard avoiding container. Defaults to false. */
  keyboardAvoiding?: boolean;
  /** Custom bottom padding override */
  customPadBottom?: number;
  /** Custom top padding override */
  customPadTop?: number;
  /**
   * Whether to include safe-area top inset directly in DetailScreen.
   * Defaults to false (for screens inside App.tsx tabs that have root top clearance).
   * Set true for modal sub-screens (e.g. Settings sub-screens like Backup/Legal).
   */
  includeTopInset?: boolean;
}

/**
 * Authoritative DetailScreen layout container for secondary/sub screens.
 * Centralizes top and bottom clearance tokens (SUBHEADER_BOTTOM, TAB_PAD_BOTTOM),
 * ensures consistent scroll geometry, avoids double top padding, and preserves keyboard/modal behavior.
 */
export function DetailScreen({
  children,
  style,
  testID = 'detail-screen-root',
  scrollable = false,
  contentContainerStyle,
  header,
  keyboardAvoiding = false,
  customPadBottom,
  customPadTop,
  includeTopInset = false,
}: DetailScreenProps) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const safeBottom = insets.bottom;

  const headerRenderedOutside = Boolean(header && !scrollable);

  const padTop = useMemo(() => {
    if (customPadTop !== undefined) return customPadTop;
    if (header) return 0;
    return SUBHEADER_BOTTOM(safeTop);
  }, [header, safeTop, customPadTop]);

  const padBottom = useMemo(() => {
    if (customPadBottom !== undefined) return customPadBottom;
    return TAB_PAD_BOTTOM(safeBottom);
  }, [safeBottom, customPadBottom]);

  const value = useMemo(
    () => ({
      padTop,
      padBottom,
      safeTop,
      safeBottom,
      header,
      headerRenderedOutside,
    }),
    [padTop, padBottom, safeTop, safeBottom, header, headerRenderedOutside]
  );

  const content = scrollable ? (
    <DetailScrollView contentContainerStyle={contentContainerStyle}>
      {children}
    </DetailScrollView>
  ) : (
    children
  );

  const inner = (
    <View
      style={[
        styles.container,
        Platform.OS === 'web' && styles.webDvh,
        includeTopInset && { paddingTop: safeTop },
        style,
      ]}
      testID={testID}
    >
      {headerRenderedOutside ? header : null}
      <View style={styles.contentWrapper}>
        {content}
      </View>
    </View>
  );

  return (
    <DetailScreenContext.Provider value={value}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </DetailScreenContext.Provider>
  );
}

/**
 * DetailScrollView automatically applies unified clearance padding:
 * - paddingTop: padTop (0 when header is passed)
 * - paddingBottom: padBottom (TAB_PAD_BOTTOM)
 * - showsVerticalScrollIndicator: false
 * - contentInsetAdjustmentBehavior: 'never'
 * - bounces: true
 */
export const DetailScrollView = forwardRef<ScrollView, ScrollViewProps>(
  ({ contentContainerStyle, children, ...rest }, ref) => {
    const { padTop, padBottom, header, headerRenderedOutside } = useDetailScreen();
    const flatStyle = StyleSheet.flatten(contentContainerStyle);
    const padH =
      typeof flatStyle?.paddingHorizontal === 'number'
        ? flatStyle.paddingHorizontal
        : 0;

    // Only render header inside ScrollView if it wasn't already rendered outside
    const shouldRenderHeader = header && !headerRenderedOutside;
    const headerNode =
      shouldRenderHeader && padH > 0 ? (
        <View style={{ marginHorizontal: -padH }}>{header}</View>
      ) : shouldRenderHeader ? (
        header
      ) : null;

    return (
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        bounces={true}
        {...rest}
        contentContainerStyle={[
          contentContainerStyle,
          { paddingTop: padTop, paddingBottom: padBottom },
        ]}
      >
        {headerNode}
        {children}
      </ScrollView>
    );
  }
);
DetailScrollView.displayName = 'DetailScrollView';

/**
 * DetailFlatList automatically applies unified clearance padding.
 */
export function DetailFlatList<T>(
  props: FlatListProps<T> & { ref?: React.Ref<FlatList<T>> }
) {
  const { padTop, padBottom, header, headerRenderedOutside } = useDetailScreen();
  const { contentContainerStyle, ListHeaderComponent, ...rest } = props;
  const flatStyle = StyleSheet.flatten(contentContainerStyle);
  const padH =
    typeof flatStyle?.paddingHorizontal === 'number'
      ? flatStyle.paddingHorizontal
      : 0;

  // Only combine header if it was not already rendered outside
  const shouldRenderHeader = header && !headerRenderedOutside;

  const combinedHeader = useMemo<React.ReactElement | null>(() => {
    if (!shouldRenderHeader && !ListHeaderComponent) return null;
    const headerNode =
      shouldRenderHeader && padH > 0 ? (
        <View style={{ marginHorizontal: -padH }}>{header}</View>
      ) : shouldRenderHeader ? (
        <View>{header}</View>
      ) : null;
    if (!headerNode) {
      return React.isValidElement(ListHeaderComponent)
        ? (ListHeaderComponent as React.ReactElement)
        : typeof ListHeaderComponent === 'function'
        ? React.createElement(ListHeaderComponent)
        : null;
    }
    if (!ListHeaderComponent) return headerNode;
    return (
      <View>
        {headerNode}
        {typeof ListHeaderComponent === 'function'
          ? React.createElement(ListHeaderComponent)
          : ListHeaderComponent}
      </View>
    );
  }, [shouldRenderHeader, header, ListHeaderComponent, padH]);

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      bounces={true}
      {...rest}
      ListHeaderComponent={combinedHeader}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingTop: padTop, paddingBottom: padBottom },
      ]}
    />
  );
}

// Attach subcomponents
DetailScreen.ScrollView = DetailScrollView;
DetailScreen.FlatList = DetailFlatList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
  },
  keyboardWrap: {
    flex: 1,
    width: '100%',
  },
  webDvh: Platform.select({
    web: {
      height: '100dvh' as any,
      maxHeight: '100dvh' as any,
    },
    default: {},
  }),
});
