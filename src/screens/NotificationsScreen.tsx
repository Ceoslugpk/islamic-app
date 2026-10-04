import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
import { fetchPrayerTimes } from '../lib/prayerTimes';
import {
  configureNotifications,
  requestNotificationPermission,
  schedulePrayerNotifications,
  cancelPrayerNotifications,
  getNotificationHealth,
  NotificationHealth,
} from '../lib/notifications';
import {
  playAdhan,
  stopAdhan,
  getAdhanReciter,
  addAdhanPlaybackListener,
} from '../lib/audio';
import { AdhanReciterModal } from '../components/AdhanReciterModal';

const REMINDER_MINUTES = [5, 10, 15, 20, 30];

export default function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const {
    settings,
    setReminders,
    setReminderOffsetMinutes,
    setAdhanReciterId,
  } = useSettings();

  const remindersEnabled = settings.remindersEnabled;
  const reminderOffsetMinutes = settings.reminderOffsetMinutes;
  const adhanReciterId = settings.adhanReciterId;

  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [adhanModalOpen, setAdhanModalOpen] = useState(false);

  useEffect(() => {
    const unsub = addAdhanPlaybackListener((id) => {
      setIsPlayingAdhan(id !== null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        const h = await getNotificationHealth(
          data,
          settings.manualLocation,
          settings.methodId,
          remindersEnabled,
          reminderOffsetMinutes
        );
        setHealth(h);
      } catch {
        // ignore
      } finally {
        setIsLoadingHealth(false);
      }
    }
    loadHealth();
  }, [settings.manualLocation, settings.methodId, remindersEnabled, reminderOffsetMinutes]);

  async function refreshHealth() {
    setIsLoadingHealth(true);
    try {
      const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
      const h = await getNotificationHealth(
        data,
        settings.manualLocation,
        settings.methodId,
        remindersEnabled,
        reminderOffsetMinutes
      );
      setHealth(h);
    } catch {
      // ignore
    } finally {
      setIsLoadingHealth(false);
    }
  }

  async function onReschedulePress() {
    setIsRescheduling(true);
    try {
      await configureNotifications();
      const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
      await cancelPrayerNotifications();
      if (remindersEnabled) {
        await schedulePrayerNotifications(data, reminderOffsetMinutes, settings.manualLocation.label);
      }
      await refreshHealth();
    } catch {
      // ignore
    } finally {
      setIsRescheduling(false);
    }
  }

  async function rescheduleWithMinutes(mins: number) {
    setReminderOffsetMinutes(mins);
    if (remindersEnabled) {
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(data, mins, settings.manualLocation.label);
        await refreshHealth();
      } catch {
        // ignore
      }
    }
  }

  async function onToggleReminders() {
    setPermissionError(null);
    const next = !remindersEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionError(
          'Notification permission was not granted. Please enable notifications in your device settings to receive prayer alerts.'
        );
        return;
      }
      await configureNotifications();
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(data, reminderOffsetMinutes, settings.manualLocation.label);
      } catch {
        // scheduling failed; still toggle
      }
    } else {
      await cancelPrayerNotifications();
    }
    setReminders(next);
  }

  async function onTestAdhan() {
    if (isPlayingAdhan) {
      await stopAdhan();
    } else {
      await playAdhan(adhanReciterId);
    }
  }

  const currentReciter = getAdhanReciter(adhanReciterId);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}>
      <View style={styles.contentWrap}>
        {onBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Tools"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Tools</Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          compact
          eyebrow="Alerts"
          title="Notifications"
          subtitle="Manage daily prayer reminders and sound alerts"
        />

      {/* Main Reminder Toggle */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>PRAYER REMINDERS</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Prayer reminders</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Send a notification before and at each prayer time
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
      </View>

      {/* Notification Health Panel */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>NOTIFICATION STATUS & HEALTH</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        {isLoadingHealth ? (
          <View style={styles.healthLoading}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.healthLoadingText, { color: colors.textMuted }]}>Checking notification status…</Text>
          </View>
        ) : health ? (
          <>
            <View style={styles.healthRow}>
              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>Status</Text>
                <View style={styles.healthStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
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
                      styles.healthValue,
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
                      ? 'Active'
                      : health.status === 'permission-needed'
                      ? 'Permission needed'
                      : 'Paused'}
                  </Text>
                </View>
              </View>
              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>Next Prayer</Text>
                <Text style={[styles.healthValue, { color: colors.textPrimary }]}>
                  {health.nextPrayer ? `${health.nextPrayer.name} · ${health.nextPrayer.time}` : '—'}
                </Text>
              </View>
              <View style={styles.healthItem}>
                <Text style={[styles.healthLabel, { color: colors.textMuted }]}>Daily Scheduled</Text>
                <Text style={[styles.healthValue, { color: colors.textPrimary }]}>
                  {health.scheduledCounts.today} today · {health.scheduledCounts.tomorrow} tomorrow
                </Text>
              </View>
            </View>

            {health.status === 'permission-needed' && (
              <>
                <Hairline />
                <TouchableOpacity
                  style={[styles.grantPermissionBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                  onPress={async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      await configureNotifications();
                      await onReschedulePress();
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Grant notification permission"
                >
                  <Ionicons name="notifications" size={16} color={colors.accent} />
                  <Text style={[styles.grantPermissionText, { color: colors.accent }]}>
                    Grant Notification Permission
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Hairline />
            <TouchableOpacity
              style={[
                styles.rescheduleBtn,
                { borderColor: colors.accent, backgroundColor: colors.accentDim },
              ]}
              onPress={onReschedulePress}
              disabled={isRescheduling}
              accessibilityRole="button"
              accessibilityLabel="Re-schedule notifications now"
            >
              {isRescheduling ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="refresh" size={16} color={colors.accent} />
              )}
              <Text style={[styles.rescheduleBtnText, { color: colors.accent }]}>
                {isRescheduling ? 'Scheduling…' : 'Re-schedule now'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.healthValue, { color: colors.textMuted }]}>Unable to load health status</Text>
        )}
      </View>

      {/* Advance Notice Timing */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>REMINDER TIME BEFORE PRAYER</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        <View style={styles.segRow}>
          {REMINDER_MINUTES.map((m) => {
            const isSelected = reminderOffsetMinutes === m;
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.seg,
                  { borderColor: colors.borderSubtle },
                  isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
                onPress={() => rescheduleWithMinutes(m)}
                disabled={!remindersEnabled}
                accessibilityRole="button"
                accessibilityLabel={`${m} minutes before`}
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
                  {m} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Adhan Reciter Choice */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>ADHAN RECITER (WHO CALLS THE PRAYER)</Text>
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
      </View>

      {/* Audio & Adhan Preview */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>TEST ADHAN SOUND</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={onTestAdhan}
          accessibilityRole="button"
          accessibilityLabel={isPlayingAdhan ? 'Stop adhan sound' : 'Test adhan sound'}
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Test adhan sound</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              {isPlayingAdhan ? `Playing ${currentReciter.name}… tap to stop` : `Preview ${currentReciter.name}`}
            </Text>
          </View>
          <View
            style={[
              styles.playBtnWrap,
              {
                backgroundColor: isPlayingAdhan ? colors.accent : colors.accentDim,
                borderColor: colors.accent,
              },
            ]}
          >
            <Ionicons
              name={isPlayingAdhan ? 'stop' : 'volume-high'}
              size={16}
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
      </View>

      {/* Info Card */}
      <Card style={styles.infoCard} padded>
        <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
          How Prayer Notifications & Adhan Work
        </Text>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          • <Text style={{ color: colors.textPrimary }}>Daily Repeat:</Text> Notifications are scheduled locally as repeating daily alarms for all 5 prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) plus countdown alerts {reminderOffsetMinutes} min before.{'\n\n'}
          • <Text style={{ color: colors.textPrimary }}>Android Notification Channel:</Text> Uses the high-priority &apos;prayer-times-adhan&apos; channel with bundled sound and vibration so reminders reliably break through.{'\n\n'}
          • <Text style={{ color: colors.textPrimary }}>Adhan Reciters:</Text> In-app adhan playback plays your chosen reciter (e.g. Mishary Alafasy, Abdul Basit, Makkah, Madinah, Al-Aqsa) when prayer time arrives.
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
  },
  group: {
    borderWidth: 1,
    borderRadius: 12,
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
  rowTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  rowDesc: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2, lineHeight: 16 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: { width: 22, height: 22, borderRadius: 11 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    flexWrap: 'wrap',
  },
  seg: {
    flex: 1,
    minWidth: 54,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  reciterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  reciterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reciterBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  reciterArabic: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 12.5,
    marginTop: 2,
  },
  chevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  playBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  testBtn: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  infoCard: {
    marginTop: 24,
  },
  infoTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  healthLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  healthLoadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  healthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  healthItem: {
    flex: 1,
    minWidth: 100,
  },
  healthLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  healthValue: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  healthStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grantPermissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  grantPermissionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rescheduleBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
