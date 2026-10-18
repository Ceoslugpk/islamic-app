import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { HOME_THEME_TOKENS, getPillShadow } from '../../lib/homeThemeTokens';
import { getBackIcon, getForwardIcon } from '../../lib/iconMap';
import { isRTL, t } from '../../lib/i18n';
import { HEADER_MAX_WIDTH } from '../../lib/headerTokens';
import { AppText } from '../ui/AppText';

export interface ReaderHeaderProps {
  /** Back navigation callback */
  onBack: () => void;
  /** Back button text label. Defaults to 'Quran'. */
  backLabel?: string;
  /** Primary title (e.g. Surah name or Page title) */
  title: string;
  /** Optional secondary subtitle (e.g. 'Page 1 of 604') */
  subtitle?: string;
  /** Previous surah/page navigation callback */
  onPrev?: () => void;
  /** Whether previous navigation is disabled */
  prevDisabled?: boolean;
  /** Accessibility label for previous button */
  prevAccessibilityLabel?: string;
  /** Optional testID override for previous button */
  prevTestID?: string;
  /** Next surah/page navigation callback */
  onNext?: () => void;
  /** Whether next navigation is disabled */
  nextDisabled?: boolean;
  /** Accessibility label for next button */
  nextAccessibilityLabel?: string;
  /** Optional testID override for next button */
  nextTestID?: string;
  /** Callback when three-dot reading tools button is pressed */
  onOpenMenu?: () => void;
  /** Whether tools menu is currently open/expanded */
  menuOpen?: boolean;
  /** Accessibility label for three-dot menu button */
  menuAccessibilityLabel?: string;
  /** Animated opacity value for auto-hide scroll behaviors */
  opacity?: Animated.Value | Animated.AnimatedInterpolation<number> | number;
  /** Whether header is currently hidden during scroll */
  hidden?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Optional testID */
  testID?: string;
}

/**
 * Authoritative ReaderHeader for Quran and reader screens.
 * Preserves existing navigation, surah/page center switcher, and three-dot reading tools menu.
 */
export function ReaderHeader({
  onBack,
  backLabel = 'Quran',
  title,
  subtitle,
  onPrev,
  prevDisabled = false,
  prevAccessibilityLabel,
  prevTestID,
  onNext,
  nextDisabled = false,
  nextAccessibilityLabel,
  nextTestID,
  onOpenMenu,
  menuOpen = false,
  menuAccessibilityLabel,
  opacity,
  hidden = false,
  style,
  testID,
}: ReaderHeaderProps) {
  const { colors, mode } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const rtl = isRTL();

  const childPrefix = testID ?? 'reader-header';
  const navBarPaddingH = isCompact ? 10 : 16;
  const navBarPaddingV = isCompact ? 8 : 10;
  const backTextSize = isCompact ? 13 : 14;
  const backIconSize = isCompact ? 18 : 20;
  const surahNavBtnSize = isCompact ? 32 : 36;
  const surahNavIconSize = isCompact ? 20 : 22;
  const dotsIconSize = isCompact ? 20 : 22;
  const titleFontSizeNav = isCompact ? 16 : 18;

  const resolvedOpacity = opacity ?? 1;

  return (
    <Animated.View
      testID="reader-header"
      {...(testID && testID !== 'reader-header' ? { testID } : {})}
      style={[
        styles.navBar,
        {
          backgroundColor: tokens.bgTop,
          borderBottomColor: tokens.cardBorder,
          paddingHorizontal: navBarPaddingH,
          paddingVertical: navBarPaddingV,
          opacity: resolvedOpacity,
        },
        isCompact ? styles.navBarCompact : styles.navBarTablet,
        style,
      ]}
      pointerEvents={hidden ? 'none' : 'auto'}
    >
      {/* Back button - fixed left */}
      <TouchableOpacity
        testID={`${childPrefix}-back-btn`}
        style={[
          styles.backButton,
          {
            gap: isCompact ? 4 : 6,
            paddingVertical: isCompact ? 3 : 4,
            flexDirection: rtl ? 'row-reverse' : 'row',
          },
        ]}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t(`Back to ${backLabel}`)}
        activeOpacity={0.7}
      >
        <Ionicons name={getBackIcon('chevron')} size={backIconSize} color={colors.accent} />
        <AppText variant="link" style={[styles.backText, { fontSize: backTextSize }]}>
          {t(backLabel)}
        </AppText>
      </TouchableOpacity>

      {/* Center: Surah name / Page as centerpiece with prev/next inline */}
      <View style={styles.navCenter}>
        <View
          style={[
            styles.surahNavInline,
            { flexDirection: rtl ? 'row-reverse' : 'row' },
          ]}
        >
          {onPrev ? (
            <TouchableOpacity
              testID={prevTestID ?? `${childPrefix}-prev-btn`}
              style={[
                styles.surahNavBtn,
                { opacity: prevDisabled ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onPrev}
              disabled={prevDisabled}
              accessibilityRole="button"
              accessibilityLabel={prevAccessibilityLabel ?? t('Previous')}
              activeOpacity={0.7}
            >
              <Ionicons name={getBackIcon()} size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.navTitleColumn}>
            <AppText
              variant="headerTitle"
              testID={`${childPrefix}-title`}
              style={[
                styles.navSurahTitle,
                {
                  fontSize: titleFontSizeNav,
                  fontFamily: rtl ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityRole="header"
            >
              {title}
            </AppText>
            {subtitle ? (
              <AppText
                variant="subtitle"
                highlight
                testID={`${childPrefix}-subtitle`}
                style={[
                  styles.navPageSubTitle,
                  {
                    fontFamily: 'Manrope_600SemiBold',
                  },
                ]}
                numberOfLines={1}
              >
                {subtitle}
              </AppText>
            ) : null}
          </View>

          {onNext ? (
            <TouchableOpacity
              testID={nextTestID ?? `${childPrefix}-next-btn`}
              style={[
                styles.surahNavBtn,
                { opacity: nextDisabled ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onNext}
              disabled={nextDisabled}
              accessibilityRole="button"
              accessibilityLabel={nextAccessibilityLabel ?? t('Next')}
              activeOpacity={0.7}
            >
              <Ionicons name={getForwardIcon()} size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Three-dot menu button - fixed right */}
      {onOpenMenu ? (
        <TouchableOpacity
          testID="reader-dots-menu-btn"
          style={[
            styles.dotsButton,
            getPillShadow(mode),
            {
              backgroundColor: menuOpen ? colors.accentDim : colors.bgSurface,
              borderColor: menuOpen ? colors.accent : colors.borderSubtle,
            },
          ]}
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel={menuAccessibilityLabel ?? t('Reading tools')}
          accessibilityState={{ expanded: menuOpen }}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={dotsIconSize}
            color={menuOpen ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightSpacer} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: HEADER_MAX_WIDTH,
    alignSelf: 'center',
    zIndex: 10,
    elevation: 4,
  },
  navBarCompact: {
    paddingVertical: 6,
  },
  navBarTablet: {
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    minHeight: 44,
    minWidth: 44,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  surahNavInline: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  surahNavBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    maxWidth: 200,
    flexShrink: 1,
  },
  navSurahTitle: {
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  navPageSubTitle: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 1,
  },
  dotsButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSpacer: {
    width: 44,
    height: 44,
  },
});
