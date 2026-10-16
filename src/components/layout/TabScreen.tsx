import React, { createContext, useContext, useMemo, forwardRef } from 'react';
import {
  View,
  ScrollView,
  ScrollViewProps,
  FlatList,
  FlatListProps,
  Animated,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_PAD_TOP, TAB_PAD_BOTTOM } from './layout.constants';

export interface TabScreenContextValue {
  padTop: number;
  padBottom: number;
  safeTop: number;
  safeBottom: number;
  header?: React.ReactNode;
}

const defaultContextValue: TabScreenContextValue = {
  padTop: TAB_PAD_TOP(0),
  padBottom: TAB_PAD_BOTTOM(0),
  safeTop: 0,
  safeBottom: 0,
};

export const TabScreenContext = createContext<TabScreenContextValue>(defaultContextValue);

export function useTabScreen(): TabScreenContextValue {
  return useContext(TabScreenContext);
}

export interface TabScreenProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
}

export function TabScreen({
  children,
  style,
  testID,
  scrollable = false,
  contentContainerStyle,
  header,
}: TabScreenProps) {
  // Exactly ONE useSafeAreaInsets call for the tab screen
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const safeBottom = insets.bottom;

  const padTop = useMemo(() => (header ? 0 : TAB_PAD_TOP(safeTop)), [header, safeTop]);
  const padBottom = useMemo(() => TAB_PAD_BOTTOM(safeBottom), [safeBottom]);

  const value = useMemo(
    () => ({
      padTop,
      padBottom,
      safeTop,
      safeBottom,
      header,
    }),
    [padTop, padBottom, safeTop, safeBottom, header]
  );

  return (
    <TabScreenContext.Provider value={value}>
      <View
        style={[
          styles.container,
          Platform.OS === 'web' && styles.webDvh,
          style,
        ]}
        testID={testID || 'tab-screen-root'}
      >
        {scrollable ? (
          <TabScrollView contentContainerStyle={contentContainerStyle}>
            {children}
          </TabScrollView>
        ) : (
          children
        )}
      </View>
    </TabScreenContext.Provider>
  );
}

/**
 * TabScrollView automatically applies unified tab padding and scroller configs:
 * - paddingTop: TAB_PAD_TOP
 * - paddingBottom: TAB_PAD_BOTTOM
 * - indicators: false
 * - contentInsetAdjustmentBehavior: 'never'
 * - automaticallyAdjustContentInsets: false
 * - bounces: true
 */
export const TabScrollView = forwardRef<ScrollView, ScrollViewProps>(
  ({ contentContainerStyle, children, ...rest }, ref) => {
    const { padTop, padBottom, header } = useTabScreen();
    const flatStyle = StyleSheet.flatten(contentContainerStyle);
    const padH =
      typeof flatStyle?.paddingHorizontal === 'number'
        ? flatStyle.paddingHorizontal
        : 0;
    const headerNode =
      header && padH > 0 ? (
        <View style={{ marginHorizontal: -padH }}>{header}</View>
      ) : (
        header
      );

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
TabScrollView.displayName = 'TabScrollView';

/**
 * TabAnimatedScrollView applies unified tab padding and scroller configs
 * for animated scroll views (e.g. HomeScreen compact prayer bar scroll listener).
 */
export const TabAnimatedScrollView = forwardRef<any, ScrollViewProps>(
  ({ contentContainerStyle, children, ...rest }, ref) => {
    const { padTop, padBottom, header } = useTabScreen();
    const flatStyle = StyleSheet.flatten(contentContainerStyle);
    const padH =
      typeof flatStyle?.paddingHorizontal === 'number'
        ? flatStyle.paddingHorizontal
        : 0;
    const headerNode =
      header && padH > 0 ? (
        <View style={{ marginHorizontal: -padH }}>{header}</View>
      ) : (
        header
      );

    return (
      <Animated.ScrollView
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
      </Animated.ScrollView>
    );
  }
);
TabAnimatedScrollView.displayName = 'TabAnimatedScrollView';

/**
 * TabFlatList automatically applies unified tab padding and scroller configs.
 */
export function TabFlatList<T>(
  props: FlatListProps<T> & { ref?: React.Ref<FlatList<T>> }
) {
  const { padTop, padBottom, header } = useTabScreen();
  const { contentContainerStyle, ListHeaderComponent, ...rest } = props;
  const flatStyle = StyleSheet.flatten(contentContainerStyle);
  const padH =
    typeof flatStyle?.paddingHorizontal === 'number'
      ? flatStyle.paddingHorizontal
      : 0;

  const combinedHeader = useMemo<React.ReactElement | null>(() => {
    if (!header && !ListHeaderComponent) return null;
    const headerNode =
      header && padH > 0 ? (
        <View style={{ marginHorizontal: -padH }}>{header}</View>
      ) : header ? (
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
  }, [header, ListHeaderComponent, padH]);

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

// Attach subcomponents to TabScreen for clean dot-notation usage
TabScreen.ScrollView = TabScrollView;
TabScreen.AnimatedScrollView = TabAnimatedScrollView;
TabScreen.FlatList = TabFlatList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  webDvh: Platform.select({
    web: {
      height: '100dvh' as any,
      maxHeight: '100dvh' as any,
    },
    default: {},
  }),
});
