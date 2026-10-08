import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  SafeAreaView,
  Linking,
  BackHandler,
  Platform,
  DevSettings,
} from 'react-native';
import type { AccessibilityRole, AccessibilityState, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { getForwardIcon, getBackIcon, iconSizes } from '../lib/iconMap';
import { touchTargetTokens } from '../lib/buttonTokens';
import { t } from '../lib/i18n';
import LegalScreen, { LegalScreenKey } from './LegalScreen';
import { BackupRestoreScreen } from './BackupRestoreScreen';
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
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
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
import { accentThemes, ACCENT_KEYS } from '../lib/accents';
import { clearWomenData, clearCycleHistory } from '../lib/db';
import { WomenPinModal } from '../components/WomenPinModal';
import {
  useQuranPreload,
  verifyQuranPreloadCache,
  repairQuranPreloadCache,
  QuranPreloadVerification,
} from '../lib/quranPreloader';

const ABOUT_ROWS: { title: string; subtitle: string }[] = [
  { title: 'Islamic — Your Daily Companion', subtitle: 'Version 1.0' },
];

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
const THANKS_TEXT =
  'Thank you to every provider who makes this possible: Islamic.app · AlAdhan · AlQuran Cloud · islamic.network · EveryAyah · EsmaulHusna.org · OpenStreetMap · Google Fonts · Expo & the open-source community. May Allah reward them all.';


const QURAN_FONT_OPTIONS: { key: QuranArabicFont; label: string; desc: string }[] = [
  { key: 'amiri', label: 'Amiri', desc: 'Classic Naskh — the Quran reader default' },
  { key: 'notonaskh', label: 'Noto Naskh Arabic', desc: 'Google’s clean, highly legible Naskh' },
];

const DANGER = '#EF4444';

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
    rowPad: isCompact ? 12 : 16,
    titleSize: isCompact ? 14 : 15,
    descSize: isCompact ? 12 : 13,
    labelSize: isCompact ? 10 : 11,
    sectionGap: isCompact ? 14 : 20,
    segMinW: 54,
    segLabelSize: isCompact ? 12 : 13,
    segPadV: isCompact ? 10 : 12,
    maxW: 640,
  };
}

interface SectionProps {
  label: string;
  children: React.ReactNode;
}

/** Uppercase section label ABOVE a surface card; hairlines separate rows inside. */
function Section({ label, children }: SectionProps) {
  const { colors } = useTheme();
  const layout = useSettingsLayout();
  return (
    <View style={{ marginTop: layout.sectionGap }}>
      <Text style={[styles.groupLabel, { color: colors.textMuted, fontSize: layout.labelSize }]}>
        {t(label)}
      </Text>
      <Card padded={false}>{children}</Card>
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
  const { colors } = useTheme();
  const layout = useSettingsLayout();

  const titleColor = danger ? DANGER : muted ? colors.textSecondary : colors.textPrimary;
  const descColor = muted ? colors.textMuted : colors.textSecondary;

  const rowStyle = [
    styles.row,
    {
      paddingVertical: layout.rowPad,
      paddingHorizontal: layout.cardPad,
      minHeight: 44,
      opacity: disabled ? 0.5 : 1,
    },
  ];

  const body = (
    <View style={styles.rowFlex}>
      <Text
        style={[
          styles.rowTitle,
          { color: titleColor, fontSize: titleFontSize ?? layout.titleSize },
          titleFont ? { fontFamily: titleFont } : null,
        ]}
      >
        {t(title)}
      </Text>
      {desc ? (
        <Text style={[styles.rowDesc, { color: descColor, fontSize: layout.descSize }]}>{t(desc)}</Text>
      ) : null}
      {children}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
      >
        {body}
        {right}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={rowStyle}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
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
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.toggle, { borderColor: colors.accent }]}
      onPress={onChange}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.toggleKnob,
          { backgroundColor: colors.accent, alignSelf: checked ? 'flex-end' : 'flex-start' },
        ]}
      />
    </TouchableOpacity>
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
}

