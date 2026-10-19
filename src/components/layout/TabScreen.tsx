import React, { createContext, useContext, useMemo, useCallback, useState, forwardRef } from 'react';
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
  RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_PAD_TOP, TAB_PAD_BOTTOM, HEADER_BOTTOM, CONTENT_GAP, HEADER_FADE, SCREEN_CONTENT_MAX_WIDTH } from './layout.constants';

export interface TabScreenContextValue {
  padTop: number;
  padBottom: number;
  safeTop: number;
  safeBottom: number;
  header?: React.ReactNode;
  headerHeight: number;
  measuredHeaderHeight: number;
  onHeaderLayout?: (height: number) => void;
}

const defaultContextValue: TabScreenContextValue = {
  padTop: TAB_PAD_TOP(0),
  padBottom: TAB_PAD_BOTTOM(0),
  safeTop: 0,
  safeBottom: 0,
  headerHeight: HEADER_BOTTOM(0) - HEADER_FADE,
  measuredHeaderHeight: HEADER_BOTTOM(0),
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

  const defaultH = HEADER_BOTTOM(safeTop);
  const [headerHeight, setHeaderHeight] = useState<number>(defaultH);
  const effectiveHeaderHeight = Math.max(0, headerHeight - HEADER_FADE);

  const padTop = useMemo(
    () => (header ? effectiveHeaderHeight + CONTENT_GAP : TAB_PAD_TOP(safeTop)),
    [header, safeTop, effectiveHeaderHeight]
  );
  const padBottom = useMemo(() => TAB_PAD_BOTTOM(safeBottom), [safeBottom]);

  const onHeaderLayout = useCallback((h: number) => {
    setHeaderHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  const value = useMemo(
    () => ({
      padTop,
      padBottom,
      safeTop,
      safeBottom,
      header,
      headerHeight: effectiveHeaderHeight,
      measuredHeaderHeight: headerHeight,
      onHeaderLayout,
    }),
    [padTop, padBottom, safeTop, safeBottom, header, effectiveHeaderHeight, headerHeight, onHeaderLayout]
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
 * TabScrollView automatically applies unified tab padding, scroller configs,
 * and renders the non-sticky shared header inside the scroll owner.
 */
export const TabScrollView = forwardRef<ScrollView, ScrollViewProps>(
  ({ contentContainerStyle, children, refreshControl, testID = 'screen-content', ...rest }, ref) => {
    const { header, padTop, padBottom, headerHeight, measuredHeaderHeight, onHeaderLayout } = useTabScreen();

    const flat = StyleSheet.flatten(contentContainerStyle);
    const padH = flat?.paddingHorizontal;
    const padStart = flat?.paddingStart;
    const padEnd = flat?.paddingEnd;
    const padL = flat?.paddingLeft;
    const padR = flat?.paddingRight;

    const headerMargin = useMemo(() => {
      const s: ViewStyle = {
        marginBottom: Math.max(0, CONTENT_GAP - HEADER_FADE),
      };
      if (typeof padH === 'number' && padH > 0) {
        s.marginHorizontal = -padH;
      } else {
        if (typeof padStart === 'number' && padStart > 0) {
          s.marginStart = -padStart;
        } else if (typeof padL === 'number' && padL > 0) {
          s.marginLeft = -padL;
        }
        if (typeof padEnd === 'number' && padEnd > 0) {
          s.marginEnd = -padEnd;
        } else if (typeof padR === 'number' && padR > 0) {
          s.marginRight = -padR;
        }
      }
      return s;
    }, [padH, padStart, padEnd, padL, padR]);

    const injectedRefreshControl = useMemo(() => {
      if (!refreshControl || !React.isValidElement(refreshControl)) return refreshControl;
      const rc = refreshControl as React.ReactElement<RefreshControlProps>;
      if (rc.props.progressViewOffset !== undefined) return refreshControl;
      return React.cloneElement(rc, { progressViewOffset: headerHeight });
    }, [refreshControl, headerHeight]);

    return (
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        bounces={true}
        refreshControl={injectedRefreshControl}
        testID={testID}
        {...rest}
        contentContainerStyle={[
          styles.contentFrame,
          contentContainerStyle,
          { paddingTop: header ? 0 : padTop, paddingBottom: padBottom },
        ]}
      >
        {header ? (
          <View
            style={[styles.scrollHeaderWrapper, headerMargin]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h - measuredHeaderHeight) > 0.5) {
                onHeaderLayout?.(h);
              }
            }}
          >
            {header}
          </View>
        ) : null}
        {children}
      </ScrollView>
    );
  }
);
TabScrollView.displayName = 'TabScrollView';

/**
 * TabAnimatedScrollView applies unified tab padding, scroller configs,
 * and renders the non-sticky shared header inside the animated scroll owner.
 */
export const TabAnimatedScrollView = forwardRef<any, ScrollViewProps>(
  ({ contentContainerStyle, children, refreshControl, testID = 'screen-content', ...rest }, ref) => {
    const { header, padTop, padBottom, headerHeight, measuredHeaderHeight, onHeaderLayout } = useTabScreen();

    const flat = StyleSheet.flatten(contentContainerStyle);
    const padH = flat?.paddingHorizontal;
    const padStart = flat?.paddingStart;
    const padEnd = flat?.paddingEnd;
    const padL = flat?.paddingLeft;
    const padR = flat?.paddingRight;

    const headerMargin = useMemo(() => {
      const s: ViewStyle = {
        marginBottom: Math.max(0, CONTENT_GAP - HEADER_FADE),
      };
      if (typeof padH === 'number' && padH > 0) {
        s.marginHorizontal = -padH;
      } else {
        if (typeof padStart === 'number' && padStart > 0) {
          s.marginStart = -padStart;
        } else if (typeof padL === 'number' && padL > 0) {
          s.marginLeft = -padL;
        }
        if (typeof padEnd === 'number' && padEnd > 0) {
          s.marginEnd = -padEnd;
        } else if (typeof padR === 'number' && padR > 0) {
          s.marginRight = -padR;
        }
      }
      return s;
    }, [padH, padStart, padEnd, padL, padR]);

    const injectedRefreshControl = useMemo(() => {
      if (!refreshControl || !React.isValidElement(refreshControl)) return refreshControl;
      const rc = refreshControl as React.ReactElement<RefreshControlProps>;
      if (rc.props.progressViewOffset !== undefined) return refreshControl;
      return React.cloneElement(rc, { progressViewOffset: headerHeight });
    }, [refreshControl, headerHeight]);

    return (
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        bounces={true}
        refreshControl={injectedRefreshControl}
        testID={testID}
        {...rest}
        contentContainerStyle={[
          styles.contentFrame,
          contentContainerStyle,
          { paddingTop: header ? 0 : padTop, paddingBottom: padBottom },
        ]}
      >
        {header ? (
          <View
            style={[styles.scrollHeaderWrapper, headerMargin]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h - measuredHeaderHeight) > 0.5) {
                onHeaderLayout?.(h);
              }
            }}
          >
            {header}
          </View>
        ) : null}
        {children}
      </Animated.ScrollView>
    );
  }
);
TabAnimatedScrollView.displayName = 'TabAnimatedScrollView';

