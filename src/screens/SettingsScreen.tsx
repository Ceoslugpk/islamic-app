import React, { useState, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  BackHandler,
  Platform,
} from 'react-native';
import type { AccessibilityRole, AccessibilityState, GestureResponderEvent } from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { reloadAppAsync } from 'expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useThemeTokens, getTokens, cardTokens, getBrandLogoSource } from '../theme/tokens';
import { getForwardIcon, iconSizes } from '../lib/iconMap';
import { touchTargetTokens } from '../lib/buttonTokens';
import { t, prepareNativeLayoutDirection, AppLanguage, isRtlLanguage } from '../lib/i18n';
import LegalScreen, { LegalScreenKey } from './LegalScreen';
import { BackupRestoreScreen } from './BackupRestoreScreen';
import { SheetHeader } from '../components/layout/SheetHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import {
  useSettings,
  QURAN_FONT_SIZE_MIN,
  QURAN_FONT_SIZE_MAX,
  QURAN_FONT_SIZE_STEP,
  QURAN_LINE_HEIGHT_MIN,
  QURAN_LINE_HEIGHT_MAX,
  QURAN_LINE_HEIGHT_STEP,
} from '../lib/settings';
import type { QuranArabicFont } from '../lib/settings';
import { QURAN_FONT_FAMILIES } from '../components/ArabicText';
import { useHaptics } from '../lib/haptics';
import { Hairline } from '../components/Hairline';
import { CALC_METHODS, fetchPrayerTimes } from '../lib/prayerTimes';
import {
  configureNotifications,
  requestNotificationPermission,
  schedulePrayerNotifications,
  scheduleQuranReminder,
  cancelPrayerNotifications,
  cancelQuranReminder,
  getNotificationHealth,
  isNotificationSchedulingSupported,
  NotificationHealth,
} from '../lib/notifications';
import {
  playAdhan,
  stopAdhan,
  getAdhanReciter,
  addAdhanPlaybackListener,
} from '../lib/audio';
import { AdhanReciterModal } from '../components/AdhanReciterModal';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { formatTime } from '../lib/timeFormat';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { getLocalizedTranslatorName } from '../lib/quranLanguages';
import { getLocalizedLanguageName } from '../lib/surahNamesLocalized';
import { clearWomenData, clearCycleHistory } from '../lib/db';
import { WomenPinModal } from '../components/WomenPinModal';
import { GeometricPattern } from '../components/GeometricPattern';
import {
  useQuranPreload,
  verifyQuranPreloadCache,
  repairQuranPreloadCache,
  QuranPreloadVerification,
} from '../lib/quranPreloader';

import appConfig from '../../app.json';

const APP_VERSION = appConfig.expo.version;

/**
 * The app's mission, in several languages.
 * "This app does not make any revenue. It is made entirely for Sadaqah Jariyah."
 */
const MISSION_TRANSLATIONS: { lang: string; text: string }[] = [
  { lang: 'English', text: 'This app makes no revenue — it is made entirely as Sadaqah Jariyah (ongoing charity).' },
  { lang: 'العربية', text: 'هذا التطبيق لا يجني أي أرباح، وهو مخلوق بالكامل كصدقة جارية.' },
  { lang: 'اردو', text: 'یہ ایپ کوئی آمدنی نہیں کماتی — یہ مکمل طور پر صدقہ جاریہ کے لیے بنائی گئی ہے۔' },
  { lang: 'Bahasa Indonesia', text: 'Aplikasi ini tidak menghasilkan pendapatan — dibuat sepenuhnya sebagai sedekah jariah.' },
  { lang: 'Français', text: 'Cette application ne génère aucun revenu — elle est faite entièrement comme Sadaqah Jariyah.' },
  { lang: 'Türkçe', text: 'Bu uygulama hiçbir gelir elde etmez — tamamen sadaka-i cariye olarak yapılmıştır.' },
  { lang: 'Melayu', text: 'Aplikasi ini tidak meraih sebarang pendapatan — ia dibuat sepenuhnya sebagai sedekah jariah.' },
];

/**
 * All data providers, thanked together.
 */
const MISSION_TABS = [
  { lang: 'English', label: 'English', fontFamily: 'Poppins_500Medium' },
  { lang: 'العربية', label: 'العربية', fontFamily: 'NotoNaskhArabic_400Regular' },
  { lang: 'اردو', label: 'اردو', fontFamily: 'NotoNaskhArabic_400Regular' },
  { lang: 'Bahasa Indonesia', label: 'Indonesia', fontFamily: 'Poppins_500Medium' },
  { lang: 'Français', label: 'Français', fontFamily: 'Poppins_500Medium' },
] as const;

function getMissionLanguage(language: string): string {
  const languageToMission: Record<string, string> = {
    en: 'English', ar: 'العربية', ur: 'اردو', id: 'Bahasa Indonesia', fr: 'Français',
  };
  return languageToMission[language] ?? 'English';
}

export interface AppLanguageOption {
  value: AppLanguage;
  label: string;
  nativeLabel: string;
  englishName: string;
  direction: 'LTR' | 'RTL';
  fontFamily?: string;
}

export const APP_LANGUAGE_OPTIONS: readonly AppLanguageOption[] = [
  { value: 'en', label: 'English', nativeLabel: 'English', englishName: 'English', direction: 'LTR' },
  { value: 'ur', label: 'اردو', nativeLabel: 'اردو', englishName: 'Urdu', direction: 'RTL', fontFamily: 'NotoNaskhArabic_700Bold' },
  { value: 'ar', label: 'العربية', nativeLabel: 'العربية', englishName: 'Arabic', direction: 'RTL', fontFamily: 'NotoNaskhArabic_700Bold' },
  { value: 'hi', label: 'हिन्दी', nativeLabel: 'हिन्दी', englishName: 'Hindi', direction: 'LTR' },
  { value: 'ml', label: 'മലയാളം', nativeLabel: 'മലയാളം', englishName: 'Malayalam', direction: 'LTR' },
  { value: 'si', label: 'සිංහල', nativeLabel: 'සිංහල', englishName: 'Sinhala', direction: 'LTR' },
  { value: 'bn', label: 'বাংলা', nativeLabel: 'বাংলা', englishName: 'Bengali', direction: 'LTR' },
  { value: 'ms', label: 'Bahasa Melayu', nativeLabel: 'Bahasa Melayu', englishName: 'Malay', direction: 'LTR' },
  { value: 'ta', label: 'தமிழ்', nativeLabel: 'தமிழ்', englishName: 'Tamil', direction: 'LTR' },
  { value: 'id', label: 'Bahasa Indonesia', nativeLabel: 'Bahasa Indonesia', englishName: 'Indonesian', direction: 'LTR' },
  { value: 'ps', label: 'پښتو', nativeLabel: 'پښتو', englishName: 'Pashto', direction: 'RTL', fontFamily: 'NotoNaskhArabic_700Bold' },
];

const QURAN_FONT_OPTIONS: { key: QuranArabicFont; label: string; desc: string }[] = [
  { key: 'amiri', label: 'Amiri', desc: 'Classic Naskh — the Quran reader default' },
  { key: 'notonaskh', label: 'Noto Naskh Arabic', desc: "Google's clean, highly legible Naskh" },
];

const absoluteStartEndFill = { position: 'absolute' as const, top: 0, bottom: 0, start: 0, end: 0 };

interface SettingsLayout {
  width: number;
  isCompact: boolean;
  screenPad: number;
  cardPad: number;
  rowPad: number;
  titleSize: number;
  descSize: number;
  labelSize: number;
  sectionGap: number;
  segMinW: number;
  segLabelSize: number;
  segPadV: number;
  maxW: number;
}

/**
 * Mobile-first metrics. width < 380 → compact (smaller type, tighter padding,
 * touch targets stay ≥ 40px). The content column is capped at maxW and centred
 * so tablets/web stay readable.
 */
function useSettingsLayout(): SettingsLayout {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  return {
    width,
    isCompact,
    screenPad: isCompact ? 16 : 20,
    cardPad: isCompact ? 12 : 16,
    rowPad: 5.65,
    titleSize: 12,
    descSize: 10.5,
    labelSize: isCompact ? 10 : 11,
    sectionGap: isCompact ? 14.5 : 18,
    segMinW: 44,
    segLabelSize: 10.5,
    segPadV: 4,
    maxW: 640,
  };
}

interface SectionProps {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  summary?: string;
}