/** Wrapping pill segmented control — never clips, touch target stays ≥ 40px. */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  label,
}: SegmentedProps<T>) {
  const { colors } = useTheme();
  const layout = useSettingsLayout();
  return (
    <View style={[styles.segRow, { paddingHorizontal: layout.cardPad, paddingVertical: layout.segPadV }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              styles.seg,
              { borderColor: colors.borderSubtle, minWidth: layout.segMinW },
              selected && !disabled && { backgroundColor: colors.accentDim, borderColor: colors.accent },
              disabled && { opacity: 0.55 },
            ]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={`${t(label)}: ${t(option.label)}`}
            accessibilityState={{ selected, disabled }}
          >
            <Text
              style={[
                styles.segLabel,
                {
                  fontSize: layout.segLabelSize,
                  color: disabled
                    ? colors.textMuted
                    : selected
                    ? colors.accent
                    : colors.textSecondary,
                },
              ]}
            >
              {t(option.label)}
            </Text>
          </TouchableOpacity>
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
    const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth));
    apply(min + ratio * (max - min));
  };

  return (
    <View
      style={[
        styles.adjustRow,
        {
          paddingHorizontal: layout.cardPad,
          paddingVertical: layout.rowPad,
          gap: layout.isCompact ? 10 : 12,
        },
      ]}
    >
      <View style={styles.adjustHeader}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: layout.titleSize }]}>
          {label}
        </Text>
        <Text style={[styles.adjustValue, { color: colors.accent }]}>{valueLabel}</Text>
      </View>
      <View style={styles.adjustControls}>
        <TouchableOpacity
          style={[
            styles.adjustBtn,
            { borderColor: colors.borderSubtle, opacity: clamped <= min ? 0.4 : 1 },
          ]}
          onPress={() => apply(clamped - step)}
          disabled={clamped <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: clamped <= min }}
        >
          <Text style={[styles.adjustBtnText, { color: colors.textPrimary }]}>{decreaseLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.adjustTrackArea}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={handleTrackPress}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${valueLabel}. Tap the track to set.`}
        >
          <View style={[styles.adjustTrack, { backgroundColor: colors.borderSubtle }]}>
            <View style={[styles.adjustFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
            <View
              style={[styles.adjustKnob, { left: `${pct}%`, backgroundColor: colors.accent }]}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.adjustBtn,
            { borderColor: colors.borderSubtle, opacity: clamped >= max ? 0.4 : 1 },
          ]}
          onPress={() => apply(clamped + step)}
          disabled={clamped >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: clamped >= max }}
        >
          <Text style={[styles.adjustBtnText, { color: colors.textPrimary }]}>{increaseLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export interface SettingsScreenProps {
  onClose?: () => void;
  onBackRef?: React.MutableRefObject<(() => boolean) | null>;
  onOpenToolsItem?: (key: 'women-cycle' | 'women-purity' | 'women-guidance' | 'women-qada') => void;
}

export default function SettingsScreen({ onClose, onBackRef, onOpenToolsItem }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, mode, accentKey, setAccent } = useTheme();
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
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [activeLegalScreen, setActiveLegalScreen] = useState<LegalScreenKey | null>(null);
  const [showBackupRestore, setShowBackupRestore] = useState(false);

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
      } finally {
        setIsLoadingHealth(false);
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: layout.screenPad,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(40, insets.bottom + 20),
        },
      ]}
    >
      <View style={[styles.contentWrap, { maxWidth: layout.maxW }]}>
        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('Close settings')}
            hitSlop={touchTargetTokens.hitSlop8}
            activeOpacity={0.7}
          >
            <Ionicons name={getBackIcon('chevron')} size={iconSizes.header} color={colors.accent} />
            <Text style={[styles.closeText, { color: colors.accent, fontSize: layout.isCompact ? 13 : 14 }]}>
              {t('Done')}
            </Text>
          </TouchableOpacity>
        )}
        <SectionHeader compact eyebrow="Preferences" title="Settings" />

        {/* Language — English / اردو */}
        <Section label="Language / زبان">
          <Row
            title="App Language"
            desc={settings.language === 'ur' ? 'اردو (Urdu) · دائیں سے بائیں (RTL)' : 'English · Left to Right (LTR)'}
            accessibilityRole="text"
          />
          <Segmented<'en' | 'ur'>
            label="Language / زبان"
            options={[
              { value: 'en', label: 'English' },
              { value: 'ur', label: 'اردو' },
            ]}
            value={settings.language}
            onChange={(nextLang) => {
              if (nextLang !== settings.language) {
                setLanguage(nextLang);
                haptic('selection');
                // RTL/LTR layout direction (I18nManager.forceRTL) only takes effect
                // after a reload on Android/iOS — trigger a native reload so the
                // user doesn't have to restart manually. Works in dev (DevSettings)
                // and release (expo-updates).
                if (Platform.OS !== 'web') {
                  setTimeout(() => {
                    Updates.reloadAsync().catch(() => DevSettings.reload());
                  }, 400);
                }
              }
            }}
          />
        </Section>

        {/* Appearance — theme, accent, haptics */}
        <Section label="Appearance">
          <Row
            title="Theme"
            desc={themeMode === 'system' ? 'Follow system' : themeMode === 'ink' ? 'Dark (Ink)' : 'Light (Paper)'}
            accessibilityRole="text"
          />
          <Segmented<'system' | 'ink' | 'paper'>
            label="Theme"
            options={themeOptions}
            value={themeMode}
            onChange={handleThemeModeChange}
          />
          <Hairline />
          <Row title="Accent color" desc="Highlight colour for toggles, links and selected states" />
          <View
            style={[
              styles.accentGrid,
              {
                paddingHorizontal: layout.cardPad,
                paddingVertical: layout.rowPad,
                gap: layout.isCompact ? 10 : 12,
              },
            ]}
          >
            {ACCENT_KEYS.map((key) => {
              const accent = accentThemes[key];
              const isSelected = accentKey === key;
              const accentColor = mode === 'ink' ? accent.darkAccent : accent.lightAccent;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.accentSwatch}
                  onPress={() => { setAccent(key); haptic('selection'); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${accent.name} accent color${isSelected ? ', selected' : ''}`}
                >
                  <View
                    style={[
                      styles.accentCircle,
                      { backgroundColor: accentColor },
                      isSelected && { borderColor: accentColor, borderWidth: 2 },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.accentLabel,
                      { color: isSelected ? accentColor : colors.textSecondary },
                    ]}
                  >
                    {accent.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Hairline />
          <Row
            title="Haptics"
            desc="Subtle vibration feedback for meaningful actions"
            right={
              <Toggle
                checked={hapticsEnabled}
                onChange={() => setHapticsEnabled(!hapticsEnabled)}
                label="Haptics"
              />
            }
          />
        </Section>

        {/* Quran Translation */}
        <Section label="Holy Quran">
          <Row
            title="Translation Language"
            desc={`${flag} ${edition.language} (${edition.name})`}
            onPress={() => { setQuranLangModalOpen(true); haptic('light'); }}
            accessibilityLabel={`Change translation language. Current: ${edition.language} ${flag}`}
            right={<Ionicons name={getForwardIcon()} size={18} color={colors.accent} />}
          />
        </Section>

        {/* Downloads — Quran text/translation preload (separate from audio files) */}
        <Section label="Downloads">
          <Row
            title="Preload Quran text"
            desc={
              preloadProgress.isComplete
                ? `114/114 cached · ${flag} ${edition.name} ready offline`
                : preloadProgress.isRunning
                ? `Downloading text ${preloadProgress.cached}/114…` +
                  (preloadProgress.currentSurah ? ` · Surah ${preloadProgress.currentSurah}` : '')
                : `${preloadProgress.cached}/114 cached · ${flag} ${edition.name}`
            }
            right={
              <View style={styles.rightCluster}>
                <Text
                  style={[
                    styles.stateLabel,
                    { color: settings.quranPreloadRequested ? colors.accent : colors.textMuted },
                  ]}
                >
                  {settings.quranPreloadRequested ? 'ON' : 'OFF'}
                </Text>
                <Toggle
                  checked={settings.quranPreloadRequested}
                  onChange={() => handleToggleQuranTextPreload(!settings.quranPreloadRequested)}
                  label="Preload Quran text for offline reading"
                />
              </View>
            }
          />
          <Hairline />
          <Row
            title="Verify offline copy"
            desc={
              verifyingText
                ? 'Reading local cache…'
                : textVerification?.ok
                ? `Verified · ${textVerification.valid}/114 surahs valid`
                : textVerification
                ? `${textVerification.valid} valid · ${textVerification.missingSurahs.length} missing · ${textVerification.invalidSurahs.length} incomplete`
                : 'Check that all 114 surahs are stored and readable offline'
            }
            onPress={handleVerifyQuranText}
            accessibilityLabel="Verify locally stored Quran text"
            right={
              verifyingText ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : textVerification?.ok ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              ) : (
                <Text style={[styles.verifyAction, { color: colors.accent }]}>Check</Text>
              )
            }
          />
          {textVerification && !textVerification.ok && (
            <>
              <Hairline />
              <Row
                title="Repair incomplete surahs"
                desc={`Re-download only the ${textVerification.missingSurahs.length + textVerification.invalidSurahs.length} surahs that failed verification`}
                onPress={handleRepairQuranText}
                accessibilityLabel="Re-download incomplete surahs"
                right={<Ionicons name="cloud-download-outline" size={18} color={colors.accent} />}
              />
            </>
          )}
        </Section>

        {/* Quran Display — Arabic font controls for the Quran reader */}
        <Section label="Quran Display">
          <Row
            title="Arabic Font"
            desc="Typeface used for Quran ayahs in the reader"
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
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Arabic font: ${option.label}${selected ? ', selected' : ''}`}
                  right={
                    <View
                      style={[
                        styles.radio,
                        { borderColor: colors.borderStrong },
                        selected && { borderColor: colors.accent, backgroundColor: colors.accentDim },
                      ]}
                    >
                      {selected && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                    </View>
                  }
                />
                <Hairline />
              </View>
            );
          })}
          {/* KFGQPC: desktop-only King Fahd Quran Complex font, no free mobile file */}
          <Row
            title="KFGQPC"
            desc="Coming soon · no bundleable mobile font file yet"
            disabled
            accessibilityRole="radio"
            accessibilityState={{ disabled: true, selected: false }}
            accessibilityLabel="Arabic font: KFGQPC, coming soon"
            right={<View style={[styles.radio, { borderColor: colors.borderStrong }]} />}
          />

          <Hairline />
          <AdjustRow
            label="Font Size"
            valueLabel={`${quranFontSize}pt`}
            min={QURAN_FONT_SIZE_MIN}
            max={QURAN_FONT_SIZE_MAX}
            step={QURAN_FONT_SIZE_STEP}
            value={quranFontSize}
            onChange={setQuranFontSize}
          />

          <Hairline />
          <AdjustRow
            label="Line Height"
            valueLabel={`${quranLineHeight.toFixed(1)}×`}
            min={QURAN_LINE_HEIGHT_MIN}
            max={QURAN_LINE_HEIGHT_MAX}
            step={QURAN_LINE_HEIGHT_STEP}
            value={quranLineHeight}
            onChange={setQuranLineHeight}
            decreaseLabel="−"
            increaseLabel="+"
          />

          <Hairline />
          <Row
            title="Translation"
            desc="Show the translation beneath each ayah"
            right={
              <View style={styles.rightCluster}>
                <Text
                  style={[
                    styles.stateLabel,
                    { color: quranShowTranslation ? colors.accent : colors.textMuted },
                  ]}
                >
                  {quranShowTranslation ? 'ON' : 'OFF'}
                </Text>
                <Toggle
                  checked={quranShowTranslation}
                  onChange={() => { setQuranShowTranslation(!quranShowTranslation); haptic('light'); }}
                  label="Show translation in the Quran reader"
                />
              </View>
            }
          />
        </Section>

        {/* Calculation method */}
        <Section label="Prayer Times">
          <Row
            title="Calculation method"
            desc="Determines how prayer times are computed"
            accessibilityRole="text"
          />
          <View
            style={[
              styles.pillWrap,
              { paddingHorizontal: layout.cardPad, paddingBottom: layout.rowPad },
            ]}
          >
            {CALC_METHODS.map((m) => {
              const selected = methodId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.pill,
                    {
                      borderColor: selected ? colors.accent : colors.borderSubtle,
                      backgroundColor: selected ? colors.accentDim : 'transparent',
                    },
                  ]}
                  onPress={() => { setMethod(m.id); haptic('light'); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${m.name}. ${m.region}${selected ? ', selected' : ''}`}
                >
                  <View style={styles.pillHead}>
                    <Text
                      style={[
                        styles.pillName,
                        { color: selected ? colors.accent : colors.textPrimary, fontSize: layout.titleSize },
                      ]}
                    >
                      {m.name}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={16} color={colors.accent} />}
                  </View>
                  <Text
                    style={[
                      styles.pillRegion,
                      { color: colors.textMuted, fontSize: Math.max(11, layout.descSize - 1) },
                    ]}
                  >
                    {m.region}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* Time format */}
        <Section label="Time Display">
          <Row title="Time format" desc="How prayer times are shown across the app" accessibilityRole="text" />
          <Segmented<'12h' | '24h'>
            label="Time format"
            options={timeOptions}
            value={timeFormat}
            onChange={(f) => { setTimeFormat(f); haptic('light'); }}
          />
        </Section>

        {/* Prayer reminders */}
        <Section label="Reminders">
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
                <Text style={[styles.permissionBannerTitle, { color: colors.textPrimary }]}>
                  Reminders deliver on your device
                </Text>
                <Text style={[styles.permissionBannerSub, { color: colors.textSecondary }]}>
                  Browsers can’t schedule notifications, so these switches are saved as preferences. Open the app on
                  iOS or Android and they’ll schedule there automatically.
                </Text>
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
              accessibilityLabel="Notification permission needed. Tap to allow notifications."
            >
              <Ionicons name="notifications-outline" size={18} color={colors.accent} />
              <View style={styles.rowFlex}>
                <Text style={[styles.permissionBannerTitle, { color: colors.textPrimary }]}>
                  Notification permission needed
                </Text>
                <Text style={[styles.permissionBannerSub, { color: colors.textSecondary }]}>
                  Tap to allow notifications so prayer reminders and the Adhan can sound at prayer time.
                </Text>
              </View>
              <Ionicons name={getForwardIcon()} size={16} color={colors.accent} />
            </TouchableOpacity>
          )}

          <Row
            title="Prayer reminders"
            desc={
              remindersEnabled
                ? `On · ${reminderOffsetMinutes} min before each prayer`
                : 'Off — no prayer notifications'
            }
            right={
              <Toggle
                checked={remindersEnabled}
                onChange={() => { onToggleReminders(); }}
                label="Prayer reminders"
              />
            }
          />

          {/* Reminder offset picker */}
          <Hairline />
          <Row
            title="Remind before prayer"
            desc={`${reminderOffsetMinutes} min before each prayer`}
            accessibilityRole="text"
          />
          <Segmented<number>
            label="Remind before prayer"
            options={offsetOptions}
            value={reminderOffsetMinutes}
            onChange={(m) => { setReminderOffsetMinutes(m); haptic('light'); }}
            disabled={!remindersEnabled}
          />

          {/* Adhan Reciter Choice */}
          <Hairline />
          <Row
            title="Adhan Reciter"
            desc={`${getAdhanReciter(settings.adhanReciterId).name} · ${getAdhanReciter(settings.adhanReciterId).location}`}
            onPress={() => { setAdhanModalOpen(true); haptic('light'); }}
            accessibilityLabel={`Adhan reciter: ${getAdhanReciter(settings.adhanReciterId).name}. Tap to change.`}
            right={
              <View style={styles.rightCluster}>
                <Text style={[styles.reciterBadgeArabic, { color: colors.accent }]}>
                  {getAdhanReciter(settings.adhanReciterId).arabicName}
                </Text>
                <Ionicons name={getForwardIcon()} size={18} color={colors.accent} />
              </View>
            }
          />

          {/* Test Adhan sound */}
          <Hairline />
          <Row
            title="Test adhan sound"
            desc={isPlayingAdhan ? 'Playing preview… tap to stop' : `Preview ${getAdhanReciter(settings.adhanReciterId).name}`}
            onPress={onTestAdhan}
            accessibilityLabel={isPlayingAdhan ? 'Stop adhan sound' : 'Test adhan sound'}
            right={
              <View
                style={[
                  styles.playBtnContainer,
                  {
                    backgroundColor: isPlayingAdhan ? colors.accent : colors.accentDim,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Ionicons
                  name={isPlayingAdhan ? 'stop' : 'volume-high'}
                  size={15}
                  color={isPlayingAdhan ? colors.bgBase : colors.accent}
                />
                <Text
                  style={[
                    styles.testBtn,
                    { color: isPlayingAdhan ? colors.bgBase : colors.accent },
                  ]}
                >
                  {isPlayingAdhan ? 'Stop' : 'Play'}
                </Text>
              </View>
            }
          />

          {/* Quran reminder toggle */}
          <Hairline />
          <Row
            title="Quran reminder"
            desc={
              quranReminderEnabled
                ? `On · daily at ${formatTime(settings.quranReminderTime, timeFormat)}`
                : 'Off — no daily reminder'
            }
            right={
              <Toggle
                checked={quranReminderEnabled}
                onChange={onToggleQuranReminder}
                label="Quran reminder"
              />
            }
          />

          {/* Compact Notification Health */}
          <Hairline />
          <View style={[styles.healthCompact, { paddingHorizontal: layout.cardPad }]}>
            {!schedulingSupported ? (
              <View style={styles.healthCompactRow}>
                <View style={[styles.healthCompactDot, { backgroundColor: colors.textMuted }]} />
                <Text style={[styles.healthCompactText, { color: colors.textSecondary }]}>
                  ○ Web — preferences saved, notifications schedule on your device
                </Text>
              </View>
            ) : isLoadingHealth ? (
              <View style={styles.healthCompactLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.healthCompactText, { color: colors.textMuted }]}>Checking…</Text>
              </View>
            ) : health ? (
              <View style={styles.healthCompactRow}>
                <View
                  style={[
                    styles.healthCompactDot,
                    {
                      backgroundColor:
                        health.status === 'active'
                          ? '#10B981'
                          : health.status === 'permission-needed'
                          ? '#F59E0B'
                          : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.healthCompactText,
                    {
                      color:
                        health.status === 'active'
                          ? '#10B981'
                          : health.status === 'permission-needed'
                          ? '#F59E0B'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {health.status === 'active'
                    ? '● Active'
                    : health.status === 'permission-needed'
                    ? '! Permission needed'
                    : '○ Paused'}
                </Text>
                <Text style={[styles.healthCompactText, { color: colors.textMuted }]}>·</Text>
                <Text style={[styles.healthCompactText, { color: colors.textPrimary }]}>
                  Next: {health.nextPrayer ? `${health.nextPrayer.name} ${health.nextPrayer.time}` : '—'}
                </Text>
                <Text style={[styles.healthCompactText, { color: colors.textMuted }]}>·</Text>
                <Text style={[styles.healthCompactText, { color: colors.textSecondary }]}>
                  Scheduled: {health.scheduledCounts.today} today, {health.scheduledCounts.tomorrow} tomorrow
                </Text>
              </View>
            ) : (
              <Text style={[styles.healthCompactText, { color: colors.textMuted }]}>Unable to load health</Text>
            )}
          </View>
        </Section>

        {/* Women's Worship */}
        <Section label="Women's Worship">
          <Row
            title="Women's Worship"
            desc="Show women's worship tools (period tracking, purity, fiqh)"
            right={
              <Toggle
                checked={womenWorshipEnabled}
                onChange={onToggleWomenWorship}
                label="Women's Worship"
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
              <Text style={[styles.consentTitleSmall, { color: colors.textPrimary }]}>Private & On-Device</Text>
              <Text style={[styles.consentBodySmall, { color: colors.textSecondary }]}>
                Cycle & purity information is sensitive. Your data:{'\n'}• Stays on this device by default{'\n'}• Needs no
                account or sign-in{'\n'}• Is never uploaded or included in analytics or logs{'\n'}• Can be deleted anytime
              </Text>
              <View style={styles.consentBtnsInline}>
                <TouchableOpacity
                  style={[styles.consentBtn, { borderColor: colors.borderSubtle }]}
                  onPress={() => setConsentOpen(false)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.consentBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.consentBtn, styles.consentBtnPrimary, { backgroundColor: colors.accent }]}
                  onPress={confirmWomenEnable}
                  accessibilityRole="button"
                >
                  <Text style={[styles.consentBtnTextPrimary, { color: colors.bgBase }]}>I Understand</Text>
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
                <Text style={[styles.privacyNoteText, { color: colors.textSecondary }]}>
                  Your cycle & purity data stays on this device by default. No account required — it is never uploaded
                  or included in analytics or logs.
                </Text>
              </View>

              {/* App lock */}
              <Hairline />
              <Row
                title="App lock (PIN)"
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
                    <Text style={[styles.privacyActionText, { color: colors.accent }]}>
                      {womenLockEnabled ? 'Disable' : 'Enable'}
                    </Text>
                  </TouchableOpacity>
                }
              />
              {womenPinHash ? (
                <Row
                  title="Change PIN"
                  onPress={() => setPinModalMode('change')}
                  right={<Text style={[styles.privacyActionText, { color: colors.accent }]}>Change</Text>}
                />
              ) : (
                <Row
                  title="Set PIN"
                  desc="Add a 4-digit PIN to lock women's screens"
                  onPress={() => setPinModalMode('set')}
                  right={<Text style={[styles.privacyActionText, { color: colors.accent }]}>Set</Text>}
                />
              )}

              {/* Protect with device security (system biometrics / PIN / face) */}
              <Hairline />
              <Row
                title="Protect Women's Worship"
                desc="Require your device security (fingerprint, face, or PIN) before viewing private Women's Worship information."
                right={
                  <Toggle
                    checked={womenLockEnabled}
                    onChange={() => setWomenLockEnabled(!womenLockEnabled)}
                    label="Protect Women's Worship"
                  />
                }
              />

              {/* Direct links to Women's tools */}
              {onOpenToolsItem && (
                <>
                  <Hairline />
                  <Row
                    title="Cycle Tracker"
                    desc="Period logging, cycle duration & predictions"
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
                    title="Purity & Ghusl"
                    desc="Step-by-step ghusl guide, tuhr & nifas tracker"
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
                    title="Worship Guidance"
                    desc="Authentic fiqh, exemptions & bleeding types"
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
                    title="Qada Fasts"
                    desc="Missed Ramadan fasts makeup ledger"
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
                title="Clear cycle history"
                desc="Remove all period entries"
                onPress={() =>
                  Alert.alert("Clear Cycle History?", "This deletes all period/cycle entries. Other women's data is kept.", [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => clearCycleHistory() },
                  ])
                }
                right={<Text style={[styles.privacyActionText, { color: colors.accent }]}>Clear</Text>}
              />

              {/* Delete all women's data */}
              <Hairline />
              <Row
                title="Delete women's data"
                desc="Erase everything, on this device"
                danger
                onPress={() =>
                  Alert.alert("Delete Women's Data?", "This permanently deletes all cycle, purity, nifas and women's qada data from this device. This cannot be undone.", [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => { clearWomenData(); setWomenWorship(false); } },
                  ])
                }
                right={<Ionicons name="trash-outline" size={18} color={DANGER} />}
              />

              {/* Hide features (keeps data) */}
              <Hairline />
              <Row
                title="Hide women's features"
                desc="Hide the tools now (your data is kept)"
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

        {/* About & Legal */}
        <Section label="About & Legal">
          <Row
            title="Privacy Policy"
            desc="No tracking, no accounts, data stays on device"
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
            title="Terms of Use"
            desc="Free service provided as-is for educational use"
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
            title="Data & Privacy"
            desc="Local storage, third-party requests & data removal"
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
            title="Open Source Licenses"
            desc="Expo, React Native & open-source libraries"
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
            title="Third-Party Services"
            desc="Public APIs for prayer times, Quran text & audio"
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
          <Row
            title="Contact / Report an Issue"
            desc="GitHub repository & community issue tracker"
            onPress={() => {
              setActiveLegalScreen('contact');
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
        </Section>

        {/* Data & App — near the bottom */}
        <Section label="Data">
          <Row
            title="Backup & Restore"
            desc="Export or restore your local data from a file"
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
            title="App Credits"
            desc="Built with the open-source Expo & React Native ecosystem"
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
        </Section>

        {/* About — muted, at the bottom */}
        <Section label="About">
          <Image
            source={
              themeMode === 'paper' || themeMode === 'system'
                ? require('../../assets/logo-master-black.png')
                : require('../../assets/logo-master-white.png')
            }
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          {ABOUT_ROWS.map((item, i) => (
            <View key={item.title}>
              {i > 0 && <Hairline />}
              <Row title={item.title} desc={item.subtitle} muted />
            </View>
          ))}
        </Section>

        {/* Mission — Sadaqah Jariyah, translations & acknowledgments */}
        <Card
          padded={false}
          style={{
            ...styles.missionCard,
            marginTop: layout.sectionGap,
            padding: layout.isCompact ? 16 : 20,
          }}
        >
          <Text style={[styles.missionEyebrow, { color: colors.accent }]}>SADAQAH JARIYAH</Text>
          <View style={styles.missionList}>
            {MISSION_TRANSLATIONS.map((m) => {
              const isRtl = m.lang === 'العربية' || m.lang === 'اردو';
              return (
                <View key={m.lang} style={styles.missionRow}>
                  <Text
                    style={[
                      styles.missionLang,
                      { color: colors.textSecondary },
                      isRtl && styles.missionLangRtl,
                    ]}
                  >
                    {m.lang}
                  </Text>
                  <Text
                    style={[
                      styles.missionText,
                      { color: colors.textPrimary },
                      isRtl && styles.missionTextRtl,
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              );
            })}
          </View>

          <Hairline style={styles.missionDivider} />

          {/* Unified thanks to all providers */}
          <Text style={[styles.thanksText, { color: colors.textSecondary }]}>
            {THANKS_TEXT}
          </Text>
        </Card>

        {/* Footer */}
        <View style={[styles.footerWrap, { marginTop: layout.isCompact ? 16 : 20 }]}>
          <Text style={[styles.footer, { color: colors.textMuted }]}>
            Made for Ummah ❤️
          </Text>
          <Text style={[styles.footerArabic, { color: colors.textSecondary }]}>
            تَوَكَّلْتُ عَلَى ٱللَّٰهُ
          </Text>
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

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
  contentWrap: {
    width: '100%',
    alignSelf: 'center',
  },
  closeBtn: {
    alignSelf: 'flex-start',
    minWidth: 40,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 4,
  },
  closeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowFlex: { flex: 1 },
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
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
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
    gap: 12,
  },
  adjustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  adjustValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  adjustControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustBtn: {
    width: 44,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  adjustTrackArea: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
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
    marginLeft: -8,
  },
  segRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 13,
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
  missionCard: {
    width: '100%',
  },
  missionEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  missionList: {
    gap: 12,
  },
  missionRow: {
    gap: 3,
  },
  missionLang: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  missionLangRtl: {
    textAlign: 'right',
  },
  missionText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  missionTextRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 23,
  },
  missionDivider: {
    marginVertical: 16,
  },
  thanksText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  aboutLogo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: 14,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  accentSwatch: {
    alignItems: 'center',
    width: 64,
    paddingVertical: 4,
  },
  accentCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
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
    fontSize: 11.5,
    lineHeight: 17,
    flex: 1,
  },
  privacyActionBtn: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
  },
  consentBtnPrimary: {
    borderWidth: 0,
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
    paddingVertical: 12,
  },
  healthCompactLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthCompactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 8,
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
    fontSize: 13,
  },
  permissionBannerSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  reciterBadgeArabic: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 13,
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
});
