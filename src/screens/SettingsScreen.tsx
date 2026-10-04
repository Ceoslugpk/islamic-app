import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  SafeAreaView,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import WidgetPreviewScreen from './WidgetPreviewScreen';
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
import { CALC_METHODS, fetchPrayerTimes } from '../lib/prayerTimes';
import {
  configureNotifications,
  requestNotificationPermission,
  schedulePrayerNotifications,
  scheduleQuranReminder,
  cancelPrayerNotifications,
  cancelQuranReminder,
  getNotificationHealth,
  NotificationHealth,
} from '../lib/notifications';
import {
  playAdhan,
  stopAdhan,
  getAdhanReciter,
  addAdhanPlaybackListener,
  configureAudio,
} from '../lib/audio';
import { AdhanReciterModal } from '../components/AdhanReciterModal';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { accentThemes, ACCENT_KEYS } from '../lib/accents';
import { clearWomenData, clearCycleHistory } from '../lib/db';
import { WomenPinModal } from '../components/WomenPinModal';

const ABOUT_ROWS: { title: string; subtitle: string }[] = [
  { title: 'Islamic · v1.0.0', subtitle: 'Version 1.0.0' },
  { title: 'Prayer times', subtitle: 'AlAdhan + islamic.app' },
  { title: 'Quran text', subtitle: 'AlQuran Cloud' },
  { title: 'Quran audio', subtitle: 'islamic.network CDN' },
  { title: 'Hadith', subtitle: 'islamic.app Hadith API' },
  { title: '99 Names', subtitle: 'EsmaulHusna.org' },
  { title: 'Qibla', subtitle: 'Great-circle calculation' },
];

const QURAN_FONT_OPTIONS: { key: QuranArabicFont; label: string; desc: string }[] = [
  { key: 'amiri', label: 'Amiri', desc: 'Classic Naskh — the Quran reader default' },
  { key: 'notonaskh', label: 'Noto Naskh Arabic', desc: 'Google’s clean, highly legible Naskh' },
];

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
    <View style={styles.adjustRow}>
      <View style={styles.adjustHeader}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{label}</Text>
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
  onOpenWidgets?: () => void;
}