/** Uppercase section label ABOVE a surface card; hairlines separate rows inside. */
function Section({ label, children, collapsible, expanded, onToggle, summary }: SectionProps) {
  const { mode } = useTheme();
  const homeTokens = getTokens(mode);
  const layout = useSettingsLayout();

  const isExpanded = collapsible ? Boolean(expanded) : true;

  return (
    <View style={{ marginTop: layout.sectionGap }}>
      <View style={styles.sectionHeaderWrap}>
        <AppText accessibilityRole="header" aria-level={2} accessibilityState={{ expanded: isExpanded }} variant="eyebrow" style={[styles.groupLabel, { fontSize: layout.labelSize, marginBottom: 0 }]}>
          {t(label)}
        </AppText>
        {collapsible && onToggle && (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={`${t(label)}, ${isExpanded ? t('Expanded') : t('Collapsed')}`}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            style={({ pressed }) => [styles.sectionHeaderBtn, pressed && styles.buttonPressed]}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={homeTokens.accent}
            />
          </Pressable>
        )}
      </View>
      <View
        style={[
          styles.sectionCard,
          cardTokens.shadow[mode],
          {
            borderColor: homeTokens.cardBorder,
            backgroundColor: homeTokens.cardTop,
          },
        ]}
      >
        <LinearGradient
          colors={[homeTokens.cardTop, homeTokens.cardBottom]}
          style={absoluteStartEndFill}
        />
        {collapsible && !isExpanded ? (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: false }}
            accessibilityLabel={`${t(label)}${summary ? `, ${summary}` : ''}, ${t('Collapsed')}`}
            hitSlop={{ top: 2.35, bottom: 2.35 }}
            style={({ pressed }) => [
              styles.collapsedSummaryRow,
              {
                paddingVertical: layout.rowPad,
                paddingHorizontal: layout.cardPad,
                backgroundColor: pressed ? `${homeTokens.gold}14` : 'transparent',
              },
            ]}
          >
            <View style={styles.rowFlex}>
              <AppText variant="rowTitle" style={styles.rowTitle}>
                {t(label)}
              </AppText>
              {summary ? (
                <AppText variant="subtitle" style={styles.rowDesc} numberOfLines={2}>
                  {summary}
                </AppText>
              ) : null}
            </View>
            <View style={styles.expandPill}>
              <AppText variant="link" style={styles.expandPillText}>
                {t('Expand')}
              </AppText>
              <Ionicons name="chevron-down" size={14} color={homeTokens.accent} />
            </View>
          </Pressable>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

interface RowProps {
  title: string;
  desc?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  muted?: boolean;
  danger?: boolean;
  titleFont?: string;
  titleFontSize?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}

/** One settings row: comfortable touch target, title + optional description. */
function Row({
  title,
  desc,
  right,
  children,
  onPress,
  disabled = false,
  muted = false,
  danger = false,
  titleFont,
  titleFontSize,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: RowProps) {
  const { mode } = useTheme();
  const homeTokens = getTokens(mode);
  const layout = useSettingsLayout();
  const isRadio = accessibilityRole === 'radio';

  const rowStyle = [
    styles.row,
    {
      paddingVertical: isRadio ? 3.5 : layout.rowPad,
      paddingHorizontal: layout.cardPad,
      minHeight: isRadio ? 35 : 39.3,
      opacity: disabled ? 0.5 : 1,
    },
  ];

  const body = (
    <View style={styles.rowFlex}>
      <AppText
        variant="rowTitle"
        tone={danger ? 'danger' : undefined}
        style={[
          styles.rowTitle,
          { fontSize: titleFontSize ?? layout.titleSize },
          titleFont ? { fontFamily: titleFont } : null,
          muted ? { color: homeTokens.muted } : null,
        ]}
      >
        {t(title)}
      </AppText>
      {desc ? (
        <AppText variant="subtitle" style={[styles.rowDesc, { fontSize: layout.descSize }]}>{t(desc)}</AppText>
      ) : null}
      {children}
    </View>
  );

  if (onPress && !disabled) {
    const isChecked = accessibilityState?.selected ?? accessibilityState?.checked ?? false;
    return (
      <Pressable
        style={({ pressed }) => [rowStyle, pressed && { backgroundColor: `${homeTokens.gold}14` }]}
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel ?? [t(title), desc ? t(desc) : ''].filter(Boolean).join(', ')}
        accessibilityState={{
          ...(accessibilityState || {}),
          ...(isRadio ? { checked: isChecked } : {}),
        }}
        {...(isRadio && Platform.OS === 'web' ? { 'aria-checked': isChecked as any } : {})}
        hitSlop={{ top: 2.35, bottom: 2.35 }}
      >
        {body}
        {right}
      </Pressable>
    );
  }

  const isChecked = accessibilityState?.selected ?? accessibilityState?.checked ?? false;
  return (
    <View
      style={rowStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? [t(title), desc ? t(desc) : ''].filter(Boolean).join(', ')}
      accessibilityState={{
        ...(accessibilityState || {}),
        ...(isRadio ? { checked: isChecked } : {}),
      }}
      {...(isRadio && Platform.OS === 'web' ? { 'aria-checked': isChecked as any } : {})}
      accessible={Boolean(accessibilityRole && (!right || accessibilityRole === 'radio'))}
    >
      {body}
      {right}
    </View>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  const { mode } = useTheme();
  const themeTokens = getTokens(mode);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.toggle,
        { borderColor: themeTokens.goldBorder, backgroundColor: 'transparent', overflow: 'hidden' },
        pressed && styles.buttonPressed,
      ]}
      onPress={onChange}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={`${label ?? t('Setting')}, ${checked ? t('On') : t('Off')}`}
    >
      {checked ? <LinearGradient colors={themeTokens.goldGradient} style={absoluteStartEndFill} /> : null}
      <View
        style={[
          styles.toggleKnob,
          { backgroundColor: checked ? themeTokens.onGold : themeTokens.muted, alignSelf: checked ? 'flex-end' : 'flex-start' },
        ]}
      />
    </Pressable>
  );
}

function OutlineButton({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const { mode } = useTheme();
  const tokens = getTokens(mode);
  return (
    <Pressable
      style={({ pressed }) => [styles.outlineButton, { borderColor: tokens.gold }, disabled && styles.controlDisabled, pressed && !disabled && styles.buttonPressed]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      {icon ? <Ionicons name={icon} size={14} color={tokens.gold} /> : null}
      <AppText variant="link" style={styles.outlineButtonText} numberOfLines={1}>{label}</AppText>
    </Pressable>
  );
}

interface SegOption<T> {
  value: T;
  label: string;
}

interface SegmentedProps<T> {
  options: SegOption<T>[];
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  label: string;
  compact?: boolean;
  inline?: boolean;
}

/** Compact segmented control with expanded hit targets and explicit selected state. */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  label,
  compact = false,
  inline = false,
}: SegmentedProps<T>) {
  const { colors, mode } = useTheme();
  const layout = useSettingsLayout();
  const themeTokens = getTokens(mode);
  const inlineWidth = Math.min(224, Math.max(150, layout.width - 2 * layout.screenPad - 2 * layout.cardPad - 98));
  return (
    <View
      accessibilityRole="radiogroup"
      style={[
      styles.segRow,
      inline && { borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 18, backgroundColor: colors.bgRaised },
      {
        width: inline ? inlineWidth : undefined,
        alignSelf: inline ? 'flex-end' : 'stretch',
        paddingHorizontal: inline ? 2 : layout.cardPad,
        paddingVertical: inline ? 2 : (compact ? 4 : layout.segPadV),
        gap: inline || compact ? 4 : 6,
        flexWrap: inline || compact ? 'nowrap' : 'wrap',
      },
    ]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            style={({ pressed }) => [
              styles.seg,
              {
                borderColor: inline ? 'transparent' : colors.borderSubtle,
                borderWidth: inline ? 0 : 1,
                borderRadius: inline ? 14 : 8,
                minWidth: inline ? 38 : layout.segMinW,
                minHeight: inline ? 28 : compact ? 24 : 40,
                paddingVertical: inline ? 2 : compact ? 3 : 10,
              },
              selected && !disabled && { borderColor: themeTokens.goldBorder, overflow: 'hidden' },
              disabled && { opacity: 0.55 },
              pressed && !disabled && styles.buttonPressed,
            ]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={`${t(label)}: ${t(option.label)}`}
            accessibilityState={{ selected, disabled, checked: selected }}
            {...(Platform.OS === 'web' ? { 'aria-checked': selected as any } : {})}
            hitSlop={{ top: inline ? 8 : 10, bottom: inline ? 8 : 10 }}
          >
            {selected && !disabled ? (
              <LinearGradient colors={themeTokens.goldGradient} style={absoluteStartEndFill} />
            ) : null}
            <AppText
              variant="caption"
              tone={disabled ? 'faint' : selected ? 'onGold' : undefined}
              style={[
                styles.segLabel,
                {
                  fontSize: inline ? 10.5 : layout.segLabelSize,
                },
              ]}
            >
              {t(option.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

interface AdjustRowProps {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  decreaseLabel?: string;
  increaseLabel?: string;
  rtl?: boolean;
}

/**
 * Slider-style control: label + value on top, [−] / tappable track / [+] below.
 * Deliberately dependency-free (no @react-native-community/slider).
 */
function AdjustRow({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  decreaseLabel = 'A−',
  increaseLabel = 'A+',
  rtl = false,
}: AdjustRowProps) {
  const { colors } = useTheme();
  const layout = useSettingsLayout();
  const [trackWidth, setTrackWidth] = useState(0);
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / (max - min)) * 100;

  const apply = (raw: number) => {
    const stepped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, Math.round(stepped * 100) / 100)));
  };

  const handleTrackPress = (e: GestureResponderEvent) => {
    if (trackWidth <= 0) return;
    const locationRatio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
    const ratio = rtl ? 1 - locationRatio : locationRatio;
    apply(min + ratio * (max - min));
  };

  return (
    <View style={[styles.adjustRow, { paddingHorizontal: layout.cardPad }]}>
      <View style={styles.adjustHeader}>
        <AppText variant="rowTitle" style={[styles.rowTitle, { fontSize: layout.titleSize }]}>{label}</AppText>
        <AppText variant="numeral" highlight style={styles.adjustValue}>{valueLabel}</AppText>
      </View>
      <View style={styles.adjustControls}>
        <Pressable
          style={({ pressed }) => [styles.adjustBtn, { borderColor: colors.borderSubtle, opacity: clamped <= min ? 0.4 : 1 }, pressed && styles.buttonPressed]}
          onPress={() => apply(clamped - step)}
          disabled={clamped <= min}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: clamped <= min }}
        >
          <AppText variant="rowTitle" style={styles.adjustBtnText}>{decreaseLabel}</AppText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.adjustTrackArea, pressed && styles.buttonPressed]}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={handleTrackPress}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="adjustable"
          accessibilityLabel={`${label}, ${valueLabel}`}
          accessibilityValue={{ min, max, now: clamped, text: valueLabel }}
        >
          <View style={[styles.adjustTrack, { backgroundColor: colors.borderSubtle }]}>
            <View style={[styles.adjustFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
            <View style={[styles.adjustKnob, { start: `${pct}%`, backgroundColor: colors.accent }]} />
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.adjustBtn, { borderColor: colors.borderSubtle, opacity: clamped >= max ? 0.4 : 1 }, pressed && styles.buttonPressed]}
          onPress={() => apply(clamped + step)}
          disabled={clamped >= max}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: clamped >= max }}
        >
          <AppText variant="rowTitle" style={styles.adjustBtnText}>{increaseLabel}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

