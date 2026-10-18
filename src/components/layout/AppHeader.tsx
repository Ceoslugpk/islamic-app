import React from 'react';
import {
  View,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, getAppLogoSource } from '../../lib/theme';
import { HOME_THEME_TOKENS } from '../../lib/homeThemeTokens';
import { isRTL, t } from '../../lib/i18n';
import { AppText } from '../ui/AppText';
import {
  HEADER_ROW_HEIGHT,
  HEADER_ROW_TOP,
  HEADER_BOTTOM,
} from './layout.constants';
import { HeaderRingButton } from './HeaderRingButton';

export interface AppHeaderProps {
  onOpenSettings: () => void;
  testID?: string;
  transparent?: boolean;
}

export function AppHeader({
  onOpenSettings,
  testID,
  transparent = false,
}: AppHeaderProps) {
  const { mode, toggle } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  const insets = useSafeAreaInsets();
  const safeTop = insets.top;

  const headerBottom = HEADER_BOTTOM(safeTop);
  const containerHeight = headerBottom;
  const rowTop = HEADER_ROW_TOP(safeTop);
  const rtl = isRTL();

  return (
    <View
      style={[
        styles.container,
        {
          height: containerHeight,
          paddingTop: rowTop,
          backgroundColor: transparent ? 'transparent' : tokens.bgTop,
          elevation: transparent ? 0 : 4,
        },
      ]}
      testID="app-header"
      {...(testID && testID !== 'app-header' && testID !== 'app-header-container' ? { testID } : {})}
    >
      {/* Background: Solid tokens.bgTop to HEADER_BOTTOM if not transparent */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="app-header-bg">
        <View style={{ height: headerBottom, backgroundColor: transparent ? 'transparent' : tokens.bgTop }} />
      </View>

      <View style={[styles.headerContainer, { backgroundColor: transparent ? 'transparent' : tokens.bgTop }]} testID="app-header-container">
        {/* Row: height 32, paddingStart 26, paddingEnd 19, centered */}
        <View
          style={[
            styles.row,
            {
              paddingStart: 26,
              paddingEnd: 19,
              flexDirection: rtl ? 'row-reverse' : 'row',
            },
          ]}
          testID="app-header-row"
        >
        {/* Brand: Logo (24x24 radius 6.5) + gap 6 + ISLAMIC wordmark */}
        <View
          style={[styles.brand, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
          testID="app-header-brand"
        >
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: mode === 'paper' ? HOME_THEME_TOKENS.paper.accent : 'transparent',
              },
            ]}
            testID="app-header-logo"
          >
            <Image
              source={getAppLogoSource(mode)}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>
          <AppText
            variant="rowTitle"
            style={[
              styles.wordmark,
              {
                fontFamily: rtl ? 'Amiri_700Bold' : 'Poppins_500Medium',
                letterSpacing: rtl ? 0 : 3,
              },
            ]}
            numberOfLines={1}
            testID="app-header-wordmark"
          >
            {rtl ? 'اسلامک' : 'ISLAMIC'}
          </AppText>
        </View>

        {/* Actions: two 32 circular buttons, gap 4, cardTop fill, tokens.cardBorder 0.75 border, 14 gold icons */}
        <View
          style={[styles.actions, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
          testID="app-header-actions"
        >
          <HeaderRingButton
            variant="card"
            iconName="sunny-outline"
            iconSize={14}
            iconColor={tokens.gold}
            onPress={toggle}
            accessibilityLabel={t('Appearance')}
            testID="app-header-appearance"
          />

          <HeaderRingButton
            variant="card"
            iconName="settings-outline"
            iconSize={14}
            iconColor={tokens.gold}
            onPress={onOpenSettings}
            accessibilityLabel={t('Open settings')}
            testID="app-header-gear"
          />
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 10,
    elevation: 4,
  },
  headerContainer: {
    width: '100%',
  },
  row: {
    height: HEADER_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  brand: {
    alignItems: 'center',
    gap: 6,
  },
  logoWrap: {
    width: 24,
    height: 24,
    borderRadius: 6.5,
    overflow: 'hidden',
  },
  logoImg: {
    width: 24,
    height: 24,
    borderRadius: 6.5,
  },
  wordmark: {
    fontSize: 11,
    paddingVertical: 2,
  },
  actions: {
    alignItems: 'center',
    gap: 4,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
