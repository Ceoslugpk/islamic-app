import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { useThemeTokens } from '../theme/tokens';
import { useSettings, PrayerNameKey, QuranGoalType } from '../lib/settings';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import {
  PremiumCard,
  OutlineButton,
  Chip,
} from '../components/ui';
import { AppText } from '../components/ui/AppText';
import { Hairline } from '../components/Hairline';
import {
  notificationsRescheduled,
  notificationsRescheduleFailed,
  snoozedTenMinutes,
  testAlertSent,
  dailyGoalDone,
  dailyGoalReopened,
  notificationPermissionDenied,
  testAlertPermission,
} from '../lib/strings';
import { t } from '../lib/i18n';
import { fetchPrayerTimes, DayTimings } from '../lib/prayerTimes';
import {
  configureNotifications,
  requestNotificationPermission,
  schedulePrayerNotifications,
  cancelPrayerNotifications,
  scheduleQuranReminder,
  cancelQuranReminder,
  getNotificationHealth,
  NotificationHealth,
  stopAdhanPlayback,
  snoozePrayer,
  sendTestPrayerNotification,
  sendTestPrePrayerNotification,
  sendTestQuranNotification,
  isNotificationSchedulingSupported,
} from '../lib/notifications';
import {
  playAdhan,
  getAdhanReciter,
  addAdhanPlaybackListener,
} from '../lib/audio';
import { AdhanReciterModal } from '../components/AdhanReciterModal';
import {
  loadQuranDailyProgress,
  setQuranDailyGoalCompleted,
  QuranDailyProgress,
} from '../lib/quranProgress';
import { getContinueReadingPosition } from '../lib/continuing';
import { buildDeepLink } from '../lib/deeplinks';
import { getForwardIcon } from '../lib/iconMap';

const REMINDER_OFFSETS = [
  { label: 'Off', value: 0 },
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
];

const QURAN_REMINDER_PRESETS = ['06:00', '08:00', '18:00', '20:00', '21:00', '22:00'];

const PRAYER_LIST: { key: PrayerNameKey; arabic: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Fajr', arabic: 'الفجر', icon: 'sunny-outline' },
  { key: 'Dhuhr', arabic: 'الظهر', icon: 'sunny' },
  { key: 'Asr', arabic: 'العصر', icon: 'partly-sunny-outline' },
  { key: 'Maghrib', arabic: 'المغرب', icon: 'cloudy-night-outline' },
  { key: 'Isha', arabic: 'العشاء', icon: 'moon-outline' },
];

