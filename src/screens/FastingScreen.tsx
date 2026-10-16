import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { useSettings } from '../lib/settings';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { EmptyState } from '../components/EmptyState';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
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

export function isWomenSpecificReason(reason: string | undefined): boolean {
  if (!reason || typeof reason !== 'string') return false;
  const r = reason.toLowerCase();
  return (
    r.includes('menstru') ||
    r.includes('period') ||
    r.includes('post-natal') ||
    r.includes('postnatal') ||
    r.includes('nifas') ||
    r.includes('haidh')
  );
}

interface FastingScreenProps {
  onBack?: () => void;
  womenUnlocked?: boolean;
  backLabel?: string;
}

function FastingScreen({
  onBack,
  womenUnlocked = false,
  backLabel = 'Tools',
}: FastingScreenProps) {
  const { tokens, mode } = useThemeTokens();
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
  const { saveUndoState } = useUndoToast();

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
  const [justLogged, setJustLogged] = useState(false);
  const logTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (logTimerRef.current) clearTimeout(logTimerRef.current);
    };
  }, []);

  const handleAddMissedFast = useCallback(() => {
    if (!missedDateInput.trim()) {
      Alert.alert(t('Invalid Date'), t('Please provide a valid date string (YYYY-MM-DD).'));
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
    setJustLogged(true);
    if (logTimerRef.current) clearTimeout(logTimerRef.current);
    logTimerRef.current = setTimeout(() => setJustLogged(false), 1800);
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
  const [justDeletedMissed, setJustDeletedMissed] = useState<string | null>(null);
  const missedDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (missedDeleteTimerRef.current) clearTimeout(missedDeleteTimerRef.current);
    };
  }, []);

  const handleDeleteMissed = useCallback((id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch { /* ignore */ }

    const target = missedList.find((m) => m.id === id);
    deleteMissedFast(id);
    setMissedList(loadMissedFasts());
    setJustDeletedMissed(id);
    if (missedDeleteTimerRef.current) clearTimeout(missedDeleteTimerRef.current);
    missedDeleteTimerRef.current = setTimeout(() => {
      setJustDeletedMissed(null);
    }, 1200);
    if (target) {
      saveUndoState({
        id,
        action: t('Record deleted'),
        revert: () => {
          saveMissedFast(target);
          setMissedList(loadMissedFasts());
        },
      });
    }
  }, [missedList, saveUndoState]);

  // Stats
  const streak = useMemo(() => computeFastingStreak(history), [history]);
  const voluntaryRecommendations = useMemo(() => getVoluntaryRecommendations(new Date()), []);
  const totalFastedDays = useMemo(() => history.filter((h) => h.fasting).length, [history]);
  const ramadanFastsCount = useMemo(
    () => history.filter((h) => h.fasting && h.type === 'ramadan').length,
    [history]
  );

  const availableMissedReasons = useMemo(() => {
    if (settings.womenWorshipEnabled && womenUnlocked) return MISSED_REASONS;
    return MISSED_REASONS.filter((r) => !isWomenSpecificReason(r));
  }, [settings.womenWorshipEnabled, womenUnlocked]);

  const visibleMissedList = useMemo(() => {
    if (settings.womenWorshipEnabled) return missedList;
    return missedList.filter((m) => !isWomenSpecificReason(m.reason));
  }, [missedList, settings.womenWorshipEnabled]);

  const qadaPendingCount = useMemo(() => visibleMissedList.filter((m) => !m.madeUp).length, [visibleMissedList]);
  const qadaMadeUpCount = useMemo(() => visibleMissedList.filter((m) => m.madeUp).length, [visibleMissedList]);

  const daysFastedThisMonth = useMemo(() => {
    const currentMonthPrefix = todayStr.slice(0, 7);
    const pastThisMonth = history.filter((h) => h.fasting && h.date.startsWith(currentMonthPrefix)).length;
    const todayInHistory = history.some((h) => h.date === todayStr && h.fasting);
    return pastThisMonth + (todayEntry.fasting && !todayInHistory ? 1 : 0);
  }, [history, todayStr, todayEntry.fasting]);

  const handleQuickRemoveMissed = useCallback(() => {
    const pending = visibleMissedList.filter((m) => !m.madeUp);
    if (pending.length === 0) return;
    const target = pending[0];
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* ignore */ }
    toggleMissedFastMadeUp(target.id, true);
    setMissedList(loadMissedFasts());
  }, [visibleMissedList]);

  const handleQuickAddMissed = useCallback(() => {
    setShowAddMissed(true);
    setActiveTab('qada');
  }, []);

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
    <View style={styles.screenContainer}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={[styles.screen, styles.detailScreen]}
        header={
          <SubHeader
            eyebrow={t('Worship & Tracker')}
            title={t('Fasting')}
            subtitle={t('Suhoor & iftar countdowns, sunnah fasts & qada logs')}
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
            styles.scroll,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, { maxWidth: maxW }]}>

          {/* Tab Navigation */}
          <View style={[styles.tabBar, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
            {(['tracker', 'voluntary', 'qada', 'history'] as FastingSubTab[]).map((tab) => {
              const isSelected = activeTab === tab;
              const labels: Record<FastingSubTab, string> = {
                tracker: t('Today'),
                voluntary: t('Sunnah'),
                qada: t('Qada'),
                history: t('History'),
              };
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabBtn,
                    {
                      borderColor: isSelected ? tokens.goldBorder : 'transparent',
                      backgroundColor: 'transparent',
                    },
                  ]}
                  onPress={() => setActiveTab(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={tokens.goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: isSelected ? tokens.onGold : tokens.muted },
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
              {/* Small Stats Row */}
              <View style={styles.statsRow}>
                <View style={[styles.statBox, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
                  <Text style={[styles.statNumber, { color: tokens.goldText }]}>
                    {daysFastedThisMonth}
                  </Text>
                  <Text style={[styles.statText, { color: tokens.muted }]}>
                    {t('This Month')}
                  </Text>
                </View>
                <View style={[styles.statBox, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
                  <Text style={[styles.statNumber, { color: tokens.text }]}>
                    {streak}d
                  </Text>
                  <Text style={[styles.statText, { color: tokens.muted }]}>
                    {t('Streak')}
                  </Text>
                </View>
                <View style={[styles.statBox, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
                  <Text style={[styles.statNumber, { color: qadaPendingCount > 0 ? tokens.goldText : tokens.text }]}>
                    {qadaPendingCount}
                  </Text>
                  <Text style={[styles.statText, { color: tokens.muted }]}>
                    {t('Qada Left')}
                  </Text>
                </View>
              </View>

              {/* Clear TODAY Card */}
              <View style={[styles.todayCard, getCardShadow(mode), { borderColor: tokens.cardBorder, borderWidth: 0.75, borderRadius: 14, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={tokens.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.todayCardHeader}>
                  <View>
                    <Text style={[styles.todayCardEyebrow, { color: tokens.goldText }]}>
                      {todayHijri.day} {HIJRI_MONTH_NAMES[todayHijri.month - 1]} {todayHijri.year} AH
                    </Text>
                    <Text style={[styles.todayCardTitle, { color: tokens.text }]}>
                      {t("Today's Fast")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      getPillShadow(mode),
                      {
                        backgroundColor: todayEntry.fasting ? tokens.ringFill : tokens.inset,
                        borderColor: todayEntry.fasting ? tokens.goldBorder : tokens.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={todayEntry.fasting ? 'checkmark-circle' : 'moon-outline'}
                      size={14}
                      color={todayEntry.fasting ? tokens.accent : tokens.muted}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: todayEntry.fasting ? tokens.goldText : tokens.muted },
                      ]}
                    >
                      {todayEntry.fasting ? t('Fasting Active') : t('Not Fasting')}
                    </Text>
                  </View>
                </View>

                <View style={styles.todayStatusBox}>
                  <Text style={[styles.todayStatusMessage, { color: tokens.muted }]}>
                    {todayEntry.fasting
                      ? t('Alhamdulillah, your fast is recorded for today.')
                      : t('Tap below to record your fast and track your habit.')}
                  </Text>

                  {todayEntry.fasting ? (
                    <View style={styles.fastTypeContainer}>
                      <Text style={[styles.typeSelectLabel, { color: tokens.muted }]}>
                        {t('Intention / Category:')}
                      </Text>
                      <View style={styles.typeButtonsRow}>
                        {(['ramadan', 'voluntary', 'qada'] as FastingType[]).map((type) => {
                          const isChosen = todayEntry.type === type;
                          const typeLabels: Record<FastingType, string> = {
                            ramadan: t('Ramadan'),
                            voluntary: t('Sunnah'),
                            qada: t('Qada (Makeup)'),
                          };
                          return (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.typeBtn,
                                getPillShadow(mode),
                                {
                                  backgroundColor: isChosen ? 'transparent' : tokens.inset,
                                  borderColor: isChosen ? tokens.goldBorder : tokens.cardBorder,
                                  overflow: 'hidden',
                                },
                              ]}
                              onPress={() => handleChangeType(type)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isChosen }}
                            >
                              {isChosen && (
                                <LinearGradient
                                  colors={tokens.goldGradient}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={StyleSheet.absoluteFill}
                                />
                              )}
                              <Text
                                style={[
                                  styles.typeBtnText,
                                  { color: isChosen ? tokens.onGold : tokens.text },
                                ]}
                              >
                                {typeLabels[type]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      getPillShadow(mode),
                      { borderRadius: 10, overflow: 'hidden' },
                    ]}
                    onPress={handleToggleFasting}
                    accessibilityRole="button"
                    accessibilityLabel={todayEntry.fasting ? t('Mark as not fasting') : t('Mark as fasting today')}
                  >
                    {todayEntry.fasting ? (
                      <View
                        style={[
                          styles.primaryCtaBtn,
                          {
                            backgroundColor: 'transparent',
                            borderColor: tokens.danger,
                          },
                        ]}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color={tokens.danger}
                        />
                        <Text
                          style={[
                            styles.primaryCtaBtnText,
                            { color: tokens.danger },
                          ]}
                        >
                          {t('Cancel / Not Fasting Today')}
                        </Text>
                      </View>
                    ) : (
                      <LinearGradient
                        colors={tokens.goldGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.primaryCtaBtn, { borderWidth: 0 }]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={tokens.onGold}
                        />
                        <Text
                          style={[
                            styles.primaryCtaBtnText,
                            { color: tokens.onGold },
                          ]}
                        >
                          {t('I am Fasting Today')}
                        </Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Suhoor & Iftar Times Card */}
              <View style={[styles.heroCard, getCardShadow(mode), { borderColor: tokens.cardBorder, borderWidth: 0.75, borderRadius: 14, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={tokens.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.heroHeader}>
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <Text style={[styles.heroEyebrow, { color: tokens.goldText }]} numberOfLines={1}>
                      {t("Today's Prayer Schedule")}
                    </Text>
                    <Text style={[styles.heroTitle, { color: tokens.text }]} numberOfLines={1}>
                      {t('Suhoor & Iftar Timings')}
                    </Text>
                  </View>
                  <View style={[styles.phasePill, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, flexShrink: 0 }]}>
                    <Ionicons
                      name={countdown.phase === 'fasting' ? 'sunny' : 'moon'}
                      size={13}
                      color={tokens.goldText}
                    />
                    <Text style={[styles.phasePillText, { color: tokens.goldText }]} numberOfLines={1}>
                      {countdown.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.timesRow}>
                  <View style={[styles.timeBox, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
                    <View style={styles.timeLabelWrap}>
                      <Ionicons name="moon-outline" size={15} color={tokens.muted} />
                      <Text style={[styles.timeBoxLabel, { color: tokens.muted }]}>{t('Suhoor Ends')}</Text>
                    </View>
                    <Text style={[styles.timeBoxValue, { color: tokens.text }]}>
                      {suhoorFormatted}
                    </Text>
                    <Text style={[styles.timeBoxSub, { color: tokens.muted }]}>{t('Fajr Dawn')}</Text>
                  </View>

                  <View style={[styles.timeBox, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
                    <View style={styles.timeLabelWrap}>
                      <Ionicons name="sunny-outline" size={15} color={tokens.goldText} />
                      <Text style={[styles.timeBoxLabel, { color: tokens.muted }]}>{t('Iftar Time')}</Text>
                    </View>
                    <Text style={[styles.timeBoxValue, { color: tokens.goldText }]}>
                      {iftarFormatted}
                    </Text>
                    <Text style={[styles.timeBoxSub, { color: tokens.muted }]}>{t('Maghrib Dusk')}</Text>
                  </View>
                </View>
              </View>

              {/* Missed Fasts (Qada) Section */}
              <View style={[styles.qadaOverviewCard, getCardShadow(mode), { borderColor: tokens.cardBorder, borderWidth: 0.75, borderRadius: 14, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={tokens.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={styles.qadaSectionHeader}>
                  <View>
                    <Text style={[styles.qadaSectionEyebrow, { color: tokens.goldText }]}>
                      {t('Obligatory Makeup')}
                    </Text>
                    <Text style={[styles.qadaSectionTitle, { color: tokens.text }]}>
                      {t('Missed Fasts (Qada)')}
                    </Text>
                  </View>
                  <View style={styles.qadaActionBtnsRow}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, getPillShadow(mode), { backgroundColor: 'transparent', borderColor: tokens.goldBorder }]}
                      onPress={handleQuickAddMissed}
                      accessibilityRole="button"
                      accessibilityLabel={t('Add missed fast')}
                    >
                      <Ionicons name="add" size={15} color={tokens.goldText} />
                      <Text style={[styles.stepperBtnText, { color: tokens.goldText }]}>{t('Add')}</Text>
                    </TouchableOpacity>
                    {qadaPendingCount > 0 ? (
                      <TouchableOpacity
                        style={[styles.stepperBtn, getPillShadow(mode), { backgroundColor: 'transparent', borderColor: tokens.cardBorder }]}
                        onPress={handleQuickRemoveMissed}
                        accessibilityRole="button"
                        accessibilityLabel={t('Make up one missed fast')}
                      >
                        <Ionicons name="checkmark" size={14} color={tokens.text} />
                        <Text style={[styles.stepperBtnText, { color: tokens.text }]}>{t('-1 Made Up')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {visibleMissedList.length === 0 ? (
                  <EmptyState
                    icon="checkmark-done-circle-outline"
                    title={t('All caught up!')}
                    subtitle={t('No missed fasts recorded in your ledger.')}
                  />
                ) : (
                  <View style={styles.qadaQuickList}>
                    {visibleMissedList.slice(0, 3).map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.missedQuickRow,
                          { borderColor: tokens.cardBorder },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: 'transparent',
                              borderColor: item.madeUp ? tokens.goldBorder : tokens.cardBorder,
                              overflow: 'hidden',
                            },
                          ]}
                          onPress={() => handleToggleMadeUp(item.id, item.madeUp)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: item.madeUp }}
                        >
                          {item.madeUp && (
                            <LinearGradient
                              colors={tokens.goldGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFill}
                            />
                          )}
                          {item.madeUp && <Ionicons name="checkmark" size={14} color={tokens.onGold} />}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.missedDate,
                              {
                                color: tokens.text,
                                textDecorationLine: item.madeUp ? 'line-through' : 'none',
                              },
                            ]}
                          >
                            {item.date}
                          </Text>
                          <Text style={[styles.missedReason, { color: tokens.muted }]}>
                            {(!womenUnlocked && isWomenSpecificReason(item.reason))
                              ? t('Excused (Private)')
                              : t(item.reason)}{' '}
                            {item.madeUp && item.madeUpDate ? `• ${t('Made up on')} ${item.madeUpDate}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.viewAllLedgerBtn, { borderColor: tokens.cardBorder }]}
                      onPress={() => setActiveTab('qada')}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.viewAllLedgerText, { color: tokens.goldText }]}>
                        {visibleMissedList.length > 3
                          ? `${t('View all')} ${visibleMissedList.length} ${t('records in Qada ledger →')}`
                          : t('Open full Qada ledger →')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ─── TAB 2: VOLUNTARY (SUNNAH) FASTS ────────────────────── */}
          {activeTab === 'voluntary' && (
            <View style={styles.tabContent}>
              <Text style={[styles.sectionHeading, { color: tokens.muted }]}>
                {t('Recommended Voluntary Fasts')}
              </Text>

              {voluntaryRecommendations.map((rec) => (
                <View key={rec.id} style={[styles.recCard, getCardShadow(mode), { borderColor: tokens.cardBorder, borderWidth: 0.75, borderRadius: 14, overflow: 'hidden' }]}>
                  <LinearGradient
                    colors={tokens.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  <View style={styles.recCardHeader}>
                    <View style={styles.recTitleWrap}>
                      <Text style={[styles.recName, { color: tokens.text }]}>
                        {rec.name}
                      </Text>
                      <ArabicText style={[styles.recArabic, { color: tokens.arabicName }]}>
                        {rec.arabicName}
                      </ArabicText>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        getPillShadow(mode),
                        {
                          backgroundColor: rec.isActiveToday ? tokens.ringFill : tokens.inset,
                          borderColor: rec.isActiveToday ? tokens.goldBorder : tokens.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: rec.isActiveToday ? tokens.goldText : tokens.muted },
                        ]}
                      >
                        {rec.upcomingDateLabel}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.recDesc, { color: tokens.muted }]}>
                    {rec.description}
                  </Text>

                  <View style={[styles.virtueBox, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
                    <Ionicons name="sparkles" size={13} color={tokens.goldText} style={{ marginTop: 2 }} />
                    <Text style={[styles.virtueText, { color: tokens.muted }]}>
                      {rec.virtue}
                    </Text>
                  </View>

                  {rec.isActiveToday && !todayEntry.fasting && (
                    <TouchableOpacity
                      style={[styles.fastTodayActionBtn, getPillShadow(mode), { backgroundColor: 'transparent', borderColor: tokens.goldBorder }]}
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
                      <Ionicons name="checkmark-circle-outline" size={16} color={tokens.goldText} />
                      <Text style={[styles.fastTodayActionText, { color: tokens.goldText }]}>
                        {t('Fast')} {rec.name} {t('Today')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ─── TAB 3: QADA (MISSED FASTS) ─────────────────────────── */}
          {activeTab === 'qada' && (
            <View style={styles.tabContent}>
              {/* Scorecard */}
              <View style={styles.qadaScorecard}>
                <PremiumCard style={styles.qadaStatBox} padded>
                  <Text style={[styles.qadaStatNumber, { color: tokens.goldText }]}>
                    {qadaPendingCount}
                  </Text>
                  <Text style={[styles.qadaStatText, { color: tokens.muted }]}>
                    {t('Fasts to Make Up')}
                  </Text>
                </PremiumCard>
                <PremiumCard style={styles.qadaStatBox} padded>
                  <Text style={[styles.qadaStatNumber, { color: tokens.text }]}>
                    {qadaMadeUpCount}
                  </Text>
                  <Text style={[styles.qadaStatText, { color: tokens.muted }]}>
                    {t('Made Up (Completed)')}
                  </Text>
                </PremiumCard>
              </View>

              {/* Add Missed Fast Button */}
              {!showAddMissed ? (
                <TouchableOpacity
                  style={[styles.addMissedBtn, getPillShadow(mode), { backgroundColor: 'transparent', borderColor: tokens.goldBorder }]}
                  onPress={() => setShowAddMissed(true)}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={justLogged ? 'checkmark-circle' : 'add-circle-outline'}
                    size={17}
                    color={tokens.goldText}
                  />
                  <Text style={[styles.addMissedBtnText, { color: tokens.goldText }]}>
                    {justLogged ? t('Logged ✓') : t('+ Log Missed Fast')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.addMissedForm, getCardShadow(mode), { borderColor: tokens.cardBorder, borderWidth: 0.75, borderRadius: 14, overflow: 'hidden' }]}>
                  <LinearGradient
                    colors={tokens.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  <Text style={[styles.formTitle, { color: tokens.text }]}>
                    {t('Log a Missed Fast')}
                  </Text>

                  <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('Date (YYYY-MM-DD):')}</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder, color: tokens.text }]}
                    value={missedDateInput}
                    onChangeText={setMissedDateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={tokens.muted}
                  />

                  <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('Reason:')}</Text>
                  <View style={styles.reasonPillsRow}>
                    {availableMissedReasons.map((r) => {
                      const isSelected = missedReasonInput === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.reasonPill,
                            getPillShadow(mode),
                            {
                              backgroundColor: isSelected ? 'transparent' : tokens.inset,
                              borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                              overflow: 'hidden',
                            },
                          ]}
                          onPress={() => setMissedReasonInput(r)}
                        >
                          {isSelected && (
                            <LinearGradient
                              colors={tokens.goldGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFill}
                            />
                          )}
                          <Text
                            style={[
                              styles.reasonPillText,
                              { color: isSelected ? tokens.onGold : tokens.text },
                            ]}
                          >
                            {t(r)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={[styles.formBtn, { borderColor: tokens.cardBorder }]}
                      onPress={() => setShowAddMissed(false)}
                    >
                      <Text style={{ color: tokens.muted }}>{t('Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.formBtn, getPillShadow(mode), { overflow: 'hidden', paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0 }]}
                      onPress={handleAddMissedFast}
                    >
                      <LinearGradient
                        colors={tokens.goldGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text
                          style={{
                            color: tokens.onGold,
                            fontFamily: 'Manrope_600SemiBold',
                          }}
                        >
                          {justLogged ? t('Saved ✓') : t('Save Record')}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* List of Missed Fasts */}
              <Text style={[styles.sectionHeading, { color: tokens.muted, marginTop: 14 }]}>
                {t('Missed Fasts Ledger')}
              </Text>

              {visibleMissedList.length === 0 ? (
                <PremiumCard style={styles.emptyCard} padded>
                  <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder }]}>
                      <Ionicons name="checkmark-done-circle-outline" size={28} color={tokens.accent} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: tokens.text }]}>
                      {t('All caught up!')}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: tokens.muted }]}>
                      {t('No missed fasts recorded in your ledger.')}
                    </Text>
                  </View>
                </PremiumCard>
              ) : (
                visibleMissedList.map((item) => (
                  <PremiumCard key={item.id} style={styles.missedItemCard} padded>
                    <View style={styles.missedItemLeft}>
                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: 'transparent',
                            borderColor: item.madeUp ? tokens.goldBorder : tokens.cardBorder,
                            overflow: 'hidden',
                          },
                        ]}
                        onPress={() => handleToggleMadeUp(item.id, item.madeUp)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.madeUp }}
                      >
                        {item.madeUp && (
                          <LinearGradient
                            colors={tokens.goldGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        {item.madeUp && <Ionicons name="checkmark" size={14} color={tokens.onGold} />}
                      </TouchableOpacity>
                      <View style={styles.missedItemText}>
                        <Text
                          style={[
                            styles.missedDate,
                            {
                              color: tokens.text,
                              textDecorationLine: item.madeUp ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {item.date}
                        </Text>
                        <Text style={[styles.missedReason, { color: tokens.muted }]}>
                          {(!womenUnlocked && isWomenSpecificReason(item.reason))
                            ? t('Excused (Private)')
                            : t(item.reason)}{' '}
                          {item.madeUp && item.madeUpDate ? `• ${t('Made up on')} ${item.madeUpDate}` : ''}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.deleteBtn,
                        justDeletedMissed === item.id && { opacity: 0.45 },
                      ]}
                      onPress={() => handleDeleteMissed(item.id)}
                      accessibilityLabel={justDeletedMissed === item.id ? t('Missed fast deleted') : t('Delete missed fast')}
                    >
                      <Ionicons
                        name={justDeletedMissed === item.id ? 'checkmark' : 'trash-outline'}
                        size={16}
                        color={justDeletedMissed === item.id ? tokens.danger : tokens.muted}
                      />
                    </TouchableOpacity>
                  </PremiumCard>
                ))
              )}
            </View>
          )}

          {/* ─── TAB 4: HISTORY & STREAK ────────────────────────────── */}
          {activeTab === 'history' && (
            <View style={styles.tabContent}>
              {/* Streak & Aggregate Scorecard */}
              <PremiumCard style={styles.statsCard} padded>
                <View style={styles.historyStatsRow}>
                  <View style={styles.statCol}>
                    <Text style={[styles.statBig, { color: tokens.goldText }]}>{streak}</Text>
                    <Text style={[styles.statLabel, { color: tokens.muted }]}>{t('Current Streak')}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.statBig, { color: tokens.text }]}>{totalFastedDays}</Text>
                    <Text style={[styles.statLabel, { color: tokens.muted }]}>{t('Total Fasted')}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.statBig, { color: tokens.text }]}>{ramadanFastsCount}</Text>
                    <Text style={[styles.statLabel, { color: tokens.muted }]}>{t('Ramadan Days')}</Text>
                  </View>
                </View>
              </PremiumCard>

              <Text style={[styles.sectionHeading, { color: tokens.muted }]}>
                {t('Fasting Log')}
              </Text>

              {history.length === 0 ? (
                <PremiumCard style={styles.emptyCard} padded>
                  <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder }]}>
                      <Ionicons name="calendar-outline" size={28} color={tokens.accent} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: tokens.text }]}>
                      {t('No fasting records yet')}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: tokens.muted }]}>
                      {t('Mark your fasts on the Today tab to start building your streak.')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setActiveTab('tracker')}
                      style={[styles.emptyActionBtn, { overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('Go to Today')}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={tokens.goldGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, alignItems: 'center' }}
                      >
                        <Text style={[styles.emptyActionText, { color: tokens.onGold }]}>
                          {t('Go to Today')}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </PremiumCard>
              ) : (
                history.map((entry) => {
                  const typeBadgeColors: Record<FastingType, { bg: string; text: string }> = {
                    ramadan: { bg: tokens.ringFill, text: tokens.goldText },
                    voluntary: { bg: tokens.inset, text: tokens.text },
                    qada: { bg: tokens.inset, text: tokens.muted },
                  };
                  const badge = typeBadgeColors[entry.type] || typeBadgeColors.voluntary;

                  return (
                    <PremiumCard key={entry.date} style={styles.historyRow} padded>
                      <View style={styles.historyLeft}>
                        <Ionicons
                          name={entry.fasting ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={entry.fasting ? tokens.accent : tokens.muted}
                        />
                        <View>
                          <Text style={[styles.historyDate, { color: tokens.text }]}>
                            {entry.date} {entry.date === todayStr ? t('(Today)') : ''}
                          </Text>
                          {entry.notes ? (
                            <Text style={[styles.historyNote, { color: tokens.muted }]}>
                              {entry.notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={[styles.typeBadge, getPillShadow(mode), { backgroundColor: badge.bg, borderColor: tokens.cardBorder }]}>
                        <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                          {entry.fasting
                            ? entry.type === 'ramadan'
                              ? t('Ramadan')
                              : entry.type === 'qada'
                              ? t('Qada')
                              : t('Sunnah')
                            : t('Not Fasting')}
                        </Text>
                      </View>
                    </PremiumCard>
                  );
                })
              )}
            </View>
          )}

        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  detailScreen: {
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 8,
  },

  /* Tab Navigation */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 0.75,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.75,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    borderWidth: 0.75,
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
    borderRadius: 14,
    borderWidth: 0.75,
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

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    lineHeight: 28,
  },
  statText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },

  /* Today Card */
  todayCard: {
    padding: 18,
    gap: 14,
  },
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  todayCardEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  todayCardTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.75,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  todayStatusBox: {
    gap: 12,
  },
  todayStatusMessage: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 0.75,
    paddingHorizontal: 16,
  },
  primaryCtaBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  fastTypeContainer: {
    marginTop: 6,
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
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },

  /* Qada Overview Card (Today tab) */
  qadaOverviewCard: {
    padding: 18,
    gap: 14,
  },
  qadaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qadaSectionEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  qadaSectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginTop: 2,
  },
  qadaActionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.75,
  },
  stepperBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  qadaQuickList: {
    gap: 6,
  },
  missedQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.75,
  },
  viewAllLedgerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.75,
    marginTop: 6,
  },
  viewAllLedgerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
    borderRadius: 12,
    borderWidth: 0.75,
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
    borderRadius: 14,
    borderWidth: 0.75,
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
    borderRadius: 14,
    borderWidth: 0.75,
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
    borderRadius: 14,
    borderWidth: 0.75,
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
    borderWidth: 0.75,
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
    borderWidth: 0.75,
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
    borderWidth: 0.75,
  },
  missedItemCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    borderWidth: 0.75,
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
  historyStatsRow: {
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
    marginBottom: 10,
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
    borderWidth: 0.75,
  },
  typeBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  emptyCard: {
    marginTop: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Lora_500Medium',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});

export default withUndoToast(FastingScreen);

