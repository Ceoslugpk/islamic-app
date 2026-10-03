import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { CALC_METHODS, fetchPrayerTimes } from '../lib/prayerTimes';
import {
  configureNotifications,
  requestNotificationPermission,
  schedulePrayerNotifications,
  cancelPrayerNotifications,
} from '../lib/notifications';
import { playAdhan, configureAudio } from '../lib/audio';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { accentThemes, ACCENT_KEYS } from '../lib/accents';

const ABOUT_ROWS: { title: string; subtitle: string }[] = [
  { title: 'Islamic · v1.0.0', subtitle: 'Version 1.0.0' },
  { title: 'Prayer times', subtitle: 'AlAdhan + islamic.app' },
  { title: 'Quran text', subtitle: 'AlQuran Cloud' },
  { title: 'Quran audio', subtitle: 'islamic.network CDN' },
  { title: 'Hadith', subtitle: 'islamic.app Hadith API' },
  { title: '99 Names', subtitle: 'EsmaulHusna.org' },
  { title: 'Qibla', subtitle: 'Great-circle calculation' },
];

export default function SettingsScreen({ onClose }: { onClose?: () => void }) {
  const { colors, mode, accentKey, setAccent } = useTheme();
  const { settings, setMethod, setTimeFormat, setReminders, setThemeMode } = useSettings();
  const { edition, flag } = useQuranLanguage();
  const [quranLangModalOpen, setQuranLangModalOpen] = useState(false);
  const methodId = settings.methodId;
  const timeFormat = settings.timeFormat;
  const remindersEnabled = settings.remindersEnabled;
  const themeMode = settings.themeMode;

  async function onToggleReminders() {
    const next = !remindersEnabled;
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await configureNotifications();
      try {
        const data = await fetchPrayerTimes(settings.manualLocation, settings.methodId);
        await cancelPrayerNotifications();
        await schedulePrayerNotifications(data);
      } catch {
        // scheduling failed; still enable the toggle, user can retry
      }
    } else {
      await cancelPrayerNotifications();
    }
    setReminders(next);
  }

  async function onTestAdhan() {
    await configureAudio();
    await playAdhan();
  }

  function handleThemeModeChange(nextMode: 'system' | 'ink' | 'paper') {
    setThemeMode(nextMode);
  }

  const themeModeLabels = {
    system: 'System',
    ink: 'Dark',
    paper: 'Light',
  } as const;

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.content}>
      {onClose && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <Text style={[styles.closeText, { color: colors.accent }]}>← Done</Text>
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
                onPress={() => setAccent(key)}
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

      {/* Quran Translation */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Holy Quran</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setQuranLangModalOpen(true)}
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

      {/* Calculation method */}
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>Prayer Times</Text>
      <View style={[styles.group, { borderColor: colors.borderSubtle }]}>
        {CALC_METHODS.map((m, i) => (
          <View key={m.id}>
            {i > 0 && <Hairline />}
            <TouchableOpacity style={styles.row} onPress={() => setMethod(m.id)}>
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
              onPress={() => setTimeFormat(f)}
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
        <View style={styles.row}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Prayer reminders</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Notification 10 minutes before each prayer
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
        <Hairline />
        <TouchableOpacity style={styles.row} onPress={onTestAdhan}>
          <View style={styles.rowFlex}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Test adhan sound</Text>
            <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
              Preview the prayer call
            </Text>
          </View>
          <Text style={[styles.testBtn, { color: colors.accent }]}>Play</Text>
        </TouchableOpacity>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  closeBtn: {
    alignSelf: 'flex-start',
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
});