export default function PrayerRemindersScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { colors } = useTheme();
  const { tokens } = useThemeTokens();
  const {
    settings,
    setReminders,
    setReminderOffsetMinutes,
    setPrayerConfig,
    setAdhanReciterId,
    setQuranReminderEnabled,
    setQuranReminderTime,
    setQuranGoal,
  } = useSettings();

  const remindersEnabled = settings.remindersEnabled;
  const reminderOffsetMinutes = settings.reminderOffsetMinutes;
  const prayerConfigs = settings.prayerConfigs;
  const adhanReciterId = settings.adhanReciterId;
  const quranReminderEnabled = settings.quranReminderEnabled;
  const quranReminderTime = settings.quranReminderTime || '20:00';
  const quranGoal = settings.quranGoal;

  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [timingsData, setTimingsData] = useState<DayTimings | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [adhanModalOpen, setAdhanModalOpen] = useState(false);
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [quranProgress, setQuranProgress] = useState<QuranDailyProgress | null>(null);

  // Listen to adhan audio playback
  useEffect(() => {
    const unsub = addAdhanPlaybackListener((id) => {
      setIsPlayingAdhan(id !== null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await loadQuranDailyProgress();
        if (!cancelled) {
          setQuranProgress(p);
        }
      } catch {
        // non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load prayer times and health status
  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId, new Date(), {
        madhab: settings.madhab,
      });
      setTimingsData(data);
      const h = await getNotificationHealth(
        data,
        settings.manualLocation,
        settings.methodId,
        remindersEnabled,
        reminderOffsetMinutes,
        quranReminderEnabled
      );
      setHealth(h);
    } catch {
      // non-fatal
    } finally {
      setIsLoadingHealth(false);
    }
  }, [
    settings.manualLocation,
    settings.methodId,
    settings.madhab,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId, new Date(), {
          madhab: settings.madhab,
        });
        if (cancelled) return;
        setTimingsData(data);
        const h = await getNotificationHealth(
          data,
          settings.manualLocation,
          settings.methodId,
          remindersEnabled,
          reminderOffsetMinutes,
          quranReminderEnabled
        );
        if (!cancelled) {
          setHealth(h);
        }
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) {
          setIsLoadingHealth(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    settings.manualLocation,
    settings.methodId,
    settings.madhab,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
  ]);

  async function onReschedulePress() {
    setIsRescheduling(true);
    setTestStatusMessage(null);
    try {
      await configureNotifications();
      const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId, new Date(), {
        madhab: settings.madhab,
      });
      await cancelPrayerNotifications();
      await cancelQuranReminder();
      if (remindersEnabled) {
        await schedulePrayerNotifications(
          data,
          reminderOffsetMinutes,
          settings.manualLocation.label,
          prayerConfigs
        );
      }
      if (quranReminderEnabled) {
        await scheduleQuranReminder(quranReminderTime, quranGoal);
      }
      await loadHealth();
      setTestStatusMessage(`✓ ${t(notificationsRescheduled)}`);
      setTimeout(() => setTestStatusMessage(null), 3000);
    } catch {
      setTestStatusMessage(t(notificationsRescheduleFailed));
    } finally {
      setIsRescheduling(false);
    }
  }

  async function onToggleReminders() {
    setPermissionError(null);
    const next = !remindersEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionError(t(notificationPermissionDenied));
        return;
      }
      await configureNotifications();
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId, new Date(), {
          madhab: settings.madhab,
        });
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(
          data,
          reminderOffsetMinutes,
          settings.manualLocation.label,
          prayerConfigs
        );
      } catch {
        // scheduling failed; still toggle
      }
    } else {
      await cancelPrayerNotifications();
    }
    setReminders(next);
  }

  async function onToggleQuranReminder() {
    setPermissionError(null);
    const next = !quranReminderEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionError(t(notificationPermissionDenied));
        return;
      }
      await configureNotifications();
      await scheduleQuranReminder(quranReminderTime, quranGoal);
    } else {
      await cancelQuranReminder();
    }
    setQuranReminderEnabled(next);
  }

  async function onSelectOffset(mins: number) {
    setReminderOffsetMinutes(mins);
    if (remindersEnabled) {
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId, new Date(), {
          madhab: settings.madhab,
        });
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(
          data,
          mins,
          settings.manualLocation.label,
          prayerConfigs
        );
        await loadHealth();
      } catch {
        // ignore
      }
    }
  }

  async function onTogglePrayer(prayer: PrayerNameKey, field: 'enabled' | 'adhan' | 'vibration') {
    const current = prayerConfigs[prayer];
    const updated = { ...current, [field]: !current[field] };
    setPrayerConfig(prayer, { [field]: !current[field] });

    if (remindersEnabled) {
      try {
        const newConfigs = { ...prayerConfigs, [prayer]: updated };
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId, new Date(), {
          madhab: settings.madhab,
        });
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(
          data,
          reminderOffsetMinutes,
          settings.manualLocation.label,
          newConfigs
        );
        await loadHealth();
      } catch {
        // ignore
      }
    }
  }

  async function onTestAdhanSound() {
    if (isPlayingAdhan) {
      await stopAdhanPlayback();
    } else {
      await playAdhan(adhanReciterId);
    }
  }

  async function onSnoozePress() {
    if (!isNotificationSchedulingSupported()) {
      setTestStatusMessage(t('Reminders deliver on your device'));
      setTimeout(() => setTestStatusMessage(null), 3500);
      return;
    }
    const ok = await snoozePrayer('Prayer', 10);
    if (ok) {
      setTestStatusMessage(t(snoozedTenMinutes));
    } else {
      setTestStatusMessage(t(testAlertPermission));
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onTestPrayerAlert(prayer: PrayerNameKey) {
    if (!isNotificationSchedulingSupported()) {
      setTestStatusMessage(t('Reminders deliver on your device'));
      setTimeout(() => setTestStatusMessage(null), 3500);
      return;
    }
    const id = await sendTestPrayerNotification(prayer, 'prayer-times-adhan');
    if (id) {
      setTestStatusMessage(`✓ ${t(testAlertSent)}`);
    } else {
      setTestStatusMessage(t(testAlertPermission));
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onTestPrePrayerAlert() {
    if (!isNotificationSchedulingSupported()) {
      setTestStatusMessage(t('Reminders deliver on your device'));
      setTimeout(() => setTestStatusMessage(null), 3500);
      return;
    }
    const id = await sendTestPrePrayerNotification('Maghrib', reminderOffsetMinutes || 15);
    if (id) {
      setTestStatusMessage(`✓ ${t(testAlertSent)}`);
    } else {
      setTestStatusMessage(t(testAlertPermission));
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onTestQuranAlert() {
    if (!isNotificationSchedulingSupported()) {
      setTestStatusMessage(t('Reminders deliver on your device'));
      setTimeout(() => setTestStatusMessage(null), 3500);
      return;
    }
    const id = await sendTestQuranNotification();
    if (id) {
      setTestStatusMessage(t('✓ Quran reminder test sent — tap "Read Now" to try the reader link.'));
    } else {
      setTestStatusMessage(t(testAlertPermission));
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onToggleQuranGoalToday() {
    if (!quranProgress) return;
    const nextCompleted = !quranProgress.completed;
    const updated = await setQuranDailyGoalCompleted(nextCompleted);
    setQuranProgress(updated);
    if (nextCompleted) {
      setTestStatusMessage(`✓ ${t(dailyGoalDone)}`);
    } else {
      setTestStatusMessage(t(dailyGoalReopened));
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onOpenQuranReaderNow() {
    try {
      const pos = await getContinueReadingPosition();
      const link = buildDeepLink(
        pos ? { type: 'quran', surah: pos.surah, ayah: pos.ayah } : { type: 'quran', surah: 1 }
      );
      Linking.openURL(link).catch(() => {});
    } catch {
      Linking.openURL('salah://quran/1').catch(() => {});
    }
  }

  const currentReciter = getAdhanReciter(adhanReciterId);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  // Calculate goal progress percentage
  const goalTarget = quranGoal?.target || 15;
  const goalType = quranGoal?.type || 'minutes';
  let goalCurrent = 0;
  if (quranProgress) {
    if (goalType === 'minutes') goalCurrent = quranProgress.minutesRead;
    else if (goalType === 'pages') goalCurrent = quranProgress.pagesRead;
    else goalCurrent = quranProgress.customCompleted;
  }
  const progressRatio = Math.min(1, Math.max(0, goalTarget > 0 ? goalCurrent / goalTarget : 0));
  const isGoalMet = quranProgress?.completed || progressRatio >= 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={styles.detailScreen}
        header={
          <SubHeader
            title={t('Prayer Reminders')}
            eyebrow={t('Tools')}
            subtitle={t('Manage daily prayer alarms, adhan voices & Quran reading habit')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
        <DetailScreen.ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[
            styles.content,
            { alignSelf: 'center', width: '100%', maxWidth: 680, paddingHorizontal: paddingH },
          ]}
        >
        <View style={styles.contentWrap}>
          {testStatusMessage && (
            <View style={[styles.bannerBox, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
              <Ionicons name="information-circle" size={18} color={colors.accent} />
              <AppText variant="body" style={styles.bannerText}>{testStatusMessage}</AppText>
            </View>
          )}

          {/* Master Reminder Card */}
          <AppText variant="eyebrow" tone="faint" style={[styles.groupLabel, styles.firstGroupLabel]}>{t('Prayer reminders')}</AppText>
          <PremiumCard style={styles.groupCard} padded={false}>
            <View style={styles.row}>
              <View style={styles.rowFlex}>
                <AppText variant="rowTitle" style={styles.rowTitle}>{t('Prayer reminders')}</AppText>
                <AppText variant="caption" tone="faint" style={styles.rowDesc}>
                  {t('Alarms before and at each prayer time — on time even when the app is closed')}
                </AppText>
              </View>
              <TouchableOpacity
                style={[styles.toggle, { borderColor: colors.accent }]}
                onPress={onToggleReminders}
                accessibilityRole="switch"
                accessibilityState={{ checked: remindersEnabled }}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: colors.accent,
                      alignSelf: remindersEnabled ? 'flex-end' : 'flex-start',
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>

            {permissionError && (
              <View style={[styles.errorBox, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
                <AppText variant="body" style={styles.errorText}>{permissionError}</AppText>
                <TouchableOpacity
                  onPress={() => Linking.openSettings().catch(() => {})}
                  style={[styles.errorAction, { borderColor: colors.accent }]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('Open device settings to enable notifications')}
                >
                  <Ionicons name="settings-outline" size={14} color={colors.accent} />
                  <AppText variant="link" highlight style={styles.errorActionText}>{t('Open Settings')}</AppText>
                </TouchableOpacity>
              </View>
            )}

            <Hairline />

            {/* Health & status row */}
            {isLoadingHealth ? (
              <View style={styles.healthLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <AppText variant="body" tone="faint" style={styles.healthLoadingText}>
                  {t('Checking your alarms…')}
                </AppText>
              </View>
            ) : (
              <View style={styles.healthRow}>
                <View style={styles.healthItem}>
                  <AppText variant="eyebrow" tone="faint" style={styles.healthLabel}>{t('Status')}</AppText>
                  <View style={styles.healthStatusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            health?.status === 'active'
                              ? (colors.forestGreen || colors.accent)
                              : health?.status === 'permission-needed'
                              ? tokens.goldText
                              : colors.textMuted,
                        },
                      ]}
                    />
                    <AppText
                      variant="body"
                      style={[
                        styles.healthValue,
                        {
                          color:
                            health?.status === 'active'
                              ? (colors.forestGreen || colors.accent)
                              : health?.status === 'permission-needed'
                              ? tokens.goldText
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {health?.status === 'active'
                        ? t('Active')
                        : health?.status === 'permission-needed'
                        ? t('Permission needed')
                        : t('Paused')}
                    </AppText>
                  </View>
                </View>

                <View style={styles.healthItem}>
                  <AppText variant="eyebrow" tone="faint" style={styles.healthLabel}>{t('Next prayer')}</AppText>
                  <AppText variant="body" style={styles.healthValue}>
                    {health?.nextPrayer ? `${health.nextPrayer.name} · ${health.nextPrayer.time}` : '—'}
                  </AppText>
                </View>

                <View style={styles.healthItem}>
                  <AppText variant="eyebrow" tone="faint" style={styles.healthLabel}>{t('Today')}</AppText>
                  <AppText variant="body" style={styles.healthValue}>
                    {health ? `${health.scheduledCounts.today} ${t('today')}` : '—'}
                  </AppText>
                </View>
              </View>
            )}

            <Hairline />

            <View style={styles.rescheduleRow}>
              <OutlineButton
                title={isRescheduling ? t('Scheduling alarms…') : t('Re-schedule now')}
                icon={isRescheduling ? undefined : 'refresh'}
                loading={isRescheduling}
                disabled={isRescheduling}
                onPress={onReschedulePress}
                accessibilityLabel={t('Re-schedule alarms now')}
                style={{ flex: 1 }}
              />
              <OutlineButton
                title={t('Snooze 10m')}
                icon="time-outline"
                onPress={onSnoozePress}
                accessibilityLabel={t('Snooze 10 minutes')}
                style={{ minWidth: 110 }}
              />
            </View>
          </PremiumCard>

        {/* Floating/Active Adhan Playback Banner */}
        {isPlayingAdhan && (
          <View style={[styles.playingBanner, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
            <View style={styles.playingLeft}>
              <Ionicons name="musical-notes" size={20} color={colors.accent} />
              <View>
                <AppText variant="rowTitle" style={styles.playingTitle}>{t('Adhan Playing')}</AppText>
                <AppText variant="caption" highlight style={styles.playingReciter}>{currentReciter.name}</AppText>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.stopAdhanBtn, { overflow: 'hidden' }]}
              onPress={() => stopAdhanPlayback()}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('Stop adhan playback')}
            >
              <LinearGradient
                pointerEvents="none"
                colors={tokens.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="stop" size={16} color={tokens.onGold} />
              <AppText variant="body" tone="onGold" style={styles.stopAdhanText}>{t('Stop Adhan')}</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Per-Prayer Controls (Fajr, Dhuhr, Asr, Maghrib, Isha) */}
        <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>
          {t('Per-prayer alerts & audio')}
        </AppText>
        <PremiumCard style={styles.groupCard} padded={false}>
          {PRAYER_LIST.map((p, idx) => {
            const config = prayerConfigs[p.key] || { enabled: true, adhan: true, vibration: true };
            const time = timingsData?.timings ? (timingsData.timings as any)[p.key] : null;

            return (
              <View key={p.key}>
                {idx > 0 && <Hairline />}
                <View style={styles.prayerRow}>
                  {/* Left: Prayer Icon & Details */}
                  <View style={styles.prayerInfo}>
                    <View style={styles.prayerTitleRow}>
                      <Ionicons
                        name={p.icon}
                        size={18}
                        color={config.enabled && remindersEnabled ? colors.accent : colors.textMuted}
                      />
                      <AppText
                        variant="rowTitle"
                        tone={config.enabled && remindersEnabled ? undefined : 'faint'}
                        style={styles.prayerName}
                      >
                        {p.key}
                      </AppText>
                      <AppText variant="rowTitle" highlight style={styles.prayerArabic}>{p.arabic}</AppText>
                      {time && (
                        <View style={[styles.timeBadge, { backgroundColor: colors.bgBase }]}>
                          <AppText variant="caption" tone="faint" style={styles.timeBadgeText}>{time}</AppText>
                        </View>
                      )}
                    </View>

                    {/* Quick action buttons per prayer */}
                    <View style={styles.prayerPillsRow}>
                      <TouchableOpacity
                        style={[
                          styles.miniPill,
                          { borderColor: colors.borderSubtle },
                          config.adhan && config.enabled && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                          !config.enabled && { opacity: 0.5 },
                        ]}
                        onPress={() => onTogglePrayer(p.key, 'adhan')}
                        disabled={!config.enabled}
                        accessibilityLabel={`${p.key} adhan sound toggle`}
                      >
                        <Ionicons
                          name={config.adhan ? 'volume-high' : 'volume-mute'}
                          size={13}
                          color={config.adhan && config.enabled ? colors.accent : colors.textMuted}
                        />
                        <AppText
                          variant="caption"
                          highlight={Boolean(config.adhan && config.enabled)}
                          tone={config.adhan && config.enabled ? undefined : 'faint'}
                          style={styles.miniPillText}
                        >
                          {t('Adhan')}
                        </AppText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.miniPill,
                          { borderColor: colors.borderSubtle },
                          config.vibration && config.enabled && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                          !config.enabled && { opacity: 0.5 },
                        ]}
                        onPress={() => onTogglePrayer(p.key, 'vibration')}
                        disabled={!config.enabled}
                        accessibilityLabel={`${p.key} vibration toggle`}
                      >
                        <Ionicons
                          name="radio"
                          size={13}
                          color={config.vibration && config.enabled ? colors.accent : colors.textMuted}
                        />
                        <AppText
                          variant="caption"
                          highlight={Boolean(config.vibration && config.enabled)}
                          tone={config.vibration && config.enabled ? undefined : 'faint'}
                          style={styles.miniPillText}
                        >
                          {t('Vibrate')}
                        </AppText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.testIconBtn, { borderColor: colors.borderSubtle }]}
                        onPress={() => onTestPrayerAlert(p.key)}
                        accessibilityLabel={`Test notification for ${p.key}`}
                      >
                        <Ionicons name="notifications-outline" size={13} color={colors.textSecondary} />
                        <AppText variant="caption" tone="faint" style={styles.miniPillText}>{t('Test')}</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Right: Master Prayer Switch */}
                  <TouchableOpacity
                    style={[styles.toggle, { borderColor: colors.accent }]}
                    onPress={() => onTogglePrayer(p.key, 'enabled')}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: config.enabled }}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        {
                          backgroundColor: colors.accent,
                          alignSelf: config.enabled ? 'flex-end' : 'flex-start',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </PremiumCard>

        {/* Pre-Prayer Advance Notice Offset */}
        <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>
          {t('Pre-prayer advance notice')} — {reminderOffsetMinutes === 0 ? t('off') : `${reminderOffsetMinutes} ${t('min before')}`}
        </AppText>
        <PremiumCard style={styles.groupCard} padded={false}>
          <AppText variant="caption" tone="faint" style={styles.groupDesc}>
            {t('Send an early heads-up before each prayer so you can prepare wudu. Choose "Off" for alerts only at prayer time.')}
          </AppText>
          <View style={styles.segRow}>
            {REMINDER_OFFSETS.map((item) => {
              const isSelected = reminderOffsetMinutes === item.value;
              return (
                <Chip
                  key={item.label}
                  label={t(item.label)}
                  selected={isSelected}
                  disabled={!remindersEnabled}
                  onPress={() => onSelectOffset(item.value)}
                  accessibilityLabel={item.value === 0 ? t('Off') : `${item.value} ${t('minutes before')}`}
                />
              );
            })}
          </View>
        </PremiumCard>

        {/* Adhan Reciter Choice */}
        <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>
          {t('Adhan reciter')}
        </AppText>
        <PremiumCard style={styles.groupCard} padded={false}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setAdhanModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Selected adhan reciter: ${currentReciter.name}. Tap to change.`}
          >
            <View style={styles.rowFlex}>
              <View style={styles.reciterHeaderRow}>
                <AppText variant="rowTitle" style={styles.rowTitle}>{currentReciter.name}</AppText>
                <View style={[styles.reciterBadge, { backgroundColor: colors.accentDim }]}>
                  <AppText variant="eyebrow" highlight style={styles.reciterBadgeText}>
                    {currentReciter.location}
                  </AppText>
                </View>
              </View>
              <AppText variant="caption" highlight style={styles.reciterArabic}>
                {currentReciter.arabicName}
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.rowDesc}>
                {currentReciter.description}
              </AppText>
            </View>
            <View style={styles.chevronWrap}>
              <AppText variant="link" highlight style={styles.changeText}>{t('Change')}</AppText>
              <Ionicons name={getForwardIcon()} size={16} color={colors.accent} />
            </View>
          </TouchableOpacity>

          <Hairline />

          {/* Reciter Audio Preview & Stop Button */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.reciterActionBtn,
                {
                  backgroundColor: isPlayingAdhan ? undefined : colors.accentDim,
                  borderColor: isPlayingAdhan ? tokens.goldBorder : colors.accent,
                  overflow: 'hidden',
                },
              ]}
              onPress={onTestAdhanSound}
              accessibilityRole="button"
              accessibilityLabel={isPlayingAdhan ? t('Stop adhan playback') : t('Test adhan sound')}
            >
              {isPlayingAdhan && (
                <LinearGradient
                  pointerEvents="none"
                  colors={tokens.goldGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons
                name={isPlayingAdhan ? 'stop' : 'volume-high'}
                size={16}
                color={isPlayingAdhan ? tokens.onGold : colors.accent}
              />
              <AppText
                variant="body"
                tone={isPlayingAdhan ? 'onGold' : undefined}
                highlight={!isPlayingAdhan}
                style={styles.reciterActionBtnText}
              >
                {isPlayingAdhan ? t('Stop Playing') : `${t('Preview')} ${currentReciter.name}`}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stopIconBtn, { borderColor: colors.borderSubtle }]}
              onPress={() => stopAdhanPlayback()}
              accessibilityRole="button"
              accessibilityLabel={t('Stop adhan')}
            >
              <Ionicons name="stop-circle-outline" size={16} color={colors.textPrimary} />
              <AppText variant="body" style={styles.stopIconBtnText}>{t('Stop Adhan')}</AppText>
            </TouchableOpacity>
          </View>
        </PremiumCard>

        {/* Test Notification Buttons */}
        <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>
          {t('Test notifications')}
        </AppText>
        <PremiumCard style={styles.groupCard} padded={false}>
          <AppText variant="caption" tone="faint" style={styles.groupDesc}>
            {t('Send a test alert to try sounds, vibration, and notification buttons (Mark Prayed, Stop Adhan, Snooze 10m).')}
          </AppText>

          <View style={styles.testGrid}>
            <TouchableOpacity
              style={[styles.testCardBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              onPress={() => onTestPrayerAlert('Fajr')}
              accessibilityRole="button"
              accessibilityLabel={t('Test at-prayer notification')}
            >
              <Ionicons name="notifications" size={20} color={colors.accent} />
              <AppText variant="rowTitle" style={styles.testCardTitle}>{t('Test at-prayer alert')}</AppText>
              <AppText variant="caption" tone="faint" style={styles.testCardDesc}>
                {t('Includes Mark Prayed, Stop Adhan & Snooze buttons')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testCardBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              onPress={onTestPrePrayerAlert}
              accessibilityRole="button"
              accessibilityLabel={t('Test pre-prayer countdown alert')}
            >
              <Ionicons name="hourglass-outline" size={20} color={colors.accent} />
              <AppText variant="rowTitle" style={styles.testCardTitle}>{t('Test pre-prayer alert')}</AppText>
              <AppText variant="caption" tone="faint" style={styles.testCardDesc}>
                {t('Includes Open Prayer & Snooze buttons')}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testCardBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              onPress={onTestQuranAlert}
              accessibilityRole="button"
              accessibilityLabel={t('Test Quran reminder alert')}
            >
              <Ionicons name="book-outline" size={20} color={colors.accent} />
              <AppText variant="rowTitle" style={styles.testCardTitle}>{t('Test Quran reminder')}</AppText>
              <AppText variant="caption" tone="faint" style={styles.testCardDesc}>
                {t('Includes Read Now, Snooze & Dismiss buttons')}
              </AppText>
            </TouchableOpacity>
          </View>
        </PremiumCard>

        {/* Daily Quran Reminder & Reading Goal */}
        <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>
          {t('Daily Quran reminder & reading goal')}
        </AppText>
        <PremiumCard style={styles.groupCard} padded={false}>
          {/* Quran Reminder Master Toggle */}
          <View style={styles.row}>
            <View style={styles.rowFlex}>
              <AppText variant="rowTitle" style={styles.rowTitle}>{t('Quran reading reminder')}</AppText>
              <AppText variant="caption" tone="faint" style={styles.rowDesc}>
                {quranReminderEnabled
                  ? `${t('On')} · ${t('daily at')} ${quranReminderTime}`
                  : t('Off — no daily reminder')}
              </AppText>
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
                  {
                    backgroundColor: colors.accent,
                    alignSelf: quranReminderEnabled ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </TouchableOpacity>
          </View>

          <Hairline />

          {/* Configurable Reminder Time */}
          <View style={styles.sectionInner}>
            <AppText variant="rowTitle" style={styles.innerTitle}>{t('Reminder time')}</AppText>
            <AppText variant="caption" tone="faint" style={styles.innerDesc}>
              {t('Scheduled on your device — fires even without internet')}
            </AppText>

            <View style={styles.presetTimeRow}>
              {QURAN_REMINDER_PRESETS.map((tVal) => {
                const isSelected = quranReminderTime === tVal;
                return (
                  <Chip
                    key={tVal}
                    label={tVal}
                    selected={isSelected}
                    onPress={() => {
                      setQuranReminderTime(tVal);
                      if (quranReminderEnabled) {
                        scheduleQuranReminder(tVal, quranGoal);
                      }
                    }}
                    accessibilityLabel={`Set Quran reminder to ${tVal}`}
                  />
                );
              })}
            </View>
          </View>

          <Hairline />

          {/* Reading Goal Type & Target */}
          <View style={styles.sectionInner}>
            <AppText variant="rowTitle" style={styles.innerTitle}>{t('Daily reading goal')}</AppText>
            <AppText variant="caption" tone="faint" style={styles.innerDesc}>
              {t("The reminder pauses automatically once today's goal is met")}
            </AppText>

            <View style={styles.goalTypeRow}>
              {(['minutes', 'pages', 'custom'] as QuranGoalType[]).map((type) => {
                const isSelected = quranGoal?.type === type;
                const label = type === 'minutes' ? t('Minutes') : type === 'pages' ? t('Pages') : t('Ayahs');
                return (
                  <Chip
                    key={type}
                    label={label}
                    selected={isSelected}
                    onPress={() => {
                      const defaultTarget = type === 'minutes' ? 15 : type === 'pages' ? 5 : 10;
                      setQuranGoal({ type, target: quranGoal?.type === type ? quranGoal.target : defaultTarget });
                    }}
                    accessibilityLabel={`Goal type: ${label}`}
                  />
                );
              })}
            </View>

            {/* Stepper for target */}
            <View style={[styles.stepperWrap, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  const step = goalType === 'minutes' ? 5 : 1;
                  const nextTarget = Math.max(step, goalTarget - step);
                  setQuranGoal({ type: goalType, target: nextTarget });
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Decrease target')}
              >
                <Ionicons name="remove" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <AppText variant="numeral" style={styles.stepperVal}>
                {goalTarget} {goalType === 'minutes' ? t('minutes / day') : goalType === 'pages' ? t('pages / day') : t('ayahs / day')}
              </AppText>

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  const step = goalType === 'minutes' ? 5 : 1;
                  const nextTarget = goalTarget + step;
                  setQuranGoal({ type: goalType, target: nextTarget });
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Increase target')}
              >
                <Ionicons name="add" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Today's Goal Progress Card */}
            <View style={[styles.goalProgressCard, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}>
              <View style={styles.goalProgressHeader}>
                <View>
                  <AppText variant="eyebrow" tone="faint" style={styles.goalProgressLabel}>
                    {t("Today's progress")}
                  </AppText>
                  <AppText variant="numeral" style={styles.goalProgressValue}>
                    {goalCurrent} / {goalTarget} {goalType === 'minutes' ? t('mins') : goalType === 'pages' ? t('pages') : t('ayahs')}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.goalStatusBadge,
                    {
                      backgroundColor: isGoalMet ? (colors.sagePill || colors.accentDim) : colors.accentDim,
                      borderColor: isGoalMet ? (colors.forestGreen || colors.accent) : colors.accent,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.goalStatusText,
                      { color: isGoalMet ? (colors.forestGreen || colors.accent) : colors.accent },
                    ]}
                  >
                    {isGoalMet ? t('✓ Goal met') : t('In progress')}
                  </AppText>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBarTrack, { backgroundColor: colors.borderSubtle }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: isGoalMet ? (colors.forestGreen || colors.accent) : colors.accent,
                    },
                  ]}
                />
              </View>

              <View style={styles.goalActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.markGoalBtn,
                    {
                      borderColor: isGoalMet ? (colors.forestGreen || colors.accent) : colors.accent,
                      backgroundColor: isGoalMet ? (colors.sagePill || colors.accentDim) : colors.accentDim,
                    },
                  ]}
                  onPress={onToggleQuranGoalToday}
                  accessibilityRole="button"
                  accessibilityLabel={t('Toggle goal completed today')}
                >
                  <Ionicons
                    name={isGoalMet ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={16}
                    color={isGoalMet ? (colors.forestGreen || colors.accent) : colors.accent}
                  />
                  <AppText
                    variant="caption"
                    style={[
                      styles.markGoalText,
                      { color: isGoalMet ? (colors.forestGreen || colors.accent) : colors.accent },
                    ]}
                  >
                    {isGoalMet ? t('Done for today') : t('Mark done for today')}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onOpenQuranReaderNow}
                  accessibilityRole="button"
                  accessibilityLabel={t('Read Quran now at saved position')}
                  style={{ borderRadius: 18, overflow: 'hidden' }}
                >
                  <LinearGradient
                    colors={tokens.goldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.readNowBtn}
                  >
                    <Ionicons name="book" size={14} color={tokens.onGold} />
                    <AppText variant="body" tone="onGold" style={styles.readNowText}>{t('Read Now')}</AppText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </PremiumCard>

        {/* Android Reliability Info Card */}
        <PremiumCard style={styles.groupCard} padded>
          <AppText variant="sectionTitle" style={styles.infoTitle}>
            {t('How your reminders work')}
          </AppText>
          <AppText variant="body" tone="faint" style={styles.infoText}>
            • <AppText variant="body" style={{ fontWeight: '600' }}>{t('On time, even offline:')}</AppText> {t('Your alarms use the same prayer schedule saved on your device, so they fire without an internet connection.')}{'\n\n'}
            • <AppText variant="body" style={{ fontWeight: '600' }}>{t('Your preferences, honored:')}</AppText> {t('Dedicated alarm channels keep adhan, sound, vibration, and silent alerts exactly as you set them.')}{'\n\n'}
            • <AppText variant="body" style={{ fontWeight: '600' }}>{t('Handy notification buttons:')}</AppText> {t("Tap 'Mark Prayed' to log your salah, 'Stop Adhan' to silence recitation, or 'Snooze' for 10 more minutes.")}{'\n\n'}
            • <AppText variant="body" style={{ fontWeight: '600' }}>{t('Recovers on its own:')}</AppText> {t('Alarms come back after a device restart and adjust automatically for timezone changes and new days.')}{'\n\n'}
            • <AppText variant="body" style={{ fontWeight: '600' }}>{t('Goal-aware:')}</AppText> {t('Once you finish your daily reading goal (minutes, pages, or ayahs), the Quran reminder stays quiet for the rest of the day.')}
          </AppText>
        </PremiumCard>
        </View>

        <AdhanReciterModal
          visible={adhanModalOpen}
          onClose={() => setAdhanModalOpen(false)}
          selectedReciterId={adhanReciterId}
          onSelectReciter={(id) => setAdhanReciterId(id)}
        />
      </DetailScreen.ScrollView>
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {},
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginStart: 4,
    paddingVertical: 2,
  },
  firstGroupLabel: {
    marginTop: 0,
  },
  groupDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  group: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupCard: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowFlex: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  rowDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    flex: 1,
  },
  errorAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  bannerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    flex: 1,
  },
  healthLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    justifyContent: 'center',
  },
  healthLoadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    gap: 8,
  },
  healthItem: {
    flex: 1,
    alignItems: 'center',
  },
  healthLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  rescheduleRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  rescheduleBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  snoozeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  playingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  playingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  playingTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  playingReciter: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  stopAdhanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 32,
  },
  stopAdhanText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  prayerInfo: {
    flex: 1,
    minWidth: 0,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  prayerName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  prayerArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 15,
  },
  timeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginStart: 4,
    minHeight: 20,
  },
  timeBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  prayerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  testIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
  },
  seg: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  segLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  reciterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reciterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minHeight: 18,
  },
  reciterBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    paddingVertical: 2,
  },
  reciterArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 14,
    marginTop: 2,
    paddingVertical: 2,
  },
  chevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  reciterActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  reciterActionBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  stopIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  stopIconBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  testGrid: {
    padding: 12,
    gap: 8,
  },
  testCardBtn: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  testCardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginTop: 2,
  },
  testCardDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  sectionInner: {
    padding: 14,
  },
  innerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  innerDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  presetTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  timePillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  goalTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  goalTypePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  goalTypePillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  goalProgressCard: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  goalProgressLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 2,
  },
  goalProgressValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    marginTop: 2,
    paddingVertical: 2,
  },
  goalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 24,
  },
  goalStatusText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    paddingVertical: 2,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  markGoalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 36,
  },
  markGoalText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  readNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    minHeight: 36,
  },
  readNowText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  infoCard: {
    marginTop: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
});