export default function SettingsScreen({ onClose, onOpenWidgets }: SettingsScreenProps) {
  const { colors, mode, accentKey, setAccent } = useTheme();
  const {
    settings,
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
  } = useSettings();
  const { haptic } = useHaptics();
  const { edition, flag } = useQuranLanguage();
  const [quranLangModalOpen, setQuranLangModalOpen] = useState(false);
  const [adhanModalOpen, setAdhanModalOpen] = useState(false);
  const [widgetsModalOpen, setWidgetsModalOpen] = useState(false);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'verifyEnable' | 'set' | 'change' | null>(null);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);

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
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await configureNotifications();
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(data, reminderOffsetMinutes, settings.manualLocation.label);
      } catch {
        // scheduling failed; still enable the toggle, user can retry
      }
    } else {
      await cancelPrayerNotifications();
    }
    setReminders(next);
    haptic('light');
  }

  async function onToggleQuranReminder() {
    const next = !quranReminderEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await configureNotifications();
      try {
        await scheduleQuranReminder();
      } catch {
        // scheduling failed; still enable the toggle, user can retry
      }
    } else {
      await cancelQuranReminder();
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

  function handleThemeModeChange(nextMode: 'system' | 'ink' | 'paper') {
    setThemeMode(nextMode);
    haptic('light');
  }

  const themeModeLabels = {
    system: 'System',
    ink: 'Dark',
    paper: 'Light',
  } as const;

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      <View style={styles.contentWrap}>
        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.closeText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Done</Text>
          </TouchableOpacity>
        )}
        <SectionHeader eyebrow="Preferences" title="Settings" />

      {/* Theme Mode */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Appearance</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Theme</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {themeMode === 'system' ? 'Follow system' : themeMode === 'ink' ? 'Dark (Ink)' : 'Light (Paper)'}
            </Text>
          </View>
        </View>
        <Hairline />
        <View style={styles.segRow}>
          {(['system', 'ink', 'paper'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.seg,
                { borderColor: colors.borderSubtle },
                themeMode === m && { backgroundColor: colors.accentDim, borderColor: colors.accent },
              ]}
              onPress={() => handleThemeModeChange(m)}
            >
              <Text
                style={[
                  styles.segLabel,
                  { color: themeMode === m ? colors.accent : colors.textSecondary },
                ]}
              >
                {themeModeLabels[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Hairline />
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Haptics</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Subtle vibration feedback for meaningful actions
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, { borderColor: colors.accent }]}
            onPress={() => setHapticsEnabled(!hapticsEnabled)}
            accessibilityRole="switch"
            accessibilityState={{ checked: hapticsEnabled }}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: colors.accent, alignSelf: hapticsEnabled ? 'flex-end' : 'flex-start' },
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Accent Color */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Accent Color</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <View style={styles.accentGrid}>
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
                <Text style={[styles.accentLabel, { color: isSelected ? accentColor : colors.textSecondary }]}>{accent.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Home Screen Widgets */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Home Screen</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            haptic('light');
            if (onOpenWidgets) {
              onOpenWidgets();
            } else {
              setWidgetsModalOpen(true);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Home Screen Widgets preview and setup"
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Home Screen Widgets</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Preview Next Prayer, Salah Progress, Quran, and Hijri widgets
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Quran Translation */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Holy Quran</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => { setQuranLangModalOpen(true); haptic('light'); }}
          accessibilityRole="button"
          accessibilityLabel={`Change translation language. Current: ${edition.language} ${flag}`}
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Translation Language</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {flag} {edition.language} ({edition.name})
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Quran Display — Arabic font controls for the Quran reader */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Quran Display</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Arabic Font</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Typeface used for Quran ayahs in the reader
            </Text>
          </View>
        </View>
        <Hairline />
        {QURAN_FONT_OPTIONS.map((option) => {
          const selected = quranArabicFont === option.key;
          return (
            <View key={option.key}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => { setQuranArabicFont(option.key); haptic('light'); }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Arabic font: ${option.label}${selected ? ', selected' : ''}`}
              >
                <View style={styles.rowFlex}>
                  <Text
                    style={[
                      styles.rowTitle,
                      {
                        color: selected ? colors.accent : colors.textPrimary,
                        fontFamily: QURAN_FONT_FAMILIES[option.key].regular,
                        fontSize: 15,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{option.desc}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    { borderColor: colors.borderStrong },
                    selected && { borderColor: colors.accent, backgroundColor: colors.accentDim },
                  ]}
                >
                  {selected && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                </View>
              </TouchableOpacity>
              <Hairline />
            </View>
          );
        })}
        {/* KFGQPC: desktop-only King Fahd Quran Complex font, no free mobile file */}
        <TouchableOpacity
          style={[styles.row, { opacity: 0.5 }]}
          disabled
          activeOpacity={1}
          accessibilityRole="radio"
          accessibilityState={{ disabled: true, selected: false }}
          accessibilityLabel="Arabic font: KFGQPC, coming soon"
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>KFGQPC</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Coming soon · no bundleable mobile font file yet
            </Text>
          </View>
          <View style={[styles.radio, { borderColor: colors.borderStrong }]} />
        </TouchableOpacity>

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
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Translation</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Show the translation beneath each ayah
            </Text>
          </View>
          <Text
            style={[
              styles.stateLabel,
              { color: quranShowTranslation ? colors.accent : colors.textMuted },
            ]}
          >
            {quranShowTranslation ? 'ON' : 'OFF'}
          </Text>
          <TouchableOpacity
            style={[styles.toggle, { borderColor: colors.accent }]}
            onPress={() => { setQuranShowTranslation(!quranShowTranslation); haptic('light'); }}
            accessibilityRole="switch"
            accessibilityState={{ checked: quranShowTranslation }}
            accessibilityLabel="Show translation in the Quran reader"
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: colors.accent, alignSelf: quranShowTranslation ? 'flex-end' : 'flex-start' },
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calculation method */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Prayer Times</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        {CALC_METHODS.map((m, i) => (
          <View key={m.id}>
            {i > 0 && <Hairline />}
            <TouchableOpacity style={styles.row} onPress={() => { setMethod(m.id); haptic('light'); }}>
              <View style={styles.rowFlex}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{m.name}</Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{m.region}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: colors.borderStrong },
                  methodId === m.id && { borderColor: colors.accent, backgroundColor: colors.accentDim },
                ]}
              >
                {methodId === m.id && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Time format */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Time Display</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <View style={styles.segRow}>
          {(['12h', '24h'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.seg,
                { borderColor: colors.borderSubtle },
                timeFormat === f && { backgroundColor: colors.accentDim, borderColor: colors.accent },
              ]}
              onPress={() => { setTimeFormat(f); haptic('light'); }}
            >
              <Text
                style={[
                  styles.segLabel,
                  { color: timeFormat === f ? colors.accent : colors.textSecondary },
                ]}
              >
                {f === '12h' ? '12-hour' : '24-hour'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Prayer reminders */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Reminders</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        {health?.status === 'permission-needed' && (
          <TouchableOpacity
            style={[styles.permissionBanner, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
            onPress={async () => {
              const granted = await requestNotificationPermission();
              if (granted) {
                await configureNotifications();
                const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
                await cancelPrayerNotifications();
                await schedulePrayerNotifications(data, reminderOffsetMinutes, settings.manualLocation.label);
                const h = await getNotificationHealth(data, settings.manualLocation, settings.methodId, true);
                setHealth(h);
                setReminders(true);
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
                Tap to allow notifications so prayer reminders can sound.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        )}

        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Prayer reminders</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Notification {reminderOffsetMinutes} minutes before each prayer
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, { borderColor: colors.accent }]}
            onPress={() => onToggleReminders()}
            accessibilityRole="switch"
            accessibilityState={{ checked: remindersEnabled }}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: colors.accent, alignSelf: remindersEnabled ? 'flex-end' : 'flex-start' },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Reminder offset picker */}
        <Hairline />
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Remind before prayer</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Minutes before each prayer time
            </Text>
          </View>
          <View style={styles.segRow}>
            {[5, 10, 15, 20, 30].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.seg,
                  { borderColor: colors.borderSubtle },
                  reminderOffsetMinutes === m && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
                onPress={() => { setReminderOffsetMinutes(m); haptic('light'); }}
                disabled={!remindersEnabled}
                accessibilityRole="button"
                accessibilityState={{ selected: reminderOffsetMinutes === m }}
              >
                <Text
                  style={[
                    styles.segLabel,
                    { color: reminderOffsetMinutes === m ? colors.accent : !remindersEnabled ? colors.textMuted : colors.textSecondary },
                  ]}
                >
                  {m} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Adhan Reciter Choice */}
        <Hairline />
        <TouchableOpacity
          style={styles.row}
          onPress={() => { setAdhanModalOpen(true); haptic('light'); }}
          accessibilityRole="button"
          accessibilityLabel={`Adhan reciter: ${getAdhanReciter(settings.adhanReciterId).name}. Tap to change.`}
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Adhan Reciter</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {getAdhanReciter(settings.adhanReciterId).name} · {getAdhanReciter(settings.adhanReciterId).location}
            </Text>
          </View>
          <View style={styles.reciterPickerRight}>
            <Text style={[styles.reciterBadgeArabic, { color: colors.accent }]}>
              {getAdhanReciter(settings.adhanReciterId).arabicName}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Test Adhan sound */}
        <Hairline />
        <TouchableOpacity
          style={styles.row}
          onPress={onTestAdhan}
          accessibilityRole="button"
          accessibilityLabel={isPlayingAdhan ? 'Stop adhan sound' : 'Test adhan sound'}
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Test adhan sound</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {isPlayingAdhan ? 'Playing preview… tap to stop' : `Preview ${getAdhanReciter(settings.adhanReciterId).name}`}
            </Text>
          </View>
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
        </TouchableOpacity>

        {/* Quran reminder toggle */}
        <Hairline />
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Quran reminder</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Daily reminder to continue reading at 8:00 PM
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, { borderColor: colors.accent }]}
            onPress={onToggleQuranReminder}
            accessibilityRole="switch"
            accessibilityState={{ checked: quranReminderEnabled }}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: colors.accent, alignSelf: quranReminderEnabled ? 'flex-end' : 'flex-start' },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Compact Notification Health */}
        <Hairline />
        <View style={styles.healthCompact}>
          {isLoadingHealth ? (
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
      </View>

      {/* Women's Worship */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Women's Worship</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Women's Worship</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Show women's worship tools (period tracking, purity, fiqh)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, { borderColor: colors.accent }]}
            onPress={onToggleWomenWorship}
            accessibilityRole="switch"
            accessibilityState={{ checked: womenWorshipEnabled }}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: colors.accent, alignSelf: womenWorshipEnabled ? 'flex-end' : 'flex-start' },
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Inline consent (cross-platform; avoids nested-Modal stacking issues on web) */}
        {consentOpen && !womenWorshipEnabled && (
          <View style={[styles.inlineConsent, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
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
            <View style={[styles.privacyNote, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
              <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
              <Text style={[styles.privacyNoteText, { color: colors.textSecondary }]}>
                Your cycle & purity data stays on this device by default. No account required — it is never uploaded
                or included in analytics or logs.
              </Text>
            </View>

            {/* App lock */}
            <Hairline />
            <View style={styles.row}>
              <View style={styles.rowFlex}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>App lock (PIN)</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  {womenPinHash
                    ? womenLockEnabled
                      ? "Locked — PIN required to open women's features"
                      : 'PIN set but not enabled — tap to enable'
                    : "Protect women's screens with a 4-digit PIN"}
                </Text>
              </View>
              {womenPinHash ? (
                <TouchableOpacity
                  style={[styles.privacyActionBtn, { borderColor: colors.accent }]}
                  onPress={() => setWomenLockEnabled(!womenLockEnabled)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.privacyActionText, { color: colors.accent }]}>
                    {womenLockEnabled ? 'Disable' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.privacyActionBtn, { borderColor: colors.accent }]}
                  onPress={() => setPinModalMode('set')}
                  accessibilityRole="button"
                >
                  <Text style={[styles.privacyActionText, { color: colors.accent }]}>Set PIN</Text>
                </TouchableOpacity>
              )}
            </View>
            {womenPinHash && (
              <TouchableOpacity style={styles.row} onPress={() => setPinModalMode('change')}>
                <View style={styles.rowFlex}>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>Change PIN</Text>
                </View>
                <Text style={[styles.privacyActionText, { color: colors.accent }]}>Change</Text>
              </TouchableOpacity>
            )}

            {/* Clear cycle history */}
            <Hairline />
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                Alert.alert("Clear Cycle History?", "This deletes all period/cycle entries. Other women's data is kept.", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => clearCycleHistory() },
                ])
              }
              accessibilityRole="button"
            >
              <View style={styles.rowFlex}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Clear cycle history</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Remove all period entries
                </Text>
              </View>
              <Text style={[styles.privacyActionText, { color: colors.accent }]}>Clear</Text>
            </TouchableOpacity>

            {/* Delete all women's data */}
            <Hairline />
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                Alert.alert("Delete Women's Data?", "This permanently deletes all cycle, purity, nifas and women's qada data from this device. This cannot be undone.", [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => { clearWomenData(); setWomenWorship(false); } },
                ])
              }
              accessibilityRole="button"
            >
              <View style={styles.rowFlex}>
                <Text style={[styles.dangerText, { color: '#EF4444' }]}>Delete women's data</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Erase everything, on this device
                </Text>
              </View>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>

            {/* Hide features (keeps data) */}
            <Hairline />
            <TouchableOpacity
              style={styles.row}
              onPress={() => setWomenWorship(false)}
              accessibilityRole="button"
            >
              <View style={styles.rowFlex}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Hide women's features</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                  Hide the tools now (your data is kept)
                </Text>
              </View>
              <Ionicons name="eye-off-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* PIN modal: set / change / verify-to-enable */}
      <WomenPinModal
        visible={pinModalMode !== null}
        mode={pinModalMode === 'set' ? 'set' : pinModalMode === 'change' ? 'change' : 'verify'}
        currentHash={womenPinHash}
        onSuccess={() => {
          if (pinModalMode === 'verifyEnable') {
            // PIN verified → show consent, then enable
            setPinModalMode(null);
            setConsentOpen(true);
          } else {
            setPinModalMode(null);
          }
        }}
        onCancel={() => setPinModalMode(null)}
        onSetPin={(newHash) => setWomenPinHash(newHash)}
      />

      {/* About */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>About</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        {ABOUT_ROWS.map((item, i) => (
          <View key={item.title}>
            {i > 0 && <Hairline />}
            <View style={styles.row}>
              <View style={styles.rowFlex}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.aboutNote, { color: colors.textMuted }]}>
        All data sources are free public APIs used with attribution.
      </Text>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Prayer times by Aladhan API · Islamic v1.0
      </Text>

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
        visible={widgetsModalOpen}
        animationType="slide"
        onRequestClose={() => setWidgetsModalOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }}>
          <WidgetPreviewScreen onClose={() => setWidgetsModalOpen(false)} />
        </SafeAreaView>
      </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 20, paddingBottom: 40 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  closeBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
  },
  closeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  group: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowFlex: { flex: 1 },
  rowTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  rowDesc: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
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
  adjustRow: {
    padding: 16,
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
    width: 38,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  adjustTrackArea: {
    flex: 1,
    height: 32,
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
  segRow: { flexDirection: 'row', gap: 8, padding: 12, flexWrap: 'wrap' },
  seg: {
    flex: 1,
    minWidth: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  testBtn: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  footer: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
  aboutNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
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
  },
  accentLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  privacyNoteText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 17,
    flex: 1,
  },
  privacyActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  privacyActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  dangerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  consentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consentCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  consentIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  consentTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginBottom: 10,
    textAlign: 'center',
  },
  consentBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 18,
  },
  consentBtns: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  consentBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
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
  inlineConsent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 8,
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
  healthCompact: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    borderWidth: 1,
    borderRadius: 8,
    margin: 12,
    marginBottom: 4,
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
  reciterPickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reciterBadgeArabic: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 13,
  },
  playBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});