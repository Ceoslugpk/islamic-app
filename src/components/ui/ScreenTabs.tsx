import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { themeTokens, fontRoles } from '../../theme/tokens';
import { AppText } from './AppText';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export interface ScreenTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ScreenTabs({
  tabs,
  activeTab,
  onChange,
  scrollable = false,
  style,
  testID = 'tabs',
}: ScreenTabsProps) {
  const { mode } = useTheme();
  const tokens = themeTokens[mode];
  const tabElements = tabs.map((tab) => {
    const isSelected = tab.id === activeTab;
    const tabTestId = isSelected ? 'tab-selected' : `tab-${tab.id}`;

    const innerContent = (
      <>
        <AppText
          variant="caption"
          tone={isSelected ? 'onGold' : undefined}
          style={[
            styles.tabText,
            {
              fontFamily: isSelected ? fontRoles.uiSemiBold : fontRoles.ui,
            },
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </AppText>
        {tab.badge !== undefined && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isSelected ? tokens.onGold : tokens.cardBorder,
              },
            ]}
          >
            <AppText
              variant="caption"
              highlight={isSelected}
              style={styles.badgeText}
            >
              {tab.badge}
            </AppText>
          </View>
        )}
      </>
    );

    return (
      <TouchableOpacity
        key={tab.id}
        testID={tabTestId}
        activeOpacity={0.8}
        onPress={() => onChange(tab.id)}
        accessibilityRole="tab"
        role="tab"
        accessibilityState={{ selected: isSelected }}
        aria-selected={isSelected}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={[
          styles.tabItem,
          isSelected && styles.tabItemSelected,
        ]}
      >
        {isSelected ? (
          <LinearGradient
            colors={tokens.goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabGradient}
          >
            {innerContent}
          </LinearGradient>
        ) : (
          innerContent
        )}
      </TouchableOpacity>
    );
  });

  const containerContent = (
    <View
      testID={testID}
      accessibilityRole="tablist"
      role="tablist"
      style={[
        styles.tabsContainer,
        {
          backgroundColor: tokens.cardTop,
          borderColor: tokens.cardBorder,
          flexDirection: 'row',
        },
        style,
      ]}
    >
      {tabElements}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollWrap}
      >
        {containerContent}
      </ScrollView>
    );
  }

  return containerContent;
}

const styles = StyleSheet.create({
  scrollWrap: {
    paddingVertical: 2,
  },
  tabsContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 3,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    gap: 6,
  },
  tabItemSelected: {
    overflow: 'hidden',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    elevation: 2,
  },
  tabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    gap: 6,
    width: '100%',
    height: '100%',
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10.5,
    fontFamily: fontRoles.uiBold,
  },
});
