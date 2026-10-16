import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { HOME_THEME_TOKENS, getPillShadow, getFloatingCardShadow } from '../../lib/homeThemeTokens';
import { isRTL, t } from '../../lib/i18n';
import {
  NAV_HEIGHT,
  NAV_SIDE_MARGIN,
  NAV_RADIUS,
  NAV_BOTTOM,
} from './layout.constants';

export type TabKey = 'home' | 'quran' | 'library' | 'tools';

export interface FloatingNavProps {
  active: TabKey | null;
  onChange: (tab: TabKey) => void;
}

interface TabItemConfig {
  key: TabKey;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: readonly TabItemConfig[] = [
  { key: 'home', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
  { key: 'quran', label: 'Quran', iconActive: 'book', iconInactive: 'book-outline' },
  { key: 'library', label: 'Library', iconActive: 'albums', iconInactive: 'albums-outline' },
  { key: 'tools', label: 'Tools', iconActive: 'construct', iconInactive: 'construct-outline' },
] as const;

export function FloatingNav({ active, onChange }: FloatingNavProps) {
  const { mode } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const safeBottom = insets.bottom;

  const navBottom = NAV_BOTTOM(safeBottom);
  const rtl = isRTL();

  const dockWidth = windowWidth - NAV_SIDE_MARGIN * 2;
  const columnWidth = dockWidth / 4;
  const maxPillWidth = Math.max(68, columnWidth - 4);

  // Responsive padding, gap, icon size, and font size based on available column width:
  // At 360dp: dockWidth=332dp, columnWidth=83dp -> pad=8dp, gap=5dp, icon=13dp, fontSize=11dp
  // At 393dp: dockWidth=365dp, columnWidth=91.25dp -> pad=10dp, gap=6dp, icon=13.5dp, fontSize=11.5dp
  // At 430dp: dockWidth=402dp, columnWidth=100.5dp -> pad=12dp, gap=7dp, icon=14dp, fontSize=12dp
  const isNarrowColumn = columnWidth < 88;
  const isMidColumn = columnWidth >= 88 && columnWidth < 96;

  const pillPadHorizontal = isNarrowColumn ? 8 : isMidColumn ? 10 : 12;
  const pillGap = isNarrowColumn ? 5 : isMidColumn ? 6 : 7;
  const iconSize = isNarrowColumn ? 13 : isMidColumn ? 13.5 : 14;
  const labelFontSize = isNarrowColumn ? 11 : isMidColumn ? 11.5 : 12;

  // 150ms pill opacity/scale animation with reduce-motion guard
  const [pillAnim] = useState(() => new Animated.Value(1));
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotion.current = v;
    });
  }, []);

  useEffect(() => {
    if (reduceMotion.current) {
      pillAnim.setValue(1);
      return;
    }
    pillAnim.setValue(0.95);
    Animated.timing(pillAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [active, pillAnim]);

  return (
    <View
      style={[
        styles.dockContainer,
        getFloatingCardShadow(mode),
        {
          bottom: navBottom,
          backgroundColor: tokens.cardTop,
        },
      ]}
      testID="floating-nav-container"
    >
      <LinearGradient
        colors={[tokens.cardTop, tokens.cardBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.dockSurface,
          {
            borderColor: tokens.cardBorder,
          },
        ]}
        testID="floating-nav-surface"
      >
        {/* Four equal full-height columns */}
        <View
          style={[
            styles.columnsRow,
            { flexDirection: rtl ? 'row-reverse' : 'row' },
          ]}
        >
          {TABS.map((tab) => {
            const isActive = tab.key === active;

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabColumn}
                onPress={() => onChange(tab.key)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t(tab.label)}
                activeOpacity={0.85}
                testID={`floating-nav-tab-${tab.key}`}
              >
                {isActive ? (
                  <Animated.View
                    style={[
                      styles.activePillWrap,
                      getPillShadow(mode),
                      {
                        opacity: pillAnim,
                        transform: [{ scale: pillAnim }],
                      },
                    ]}
                    testID="floating-nav-active-pill"
                  >
                    <LinearGradient
                      colors={HOME_THEME_TOKENS.goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.activePillGradient,
                        {
                          maxWidth: maxPillWidth,
                          paddingHorizontal: pillPadHorizontal,
                          gap: pillGap,
                          flexDirection: rtl ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons
                        name={tab.iconActive}
                        size={iconSize}
                        color={tokens.onGold}
                      />
                      <Text
                        testID="floating-nav-active-label"
                        style={[
                          styles.activeLabel,
                          {
                            color: tokens.onGold,
                            fontSize: labelFontSize,
                            fontFamily: rtl ? 'Amiri_700Bold' : 'Poppins_500Medium',
                            ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' as any } : {}),
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.9}
                      >
                        {t(tab.label)}
                      </Text>
                    </LinearGradient>
                  </Animated.View>
                ) : (
                  <Ionicons
                    name={tab.iconInactive}
                    size={iconSize + 0.5}
                    color={tokens.muted}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    left: NAV_SIDE_MARGIN,
    right: NAV_SIDE_MARGIN,
    height: NAV_HEIGHT,
    borderRadius: NAV_RADIUS,
    zIndex: 30,
  },
  dockSurface: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: NAV_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  columnsRow: {
    flex: 1,
    height: '100%',
    width: '100%',
    alignItems: 'center',
  },
  tabColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillWrap: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillGradient: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    fontSize: 12,
    includeFontPadding: false,
  },
});