/**
 * TabFlatList automatically applies unified tab padding, scroller configs,
 * and prepends the non-sticky shared header to ListHeaderComponent.
 */
export function TabFlatList<T>(
  props: FlatListProps<T> & { ref?: React.Ref<FlatList<T>> }
) {
  const { header, padTop, padBottom, headerHeight, measuredHeaderHeight, onHeaderLayout } = useTabScreen();
  const { contentContainerStyle, refreshControl, testID = 'screen-content', ListHeaderComponent, ...rest } = props;

  const flat = StyleSheet.flatten(contentContainerStyle);
  const padH = flat?.paddingHorizontal;
  const padStart = flat?.paddingStart;
  const padEnd = flat?.paddingEnd;
  const padL = flat?.paddingLeft;
  const padR = flat?.paddingRight;

  const headerMargin = useMemo(() => {
    const s: ViewStyle = {
      marginBottom: Math.max(0, CONTENT_GAP - HEADER_FADE),
    };
    if (typeof padH === 'number' && padH > 0) {
      s.marginHorizontal = -padH;
    } else {
      if (typeof padStart === 'number' && padStart > 0) {
        s.marginStart = -padStart;
      } else if (typeof padL === 'number' && padL > 0) {
        s.marginLeft = -padL;
      }
      if (typeof padEnd === 'number' && padEnd > 0) {
        s.marginEnd = -padEnd;
      } else if (typeof padR === 'number' && padR > 0) {
        s.marginRight = -padR;
      }
    }
    return s;
  }, [padH, padStart, padEnd, padL, padR]);

  const combinedHeader = useMemo(() => {
    if (!header && !ListHeaderComponent) return null;
    const originalHeader = React.isValidElement(ListHeaderComponent)
      ? ListHeaderComponent
      : typeof ListHeaderComponent === 'function'
      ? React.createElement(ListHeaderComponent as any)
      : ListHeaderComponent;

    if (!header) return originalHeader;

    return (
      <View style={styles.flatListHeaderWrap}>
        <View
          style={[styles.scrollHeaderWrapper, headerMargin]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - measuredHeaderHeight) > 0.5) {
              onHeaderLayout?.(h);
            }
          }}
        >
          {header}
        </View>
        {originalHeader}
      </View>
    );
  }, [header, ListHeaderComponent, headerMargin, measuredHeaderHeight, onHeaderLayout]);

  const injectedRefreshControl = useMemo(() => {
    if (!refreshControl || !React.isValidElement(refreshControl)) return refreshControl;
    const rc = refreshControl as React.ReactElement<RefreshControlProps>;
    if (rc.props.progressViewOffset !== undefined) return refreshControl;
    return React.cloneElement(rc, { progressViewOffset: headerHeight });
  }, [refreshControl, headerHeight]);

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      bounces={true}
      refreshControl={injectedRefreshControl}
      testID={testID}
      ListHeaderComponent={combinedHeader}
      {...rest}
      contentContainerStyle={[
        styles.contentFrame,
        contentContainerStyle,
        { paddingTop: header ? 0 : padTop, paddingBottom: padBottom },
      ]}
    />
  );
}

// Attach subcomponents to TabScreen for clean dot-notation usage
TabScreen.ScrollView = TabScrollView;
TabScreen.AnimatedScrollView = TabAnimatedScrollView;
TabScreen.FlatList = TabFlatList;

const styles = StyleSheet.create({
  contentFrame: {
    width: '100%',
    maxWidth: SCREEN_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scrollHeaderWrapper: {
    alignSelf: 'stretch',
    zIndex: 10,
    elevation: 4,
    position: 'relative',
  },
  flatListHeaderWrap: {
    alignSelf: 'stretch',
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
