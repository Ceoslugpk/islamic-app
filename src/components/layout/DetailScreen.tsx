import React, { createContext, useContext, useMemo, useState, forwardRef } from 'react';
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
  RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_PAD_BOTTOM, SUBHEADER_BOTTOM, SUBHEADER_HEIGHT, CONTENT_GAP, HEADER_FADE } from './layout.constants';

export interface DetailScreenContextValue {
  padTop: number;
  padBottom: number;
  safeTop: number;
  safeBottom: number;
  header?: React.ReactNode;
  headerHeight: number;
  isDirectScroller: boolean;
}

const defaultContextValue: DetailScreenContextValue = {
  padTop: 0,
  padBottom: TAB_PAD_BOTTOM(0),
  safeTop: 0,
  safeBottom: 0,
  headerHeight: SUBHEADER_HEIGHT - HEADER_FADE,
  isDirectScroller: true,
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
   * Defaults to true for all secondary/detail screens so headers and content respect the status bar.
   */
  includeTopInset?: boolean;
}

/**
 * Authoritative DetailScreen layout container for secondary/sub screens.
 * Centralizes top and bottom clearance tokens (CONTENT_GAP = 24, TAB_PAD_BOTTOM),
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
  includeTopInset = true,
}: DetailScreenProps) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;
  const safeBottom = insets.bottom;
  const topOffset = includeTopInset ? safeTop : 0;

  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const defaultH = SUBHEADER_HEIGHT;
  const effectiveHeaderHeight = Math.max(0, (headerHeight > 0 ? headerHeight : defaultH) - HEADER_FADE);

  const isDirectScroller = useMemo(() => {
    if (scrollable) return true;
    const childrenArray = React.Children.toArray(children);
    if (childrenArray.length === 0) return false;
    const firstChild = childrenArray[0];
    if (React.isValidElement(firstChild)) {
      if (firstChild.type === DetailScrollView || firstChild.type === DetailFlatList) {
        return true;
      }
      const typeName = (firstChild.type as any)?.displayName || (firstChild.type as any)?.name;
      if (typeName === 'DetailScrollView' || typeName === 'DetailFlatList') {
        return true;
      }
    }
    return false;
  }, [scrollable, children]);

  const padTop = useMemo(() => {
    if (customPadTop !== undefined) return customPadTop;
    if (header) {
      return isDirectScroller ? topOffset + effectiveHeaderHeight + CONTENT_GAP : 0;
    }
    return SUBHEADER_BOTTOM(safeTop);
  }, [customPadTop, header, isDirectScroller, topOffset, effectiveHeaderHeight, safeTop]);

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
      headerHeight: effectiveHeaderHeight,
      isDirectScroller,
    }),
    [padTop, padBottom, safeTop, safeBottom, header, effectiveHeaderHeight, isDirectScroller]
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
        style,
      ]}
      testID={testID}
    >
      {header ? (
        <View
          style={[styles.headerWrapper, { top: topOffset }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - headerHeight) > 0.5) {
              setHeaderHeight(h);
            }
          }}
        >
          {header}
        </View>
      ) : null}
      <View
        style={[
          styles.contentWrapper,
          header && !isDirectScroller
            ? { paddingTop: topOffset + effectiveHeaderHeight + CONTENT_GAP }
            : null,
        ]}
        testID={!isDirectScroller ? 'screen-content' : undefined}
      >
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
 * - paddingTop: padTop (effectiveHeaderHeight + CONTENT_GAP when header is present)
 * - paddingBottom: padBottom (TAB_PAD_BOTTOM)
 * - showsVerticalScrollIndicator: false
 * - contentInsetAdjustmentBehavior: 'never'
 * - bounces: true
 */
export const DetailScrollView = forwardRef<ScrollView, ScrollViewProps>(
  ({ contentContainerStyle, children, refreshControl, testID, ...rest }, ref) => {
    const { padTop, padBottom, headerHeight, isDirectScroller } = useDetailScreen();
    const resolvedTestID = testID ?? (isDirectScroller ? 'screen-content' : 'screen-scroll-container');

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
        testID={resolvedTestID}
        {...rest}
        contentContainerStyle={[
          contentContainerStyle,
          { paddingTop: isDirectScroller ? padTop : 0, paddingBottom: padBottom },
        ]}
      >
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
  const { padTop, padBottom, headerHeight, isDirectScroller } = useDetailScreen();
  const { contentContainerStyle, refreshControl, testID, ...rest } = props;
  const resolvedTestID = testID ?? (isDirectScroller ? 'screen-content' : 'screen-scroll-container');

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
      testID={resolvedTestID}
      {...rest}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingTop: isDirectScroller ? padTop : 0, paddingBottom: padBottom },
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
    position: 'relative',
  },
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    overflow: 'visible',
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