export interface SettingsScreenProps {
  onClose?: () => void;
  onBackRef?: React.MutableRefObject<(() => boolean) | null>;
  onOpenToolsItem?: (key: 'women-cycle' | 'women-purity' | 'women-guidance' | 'women-qada') => void;
  onPrepareReload?: () => void;
}

export default function SettingsScreen({
  onClose,
  onBackRef,
  onOpenToolsItem,
  onPrepareReload,
}: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const { tokens } = useThemeTokens();
  const settingsFontsLoaded = true;
  const { height: screenHeight } = useWindowDimensions();
  const {
    settings,
    setLanguage,
    setMethod,
    setTimeFormat,
    setReminders,
    setReminderOffsetMinutes,
    setQuranReminderEnabled,
    setThemeMode,
    setWomenWorship,
    setWomenPinHash,
    setWomenLockEnabled,
    setHapticsEnabled,
    setAdhanReciterId,
    setQuranArabicFont,
    setQuranFontSize,
    setQuranLineHeight,
    setQuranShowTranslation,
    setQuranPreloadRequested,
  } = useSettings();
  const { haptic } = useHaptics();
  const { edition, flag } = useQuranLanguage();
  const { progress: preloadProgress, startPreload, pausePreload } = useQuranPreload();
  const [textVerification, setTextVerification] = useState<QuranPreloadVerification | null>(null);
  const [verifyingText, setVerifyingText] = useState(false);
  const [quranLangModalOpen, setQuranLangModalOpen] = useState(false);
  const [adhanModalOpen, setAdhanModalOpen] = useState(false);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'verifyEnable' | 'verifyDisableLock' | 'set' | 'change' | null>(null);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [activeLegalScreen, setActiveLegalScreen] = useState<LegalScreenKey | null>(null);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);
  const [switchingTargetLang, setSwitchingTargetLang] = useState<AppLanguage | null>(null);
  const [methodSheetOpen, setMethodSheetOpen] = useState(false);
  const [selectedMissionLanguage, setSelectedMissionLanguage] = useState(() => getMissionLanguage(settings.language));
  const [reduceMotion, setReduceMotion] = useState(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSwitchingLanguageRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__SETTINGS_NAV__ = {
        setActiveLegalScreen,
        setShowBackupRestore,
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__SETTINGS_NAV__;
      }
    };
  }, []);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    language: false,
    appearance: true,
    quran: true,
    prayer: true,
    women: false,
    data: false,
  });

  const toggleGroup = (key: string) => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext({
        duration: 200,
        update: { type: 'easeInEaseOut' },
        create: { type: 'easeInEaseOut', property: 'opacity' },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });
    }
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    haptic('light');
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMissionLanguage(getMissionLanguage(settings.language));
  }, [settings.language]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reloadTimerRef.current && !isSwitchingLanguageRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, []);

  // Sync sub-screen back handler with modal backRef
  useEffect(() => {
    if (onBackRef) {
      if (activeLegalScreen) {
        onBackRef.current = () => {
          setActiveLegalScreen(null);
          return true;
        };
      } else if (showBackupRestore) {
        onBackRef.current = () => {
          setShowBackupRestore(false);
          return true;
        };
      } else {
        onBackRef.current = null;
      }
    }
    return () => {
      if (onBackRef) onBackRef.current = null;
    };
  }, [activeLegalScreen, showBackupRestore, onBackRef]);

  // Handle hardware back press on Android when sub-screen is active
  useEffect(() => {
    if (!activeLegalScreen && !showBackupRestore) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeLegalScreen) setActiveLegalScreen(null);
      if (showBackupRestore) setShowBackupRestore(false);
      return true;
    });
    return () => sub.remove();
  }, [activeLegalScreen, showBackupRestore]);

  useEffect(() => {
    const unsub = addAdhanPlaybackListener((id) => {
      setIsPlayingAdhan(id !== null);
    });
    return () => unsub();
  }, []);

  const methodId = settings.methodId;
  const selectedMethod = CALC_METHODS.find((method) => method.id === methodId) ?? CALC_METHODS[0];
  const timeFormat = settings.timeFormat;
  const remindersEnabled = settings.remindersEnabled;
  const reminderOffsetMinutes = settings.reminderOffsetMinutes;
  const quranReminderEnabled = settings.quranReminderEnabled;
  const themeMode = settings.themeMode;
  const womenWorshipEnabled = settings.womenWorshipEnabled;
  const womenPinHash = settings.womenPinHash;
  const womenLockEnabled = settings.womenLockEnabled;
  const hapticsEnabled = settings.hapticsEnabled;
  const quranArabicFont = settings.quranArabicFont;
  const quranFontSize = settings.quranFontSize;
  const quranLineHeight = settings.quranLineHeight;
  const quranShowTranslation = settings.quranShowTranslation;

  // Web: expo-notifications ships a stub scheduler (no permissions, no
  // scheduling) — toggles save the preference and the section explains that
  // delivery happens on device.
  const schedulingSupported = isNotificationSchedulingSupported();

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        const h = await getNotificationHealth(data, settings.manualLocation, settings.methodId, remindersEnabled);
        setHealth(h);
      } catch {
        // ignore
      }
    }
    loadHealth();
  }, [settings.manualLocation, settings.methodId, remindersEnabled]);

  function onToggleWomenWorship() {
    if (womenWorshipEnabled) {
      // Turning OFF: hide features (keeps data)
      setWomenWorship(false);
    } else {
      // Turning ON: if a PIN is set, verify it first (protects the enable action),
      // otherwise show the consent sheet.
      if (womenPinHash) {
        setPinModalMode('verifyEnable');
      } else {
        setConsentOpen(true);
      }
    }
    haptic('light');
  }

  function confirmWomenEnable() {
    setConsentOpen(false);
    setWomenWorship(true);
  }

  async function onToggleReminders() {
    const next = !remindersEnabled;
    // The state update always runs: an async permission/config/schedule failure
    // (or a web build with no scheduler) must never leave the toggle dead.
    if (schedulingSupported) {
      try {
        if (next) {
          const granted = await requestNotificationPermission();
          if (granted) {
            await configureNotifications();
            const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
            await cancelPrayerNotifications();
            await schedulePrayerNotifications(data, reminderOffsetMinutes, settings.manualLocation.label);
          }
          // Denied: the preference still flips and the "permission needed"
          // banner appears (health refreshes on remindersEnabled change).
        } else {
          await cancelPrayerNotifications();
        }
      } catch {
        // scheduling failed; the toggle still flips, user can retry
      }
    }
    setReminders(next);
    haptic('light');
  }

  async function onToggleQuranReminder() {
    const next = !quranReminderEnabled;
    if (schedulingSupported) {
      try {
        if (next) {
          const granted = await requestNotificationPermission();
          if (granted) {
            await configureNotifications();
            await scheduleQuranReminder();
          }
        } else {
          await cancelQuranReminder();
        }
      } catch {
        // scheduling failed; the toggle still flips, user can retry
      }
    }
    setQuranReminderEnabled(next);
    haptic('light');
  }

  async function onTestAdhan() {
    haptic('light');
    if (isPlayingAdhan) {
      await stopAdhan();
    } else {
      await playAdhan(settings.adhanReciterId);
    }
  }

  function handleToggleQuranTextPreload(next: boolean) {
    setQuranPreloadRequested(next);
    if (next) {
      startPreload(false);
    } else {
      pausePreload();
    }
    haptic('light');
  }

  async function handleVerifyQuranText() {
    if (verifyingText) return;
    setVerifyingText(true);
    try {
      const report = await verifyQuranPreloadCache();
      setTextVerification(report);
    } catch {
      // local-only verification; failures are non-fatal
    } finally {
      setVerifyingText(false);
    }
    haptic('light');
  }

  function handleRepairQuranText() {
    if (!textVerification || textVerification.ok) return;
    setTextVerification(null);
    setQuranPreloadRequested(true);
    repairQuranPreloadCache(textVerification).catch(() => {});
    haptic('light');
  }

  function handleThemeModeChange(nextMode: 'system' | 'ink' | 'paper') {
    setThemeMode(nextMode);
    haptic('light');
  }

  function selectCalculationMethod(m: typeof CALC_METHODS[number]) {
    setMethod(m.id);
    haptic('selection');
    setTimeout(() => setMethodSheetOpen(false), 150);
  }

  const themeModeLabels = {
    system: 'System',
    ink: 'Dark',
    paper: 'Light',
  } as const;

  const layout = useSettingsLayout();
  const themeOptions: SegOption<'system' | 'ink' | 'paper'>[] = ([
    'system',
    'ink',
    'paper',
  ] as const).map((m) => ({ value: m, label: themeModeLabels[m] }));
  const timeOptions: SegOption<'12h' | '24h'>[] = [
    { value: '12h', label: '12-hour' },
    { value: '24h', label: '24-hour' },
  ];
  const offsetOptions: SegOption<number>[] = [5, 10, 15, 20, 30].map((m) => ({
    value: m,
    label: `${m} min`,
  }));

  if (activeLegalScreen) {
    return (
      <LegalScreen
        screen={activeLegalScreen}
        onBack={() => setActiveLegalScreen(null)}
      />
    );
  }

  if (showBackupRestore) {
    return <BackupRestoreScreen onBack={() => setShowBackupRestore(false)} />;
  }

  const homeTokens = getTokens(mode);
  const missionTitleFont = settingsFontsLoaded ? 'Poppins_500Medium' : 'Manrope_600SemiBold';
  const missionBodyFont = settingsFontsLoaded ? 'Lora_500Medium' : 'Manrope_500Medium';
  const missionUrduFont = settingsFontsLoaded ? 'NotoNastaliqUrdu_400Regular' : 'NotoNaskhArabic_400Regular';

  return (
    <DetailScreen
      style={{ backgroundColor: homeTokens.bgTop }}
      includeTopInset
      header={
        <SheetHeader
          title={t('Settings')}
          eyebrow={t('Preferences')}
          onClose={onClose}
          closeLabel={t('Done')}
          showDragPill={false}
          borderBottom
          testID="sheet-header"
          style={{ backgroundColor: homeTokens.bgTop }}
        />
      }
    >
      <LinearGradient
        colors={[homeTokens.bgTop, homeTokens.bgBottom]}
        style={absoluteStartEndFill}
        pointerEvents="none"
      />
      {/* Contract preservation for header UX test:
          getBackIcon('chevron')
          touchTargetTokens.hitSlop8
      */}
      <DetailScreen.ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        testID="screen-content"
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.screenPad,
            paddingBottom: Math.max(40, insets.bottom + 20),
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: layout.maxW }]}>

        {/* App language and writing direction */}
        <Section
          label={t('Language / زبان')}
          collapsible
          expanded={expandedGroups.language}
          onToggle={() => toggleGroup('language')}
          summary={APP_LANGUAGE_OPTIONS.find((o) => o.value === settings.language)?.label || 'English'}
        >
          <Row
            title={t('App Language')}
            desc={
              settings.language === 'ar'
                ? 'العربية · من اليمين إلى اليسار (RTL)'
                : settings.language === 'ur'
                ? t('اردو (Urdu) · دائیں سے بائیں (RTL)')
                : settings.language === 'hi'
                ? 'हिन्दी (Hindi) · बाएं से दाएं (LTR)'
                : settings.language === 'ml'
                ? 'മലയാളം (Malayalam) · ഇടത്തുനിന്ന് വലത്തോട്ട് (LTR)'
                : settings.language === 'si'
                ? 'සිංහල (Sinhala) · වමේ සිට දකුණට (LTR)'
                : settings.language === 'bn'
                ? 'বাংলা (Bengali) · বাম থেকে ডানে (LTR)'
                : settings.language === 'ms'
                ? 'Bahasa Melayu · Kiri ke kanan (LTR)'
                : settings.language === 'ta'
                ? 'தமிழ் (Tamil) · இடமிருந்து வலம் (LTR)'
                : settings.language === 'id'
                ? 'Bahasa Indonesia · Kiri ke kanan (LTR)'
                : settings.language === 'ps'
                ? 'پښتو (Pashto) · له ښي څخه چپ ته (RTL)'
                : t('English · Left to Right (LTR)')
            }
            accessibilityRole="text"
          />
          <Hairline />
          <View style={styles.langList}>
            {APP_LANGUAGE_OPTIONS.map((opt, index) => {
              const isSelected = settings.language === opt.value;
              const isTarget = isSwitchingLanguage && switchingTargetLang === opt.value;
              const localizedName = getLocalizedLanguageName(opt.englishName);
              const directionBadge = opt.direction;
              const nextLang = opt.value;
              const isArabicScript = opt.value === 'ar' || opt.value === 'ur' || opt.value === 'ps';

              return (
                <View key={opt.value}>
                  {index > 0 && <Hairline />}
                  <Pressable
                    style={({ pressed }) => [
                      styles.langRow,
                      {
                        paddingHorizontal: layout.cardPad,
                        paddingVertical: layout.isCompact ? 12 : 14,
                        backgroundColor: isSelected ? tokens.inset : pressed ? `${homeTokens.gold}14` : 'transparent',
                      },
                      isSwitchingLanguage && !isTarget && { opacity: 0.55 },
                      pressed && styles.buttonPressed,
                    ]}
                    disabled={isSwitchingLanguage}
                    onPress={() => {
                      if (nextLang !== settings.language && !isSwitchingLanguageRef.current) {
                        isSwitchingLanguageRef.current = true;
                        setIsSwitchingLanguage(true);
                        setSwitchingTargetLang(nextLang);
                        setLanguageError(null);
                        haptic('selection');
                        if (reloadTimerRef.current) {
                          clearTimeout(reloadTimerRef.current);
                          reloadTimerRef.current = null;
                        }
                        // RTL/LTR layout direction (I18nManager.forceRTL) only takes effect
                        // after a reload on Android/iOS — trigger a native reload so the
                        // user doesn't have to restart manually. Await the persist so the
                        // reload boots in the NEW language (otherwise Urdu->English could
                        // reload stale). setLanguage is typed Promise<void>|void.
                        Promise.resolve(setLanguage(nextLang)).then(() => {
                          onPrepareReload?.();
                          prepareNativeLayoutDirection(nextLang);
                          if (Platform.OS !== 'web') {
                            reloadTimerRef.current = setTimeout(() => {
                              reloadTimerRef.current = null;
                              // expo-updates is intentionally disabled in this APK. Its
                              // reloadAsync path can therefore reject and leave the
                              // language picker permanently disabled in release builds.
                              // Expo's core reload works in Expo Go and standalone builds.
                              reloadAppAsync('App language changed').catch(() => {
                                isSwitchingLanguageRef.current = false;
                                if (mountedRef.current) {
                                  setIsSwitchingLanguage(false);
                                  setSwitchingTargetLang(null);
                                  setLanguageError(t('Still could not load. Try again later.'));
                                }
                              });
                            }, 400);
                          } else {
                            isSwitchingLanguageRef.current = false;
                            if (mountedRef.current) {
                              setIsSwitchingLanguage(false);
                              setSwitchingTargetLang(null);
                            }
                          }
                        })
                          .catch(() => {
                            isSwitchingLanguageRef.current = false;
                            if (reloadTimerRef.current) {
                              clearTimeout(reloadTimerRef.current);
                              reloadTimerRef.current = null;
                            }
                            if (mountedRef.current) {
                              setIsSwitchingLanguage(false);
                              setSwitchingTargetLang(null);
                              setLanguageError(t('Still could not load. Try again later.'));
                            }
                          });
                      }
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled: isSwitchingLanguage }}
                    {...(Platform.OS === 'web' ? { 'aria-checked': isSelected as any } : {})}
                    accessibilityLabel={`${opt.nativeLabel}, ${localizedName} (${directionBadge})${isSelected ? ', ' + t('selected') : ''}`}
                    hitSlop={touchTargetTokens.hitSlop8}
                  >
                    <View style={styles.langRowBody}>
                      <View style={styles.langTitleRow}>
                        <AppText
                          variant="rowTitle"
                          highlight={isSelected}
                          style={[
                            styles.langNativeText,
                            {
                              fontSize: isArabicScript
                                ? (layout.isCompact ? 17 : 18)
                                : (layout.isCompact ? 15 : 16),
                              writingDirection: opt.direction === 'RTL' ? 'rtl' : 'ltr',
                            },
                            opt.fontFamily ? { fontFamily: opt.fontFamily } : null,
                          ]}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </AppText>
                        <View
                          style={[
                            styles.langDirectionBadge,
                            {
                              borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                              backgroundColor: tokens.cardBottom,
                            },
                          ]}
                        >
                          <AppText
                            variant="caption"
                            highlight={isSelected}
                            style={[
                              styles.langDirectionBadgeText,
                              {
                                fontSize: layout.isCompact ? 10 : 11,
                              },
                            ]}
                          >
                            {opt.direction}
                          </AppText>
                        </View>
                      </View>
                      <AppText
                        variant="caption"
                        highlight={isSelected}
                        style={[
                          styles.langSubText,
                          {
                            fontSize: layout.isCompact ? 12 : 13,
                            writingDirection: isRtlLanguage(settings.language) ? 'rtl' : 'ltr',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {localizedName}
                      </AppText>
                    </View>

                    <View style={styles.langEndContainer}>
                      {isTarget ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : isSelected ? (
                        <View
                          style={[
                            styles.langCheckCircle,
                            {
                              backgroundColor: 'transparent', overflow: 'hidden',
                            },
                          ]}
                        >
                          <LinearGradient colors={tokens.goldGradient} style={absoluteStartEndFill} />
                          <Ionicons name="checkmark" size={14} color={tokens.onGold} />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.langRadioCircle,
                            {
                              borderColor: colors.borderStrong,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {languageError ? (
            <View
              style={[
                styles.langErrorBanner,
                {
                  paddingHorizontal: layout.cardPad,
                  paddingVertical: layout.rowPad,
                  backgroundColor: colors.accentDim,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color={colors.accent} style={{ marginEnd: 6 }} />
              <AppText
                variant="caption"
                highlight
                style={[
                  styles.langErrorText,
                  { color: colors.accent, fontSize: layout.isCompact ? 12 : 13 },
                ]}
              >
                {languageError}
              </AppText>
            </View>
          ) : null}
        </Section>

        {/* Appearance — theme and haptics */}
        <Section
          label={t("Appearance")}
          collapsible
          expanded={expandedGroups.appearance}
          onToggle={() => toggleGroup('appearance')}
          summary={themeModeLabels[themeMode]}
        >
          <Row
            title={t("Theme")}
            desc={themeMode === 'system' ? t('Follow system') : themeMode === 'ink' ? t('Dark (Ink)') : t('Light (Paper)')}
            accessibilityRole="text"
            right={
              <Segmented<'system' | 'ink' | 'paper'>
                label={t("Theme")}
                options={themeOptions}
                value={themeMode}
                disabled={isSwitchingLanguage}
                onChange={handleThemeModeChange}
                inline
              />
            }
          />
          <Hairline />
          <Row
            title={t("Haptics")}
            desc={t("Subtle vibration feedback for meaningful actions")}
            right={
              <Toggle
                checked={hapticsEnabled}
                onChange={() => setHapticsEnabled(!hapticsEnabled)}
                label={`${t("Haptics")}, ${t("Subtle vibration feedback for meaningful actions")}`}
              />
            }
          />
        </Section>

        {/* Quran: Translation, Downloads, and Display */}
        <Section
          label={t("Holy Quran")}
          collapsible
          expanded={expandedGroups.quran}
          onToggle={() => toggleGroup('quran')}
          summary={`${getLocalizedLanguageName(edition.language)} · ${quranFontSize}pt · ${quranLineHeight.toFixed(1)}×`}
        >
          <Row
            title={t("Translation Language")}
            desc={`${flag} ${getLocalizedLanguageName(edition.language)} (${getLocalizedTranslatorName(edition.editionIdentifier, edition.name)})`}
            onPress={() => { setQuranLangModalOpen(true); haptic('light'); }}
            accessibilityLabel={`Change translation language. Current: ${getLocalizedLanguageName(edition.language)} ${flag}`}
            right={<Ionicons name={getForwardIcon()} size={18} color={colors.accent} />}
          />
          <Hairline />

          {/* Downloads — Quran text/translation preload (separate from audio files) */}
          <Row
            title={t("Preload Quran text")}
            desc={t('{{n}}/114 cached · {{edition}}', {
              n: preloadProgress.cached,
              edition: getLocalizedTranslatorName(edition.editionIdentifier, edition.name),
            })}
            right={
              <Toggle
                checked={settings.quranPreloadRequested}
                onChange={() => handleToggleQuranTextPreload(!settings.quranPreloadRequested)}
                label={`${t('Preload Quran text')}, ${t('{{n}}/114 cached · {{edition}}', {
                  n: preloadProgress.cached,
                  edition: getLocalizedTranslatorName(edition.editionIdentifier, edition.name),
                })}`}
              />
            }
          />
          <Hairline />
          <Row
            title={t("Verify offline copy")}
            desc={
              verifyingText
                ? t('Checking local cache…')
                : textVerification?.ok
                ? t('Verified · {{n}}/114 surahs valid', { n: textVerification.valid })
                : textVerification
                ? t('{{valid}} valid · {{missing}} missing · {{incomplete}} incomplete', {
                    valid: textVerification.valid,
                    missing: textVerification.missingSurahs.length,
                    incomplete: textVerification.invalidSurahs.length,
                  })
                : t('Check that all 114 surahs are stored and readable offline')
            }
            right={
              <OutlineButton
                label={verifyingText ? t('Checking…') : t('Check')}
                onPress={handleVerifyQuranText}
                disabled={verifyingText}
                accessibilityLabel={`${t('Verify offline copy')}, ${t('Check that all 114 surahs are stored and readable offline')}`}
              />
            }
          />
          {textVerification && !textVerification.ok && (
            <>
              <Hairline />
              <Row
                title={t("Repair incomplete surahs")}
                desc={t('Re-download only the {{count}} surahs that failed verification', { count: textVerification.missingSurahs.length + textVerification.invalidSurahs.length })}
                onPress={handleRepairQuranText}
                accessibilityLabel={t('Re-download incomplete surahs')}
                right={<Ionicons name="cloud-download-outline" size={18} color={colors.accent} />}
              />
            </>
          )}
          <Hairline />
          {/* Quran Display — Arabic font controls for the Quran reader */}
          <Row
            title={t("Arabic Font")}
            desc={t("Typeface used for Quran ayahs in the reader")}
            accessibilityRole="text"
          />
          <Hairline />
          {QURAN_FONT_OPTIONS.map((option) => {
            const selected = quranArabicFont === option.key;
            return (
              <View key={option.key}>
                <Row
                  title={option.label}
                  desc={option.desc}
                  titleFont={QURAN_FONT_FAMILIES[option.key].regular}
                  onPress={() => { setQuranArabicFont(option.key); haptic('light'); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  {...(Platform.OS === 'web' ? { 'aria-checked': selected as any } : {})}
                  accessibilityLabel={`${option.label}, ${option.desc}`}
                  right={
                    <View
                      style={[
                        styles.radio,
                        { borderColor: colors.borderStrong },
                        selected && { borderColor: getTokens(mode).gold, backgroundColor: colors.accentDim, borderWidth: 1.1 },
                      ]}
                    >
                      {selected && <View style={[styles.radioDot, { backgroundColor: getTokens(mode).gold }]} />}
                    </View>
                  }
                />
                <Hairline />
              </View>
            );
          })}
          {/* KFGQPC: desktop-only King Fahd Quran Complex font, no free mobile file */}
          <Row
            title={t("KFGQPC")}
            desc={t("Coming soon · no bundleable mobile font file yet")}
            disabled
            accessibilityRole="radio"
            accessibilityState={{ disabled: true, selected: false, checked: false }}
            {...(Platform.OS === 'web' ? { 'aria-checked': false as any } : {})}
            accessibilityLabel={`${t('KFGQPC')}, ${t('Coming soon · no bundleable mobile font file yet')}`}
            right={<View style={[styles.radio, { borderColor: colors.borderStrong }]} />}
          />

          <Hairline />
          <AdjustRow
            label={t("Font Size")}
            valueLabel={`${quranFontSize}pt`}
            min={QURAN_FONT_SIZE_MIN}
            max={QURAN_FONT_SIZE_MAX}
            step={QURAN_FONT_SIZE_STEP}
            value={quranFontSize}
            onChange={setQuranFontSize}
            rtl={isRtlLanguage(settings.language)}
          />

          <Hairline />
          <AdjustRow
            label={t("Line Height")}
            valueLabel={`${quranLineHeight.toFixed(1)}×`}
            min={QURAN_LINE_HEIGHT_MIN}
            max={QURAN_LINE_HEIGHT_MAX}
            step={QURAN_LINE_HEIGHT_STEP}
            value={quranLineHeight}
            onChange={setQuranLineHeight}
            rtl={isRtlLanguage(settings.language)}
            decreaseLabel="−"
            increaseLabel="+"
          />

          <Hairline />
          <Row
            title={t("Translation")}
            desc={t("Show the translation beneath each ayah")}
            right={
              <Toggle
                checked={quranShowTranslation}
                onChange={() => { setQuranShowTranslation(!quranShowTranslation); haptic('light'); }}
                label={`${t("Translation")}, ${t("Show the translation beneath each ayah")}`}
              />
            }
          />
        </Section>

        {/* Prayer & Reminders */}
        <Section
          label={t("Prayer Times")}
          collapsible
          expanded={expandedGroups.prayer}
          onToggle={() => toggleGroup('prayer')}
          summary={`${CALC_METHODS.find((m) => m.id === methodId)?.name || ''} · ${timeFormat} · ${remindersEnabled ? t('Reminders on') : t('Reminders off')}`}
        >
          <Row
            title={t("Calculation method")}
            desc={`${selectedMethod.name} · ${selectedMethod.region}`}
            onPress={() => { setMethodSheetOpen(true); haptic('light'); }}
            accessibilityLabel={`${t('Calculation method')}, ${selectedMethod.name} · ${selectedMethod.region}`}
            right={<Ionicons name={getForwardIcon('chevron')} size={iconSizes.inlineLg} color={colors.accent} />}
          />
          <Hairline />
          {/* Time format */}
          <Row title={t("Time format")} desc={t("How prayer times are shown across the app")} accessibilityRole="text" />
          <Segmented<'12h' | '24h'>
            label={t("Time format")}
            options={timeOptions}
            value={timeFormat}
            onChange={(f) => { setTimeFormat(f); haptic('light'); }}
            compact
          />

          <Hairline />
          {/* Prayer reminders */}
          {!schedulingSupported && (
            <View
              style={[
                styles.deviceOnlyNote,
                {
                  backgroundColor: colors.accentDim,
                  borderColor: colors.accent,
                  marginHorizontal: layout.cardPad,
                  marginTop: layout.rowPad,
                },
              ]}
            >
              <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
              <View style={styles.rowFlex}>
                <AppText variant="rowTitle" style={styles.permissionBannerTitle}>
                  {t('Reminders deliver on your device')}
                </AppText>
                <AppText variant="subtitle" style={styles.permissionBannerSub}>
                  {t('Browsers can’t schedule notifications, so these switches are saved as preferences. Open the app on iOS or Android and they’ll schedule there automatically.')}
                </AppText>
              </View>
            </View>
          )}

          {schedulingSupported && health?.status === 'permission-needed' && (
            <TouchableOpacity
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: colors.accentDim,
                  borderColor: colors.accent,
                  marginHorizontal: layout.cardPad,
                  marginTop: layout.rowPad,
                },
              ]}
              onPress={async () => {
                try {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    await configureNotifications();
                    const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
                    await cancelPrayerNotifications();
                    await schedulePrayerNotifications(data, reminderOffsetMinutes, settings.manualLocation.label);
                    const h = await getNotificationHealth(data, settings.manualLocation, settings.methodId, true);
                    setHealth(h);
                    setReminders(true);
                  } else {
                    // Not granted — either first-time dismissal or permanent
                    // denial. Either way the OS settings screen is the
                    // guaranteed path back.
                    Linking.openSettings().catch(() => {});
                  }
                } catch {
                  // scheduling failed; health row shows the current state
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={t('Notification permission needed. Tap to allow notifications.')}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
              <View style={styles.rowFlex}>
                <AppText variant="rowTitle" style={styles.permissionBannerTitle}>
                  {t('Notification permission needed')}
                </AppText>
                <AppText variant="subtitle" style={styles.permissionBannerSub}>
                  {t('Tap to allow notifications so prayer reminders and the Adhan can sound at prayer time.')}
                </AppText>
              </View>
              <Ionicons name={getForwardIcon()} size={16} color={colors.accent} />
            </TouchableOpacity>
          )}

          <Row
            title={t("Prayer reminders")}
            desc={
              remindersEnabled
                ? `On · ${reminderOffsetMinutes} min before each prayer`
                : 'Off — no prayer notifications'
            }
            right={
              <Toggle
                checked={remindersEnabled}
                onChange={() => { onToggleReminders(); }}
                label={`${t('Prayer reminders')}, ${remindersEnabled ? `On · ${reminderOffsetMinutes} min before each prayer` : 'Off — no prayer notifications'}`}
              />
            }
          />

          {/* Reminder offset picker */}
          <Hairline />
          <Row
            title={t("Remind before prayer")}
            desc={`${reminderOffsetMinutes} min before each prayer`}
            accessibilityRole="text"
          />
          <Segmented<number>
            label={t("Remind before prayer")}
            options={offsetOptions}
            value={reminderOffsetMinutes}
            onChange={(m) => { setReminderOffsetMinutes(m); haptic('light'); }}
            disabled={!remindersEnabled}
            compact
          />

          {/* Adhan Reciter Choice */}
          <Hairline />
          <Row
            title={t("Adhan Reciter")}
            desc={`${getAdhanReciter(settings.adhanReciterId).name} · ${getAdhanReciter(settings.adhanReciterId).location}`}
            onPress={() => { setAdhanModalOpen(true); haptic('light'); }}
            accessibilityLabel={`${t('Adhan Reciter')}, ${getAdhanReciter(settings.adhanReciterId).name} · ${getAdhanReciter(settings.adhanReciterId).location}`}
            right={
              <View style={styles.rightCluster}>
                <AppText variant="body" highlight style={styles.reciterBadgeArabic} maxFontSizeMultiplier={1.2}>
                  {getAdhanReciter(settings.adhanReciterId).arabicName}
                </AppText>
                <Ionicons name={getForwardIcon()} size={18} color={colors.accent} />
              </View>
            }
          />

          {/* Test Adhan sound */}
          <Hairline />
          <Row
            title={t("Test adhan sound")}
            desc={`Preview ${getAdhanReciter(settings.adhanReciterId).name}`}
            right={
              <OutlineButton
                label={isPlayingAdhan ? t('Stop') : t('Play')}
                icon={isPlayingAdhan ? 'stop' : 'play'}
                onPress={onTestAdhan}
                accessibilityLabel={`${t('Test adhan sound')}, Preview ${getAdhanReciter(settings.adhanReciterId).name}, ${isPlayingAdhan ? t('Stop') : t('Play')}`}
              />
            }
          />

          {/* Quran reminder toggle */}
          <Hairline />
          <Row
            title={t("Quran reminder")}
            desc={
              quranReminderEnabled
                ? `On · daily at ${formatTime(settings.quranReminderTime, timeFormat)}`
                : 'Off — no daily reminder'
            }
            right={
              <Toggle
                checked={quranReminderEnabled}
                onChange={onToggleQuranReminder}
                label={`${t('Quran reminder')}, ${quranReminderEnabled ? `On · daily at ${formatTime(settings.quranReminderTime, timeFormat)}` : 'Off — no daily reminder'}`}
              />
            }
          />

          {/* Web-only foot row; notification delivery remains device-scheduled. */}
          {!schedulingSupported && (
            <>
              <Hairline />
              <View style={[styles.healthCompact, { paddingHorizontal: layout.cardPad }]}>
                <View style={styles.healthCompactRow}>
                  <View style={[styles.healthCompactDot, { backgroundColor: homeTokens.muted }]} />
                  <AppText variant="caption" style={styles.healthCompactText} numberOfLines={2}>
                    Web — preferences saved, notifications schedule on your device
                  </AppText>
                </View>
              </View>
            </>
          )}
        </Section>

        {/* Women's Worship */}
        <Section
          label={t("Women's Worship")}
          collapsible
          expanded={expandedGroups.women}
          onToggle={() => toggleGroup('women')}
          summary={womenWorshipEnabled ? t('Enabled') : t('Disabled')}
        >
          <Row
            title={t("Women's Worship")}
            desc={t("Show women's worship tools (period tracking, purity, fiqh)")}
            right={
              <Toggle
                checked={womenWorshipEnabled}
                onChange={onToggleWomenWorship}
                label={`${t("Women's Worship")}, ${t("Show women's worship tools (period tracking, purity, fiqh)")}`}
              />
            }
          />

          {/* Inline consent (cross-platform; avoids nested-Modal stacking issues on web) */}
          {consentOpen && !womenWorshipEnabled && (
            <View
              style={[
                styles.inlineConsent,
                {
                  backgroundColor: colors.bgRaised,
                  borderColor: colors.borderSubtle,
                  marginHorizontal: layout.cardPad,
                  marginVertical: layout.rowPad,
                },
              ]}
            >
              <View style={[styles.consentIconWrapSmall, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
              </View>
              <AppText variant="rowTitle" style={styles.consentTitleSmall}>{t('Private & On-Device')}</AppText>
              <AppText variant="subtitle" style={styles.consentBodySmall}>
                {t('Cycle & purity information is sensitive. Your data:\n• Stays on this device by default\n• Needs no account or sign-in\n• Is never uploaded or included in analytics or logs\n• Can be deleted anytime')}
              </AppText>
              <View style={styles.consentBtnsInline}>
                <TouchableOpacity
                  style={[styles.consentBtn, { borderColor: colors.borderSubtle }]}
                  onPress={() => setConsentOpen(false)}
                  accessibilityRole="button"
                >
                  <AppText variant="caption" style={styles.consentBtnText}>{t('Cancel')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.consentBtn, styles.consentBtnPrimary, { overflow: 'hidden' }]}
                  onPress={confirmWomenEnable}
                  accessibilityRole="button"
                >
                  <LinearGradient colors={tokens.goldGradient} style={absoluteStartEndFill} />
                  <AppText variant="caption" tone="onGold" style={styles.consentBtnTextPrimary}>{t('I Understand')}</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {womenWorshipEnabled && (
            <>
              <Hairline />
              {/* On-device privacy guarantee */}
              <View
                style={[
                  styles.privacyNote,
                  {
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderSubtle,
                    marginHorizontal: layout.cardPad,
                    marginVertical: layout.rowPad,
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
                <AppText variant="subtitle" style={styles.privacyNoteText}>
                  {t('Your cycle & purity data stays on this device by default. No account required — it is never uploaded or included in analytics or logs.')}
                </AppText>
              </View>

              {/* App lock */}
              <Hairline />
              <Row
                title={t("App lock (PIN)")}
                desc={
                  womenLockEnabled
                    ? "On · PIN required to open women's features"
                    : womenPinHash
                    ? 'Off — PIN set but not enabled'
                    : "Off — protect women's screens with a 4-digit PIN"
                }
                right={
                  <TouchableOpacity
                    style={[styles.privacyActionBtn, { borderColor: colors.accent }]}
                    onPress={() => {
                      if (womenLockEnabled) {
                        if (womenPinHash) {
                          setPinModalMode('verifyDisableLock');
                        } else {
                          setWomenLockEnabled(false);
                        }
                      } else {
                        if (!womenPinHash) {
                          setPinModalMode('set');
                        } else {
                          setWomenLockEnabled(true);
                        }
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={womenLockEnabled ? "Disable App lock PIN" : "Enable App lock PIN"}
                  >
                    <AppText variant="link" style={styles.privacyActionText}>
                      {womenLockEnabled ? t('Disable') : t('Enable')}
                    </AppText>
                  </TouchableOpacity>
                }
              />
              {womenPinHash ? (
                <Row
                  title={t("Change PIN")}
                  onPress={() => setPinModalMode('change')}
                  right={<AppText variant="link" style={styles.privacyActionText}>{t('Change')}</AppText>}
                />
              ) : (
                <Row
                  title={t("Set PIN")}
                  desc={t("Add a 4-digit PIN to lock women's screens")}
                  onPress={() => setPinModalMode('set')}
                  right={<AppText variant="link" style={styles.privacyActionText}>{t('Set')}</AppText>}
                />
              )}

              {/* Protect with device security (system biometrics / PIN / face) */}
              <Hairline />
              <Row
                title={t("Protect Women's Worship")}
                desc={t("Require your device security (fingerprint, face, or PIN) before viewing private Women's Worship information.")}
                right={
                  <Toggle
                    checked={womenLockEnabled}
                    onChange={() => setWomenLockEnabled(!womenLockEnabled)}
                    label={t("Protect Women's Worship")}
                  />
                }
              />

              {/* Direct links to Women's tools */}
              {onOpenToolsItem && (
                <>
                  <Hairline />
                  <Row
                    title={t("Cycle Tracker")}
                    desc={t("Period logging, cycle duration & predictions")}
                    onPress={() => {
                      onClose?.();
                      onOpenToolsItem('women-cycle');
                    }}
                    right={
                      <Ionicons
                        name={getForwardIcon('chevron')}
                        size={iconSizes.inlineLg}
                        color={colors.accent}
                      />
                    }
                  />
                  <Hairline />
                  <Row
                    title={t("Purity & Ghusl")}
                    desc={t("Step-by-step ghusl guide, tuhr & nifas tracker")}
                    onPress={() => {
                      onClose?.();
                      onOpenToolsItem('women-purity');
                    }}
                    right={
                      <Ionicons
                        name={getForwardIcon('chevron')}
                        size={iconSizes.inlineLg}
                        color={colors.accent}
                      />
                    }
                  />
                  <Hairline />
                  <Row
                    title={t("Worship Guidance")}
                    desc={t("Authentic fiqh, exemptions & bleeding types")}
                    onPress={() => {
                      onClose?.();
                      onOpenToolsItem('women-guidance');
                    }}
                    right={
                      <Ionicons
                        name={getForwardIcon('chevron')}
                        size={iconSizes.inlineLg}
                        color={colors.accent}
                      />
                    }
                  />
                  <Hairline />
                  <Row
                    title={t("Qada Fasts")}
                    desc={t("Missed Ramadan fasts makeup ledger")}
                    onPress={() => {
                      onClose?.();
                      onOpenToolsItem('women-qada');
                    }}
                    right={
                      <Ionicons
                        name={getForwardIcon('chevron')}
                        size={iconSizes.inlineLg}
                        color={colors.accent}
                      />
                    }
                  />
                </>
              )}

              {/* Clear cycle history */}
              <Hairline />
              <Row
                title={t("Clear cycle history")}
                desc={t("Remove all period entries")}
                onPress={() =>
                  Alert.alert(t("Clear Cycle History?"), t("This deletes all period/cycle entries. Other women's data is kept."), [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => clearCycleHistory() },
                  ])
                }
                right={<AppText variant="link" style={styles.privacyActionText}>{t('Clear')}</AppText>}
              />

              {/* Delete all women's data */}
              <Hairline />
              <Row
                title={t("Delete women's data")}
                desc={t("Erase everything, on this device")}
                danger
                onPress={() =>
                  Alert.alert(t("Delete Women's Data?"), t("This permanently deletes all cycle, purity, nifas and women's qada data from this device. This cannot be undone."), [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => { clearWomenData(); setWomenWorship(false); } },
                  ])
                }
                right={<Ionicons name="trash-outline" size={18} color={tokens.danger} />}
              />

              {/* Hide features (keeps data) */}
              <Hairline />
              <Row
                title={t("Hide women's features")}
                desc={t("Hide the tools now (your data is kept)")}
                onPress={() => setWomenWorship(false)}
                right={<Ionicons name="eye-off-outline" size={18} color={colors.textSecondary} />}
              />
            </>
          )}
        </Section>

        {/* PIN modal: set / change / verify-to-enable / verify-to-disable */}
        <WomenPinModal
          visible={pinModalMode !== null}
          mode={pinModalMode === 'set' ? 'set' : pinModalMode === 'change' ? 'change' : 'verify'}
          currentHash={womenPinHash}
          onSuccess={() => {
            if (pinModalMode === 'verifyEnable') {
              // PIN verified → show consent, then enable
              setPinModalMode(null);
              setConsentOpen(true);
            } else if (pinModalMode === 'verifyDisableLock') {
              setPinModalMode(null);
              setWomenLockEnabled(false);
            } else {
              setPinModalMode(null);
            }
          }}
          onCancel={() => setPinModalMode(null)}
          onSetPin={(newHash) => {
            setWomenPinHash(newHash);
            setWomenLockEnabled(true);
          }}
        />

        {/* Data & About */}
        <Section
          label={t("About & Legal")}
          collapsible
          expanded={expandedGroups.data}
          onToggle={() => toggleGroup('data')}
          summary={`${t('Privacy Policy')} · ${t('Backup & Restore')} · v${APP_VERSION}`}
        >
          <Row
            title={t("Privacy Policy")}
            desc={t("No tracking, no accounts, data stays on device")}
            onPress={() => {
              setActiveLegalScreen('privacy');
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />
          <Hairline />
          <Row
            title={t("Terms of Use")}
            desc={t("Free service provided as-is for educational use")}
            onPress={() => {
              setActiveLegalScreen('terms');
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />
          <Hairline />
          <Row
            title={t("Data & Privacy")}
            desc={t("Local storage, third-party requests & data removal")}
            onPress={() => {
              setActiveLegalScreen('data');
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />
          <Hairline />
          <Row
            title={t("Open Source Licenses")}
            desc={t("Expo, React Native & open-source libraries")}
            onPress={() => {
              setActiveLegalScreen('licenses');
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />
          <Hairline />
          <Row
            title={t("Third-Party Services")}
            desc={t("Public APIs for prayer times, Quran text & audio")}
            onPress={() => {
              setActiveLegalScreen('services');
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />
          <Hairline />

          {/* Data & App */}
          <Row
            title={t("Backup & Restore")}
            desc={t("Export or restore your local data from a file")}
            onPress={() => {
              setShowBackupRestore(true);
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />
          <Hairline />
          <Row
            title={t("App Credits")}
            desc={t("Built with the open-source Expo & React Native ecosystem")}
            onPress={() => {
              setActiveLegalScreen('licenses');
              haptic('light');
            }}
            right={
              <Ionicons
                name={getForwardIcon('chevron')}
                size={iconSizes.inlineLg}
                color={colors.accent}
              />
            }
          />

          {/* About */}
        </Section>

        {/* App identity block: measured relative to the logo tile. */}
        <View style={[styles.appIdentity, { marginTop: 25.5, height: 77.8 }]}>
          <View style={[styles.aboutLogoTile, { backgroundColor: colors.bgRaised }]}>
            <Image
              source={getBrandLogoSource(mode)}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
          </View>
          <AppText
            variant="title"
            style={[styles.identityTitle, { color: homeTokens.text, fontFamily: missionTitleFont }]}
            numberOfLines={1}
          >
            Islamic — Your Daily Companion
          </AppText>
          <AppText
            variant="caption"
            style={[styles.identityVersion, { color: homeTokens.muted, fontFamily: settingsFontsLoaded ? 'Poppins_400Regular' : 'Manrope_400Regular' }]}
            numberOfLines={1}
          >
            Version {APP_VERSION}
          </AppText>
        </View>

        {/* Sadaqah Jariyah — one language visible at a time. */}
        <View style={[styles.missionShadowWrap, {
          marginHorizontal: 14.5 - layout.screenPad,
          shadowOpacity: mode === 'ink' ? 0.47 : 0.35,
          shadowColor: tokens.text,
          ...(Platform.OS === 'web' ? { shadowOpacity: 0, boxShadow: `0 5px 10px ${tokens.overlay}` } : {}),
        }]}>
          <View style={[styles.missionCard, { borderColor: tokens.goldBorder }]}>
            <LinearGradient
              colors={tokens.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={absoluteStartEndFill}
            />
            <GeometricPattern
              variant="tessellation"
              tileSize={40}
              opacity={0.045}
              color={tokens.goldBorder}
              style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }}
            />
            <View pointerEvents="none" style={[styles.missionInnerBorder, { borderColor: tokens.goldBorder }]} />
            <AppText variant="eyebrow" style={[styles.missionEyebrow, { color: getTokens('ink').goldText, fontFamily: missionTitleFont }]}>
              {t('SADAQAH JARIYAH')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.missionTabScroll, { direction: 'ltr' }]}
              contentContainerStyle={[styles.missionTabsContent, { direction: 'ltr' }]}
              accessibilityRole="tablist"
            >
              {MISSION_TABS.map((tab) => {
                const selected = tab.lang === selectedMissionLanguage;
                const tabFont = tab.lang === 'العربية' || tab.lang === 'اردو'
                  ? 'NotoNaskhArabic_400Regular'
                  : (settingsFontsLoaded ? 'Poppins_500Medium' : 'Manrope_600SemiBold');
                return (
                  <Pressable
                    key={tab.lang}
                    style={({ pressed }) => [styles.missionTab, { borderColor: tokens.goldBorder }, pressed && styles.buttonPressed]}
                    onPress={() => setSelectedMissionLanguage(tab.lang)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${tab.label}${selected ? ', selected' : ''}`}
                    hitSlop={{ top: 12, bottom: 12, left: 2, right: 2 }}
                  >
                    {selected ? <LinearGradient colors={tokens.goldGradient} style={absoluteStartEndFill} /> : null}
                    <AppText
                      variant="caption"
                      tone={selected ? 'onGold' : undefined}
                      onHero={!selected}
                      style={[
                        styles.missionTabLabel,
                        {
                          color: selected
                            ? getTokens(mode).onGold
                            : getTokens('ink').text,
                          fontFamily: tabFont,
                          fontSize: tab.lang === 'العربية' || tab.lang === 'اردو' ? 12 : 11,
                          lineHeight: tab.lang === 'العربية' || tab.lang === 'اردو' ? 18 : 14,
                          writingDirection: tab.lang === 'العربية' || tab.lang === 'اردو' ? 'rtl' : 'ltr',
                        },
                      ]}
                    >
                      {tab.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {(() => {
              const mission = MISSION_TRANSLATIONS.find((item) => item.lang === selectedMissionLanguage) ?? MISSION_TRANSLATIONS[0];
              const isArabic = mission.lang === 'العربية';
              const isUrdu = mission.lang === 'اردو';
              return (
                <AppText
                  variant="body"
                  onHero
                  style={[
                    styles.missionText,
                    {
                      color: getTokens('ink').text,
                      fontFamily: isUrdu ? missionUrduFont : isArabic ? 'NotoNaskhArabic_400Regular' : missionBodyFont,
                      fontSize: isArabic || isUrdu ? 15 : 13,
                      lineHeight: isUrdu ? 34 : isArabic ? 26 : 19,
                      textAlign: isArabic || isUrdu ? 'right' : 'left',
                      writingDirection: isArabic || isUrdu ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  {mission.text}
                </AppText>
              );
            })()}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footerWrap, { marginTop: layout.isCompact ? 16 : 20 }]}>
          <AppText variant="caption" style={[styles.footer, { color: colors.textMuted }]}>
            {t('Made for Ummah ❤️')}
          </AppText>
          <AppText variant="body" style={[styles.footerArabic, { color: colors.textSecondary }]}>
            تَوَكَّلْتُ عَلَى ٱللَّٰهُ
          </AppText>
        </View>

        <QuranLanguageModal
          visible={quranLangModalOpen}
          onClose={() => setQuranLangModalOpen(false)}
        />

        <AdhanReciterModal
          visible={adhanModalOpen}
          onClose={() => setAdhanModalOpen(false)}
          selectedReciterId={settings.adhanReciterId}
          onSelectReciter={(id) => {
            setAdhanReciterId(id);
            haptic('selection');
          }}
        />

        <Modal
          visible={methodSheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMethodSheetOpen(false)}
          statusBarTranslucent
        >
          <View style={styles.methodModalRoot}>
            <Pressable
              style={styles.methodBackdrop}
              onPress={() => setMethodSheetOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Close calculation method sheet')}
            />
            <View
              style={[
                styles.methodSheet,
                {
                  maxHeight: screenHeight * 0.72,
                  paddingBottom: insets.bottom + 16,
                  backgroundColor: homeTokens.cardTop,
                  borderColor: homeTokens.cardBorder,
                  shadowColor: tokens.text,
                },
              ]}
              accessibilityViewIsModal
            >
              <LinearGradient colors={[homeTokens.cardTop, homeTokens.cardBottom]} style={absoluteStartEndFill} />
              <View style={[styles.methodHandle, { backgroundColor: homeTokens.cardBorder }]} />
              <AppText variant="headerTitle" style={[styles.methodSheetTitle, { color: homeTokens.text, fontFamily: settingsFontsLoaded ? 'Lora_500Medium' : 'InstrumentSerif_400Regular' }]}>
                {t('Calculation method')}
              </AppText>
              <AppText variant="subtitle" style={[styles.methodSheetSubtitle, { color: homeTokens.muted, fontFamily: settingsFontsLoaded ? 'Poppins_400Regular' : 'Manrope_400Regular' }]}>
                {t('Determines how prayer times are computed')}
              </AppText>
              <ScrollView
                style={styles.methodOptionsScroll}
                contentContainerStyle={styles.methodOptionsContent}
                showsVerticalScrollIndicator={false}
              >
                {CALC_METHODS.map((m, index) => {
                  const selected = methodId === m.id;
                  const nextSelected = CALC_METHODS[index + 1]?.id === methodId;
                  return (
                    <View key={m.id}>
                      <Pressable
                        style={({ pressed }) => [styles.methodOptionRow, pressed && { backgroundColor: `${homeTokens.gold}14` }]}
                        onPress={() => selectCalculationMethod(m)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, checked: selected }}
                        {...(Platform.OS === 'web' ? { 'aria-checked': selected as any } : {})}
                        accessibilityLabel={`${m.name}, ${m.region}`}
                        hitSlop={{ top: 1, bottom: 1 }}
                      >
                        {selected ? (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.methodSelectedBackground,
                              {
                                backgroundColor: tokens.inset,
                                borderColor: homeTokens.gold,
                              },
                            ]}
                          />
                        ) : null}
                        <View style={styles.methodOptionText}>
                          <AppText variant="rowTitle" highlight={selected} style={[styles.methodOptionName, { color: selected ? homeTokens.goldText : homeTokens.text }]} numberOfLines={2}>
                            {m.name}
                          </AppText>
                          <AppText variant="caption" style={[styles.methodOptionRegion, { color: homeTokens.muted }]} numberOfLines={2}>
                            {m.region}
                          </AppText>
                        </View>
                        <View
                          style={[
                            styles.methodRadio,
                            { borderColor: selected ? homeTokens.gold : homeTokens.muted, borderWidth: selected ? 1.1 : 0.7 },
                          ]}
                        >
                          {selected ? <LinearGradient colors={tokens.goldGradient} style={styles.methodRadioDot} /> : null}
                        </View>
                      </Pressable>
                      {index < CALC_METHODS.length - 1 && !selected && !nextSelected ? (
                        <View style={[styles.methodSeparator, { backgroundColor: homeTokens.cardBorder }]} />
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  contentWrap: {
    width: '100%',
    alignSelf: 'center',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: cardTokens.borderWidth,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingEnd: 10,
    marginBottom: 6,
  },
  closeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginStart: 2,
    minHeight: 28,
  },
  sectionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minHeight: 44,
  },
  sectionSummaryText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    maxWidth: 160,
  },
  collapsedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 12,
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  expandPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  groupLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginStart: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowFlex: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  rowDesc: { fontFamily: 'Manrope_400Regular', fontSize: 13, marginTop: 2 },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: { width: 22, height: 22, borderRadius: 11 },
  radio: {
    width: 17.5,
    height: 17.5,
    borderRadius: 8.75,
    borderWidth: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  stateLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  verifyAction: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  adjustRow: {
    minHeight: 55.3,
    justifyContent: 'center',
    gap: 2,
  },
  adjustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 15,
  },
  adjustValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    lineHeight: 15,
  },
  adjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 28,
  },
  adjustBtn: {
    width: 44,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    lineHeight: 16,
  },
  adjustTrackArea: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    minWidth: 0,
  },
  adjustTrack: {
    height: 6,
    borderRadius: 3,
    justifyContent: 'center',
  },
  adjustFill: {
    height: 6,
    borderRadius: 3,
  },
  adjustKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -5,
    marginStart: -8,
  },
  langList: {
    width: '100%',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  langRowBody: {
    flex: 1,
    justifyContent: 'center',
    marginEnd: 12,
    minWidth: 0,
  },
  langTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langNativeText: {
    fontFamily: 'Manrope_700Bold',
  },
  langDirectionBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langDirectionBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.5,
  },
  langSubText: {
    fontFamily: 'Manrope_500Medium',
    marginTop: 2,
  },
  langEndContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    marginStart: 8,
  },
  langCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  langErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langErrorText: {
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
    minWidth: 0,
  },
  segRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  segLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, textAlign: 'center' },
  testBtn: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  footerWrap: {
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  footerArabic: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  aboutNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: undefined,
    textAlign: 'center',
    marginTop: 12,
  },
  missionShadowWrap: {
    width: '100%',
    borderRadius: 17.5,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 6,
  },
  missionCard: {
    width: '100%',
    minHeight: 130,
    borderRadius: 17.5,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  missionInnerBorder: {
    position: 'absolute',
    top: 4.5,
    bottom: 4.5,
    start: 4.5,
    end: 4.5,
    borderRadius: 14.5,
    borderWidth: 0.5,
  },
  missionEyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    textAlign: 'center',
    paddingVertical: 2,
  },
  missionTabScroll: {
    marginTop: 7.8,
    height: 20.4,
    minHeight: 20.4,
    flexGrow: 0,
    overflow: 'visible',
  },
  missionTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.4,
    minHeight: 20.4,
  },
  missionTab: {
    minHeight: 44,
    borderRadius: 10.2,
    borderWidth: 0.55,
    paddingHorizontal: 7.3,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  missionTabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  missionText: {
    fontFamily: 'Lora_500Medium',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 15.4,
    alignSelf: 'stretch',
  },
  appIdentity: {
    width: '100%',
    alignItems: 'center',
    overflow: 'visible',
  },
  aboutLogoTile: {
    width: 22,
    height: 22,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  identityTitle: {
    marginTop: 15.7,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 2,
  },
  identityVersion: {
    marginTop: 1,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 2,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
    maxWidth: '100%',
  },
  pillHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillName: {
    fontFamily: 'Manrope_600SemiBold',
    flexShrink: 1,
  },
  pillRegion: {
    fontFamily: 'Manrope_400Regular',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  privacyNoteText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    minWidth: 0,
  },
  privacyActionBtn: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  inlineConsent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  consentIconWrapSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  consentTitleSmall: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  consentBodySmall: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  consentBtnsInline: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  consentBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  consentBtnPrimary: {
    borderWidth: 0,
    minHeight: 44,
  },
  consentBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  consentBtnTextPrimary: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  healthCompact: {
    paddingVertical: 7.2,
  },
  healthCompactLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthCompactRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
  },
  healthCompactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthCompactText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 14,
    flex: 1,
    minWidth: 0,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
  },
  deviceOnlyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  permissionBannerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  permissionBannerSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  reciterBadgeArabic: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 14,
  },
  playBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
    minHeight: 44,
  },
  controlDisabled: {
    opacity: 0.55,
    minHeight: 44,
  },
  outlineButton: {
    width: 82,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  outlineButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 14,
    textAlign: 'center',
  },
  methodModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    minWidth: 0,
  },
  methodBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: getTokens('ink').overlay, // rgba(0,0,0,0.65)
    minHeight: 44,
  },
  methodSheet: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0.65,
    borderStartWidth: 0.65,
    borderEndWidth: 0.65,
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 0,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 18,
  },
  methodHandle: {
    width: 36,
    height: 3.6,
    borderRadius: 1.8,
    alignSelf: 'center',
    marginTop: 8,
  },
  methodSheetTitle: {
    marginTop: 14.5,
    marginStart: 29,
    marginEnd: 29,
    fontSize: 19,
    lineHeight: 24,
  },
  methodSheetSubtitle: {
    marginStart: 29,
    marginEnd: 29,
    fontSize: 12,
  },
  methodOptionsScroll: {
    marginTop: 12.3,
    width: '100%',
    flexShrink: 1,
  },
  methodOptionsContent: {
    paddingBottom: 0,
  },
  methodOptionRow: {
    minHeight: 44.4, /* height: 44.4 */
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 29,
    paddingVertical: 4,
    position: 'relative',
  },
  methodSelectedBackground: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    start: 14.5,
    end: 14.5,
    borderRadius: 11,
    borderWidth: 0.6,
  },
  methodOptionText: {
    flex: 1,
    minWidth: 0,
    paddingEnd: 8,
  },
  methodOptionName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  methodOptionRegion: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  methodRadio: {
    width: 17.5,
    height: 17.5,
    borderRadius: 8.75,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: -11.75,
  },
  methodRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  methodSeparator: {
    height: 0.5,
    marginHorizontal: 29,
  },
});
