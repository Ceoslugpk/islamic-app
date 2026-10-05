import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings, PrayerNameKey, QuranGoalType } from '../lib/settings';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
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
import { getReadingPosition } from '../lib/continuing';
import { buildDeepLink } from '../lib/deeplinks';

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

export default function PrayerRemindersScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
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
      setTestStatusMessage('✓ Notifications re-scheduled successfully.');
      setTimeout(() => setTestStatusMessage(null), 3000);
    } catch {
      setTestStatusMessage('Could not reschedule notifications.');
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
        setPermissionError(
          'Notification permission was not granted. Please enable notifications in device settings.'
        );
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
        setPermissionError(
          'Notification permission was not granted. Please enable notifications in device settings.'
        );
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
    await snoozePrayer('Prayer', 10);
    setTestStatusMessage('Snoozed for 10 minutes. An alert will sound at that time.');
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onTestPrayerAlert(prayer: PrayerNameKey) {
    const id = await sendTestPrayerNotification(prayer, 'prayer-times-adhan');
    if (id) {
      setTestStatusMessage(`✓ Test notification sent for ${prayer}. Check notification shade.`);
    } else {
      setTestStatusMessage('Please allow notification permission to receive test alerts.');
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onTestPrePrayerAlert() {
    const id = await sendTestPrePrayerNotification('Maghrib', reminderOffsetMinutes || 15);
    if (id) {
      setTestStatusMessage('✓ Test pre-prayer alert sent. Check notification shade.');
    } else {
      setTestStatusMessage('Please allow notification permission to receive test alerts.');
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onTestQuranAlert() {
    const id = await sendTestQuranNotification();
    if (id) {
      setTestStatusMessage('✓ Test Quran reading alert sent. Tap "Read Now" to test reader deep link.');
    } else {
      setTestStatusMessage('Please allow notification permission to receive test alerts.');
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onToggleQuranGoalToday() {
    if (!quranProgress) return;
    const nextCompleted = !quranProgress.completed;
    const updated = await setQuranDailyGoalCompleted(nextCompleted);
    setQuranProgress(updated);
    if (nextCompleted) {
      setTestStatusMessage('✓ Daily Quran goal marked completed! Reminder is suppressed for today.');
    } else {
      setTestStatusMessage('Daily Quran goal marked incomplete.');
    }
    setTimeout(() => setTestStatusMessage(null), 3500);
  }

  async function onOpenQuranReaderNow() {
    try {
      const pos = await getReadingPosition();
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
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      <View style={styles.contentWrap}>
        {onBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Tools"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>
              ← Tools
            </Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          compact
          eyebrow="Tools"
          title="Prayer Reminders"
          subtitle="Manage daily prayer alarms, adhan voices & Quran reading habit"
        />

        {testStatusMessage && (
          <View style={[styles.bannerBox, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
            <Ionicons name="information-circle" size={18} color={colors.accent} />
            <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{testStatusMessage}</Text>
          </View>
        )}

        {/* Master Reminder Card */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>PRAYER REMINDERS</Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <View style={styles.row}>
            <View style={styles.rowFlex}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Prayer reminders</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                Reliable alarms before and at each prayer time via system AlarmManager
              </Text>
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
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{permissionError}</Text>
            </View>
          )}

          <Hairline />

          {/* Health & status row */}
          {isLoadingHealth ? (
            <View style={styles.healthLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.healthLoadingText, { color: colors.textMuted }]}>
                Checking alarm schedule…
              </Text>
            </View>
          ) : (
            <View style={styles.healthRow}>
              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>Alarm Status</Text>
                <View style={styles.healthStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          health?.status === 'active'
                            ? '#10B981'
                            : health?.status === 'permission-needed'
                            ? '#F59E0B'
                            : colors.textMuted,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.healthValue,
                      {
                        color:
                          health?.status === 'active'
                            ? '#10B981'
                            : health?.status === 'permission-needed'
                            ? '#F59E0B'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {health?.status === 'active'
                      ? 'Active'
                      : health?.status === 'permission-needed'
                      ? 'Permission needed'
                      : 'Paused'}
                  </Text>
                </View>
              </View>

              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>Next Prayer</Text>
                <Text style={[styles.healthValue, { color: colors.textPrimary }]}>
                  {health?.nextPrayer ? `${health.nextPrayer.name} · ${health.nextPrayer.time}` : '—'}
                </Text>
              </View>

              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>Daily Alarms</Text>
                <Text style={[styles.healthValue, { color: colors.textPrimary }]}>
                  {health ? `${health.scheduledCounts.today} today` : '—'}
                </Text>
              </View>
            </View>
          )}

          <Hairline />

          <View style={styles.rescheduleRow}>
            <TouchableOpacity
              style={[styles.rescheduleBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim }]}
              onPress={onReschedulePress}
              disabled={isRescheduling}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Re-schedule alarms now"
            >
              {isRescheduling ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="refresh" size={16} color={colors.accent} />
              )}
              <Text style={[styles.rescheduleBtnText, { color: colors.accent }]}>
                {isRescheduling ? 'Scheduling alarms…' : 'Re-schedule now'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.snoozeBtn, { borderColor: colors.borderSubtle }]}
              onPress={onSnoozePress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Snooze 10 minutes"
            >
              <Ionicons name="time-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.snoozeBtnText, { color: colors.textPrimary }]}>Snooze 10m</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating/Active Adhan Playback Banner */}
        {isPlayingAdhan && (
          <View style={[styles.playingBanner, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
            <View style={styles.playingLeft}>
              <Ionicons name="musical-notes" size={20} color={colors.accent} />
              <View>
                <Text style={[styles.playingTitle, { color: colors.textPrimary }]}>Adhan Playing</Text>
                <Text style={[styles.playingReciter, { color: colors.accent }]}>{currentReciter.name}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.stopAdhanBtn, { backgroundColor: colors.accent }]}
              onPress={() => stopAdhanPlayback()}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Stop adhan playback"
            >
              <Ionicons name="stop" size={16} color={colors.bgBase} />
              <Text style={[styles.stopAdhanText, { color: colors.bgBase }]}>Stop Adhan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Per-Prayer Controls (Fajr, Dhuhr, Asr, Maghrib, Isha) */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
          PER-PRAYER NOTIFICATION & AUDIO CONTROLS
        </Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
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
                      <Text
                        style={[
                          styles.prayerName,
                          {
                            color: config.enabled && remindersEnabled ? colors.textPrimary : colors.textMuted,
                          },
                        ]}
                      >
                        {p.key}
                      </Text>
                      <Text style={[styles.prayerArabic, { color: colors.accent }]}>{p.arabic}</Text>
                      {time && (
                        <View style={[styles.timeBadge, { backgroundColor: colors.bgBase }]}>
                          <Text style={[styles.timeBadgeText, { color: colors.textSecondary }]}>{time}</Text>
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
                        <Text
                          style={[
                            styles.miniPillText,
                            { color: config.adhan && config.enabled ? colors.accent : colors.textMuted },
                          ]}
                        >
                          Adhan
                        </Text>
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
                        <Text
                          style={[
                            styles.miniPillText,
                            { color: config.vibration && config.enabled ? colors.accent : colors.textMuted },
                          ]}
                        >
                          Vibrate
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.testIconBtn, { borderColor: colors.borderSubtle }]}
                        onPress={() => onTestPrayerAlert(p.key)}
                        accessibilityLabel={`Test notification for ${p.key}`}
                      >
                        <Ionicons name="notifications-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.miniPillText, { color: colors.textSecondary }]}>Test</Text>
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
        </View>

        {/* Pre-Prayer Advance Notice Offset */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
          PRE-PRAYER ADVANCE NOTICE — {reminderOffsetMinutes === 0 ? 'OFF' : `${reminderOffsetMinutes} MIN BEFORE`}
        </Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.groupDesc, { color: colors.textSecondary }]}>
            Send an early alert before prayer time begins so you can prepare wudu. Select &quot;Off&quot; to receive
            only the at-prayer alert.
          </Text>
          <View style={styles.segRow}>
            {REMINDER_OFFSETS.map((item) => {
              const isSelected = reminderOffsetMinutes === item.value;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.seg,
                    { borderColor: colors.borderSubtle },
                    isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                  ]}
                  onPress={() => onSelectOffset(item.value)}
                  disabled={!remindersEnabled}
                  accessibilityRole="button"
                  accessibilityLabel={item.value === 0 ? 'Off' : `${item.value} minutes before`}
                >
                  <Text
                    style={[
                      styles.segLabel,
                      {
                        color: isSelected
                          ? colors.accent
                          : !remindersEnabled
                          ? colors.textMuted
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Adhan Reciter Choice */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
          ADHAN RECITER (CALL TO PRAYER VOICE)
        </Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setAdhanModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Selected adhan reciter: ${currentReciter.name}. Tap to change.`}
          >
            <View style={styles.rowFlex}>
              <View style={styles.reciterHeaderRow}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{currentReciter.name}</Text>
                <View style={[styles.reciterBadge, { backgroundColor: colors.accentDim }]}>
                  <Text style={[styles.reciterBadgeText, { color: colors.accent }]}>
                    {currentReciter.location}
                  </Text>
                </View>
              </View>
              <Text style={[styles.reciterArabic, { color: colors.accent }]}>
                {currentReciter.arabicName}
              </Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                {currentReciter.description}
              </Text>
            </View>
            <View style={styles.chevronWrap}>
              <Text style={[styles.changeText, { color: colors.accent }]}>Change</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </View>
          </TouchableOpacity>

          <Hairline />

          {/* Reciter Audio Preview & Stop Button */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.reciterActionBtn,
                {
                  backgroundColor: isPlayingAdhan ? colors.accent : colors.accentDim,
                  borderColor: colors.accent,
                },
              ]}
              onPress={onTestAdhanSound}
              accessibilityRole="button"
              accessibilityLabel={isPlayingAdhan ? 'Stop adhan sound' : 'Test adhan sound'}
            >
              <Ionicons
                name={isPlayingAdhan ? 'stop' : 'volume-high'}
                size={16}
                color={isPlayingAdhan ? colors.bgBase : colors.accent}
              />
              <Text
                style={[
                  styles.reciterActionBtnText,
                  { color: isPlayingAdhan ? colors.bgBase : colors.accent },
                ]}
              >
                {isPlayingAdhan ? 'Stop Playing' : `Preview ${currentReciter.name}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stopIconBtn, { borderColor: colors.borderSubtle }]}
              onPress={() => stopAdhanPlayback()}
              accessibilityRole="button"
              accessibilityLabel="Stop adhan"
            >
              <Ionicons name="stop-circle-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.stopIconBtnText, { color: colors.textPrimary }]}>Stop Adhan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Notification Buttons */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
          TEST NOTIFICATIONS & AUDIO CHANNELS
        </Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.groupDesc, { color: colors.textSecondary }]}>
            Send immediate test notifications to verify system channels, sound playback, vibration, and
            notification buttons (Mark Prayed, Stop Adhan, Snooze 10m).
          </Text>

          <View style={styles.testGrid}>
            <TouchableOpacity
              style={[styles.testCardBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              onPress={() => onTestPrayerAlert('Fajr')}
              accessibilityRole="button"
              accessibilityLabel="Test at-prayer notification"
            >
              <Ionicons name="notifications" size={20} color={colors.accent} />
              <Text style={[styles.testCardTitle, { color: colors.textPrimary }]}>Test At-Prayer Alert</Text>
              <Text style={[styles.testCardDesc, { color: colors.textMuted }]}>
                Includes Mark Prayed, Stop Adhan &amp; Snooze buttons
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testCardBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              onPress={onTestPrePrayerAlert}
              accessibilityRole="button"
              accessibilityLabel="Test pre-prayer countdown alert"
            >
              <Ionicons name="hourglass-outline" size={20} color={colors.accent} />
              <Text style={[styles.testCardTitle, { color: colors.textPrimary }]}>Test Pre-Prayer Alert</Text>
              <Text style={[styles.testCardDesc, { color: colors.textMuted }]}>
                Includes Open Prayer &amp; Snooze buttons
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testCardBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              onPress={onTestQuranAlert}
              accessibilityRole="button"
              accessibilityLabel="Test Quran reminder alert"
            >
              <Ionicons name="book-outline" size={20} color={colors.accent} />
              <Text style={[styles.testCardTitle, { color: colors.textPrimary }]}>Test Quran Reminder</Text>
              <Text style={[styles.testCardDesc, { color: colors.textMuted }]}>
                Includes Read Now, Snooze &amp; Dismiss buttons
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Quran Reminder & Reading Goal */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
          DAILY QURAN REMINDER &amp; READING GOAL
        </Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          {/* Quran Reminder Master Toggle */}
          <View style={styles.row}>
            <View style={styles.rowFlex}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Quran reading reminder</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                {quranReminderEnabled
                  ? `On · daily at ${quranReminderTime}`
                  : 'Off — no daily reminder'}
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
            <Text style={[styles.innerTitle, { color: colors.textPrimary }]}>Reminder Time</Text>
            <Text style={[styles.innerDesc, { color: colors.textMuted }]}>
              Scheduled daily offline; fires reliably even without internet
            </Text>

            <View style={styles.presetTimeRow}>
              {QURAN_REMINDER_PRESETS.map((t) => {
                const isSelected = quranReminderTime === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.timePill,
                      { borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                    ]}
                    onPress={() => {
                      setQuranReminderTime(t);
                      if (quranReminderEnabled) {
                        scheduleQuranReminder(t, quranGoal);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set Quran reminder to ${t}`}
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        { color: isSelected ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Hairline />

          {/* Reading Goal Type & Target */}
          <View style={styles.sectionInner}>
            <Text style={[styles.innerTitle, { color: colors.textPrimary }]}>Daily Reading Goal</Text>
            <Text style={[styles.innerDesc, { color: colors.textMuted }]}>
              The reminder is automatically suppressed once today&apos;s goal is completed
            </Text>

            <View style={styles.goalTypeRow}>
              {(['minutes', 'pages', 'custom'] as QuranGoalType[]).map((type) => {
                const isSelected = quranGoal?.type === type;
                const label = type === 'minutes' ? 'Minutes' : type === 'pages' ? 'Pages' : 'Ayahs';
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.goalTypePill,
                      { borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                    ]}
                    onPress={() => {
                      const defaultTarget = type === 'minutes' ? 15 : type === 'pages' ? 5 : 10;
                      setQuranGoal({ type, target: quranGoal?.type === type ? quranGoal.target : defaultTarget });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Goal type: ${label}`}
                  >
                    <Text
                      style={[
                        styles.goalTypePillText,
                        { color: isSelected ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
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
                accessibilityLabel="Decrease target"
              >
                <Ionicons name="remove" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={[styles.stepperVal, { color: colors.textPrimary }]}>
                {goalTarget} {goalType === 'minutes' ? 'minutes / day' : goalType === 'pages' ? 'pages / day' : 'ayahs / day'}
              </Text>

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => {
                  const step = goalType === 'minutes' ? 5 : 1;
                  const nextTarget = goalTarget + step;
                  setQuranGoal({ type: goalType, target: nextTarget });
                }}
                accessibilityRole="button"
                accessibilityLabel="Increase target"
              >
                <Ionicons name="add" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Today's Goal Progress Card */}
            <View style={[styles.goalProgressCard, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}>
              <View style={styles.goalProgressHeader}>
                <View>
                  <Text style={[styles.goalProgressLabel, { color: colors.textMuted }]}>
                    Today&apos;s Reading Progress
                  </Text>
                  <Text style={[styles.goalProgressValue, { color: colors.textPrimary }]}>
                    {goalCurrent} / {goalTarget} {goalType === 'minutes' ? 'mins' : goalType === 'pages' ? 'pages' : 'ayahs'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.goalStatusBadge,
                    {
                      backgroundColor: isGoalMet ? '#10B98120' : colors.accentDim,
                      borderColor: isGoalMet ? '#10B981' : colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.goalStatusText,
                      { color: isGoalMet ? '#10B981' : colors.accent },
                    ]}
                  >
                    {isGoalMet ? '✓ Goal Met (Suppressed)' : 'In Progress'}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBarTrack, { backgroundColor: colors.borderSubtle }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: isGoalMet ? '#10B981' : colors.accent,
                    },
                  ]}
                />
              </View>

              <View style={styles.goalActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.markGoalBtn,
                    {
                      borderColor: isGoalMet ? '#10B981' : colors.accent,
                      backgroundColor: isGoalMet ? '#10B98120' : colors.accentDim,
                    },
                  ]}
                  onPress={onToggleQuranGoalToday}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle goal completed today"
                >
                  <Ionicons
                    name={isGoalMet ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={16}
                    color={isGoalMet ? '#10B981' : colors.accent}
                  />
                  <Text style={[styles.markGoalText, { color: isGoalMet ? '#10B981' : colors.accent }]}>
                    {isGoalMet ? 'Goal Completed Today' : 'Mark Completed for Today'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.readNowBtn, { backgroundColor: colors.accent }]}
                  onPress={onOpenQuranReaderNow}
                  accessibilityRole="button"
                  accessibilityLabel="Read Quran now at saved position"
                >
                  <Ionicons name="book" size={14} color={colors.bgBase} />
                  <Text style={[styles.readNowText, { color: colors.bgBase }]}>Read Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Android Reliability Info Card */}
        <Card style={styles.infoCard} padded>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            How Reminders &amp; Offline Alarms Work
          </Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            • <Text style={{ color: colors.textPrimary }}>Offline &amp; Authoritative:</Text> Reminders use the exact same
            Islamic.app schedule cached locally in SQLite. Alarms schedule without network.{'\n\n'}
            • <Text style={{ color: colors.textPrimary }}>Android System Channels:</Text> Uses dedicated system channels
            (&apos;prayer-times-adhan&apos;, &apos;prayer-times-sound-only&apos;, &apos;prayer-times-vibrate-only&apos;,
            &apos;prayer-times-silent&apos;) ensuring your exact preferences are honored.{'\n\n'}
            • <Text style={{ color: colors.textPrimary }}>Interactive Notification Buttons:</Text> When prayer alerts fire,
            tap &apos;Mark Prayed&apos; to record Salah in the tracker, &apos;Stop Adhan&apos; to silence recitation, or &apos;Snooze&apos; for a 10-minute follow up.{'\n\n'}
            • <Text style={{ color: colors.textPrimary }}>Reboot &amp; Background Recovery:</Text> Alarms are declared with
            RECEIVE_BOOT_COMPLETED to recover after device restart, and automatically refresh on timezone changes and date rollovers.{'\n\n'}
            • <Text style={{ color: colors.textPrimary }}>Goal-Aware Quran Habit:</Text> Once you finish your daily reading
            goal (minutes, pages, or ayahs), the Quran reminder is automatically silenced for the remainder of the day.
          </Text>
        </Card>

        <AdhanReciterModal
          visible={adhanModalOpen}
          onClose={() => setAdhanModalOpen(false)}
          selectedReciterId={adhanReciterId}
          onSelectReciter={(id) => setAdhanReciterId(id)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 10, paddingBottom: 40 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  group: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowFlex: { flex: 1 },
  rowTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  rowDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
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
  },
  playingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
  },
  timeBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  prayerPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  reciterBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  reciterArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 14,
    marginTop: 2,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 10,
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
    lineHeight: 16,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  goalProgressCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalProgressLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalProgressValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    marginTop: 2,
  },
  goalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  goalStatusText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
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
  },
  markGoalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  markGoalText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  readNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  readNowText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
