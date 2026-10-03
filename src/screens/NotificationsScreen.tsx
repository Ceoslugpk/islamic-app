import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
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
} from '../lib/notifications';
import { playAdhan, configureAudio } from '../lib/audio';

const REMINDER_MINUTES = [5, 10, 15, 20];

export default function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { settings, setReminders } = useSettings();
  const remindersEnabled = settings.remindersEnabled;

  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  async function rescheduleWithMinutes(mins: number) {
    setSelectedMinutes(mins);
    if (remindersEnabled) {
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(data, mins);
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
        setPermissionError('Notification permission was not granted. Please enable in device settings.');
        return;
      }
      await configureNotifications();
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(data, selectedMinutes);
      } catch {
        // scheduling failed; still toggle
      }
    } else {
      await cancelPrayerNotifications();
    }
    setReminders(next);
  }

  async function onTestAdhan() {
    setIsPlayingAdhan(true);
    try {
      await configureAudio();
      await playAdhan();
    } finally {
      setTimeout(() => setIsPlayingAdhan(false), 2000);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.content}>
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
        >
          <Text style={[styles.backText, { color: colors.accent }]}>← Tools</Text>
        </TouchableOpacity>
      )}

      <SectionHeader
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
              Send a notification before each prayer time
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
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{permissionError}</Text>
          </View>
        )}
      </View>

      {/* Advance Notice Timing */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>REMINDER TIME BEFORE PRAYER</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        <View style={styles.segRow}>
          {REMINDER_MINUTES.map((m) => {
            const isSelected = selectedMinutes === m;
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.seg,
                  { borderColor: colors.borderSubtle },
                  isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
                onPress={() => rescheduleWithMinutes(m)}
                accessibilityRole="button"
                accessibilityLabel={`${m} minutes before`}
              >
                <Text
                  style={[
                    styles.segLabel,
                    { color: isSelected ? colors.accent : colors.textSecondary },
                  ]}
                >
                  {m} min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Audio & Adhan Preview */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>ADHAN AUDIO</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={onTestAdhan}
          accessibilityRole="button"
          accessibilityLabel="Test adhan sound"
        >
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Test adhan sound</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Play the prayer chime audio sample
            </Text>
          </View>
          <View style={styles.playAction}>
            {isPlayingAdhan ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <View style={styles.playRow}>
                <Ionicons name="volume-high" size={16} color={colors.accent} />
                <Text style={[styles.testBtn, { color: colors.accent }]}>Play</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <Card style={styles.infoCard} padded>
        <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
          How Prayer Notifications Work
        </Text>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Notifications are scheduled locally for Fajr, Dhuhr, Asr, Maghrib, and Isha using your calculated prayer times. On Android devices, reminders play the bundled adhan chime via the high-priority notification channel.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
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
  errorBox: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  playAction: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    marginBottom: 6,
  },
  infoText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
