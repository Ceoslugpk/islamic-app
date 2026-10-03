import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Modal, Alert } from 'react-native';
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

export default function SettingsScreen({ onClose }: { onClose?: () => void }) {
  const { colors, mode, accentKey, setAccent } = useTheme();
  const { settings, setMethod, setTimeFormat, setReminders, setThemeMode, setWomenWorship, setWomenPinHash, setWomenLockEnabled } = useSettings();
  const { edition, flag } = useQuranLanguage();
  const [quranLangModalOpen, setQuranLangModalOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'set' | 'change' | null>(null);
  const methodId = settings.methodId;
  const timeFormat = settings.timeFormat;
  const remindersEnabled = settings.remindersEnabled;
  const themeMode = settings.themeMode;
  const womenWorshipEnabled = settings.womenWorshipEnabled;
  const womenPinHash = settings.womenPinHash;
  const womenLockEnabled = settings.womenLockEnabled;

  function onToggleWomenWorship() {
    if (womenWorshipEnabled) {
      // Turning OFF: hide features (keeps data)
      setWomenWorship(false);
    } else {
      // Turning ON: show consent first
      setConsentOpen(true);
    }
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

      {/* Consent modal — shown on first enable */}
      <Modal visible={consentOpen} transparent animationType="fade" onRequestClose={() => setConsentOpen(false)}>
        <View style={styles.consentBackdrop}>
          <View style={[styles.consentCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.consentIconWrap, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
              <Ionicons name="shield-checkmark" size={26} color={colors.accent} />
            </View>
            <Text style={[styles.consentTitle, { color: colors.textPrimary }]}>Private & On-Device</Text>
            <Text style={[styles.consentBody, { color: colors.textSecondary }]}>
              Cycle & purity information is sensitive. Your data:{'\n'}• Stays on this device by default{'\n'}• Needs no account or sign-in{'\n'}• Is never uploaded or included in analytics or logs{'\n'}• Can be deleted anytime
            </Text>
            <View style={styles.consentBtns}>
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
        </View>
      </Modal>

      {/* PIN modal for set/change */}
      <WomenPinModal
        visible={pinModalMode !== null}
        mode={pinModalMode === 'change' ? 'change' : 'set'}
        currentHash={womenPinHash}
        onSuccess={() => setPinModalMode(null)}
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
});