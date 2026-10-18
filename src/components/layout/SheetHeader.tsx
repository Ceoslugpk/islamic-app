import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { HOME_THEME_TOKENS } from '../../lib/homeThemeTokens';
import { touchTargetTokens } from '../../lib/buttonTokens';
import { isRTL, t } from '../../lib/i18n';
import {
  HEADER_HORIZONTAL_PADDING,
  HEADER_MAX_WIDTH,
  HEADER_PADDING_VERTICAL,
} from '../../lib/headerTokens';
import { SUBHEADER_HEIGHT } from './layout.constants';
import { fontRoles } from '../../theme/tokens';
import { HeaderRingButton } from './HeaderRingButton';
import { AppText } from '../ui/AppText';

export interface SheetHeaderProps {
  /** Title of the sheet or modal */
  title: string;
  /** Optional category or section eyebrow */
  eyebrow?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Close or dismiss callback */
  onClose?: () => void;
  /** Close action label (e.g. "Done" or "Cancel"). If omitted, renders close icon ring button */
  closeLabel?: string;
  /** Whether to show the top drag pill. Defaults to true */
  showDragPill?: boolean;
  /** Optional accessibility label for drag pill dismiss button */
  dismissAccessibilityLabel?: string;
  /** Optional chip or badge accessory */
  chip?: React.ReactNode;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Whether to show bottom hairline separator. Defaults to true */
  borderBottom?: boolean;
  /** Optional testID */
  testID?: string;
}

/**
 * Authoritative SheetHeader for modal dialogs and bottom sheets.
 * Features:
 * - Centered 36x5dp drag pill with 2.5dp radius
 * - Display title (Amiri for RTL, Instrument Serif / Lora for LTR) and optional eyebrow
 * - Dismiss button (32dp ring button or text action)
 * - Hairline bottom border
 */
export function SheetHeader({
  title,
  eyebrow,
  subtitle,
  onClose,
  closeLabel,
  showDragPill = true,
  dismissAccessibilityLabel,
  chip,
  style,
  borderBottom = true,
  testID,
}: SheetHeaderProps) {
  const { colors, mode } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const rtl = isRTL();

  const childPrefix = testID ?? 'sheet-header';

  return (
    <View
      testID="sheet-header"
      {...(testID && testID !== 'sheet-header' ? { testID } : {})}
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          paddingHorizontal: HEADER_HORIZONTAL_PADDING,
          borderBottomColor: colors.borderSubtle,
          borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      {/* Centered Drag Pill (36 x 5dp, radius 2.5dp) */}
      {showDragPill && (
        <View style={styles.dragPillWrap} testID={`${childPrefix}-drag-pill-wrap`}>
          {onClose ? (
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={dismissAccessibilityLabel ?? t('Dismiss')}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            >
              <View
                style={[
                  styles.dragPill,
                  { backgroundColor: mode === 'ink' ? tokens.ringBorder : colors.borderSubtle },
                ]}
                testID={`${childPrefix}-drag-pill`}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.dragPill,
                { backgroundColor: mode === 'ink' ? tokens.ringBorder : colors.borderSubtle },
              ]}
              testID={`${childPrefix}-drag-pill`}
            />
          )}
        </View>
      )}

      {/* Content Row */}
      <View
        style={[
          styles.row,
          { flexDirection: 'row' },
        ]}
      >
        <View style={styles.titleColumn}>
          {eyebrow ? (
            <AppText
              variant="eyebrow"
              testID={`${childPrefix}-eyebrow`}
              style={[
                styles.eyebrow,
                {
                  fontFamily: rtl ? fontRoles.arabicBold : fontRoles.eyebrowFallback,
                  fontSize: isCompact ? 10 : 11,
                  textAlign: rtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
            >
              {t(eyebrow)}
            </AppText>
          ) : null}
          <AppText
            variant="headerTitle"
            testID={`${childPrefix}-title`}
            style={[
              styles.title,
              {
                fontFamily: rtl ? fontRoles.titleRtl : fontRoles.titleFallback,
                fontSize: 22,
                lineHeight: 26,
                textAlign: rtl ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {t(title)}
          </AppText>
          {subtitle ? (
            <AppText
              variant="subtitle"
              testID={`${childPrefix}-subtitle`}
              style={[
                styles.subtitle,
                {
                  fontFamily: fontRoles.ui,
                  fontSize: isCompact ? 11.5 : 12,
                  textAlign: rtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
            >
              {t(subtitle)}
            </AppText>
          ) : null}
        </View>

        {/* Right Actions & Dismiss */}
        {(chip || onClose) && (
          <View
            style={[
              styles.rightActionsRow,
              { flexDirection: 'row' },
            ]}
          >
            {chip ? (
              <View testID={`${childPrefix}-chip`} style={styles.chipWrap}>
                {chip}
              </View>
            ) : null}
            {onClose && (
              <View style={styles.dismissWrap}>
                {closeLabel ? (
                  <TouchableOpacity
                    testID={`${childPrefix}-close-btn`}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={t(closeLabel)}
                    hitSlop={touchTargetTokens.hitSlop8}
                    activeOpacity={0.7}
                    style={styles.closeTextTouch}
                  >
                    <AppText
                      variant="link"
                      style={[
                        styles.closeText,
                        {
                          fontFamily: rtl ? fontRoles.arabicBold : fontRoles.uiSemiBold,
                        },
                      ]}
                    >
                      {t(closeLabel)}
                    </AppText>
                  </TouchableOpacity>
                ) : (
                  <HeaderRingButton
                    testID={`${childPrefix}-close-btn`}
                    iconName="close"
                    iconSize={16}
                    iconColor={colors.accent}
                    onPress={onClose}
                    accessibilityLabel={t('Close')}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: SUBHEADER_HEIGHT,
    width: '100%',
    maxWidth: HEADER_MAX_WIDTH,
    alignSelf: 'center',
    paddingVertical: HEADER_PADDING_VERTICAL,
    position: 'relative',
    zIndex: 10,
    elevation: 4,
  },
  dragPillWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  dragPill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  eyebrow: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
  },
  dismissWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  closeTextTouch: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 14,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
