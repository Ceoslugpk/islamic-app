import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ArabicText } from '../components/ArabicText';
import { fetchPrayerTimes, DayTimings } from '../lib/prayerTimes';
import { formatTime } from '../lib/timeFormat';
import {
  FastingEntry,
  MissedFastItem,
  saveFastingEntry,
  getFastingEntry,
  loadFastingHistory,
  saveMissedFast,
  deleteMissedFast,
  loadMissedFasts,
  toggleMissedFastMadeUp,
} from '../lib/db';
import {
  getHijriDate,
  HIJRI_MONTH_NAMES,
  toDateString,
  getVoluntaryRecommendations,
  computeFastingStreak,
  getFastingCountdown,
  FastingType,
} from '../lib/fasting';

type FastingSubTab = 'tracker' | 'voluntary' | 'qada' | 'history';

const MISSED_REASONS = [
  'Illness / Medical',
  'Travel',
  'Menstruation / Post-natal',
  'Pregnancy / Nursing',
  'Severe Fatigue',
  'Other',
];

export default function FastingScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  const [activeTab, setActiveTab] = useState<FastingSubTab>('tracker');

  // Timings & Hijri state
  const [timings, setTimings] = useState<DayTimings | null>(null);
  const [todayEntry, setTodayEntry] = useState<FastingEntry>({
    date: toDateString(),
    fasting: false,
    type: 'voluntary',
  });
  const [history, setHistory] = useState<FastingEntry[]>([]);
  const [missedList, setMissedList] = useState<MissedFastItem[]>([]);

  // Qada Form State
  const [showAddMissed, setShowAddMissed] = useState(false);
  const [missedDateInput, setMissedDateInput] = useState(toDateString());
  const [missedReasonInput, setMissedReasonInput] = useState(MISSED_REASONS[0]);

  const todayStr = useMemo(() => toDateString(), []);
  const todayHijri = useMemo(() => getHijriDate(new Date()), []);

  // Load initial data
  const loadData = useCallback(() => {
    const entry = getFastingEntry(todayStr);
    if (entry) {
      setTodayEntry(entry);
    } else {
      // Default to Ramadan if month 9, else voluntary
      const defaultType: FastingType = todayHijri.month === 9 ? 'ramadan' : 'voluntary';
      setTodayEntry({
        date: todayStr,
        fasting: false,
        type: defaultType,
      });
    }

    const hist = loadFastingHistory();
    setHistory(hist);

    const missed = loadMissedFasts();
    setMissedList(missed);
  }, [todayStr, todayHijri.month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load prayer times for suhoor / iftar
  useEffect(() => {
    let mounted = true;
    const loc = settings.locationMode === 'auto' && settings.autoLocation
      ? settings.autoLocation
      : settings.manualLocation;

    fetchPrayerTimes(loc, settings.methodId, new Date())
      .then((data) => {
        if (mounted) setTimings(data);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [settings]);

  // Toggle today's fasting state
  const handleToggleFasting = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* ignore */ }

    const nextFasting = !todayEntry.fasting;
    const updated: FastingEntry = {
      ...todayEntry,
      fasting: nextFasting,
      completedAt: nextFasting ? Date.now() : undefined,
    };
    setTodayEntry(updated);
    saveFastingEntry(updated);
    setHistory(loadFastingHistory());
  }, [todayEntry]);

  // Change today's fasting type
  const handleChangeType = useCallback((type: FastingType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }

    const updated: FastingEntry = {
      ...todayEntry,
      type,
    };
    setTodayEntry(updated);
    saveFastingEntry(updated);
    setHistory(loadFastingHistory());
  }, [todayEntry]);

  // Handle logging a missed fast
  const handleAddMissedFast = useCallback(() => {
    if (!missedDateInput.trim()) {
      Alert.alert('Invalid Date', 'Please provide a valid date string (YYYY-MM-DD).');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* ignore */ }

    const newItem: MissedFastItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: missedDateInput.trim(),
      reason: missedReasonInput,
      madeUp: false,
      createdAt: Date.now(),
    };
    saveMissedFast(newItem);
    setMissedList(loadMissedFasts());
    setShowAddMissed(false);
  }, [missedDateInput, missedReasonInput]);

  // Toggle missed fast completion
  const handleToggleMadeUp = useCallback((id: string, currentMadeUp: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }

    toggleMissedFastMadeUp(id, !currentMadeUp);
    setMissedList(loadMissedFasts());
  }, []);

  // Delete missed fast record
  const handleDeleteMissed = useCallback((id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch { /* ignore */ }

    deleteMissedFast(id);
    setMissedList(loadMissedFasts());
  }, []);

  // Stats
  const streak = useMemo(() => computeFastingStreak(history), [history]);
  const voluntaryRecommendations = useMemo(() => getVoluntaryRecommendations(new Date()), []);
  const totalFastedDays = useMemo(() => history.filter((h) => h.fasting).length, [history]);
  const ramadanFastsCount = useMemo(
    () => history.filter((h) => h.fasting && h.type === 'ramadan').length,
    [history]
  );
  const qadaPendingCount = useMemo(() => missedList.filter((m) => !m.madeUp).length, [missedList]);
  const qadaMadeUpCount = useMemo(() => missedList.filter((m) => m.madeUp).length, [missedList]);

  // Countdown & times
  const suhoorTimeRaw = timings?.timings?.Fajr || '';
  const iftarTimeRaw = timings?.timings?.Maghrib || '';
  const suhoorFormatted = formatTime(suhoorTimeRaw, settings.timeFormat);
  const iftarFormatted = formatTime(iftarTimeRaw, settings.timeFormat);
  const countdown = useMemo(
    () => getFastingCountdown(suhoorTimeRaw, iftarTimeRaw),
    [suhoorTimeRaw, iftarTimeRaw]
  );

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.scroll, { paddingHorizontal: paddingH }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, { maxWidth: maxW }]}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
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
          eyebrow="Worship & Tracker"
          title="Fasting"
        />

        {/* Tab Navigation */}
        <View style={[styles.tabBar, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          {(['tracker', 'voluntary', 'qada', 'history'] as FastingSubTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            const labels: Record<FastingSubTab, string> = {
              tracker: 'Today',
              voluntary: 'Sunnah',
              qada: 'Qada',
              history: 'History',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: isSelected ? colors.accent : colors.textMuted },
                  ]}
                >
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── TAB 1: TODAY TRACKER ───────────────────────────────── */}
        {activeTab === 'tracker' && (
          <View style={styles.tabContent}>
            {/* Suhoor & Iftar Times Hero */}
            <Card style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
                    {todayHijri.day} {HIJRI_MONTH_NAMES[todayHijri.month - 1]} {todayHijri.year} AH
                  </Text>
                  <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                    Suhoor & Iftar Timings
                  </Text>
                </View>
                <View style={[styles.phasePill, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                  <Ionicons
                    name={countdown.phase === 'fasting' ? 'sunny' : 'moon'}
                    size={13}
                    color={colors.accent}
                  />
                  <Text style={[styles.phasePillText, { color: colors.accent }]}>
                    {countdown.label}
                  </Text>
                </View>
              </View>

              <View style={styles.timesRow}>
                <View style={[styles.timeBox, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
                  <View style={styles.timeLabelWrap}>
                    <Ionicons name="moon-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.timeBoxLabel, { color: colors.textMuted }]}>Suhoor Ends</Text>
                  </View>
                  <Text style={[styles.timeBoxValue, { color: colors.textPrimary }]}>
                    {suhoorFormatted}
                  </Text>
                  <Text style={[styles.timeBoxSub, { color: colors.textMuted }]}>Fajr Dawn</Text>
                </View>

                <View style={[styles.timeBox, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
                  <View style={styles.timeLabelWrap}>
                    <Ionicons name="sunny-outline" size={15} color={colors.accent} />
                    <Text style={[styles.timeBoxLabel, { color: colors.textMuted }]}>Iftar Time</Text>
                  </View>
                  <Text style={[styles.timeBoxValue, { color: colors.accent }]}>
                    {iftarFormatted}
                  </Text>
                  <Text style={[styles.timeBoxSub, { color: colors.textMuted }]}>Maghrib Dusk</Text>
                </View>
              </View>
            </Card>

            {/* Daily Fasting Toggle */}
            <Card style={styles.toggleCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                    Are you fasting today?
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.textMuted }]}>
                    {todayEntry.fasting ? 'Marked as fasting today' : 'Tap switch to record today’s fast'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: todayEntry.fasting ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  onPress={handleToggleFasting}
                  activeOpacity={0.8}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: todayEntry.fasting }}
                  accessibilityLabel="Toggle fasting today"
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      todayEntry.fasting ? styles.toggleKnobActive : styles.toggleKnobInactive,
                      { backgroundColor: '#FFFFFF' },
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {todayEntry.fasting && (
                <View style={styles.fastTypeContainer}>
                  <Hairline style={styles.cardHairline} />
                  <Text style={[styles.typeSelectLabel, { color: colors.textSecondary }]}>
                    Fasting Intention / Category:
                  </Text>
                  <View style={styles.typeButtonsRow}>
                    {(['ramadan', 'voluntary', 'qada'] as FastingType[]).map((type) => {
                      const isChosen = todayEntry.type === type;
                      const typeLabels: Record<FastingType, string> = {
                        ramadan: 'Ramadan',
                        voluntary: 'Sunnah',
                        qada: 'Qada (Makeup)',
                      };
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeBtn,
                            {
                              backgroundColor: isChosen ? colors.accent : colors.bgBase,
                              borderColor: isChosen ? colors.accent : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => handleChangeType(type)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isChosen }}
                        >
                          <Text
                            style={[
                              styles.typeBtnText,
                              { color: isChosen ? '#FFFFFF' : colors.textPrimary },
                            ]}
                          >
                            {typeLabels[type]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </Card>

            {/* Ramadan Progress Card */}
            <Card style={styles.ramadanCard}>
              <View style={styles.ramadanHeader}>
                <View>
                  <Text style={[styles.ramadanEyebrow, { color: colors.accent }]}>
                    Ramadan {todayHijri.year} AH
                  </Text>
                  <Text style={[styles.ramadanTitle, { color: colors.textPrimary }]}>
                    {todayHijri.month === 9
                      ? `Ramadan Active — Day ${todayHijri.day} of 30`
                      : 'Ramadan Overview'}
                  </Text>
                </View>
                <View style={[styles.streakBadge, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                  <Ionicons name="flame" size={14} color={colors.accent} />
                  <Text style={[styles.streakBadgeText, { color: colors.accent }]}>
                    {streak} Day Streak
                  </Text>
                </View>
              </View>

              <View style={styles.ramadanStatsRow}>
                <View style={styles.ramadanStat}>
                  <Text style={[styles.ramadanStatValue, { color: colors.textPrimary }]}>
                    {ramadanFastsCount}
                  </Text>
                  <Text style={[styles.ramadanStatLabel, { color: colors.textMuted }]}>
                    Ramadan Fasts
                  </Text>
                </View>
                <View style={styles.ramadanStat}>
                  <Text style={[styles.ramadanStatValue, { color: colors.textPrimary }]}>
                    {totalFastedDays}
                  </Text>
                  <Text style={[styles.ramadanStatLabel, { color: colors.textMuted }]}>
                    Total Recorded
                  </Text>
                </View>
                <View style={styles.ramadanStat}>
                  <Text style={[styles.ramadanStatValue, { color: colors.accent }]}>
                    {qadaPendingCount}
                  </Text>
                  <Text style={[styles.ramadanStatLabel, { color: colors.textMuted }]}>
                    Qada Pending
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ─── TAB 2: VOLUNTARY (SUNNAH) FASTS ────────────────────── */}
        {activeTab === 'voluntary' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              Recommended Voluntary Fasts
            </Text>

            {voluntaryRecommendations.map((rec) => (
              <Card key={rec.id} style={styles.recCard}>
                <View style={styles.recCardHeader}>
                  <View style={styles.recTitleWrap}>
                    <Text style={[styles.recName, { color: colors.textPrimary }]}>
                      {rec.name}
                    </Text>
                    <ArabicText style={[styles.recArabic, { color: colors.accent }]}>
                      {rec.arabicName}
                    </ArabicText>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: rec.isActiveToday ? colors.accent : colors.bgBase,
                        borderColor: rec.isActiveToday ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: rec.isActiveToday ? '#FFFFFF' : colors.textMuted },
                      ]}
                    >
                      {rec.upcomingDateLabel}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.recDesc, { color: colors.textSecondary }]}>
                  {rec.description}
                </Text>

                <View style={[styles.virtueBox, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
                  <Ionicons name="sparkles" size={13} color={colors.accent} style={{ marginTop: 2 }} />
                  <Text style={[styles.virtueText, { color: colors.textMuted }]}>
                    {rec.virtue}
                  </Text>
                </View>

                {rec.isActiveToday && !todayEntry.fasting && (
                  <TouchableOpacity
                    style={[styles.fastTodayActionBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                    onPress={() => {
                      setTodayEntry({
                        date: todayStr,
                        fasting: true,
                        type: 'voluntary',
                        notes: rec.name,
                      });
                      saveFastingEntry({
                        date: todayStr,
                        fasting: true,
                        type: 'voluntary',
                        notes: rec.name,
                      });
                      setHistory(loadFastingHistory());
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
                    <Text style={[styles.fastTodayActionText, { color: colors.accent }]}>
                      Fast {rec.name} Today
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* ─── TAB 3: QADA (MISSED FASTS) ─────────────────────────── */}
        {activeTab === 'qada' && (
          <View style={styles.tabContent}>
            {/* Scorecard */}
            <View style={styles.qadaScorecard}>
              <View style={[styles.qadaStatBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.qadaStatNumber, { color: colors.accent }]}>
                  {qadaPendingCount}
                </Text>
                <Text style={[styles.qadaStatText, { color: colors.textMuted }]}>
                  Fasts to Make Up
                </Text>
              </View>
              <View style={[styles.qadaStatBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.qadaStatNumber, { color: colors.textPrimary }]}>
                  {qadaMadeUpCount}
                </Text>
                <Text style={[styles.qadaStatText, { color: colors.textMuted }]}>
                  Made Up (Completed)
                </Text>
              </View>
            </View>

            {/* Add Missed Fast Button */}
            {!showAddMissed ? (
              <TouchableOpacity
                style={[styles.addMissedBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                onPress={() => setShowAddMissed(true)}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={17} color={colors.accent} />
                <Text style={[styles.addMissedBtnText, { color: colors.accent }]}>
                  + Log Missed Fast
                </Text>
              </TouchableOpacity>
            ) : (
              <Card style={styles.addMissedForm}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                  Log a Missed Fast
                </Text>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date (YYYY-MM-DD):</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={missedDateInput}
                  onChangeText={setMissedDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reason:</Text>
                <View style={styles.reasonPillsRow}>
                  {MISSED_REASONS.map((r) => {
                    const isSelected = missedReasonInput === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.reasonPill,
                          {
                            backgroundColor: isSelected ? colors.accentDim : colors.bgBase,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => setMissedReasonInput(r)}
                      >
                        <Text
                          style={[
                            styles.reasonPillText,
                            { color: isSelected ? colors.accent : colors.textPrimary },
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.formBtn, { borderColor: colors.borderSubtle }]}
                    onPress={() => setShowAddMissed(false)}
                  >
                    <Text style={{ color: colors.textMuted }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.formBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                    onPress={handleAddMissedFast}
                  >
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Manrope_600SemiBold' }}>
                      Save Record
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* List of Missed Fasts */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 14 }]}>
              Missed Fasts Ledger
            </Text>

            {missedList.length === 0 ? (
              <EmptyState
                icon="checkmark-done-circle-outline"
                title="All caught up!"
                subtitle="No missed fasts recorded in your ledger."
              />
            ) : (
              missedList.map((item) => (
                <Card key={item.id} style={styles.missedItemCard}>
                  <View style={styles.missedItemLeft}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: item.madeUp ? colors.accent : 'transparent',
                          borderColor: item.madeUp ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => handleToggleMadeUp(item.id, item.madeUp)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.madeUp }}
                    >
                      {item.madeUp && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                    <View style={styles.missedItemText}>
                      <Text
                        style={[
                          styles.missedDate,
                          {
                            color: colors.textPrimary,
                            textDecorationLine: item.madeUp ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {item.date}
                      </Text>
                      <Text style={[styles.missedReason, { color: colors.textMuted }]}>
                        {item.reason} {item.madeUp && item.madeUpDate ? `• Made up on ${item.madeUpDate}` : ''}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteMissed(item.id)}
                    accessibilityLabel="Delete missed fast"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 4: HISTORY & STREAK ────────────────────────────── */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            {/* Streak & Aggregate Scorecard */}
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statBig, { color: colors.accent }]}>{streak}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Current Streak</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statBig, { color: colors.textPrimary }]}>{totalFastedDays}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Fasted</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statBig, { color: colors.textPrimary }]}>{ramadanFastsCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ramadan Days</Text>
                </View>
              </View>
            </Card>

            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              Fasting Log
            </Text>

            {history.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No fasting records yet"
                subtitle="Mark your fasts on the Today tab to start building your streak."
                actionLabel="Go to Today"
                onAction={() => setActiveTab('tracker')}
              />
            ) : (
              history.map((entry) => {
                const typeBadgeColors: Record<FastingType, { bg: string; text: string }> = {
                  ramadan: { bg: colors.accentDim, text: colors.accent },
                  voluntary: { bg: colors.bgBase, text: colors.textPrimary },
                  qada: { bg: colors.bgBase, text: colors.textSecondary },
                };
                const badge = typeBadgeColors[entry.type] || typeBadgeColors.voluntary;

                return (
                  <Card key={entry.date} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Ionicons
                        name={entry.fasting ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={entry.fasting ? colors.accent : colors.textMuted}
                      />
                      <View>
                        <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                          {entry.date} {entry.date === todayStr ? '(Today)' : ''}
                        </Text>
                        {entry.notes ? (
                          <Text style={[styles.historyNote, { color: colors.textMuted }]}>
                            {entry.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: colors.borderSubtle }]}>
                      <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                        {entry.fasting
                          ? entry.type === 'ramadan'
                            ? 'Ramadan'
                            : entry.type === 'qada'
                            ? 'Qada'
                            : 'Sunnah'
                          : 'Not Fasting'}
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 16,
  },
  backButton: {
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

  /* Tab Navigation */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  tabContent: {
    gap: 14,
  },

  /* Hero Card */
  heroCard: {
    padding: 18,
    gap: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginTop: 2,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  phasePillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBoxLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBoxValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    marginTop: 4,
  },
  timeBoxSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },

  /* Toggle Card */
  toggleCard: {
    padding: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
  },
  toggleSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  toggleKnobInactive: {
    alignSelf: 'flex-start',
  },
  fastTypeContainer: {
    marginTop: 14,
  },
  cardHairline: {
    marginBottom: 12,
  },
  typeSelectLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 8,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },

  /* Ramadan Card */
  ramadanCard: {
    padding: 18,
    gap: 14,
  },
  ramadanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ramadanEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  ramadanTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  ramadanStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ramadanStat: {
    alignItems: 'center',
  },
  ramadanStatValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
  },
  ramadanStatLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },

  /* Voluntary Fasts */
  sectionHeading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  recCard: {
    padding: 16,
    gap: 10,
  },
  recCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  recName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  recArabic: {
    fontSize: 15,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  recDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  virtueBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  virtueText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  fastTodayActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  fastTodayActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },

  /* Qada */
  qadaScorecard: {
    flexDirection: 'row',
    gap: 10,
  },
  qadaStatBox: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  qadaStatNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
  },
  qadaStatText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  addMissedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  addMissedBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
  },
  addMissedForm: {
    padding: 16,
    gap: 10,
  },
  formTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  reasonPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonPillText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  formBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  missedItemCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedItemText: {
    flex: 1,
  },
  missedDate: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  missedReason: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },

  /* History */
  statsCard: {
    padding: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statBig: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
  },
  statLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 3,
  },
  historyRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyDate: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
  },
  historyNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },

  bottomSpacer: {
    height: 30,
  },
});
