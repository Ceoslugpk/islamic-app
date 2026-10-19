import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens, cardTokens } from '../theme/tokens';
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
  const todayStr = useMemo(() => toDateString(), []);
  const todayHijri = useMemo(() => getHijriDate(new Date()), []);

  const [timings, setTimings] = useState<DayTimings | null>(null);
  const [todayEntry, setTodayEntry] = useState<FastingEntry>(() => {
    const entry = getFastingEntry(todayStr);
    if (entry) {
      return entry;
    }
    const defaultType: FastingType = todayHijri.month === 9 ? 'ramadan' : 'voluntary';
    return {
      date: todayStr,
      fasting: false,
      type: defaultType,
    };
  });
  const [history, setHistory] = useState<FastingEntry[]>(() => loadFastingHistory());
  const [missedList, setMissedList] = useState<MissedFastItem[]>(() => loadMissedFasts());
  const { saveUndoState } = useUndoToast();

  // Qada Form State
  const [showAddMissed, setShowAddMissed] = useState(false);
  const [missedDateInput, setMissedDateInput] = useState(toDateString());
  const [missedReasonInput, setMissedReasonInput] = useState(MISSED_REASONS[0]);

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
                  <AppText
                    variant="rowTitle"
                    tone={isSelected ? 'onGold' : undefined}
                    style={styles.tabBtnText}
                  >
                    {labels[tab]}
                  </AppText>
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
                  <AppText variant="numeral" highlight style={styles.statNumber}>
                    {daysFastedThisMonth}
                  </AppText>
                  <AppText variant="caption" style={styles.statText}>
                    {t('This Month')}
                  </AppText>
                </View>
                <View style={[styles.statBox, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
                  <AppText variant="numeral" style={styles.statNumber}>
                    {streak}d
                  </AppText>
                  <AppText variant="caption" style={styles.statText}>
                    {t('Streak')}
                  </AppText>
                </View>
                <View style={[styles.statBox, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
                  <AppText variant="numeral" highlight={qadaPendingCount > 0} style={styles.statNumber}>
                    {qadaPendingCount}
                  </AppText>
                  <AppText variant="caption" style={styles.statText}>
                    {t('Qada Left')}
                  </AppText>
                </View>
              </View>

              {/* Clear TODAY Card */}
              <PremiumCard
                style={styles.todayCard}
                contentStyle={{ gap: 14 }}
                borderRadius={cardTokens.borderRadius}
                padded
              >
                <View style={styles.todayCardHeader}>
                  <View style={{ width: '100%', minWidth: 0 }}>
                    <AppText variant="eyebrow" highlight style={styles.todayCardEyebrow}>
                      {todayHijri.day} {HIJRI_MONTH_NAMES[todayHijri.month - 1]} {todayHijri.year} AH
                    </AppText>
                    <AppText variant="headerTitle" style={styles.todayCardTitle}>
                      {t("Today's Fast")}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      getPillShadow(mode),
                      {
                        backgroundColor: todayEntry.fasting ? tokens.ringFill : tokens.inset,
                        borderColor: todayEntry.fasting ? tokens.goldBorder : tokens.cardBorder,
                        flexShrink: 0,
                      },
                    ]}
                  >
                    <Ionicons
                      name={todayEntry.fasting ? 'checkmark-circle' : 'moon-outline'}
                      size={14}
                      color={todayEntry.fasting ? tokens.accent : tokens.muted}
                    />
                    <AppText
                      variant="caption"
                      highlight={todayEntry.fasting}
                      style={styles.statusBadgeText}
                    >
                      {todayEntry.fasting ? t('Fasting Active') : t('Not Fasting')}
                    </AppText>
                  </View>
                </View>

                <View style={styles.todayStatusBox}>
                  <AppText variant="body" style={styles.todayStatusMessage}>
                    {todayEntry.fasting
                      ? t('Alhamdulillah, your fast is recorded for today.')
                      : t('Tap below to record your fast and track your habit.')}
                  </AppText>

                  {todayEntry.fasting ? (
                    <View style={styles.fastTypeContainer}>
                      <AppText variant="rowTitle" style={styles.typeSelectLabel}>
                        {t('Intention / Category:')}
                      </AppText>
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
                              <AppText
                                variant="rowTitle"
                                tone={isChosen ? 'onGold' : undefined}
                                style={styles.typeBtnText}
                              >
                                {typeLabels[type]}
                              </AppText>
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
                        <AppText
                          variant="rowTitle"
                          tone="danger"
                          style={styles.primaryCtaBtnText}
                        >
                          {t('Cancel / Not Fasting Today')}
                        </AppText>
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
                        <AppText
                          variant="rowTitle"
                          tone="onGold"
                          style={styles.primaryCtaBtnText}
                        >
                          {t('I am Fasting Today')}
                        </AppText>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              </PremiumCard>

              {/* Suhoor & Iftar Times Card */}
              <PremiumCard
                style={styles.heroCard}
                contentStyle={{ gap: 14 }}
                borderRadius={cardTokens.borderRadius}
                padded
              >
                <View style={styles.heroHeader}>
                  <View style={{ width: '100%', minWidth: 0 }}>
                    <AppText variant="eyebrow" highlight style={styles.heroEyebrow}>
                      {t("Today's Prayer Schedule")}
                    </AppText>
                    <AppText variant="title" style={styles.heroTitle}>
                      {t('Suhoor & Iftar Timings')}
                    </AppText>
                  </View>
                  <View style={[styles.phasePill, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, flexShrink: 0 }]}>
                    <Ionicons
                      name={countdown.phase === 'fasting' ? 'sunny' : 'moon'}
                      size={13}
                      color={tokens.goldText}
                    />
                    <AppText variant="caption" highlight style={styles.phasePillText} numberOfLines={2}>
                      {countdown.label}
                    </AppText>
                  </View>
                </View>

                <View style={styles.timesRow}>
                  <View style={[styles.timeBox, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
                    <View style={styles.timeLabelWrap}>
                      <Ionicons name="moon-outline" size={15} color={tokens.muted} />
                      <AppText variant="caption" style={styles.timeBoxLabel}>{t('Suhoor Ends')}</AppText>
                    </View>
                    <AppText variant="numeral" style={styles.timeBoxValue}>
                      {suhoorFormatted}
                    </AppText>
                    <AppText variant="caption" style={styles.timeBoxSub}>{t('Fajr Dawn')}</AppText>
                  </View>

                  <View style={[styles.timeBox, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
                    <View style={styles.timeLabelWrap}>
                      <Ionicons name="sunny-outline" size={15} color={tokens.goldText} />
                      <AppText variant="caption" style={styles.timeBoxLabel}>{t('Iftar Time')}</AppText>
                    </View>
                    <AppText variant="numeral" highlight style={styles.timeBoxValue}>
                      {iftarFormatted}
                    </AppText>
                    <AppText variant="caption" style={styles.timeBoxSub}>{t('Maghrib Dusk')}</AppText>
                  </View>
                </View>
              </PremiumCard>

              {/* Missed Fasts (Qada) Section */}
              <PremiumCard
                style={styles.qadaOverviewCard}
                contentStyle={{ gap: 14 }}
                borderRadius={cardTokens.borderRadius}
                padded
              >
                <View style={styles.qadaSectionHeader}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <AppText variant="eyebrow" highlight style={styles.qadaSectionEyebrow}>
                      {t('Obligatory Makeup')}
                    </AppText>
                    <AppText variant="title" style={styles.qadaSectionTitle}>
                      {t('Missed Fasts (Qada)')}
                    </AppText>
                  </View>
                  <View style={[styles.qadaActionBtnsRow, { flexShrink: 0 }]}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, getPillShadow(mode), { backgroundColor: 'transparent', borderColor: tokens.goldBorder }]}
                      onPress={handleQuickAddMissed}
                      accessibilityRole="button"
                      accessibilityLabel={t('Add missed fast')}
                    >
                      <Ionicons name="add" size={15} color={tokens.goldText} />
                      <AppText variant="rowTitle" highlight style={styles.stepperBtnText}>{t('Add')}</AppText>
                    </TouchableOpacity>
                    {qadaPendingCount > 0 ? (
                      <TouchableOpacity
                        style={[styles.stepperBtn, getPillShadow(mode), { backgroundColor: 'transparent', borderColor: tokens.cardBorder }]}
                        onPress={handleQuickRemoveMissed}
                        accessibilityRole="button"
                        accessibilityLabel={t('Make up one missed fast')}
                      >
                        <Ionicons name="checkmark" size={14} color={tokens.text} />
                        <AppText variant="rowTitle" style={styles.stepperBtnText}>{t('-1 Made Up')}</AppText>
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
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText
                            variant="rowTitle"
                            style={[
                              styles.missedDate,
                              {
                                textDecorationLine: item.madeUp ? 'line-through' : 'none',
                              },
                            ]}
                          >
                            {item.date}
                          </AppText>
                          <AppText variant="body" style={styles.missedReason}>
                            {(!womenUnlocked && isWomenSpecificReason(item.reason))
                              ? t('Excused (Private)')
                              : t(item.reason)}{' '}
                            {item.madeUp && item.madeUpDate ? `• ${t('Made up on')} ${item.madeUpDate}` : ''}
                          </AppText>
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.viewAllLedgerBtn, { borderColor: tokens.cardBorder }]}
                      onPress={() => setActiveTab('qada')}
                      accessibilityRole="button"
                    >
                      <AppText variant="link" style={styles.viewAllLedgerText}>
                        {visibleMissedList.length > 3
                          ? `${t('View all')} ${visibleMissedList.length} ${t('records in Qada ledger →')}`
                          : t('Open full Qada ledger →')}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </PremiumCard>
            </View>
          )}

          {/* ─── TAB 2: VOLUNTARY (SUNNAH) FASTS ────────────────────── */}
          {activeTab === 'voluntary' && (
            <View style={styles.tabContent}>
              <AppText variant="eyebrow" style={styles.sectionHeading}>
                {t('Recommended Voluntary Fasts')}
              </AppText>

              {voluntaryRecommendations.map((rec) => (
                <PremiumCard
                  key={rec.id}
                  style={styles.recCard}
                  contentStyle={{ gap: 10 }}
                  borderRadius={cardTokens.borderRadius}
                  padded
                >
                  <View style={styles.recCardHeader}>
                    <View style={styles.recTitleWrap}>
                      <AppText variant="sectionTitle" style={styles.recName}>
                        {rec.name}
                      </AppText>
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
                      <AppText
                        variant="caption"
                        highlight={rec.isActiveToday}
                        style={styles.statusPillText}
                      >
                        {rec.upcomingDateLabel}
                      </AppText>
                    </View>
                  </View>

                  <AppText variant="body" style={styles.recDesc}>
                    {rec.description}
                  </AppText>

                  <View style={[styles.virtueBox, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
                    <Ionicons name="sparkles" size={13} color={tokens.goldText} style={{ marginTop: 2 }} />
                    <AppText variant="caption" style={styles.virtueText}>
                      {rec.virtue}
                    </AppText>
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
                      <AppText variant="link" style={styles.fastTodayActionText}>
                        {t('Fast')} {rec.name} {t('Today')}
                      </AppText>
                    </TouchableOpacity>
                  )}
                </PremiumCard>
              ))}
            </View>
          )}

          {/* ─── TAB 3: QADA (MISSED FASTS) ─────────────────────────── */}
          {activeTab === 'qada' && (
            <View style={styles.tabContent}>
              {/* Scorecard */}
              <View style={styles.qadaScorecard}>
                <PremiumCard
                  style={styles.qadaStatBox}
                  contentStyle={styles.qadaStatBoxContent}
                  borderRadius={cardTokens.borderRadius}
                  padded
                >
                  <AppText variant="numeral" highlight style={styles.qadaStatNumber}>
                    {qadaPendingCount}
                  </AppText>
                  <AppText variant="caption" style={styles.qadaStatText}>
                    {t('Fasts to Make Up')}
                  </AppText>
                </PremiumCard>
                <PremiumCard
                  style={styles.qadaStatBox}
                  contentStyle={styles.qadaStatBoxContent}
                  borderRadius={cardTokens.borderRadius}
                  padded
                >
                  <AppText variant="numeral" style={styles.qadaStatNumber}>
                    {qadaMadeUpCount}
                  </AppText>
                  <AppText variant="caption" style={styles.qadaStatText}>
                    {t('Made Up (Completed)')}
                  </AppText>
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
                  <AppText variant="link" style={styles.addMissedBtnText}>
                    {justLogged ? t('Logged ✓') : t('+ Log Missed Fast')}
                  </AppText>
                </TouchableOpacity>
              ) : (
                <PremiumCard
                  style={styles.addMissedForm}
                  contentStyle={{ gap: 10 }}
                  borderRadius={cardTokens.borderRadius}
                  padded
                >
                  <AppText variant="sectionTitle" style={styles.formTitle}>
                    {t('Log a Missed Fast')}
                  </AppText>

                  <AppText variant="rowTitle" style={styles.inputLabel}>{t('Date (YYYY-MM-DD):')}</AppText>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder, color: tokens.text }]}
                    value={missedDateInput}
                    onChangeText={setMissedDateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={tokens.muted}
                    accessibilityLabel={t('Date (YYYY-MM-DD)')}
                  />

                  <AppText variant="rowTitle" style={styles.inputLabel}>{t('Reason:')}</AppText>
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
                          <AppText
                            variant="caption"
                            tone={isSelected ? 'onGold' : undefined}
                            style={styles.reasonPillText}
                          >
                            {t(r)}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={[styles.formBtn, { borderColor: tokens.cardBorder }]}
                      onPress={() => setShowAddMissed(false)}
                    >
                      <AppText variant="rowTitle">{t('Cancel')}</AppText>
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
                        <AppText
                          variant="rowTitle"
                          tone="onGold"
                        >
                          {justLogged ? t('Saved ✓') : t('Save Record')}
                        </AppText>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </PremiumCard>
              )}

              {/* List of Missed Fasts */}
              <AppText variant="eyebrow" style={[styles.sectionHeading, { marginTop: 14 }]}>
                {t('Missed Fasts Ledger')}
              </AppText>

              {visibleMissedList.length === 0 ? (
                <PremiumCard style={styles.emptyCard} borderRadius={cardTokens.borderRadius} padded>
                  <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder }]}>
                      <Ionicons name="checkmark-done-circle-outline" size={28} color={tokens.accent} />
                    </View>
                    <AppText variant="sectionTitle" style={styles.emptyTitle}>
                      {t('All caught up!')}
                    </AppText>
                    <AppText variant="body" style={styles.emptySubtitle}>
                      {t('No missed fasts recorded in your ledger.')}
                    </AppText>
                  </View>
                </PremiumCard>
              ) : (
                visibleMissedList.map((item) => (
                  <PremiumCard key={item.id} style={styles.missedItemCard} contentStyle={styles.missedItemCardContent} borderRadius={cardTokens.borderRadius} padded>
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
                        <AppText
                          variant="rowTitle"
                          style={[
                            styles.missedDate,
                            {
                              textDecorationLine: item.madeUp ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {item.date}
                        </AppText>
                        <AppText variant="body" style={styles.missedReason}>
                          {(!womenUnlocked && isWomenSpecificReason(item.reason))
                            ? t('Excused (Private)')
                            : t(item.reason)}{' '}
                          {item.madeUp && item.madeUpDate ? `• ${t('Made up on')} ${item.madeUpDate}` : ''}
                        </AppText>
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
              <PremiumCard style={styles.statsCard} contentStyle={styles.statsCardContent} borderRadius={cardTokens.borderRadius} padded>
                <View style={styles.historyStatsRow}>
                  <View style={styles.statCol}>
                    <AppText variant="numeral" highlight style={styles.statBig}>{streak}</AppText>
                    <AppText variant="caption" style={styles.statLabel}>{t('Current Streak')}</AppText>
                  </View>
                  <View style={styles.statCol}>
                    <AppText variant="numeral" style={styles.statBig}>{totalFastedDays}</AppText>
                    <AppText variant="caption" style={styles.statLabel}>{t('Total Fasted')}</AppText>
                  </View>
                  <View style={styles.statCol}>
                    <AppText variant="numeral" style={styles.statBig}>{ramadanFastsCount}</AppText>
                    <AppText variant="caption" style={styles.statLabel}>{t('Ramadan Days')}</AppText>
                  </View>
                </View>
              </PremiumCard>

              <AppText variant="eyebrow" style={styles.sectionHeading}>
                {t('Fasting Log')}
              </AppText>

              {history.length === 0 ? (
                <PremiumCard style={styles.emptyCard} borderRadius={cardTokens.borderRadius} padded>
                  <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder }]}>
                      <Ionicons name="calendar-outline" size={28} color={tokens.accent} />
                    </View>
                    <AppText variant="sectionTitle" style={styles.emptyTitle}>
                      {t('No fasting records yet')}
                    </AppText>
                    <AppText variant="body" style={styles.emptySubtitle}>
                      {t('Mark your fasts on the Today tab to start building your streak.')}
                    </AppText>
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
                        <AppText variant="rowTitle" tone="onGold" style={styles.emptyActionText}>
                          {t('Go to Today')}
                        </AppText>
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
                    <PremiumCard key={entry.date} style={styles.historyRow} contentStyle={styles.historyRowContent} borderRadius={cardTokens.borderRadius} padded>
                      <View style={styles.historyLeft}>
                        <Ionicons
                          name={entry.fasting ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={entry.fasting ? tokens.accent : tokens.muted}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText variant="rowTitle" style={styles.historyDate}>
                            {entry.date} {entry.date === todayStr ? t('(Today)') : ''}
                          </AppText>
                          {entry.notes ? (
                            <AppText variant="caption" style={styles.historyNote}>
                              {entry.notes}
                            </AppText>
                          ) : null}
                        </View>
                      </View>

                      <View style={[styles.typeBadge, getPillShadow(mode), { backgroundColor: badge.bg, borderColor: tokens.cardBorder }]}>
                        <AppText
                          variant="caption"
                          highlight={entry.fasting && entry.type === 'ramadan'}
                          style={styles.typeBadgeText}
                        >
                          {entry.fasting
                            ? entry.type === 'ramadan'
                              ? t('Ramadan')
                              : entry.type === 'qada'
                              ? t('Qada')
                              : t('Sunnah')
                            : t('Not Fasting')}
                        </AppText>
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
    minWidth: 0,
  },
  detailScreen: {
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    minWidth: 0,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
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
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 0.75,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minWidth: 0,
  },
  tabBtnText: {
    fontSize: 14,
  },
  tabContent: {
    gap: 14,
  },

  /* Hero Card */
  heroCard: {
    marginBottom: 14,
  },
  heroHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 22,
    marginTop: 2,
  },
  phasePill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 0.75,
  },
  phasePillText: {
    flexShrink: 1,
    fontSize: 12,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeBox: {
    flex: 1,
    minHeight: 76,
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.75,
    minWidth: 0,
  },
  timeLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBoxLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBoxValue: {
    fontSize: 18,
    marginTop: 4,
  },
  timeBoxSub: {
    fontSize: 12,
    marginTop: 2,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  statNumber: {
    fontSize: 24,
    lineHeight: 28,
  },
  statText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },

  /* Today Card */
  todayCard: {
    marginBottom: 14,
  },
  todayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  todayCardEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  todayCardTitle: {
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
    fontSize: 12,
  },
  todayStatusBox: {
    gap: 12,
  },
  todayStatusMessage: {
    fontSize: 14,
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
    fontSize: 14,
  },
  fastTypeContainer: {
    marginTop: 6,
  },
  typeSelectLabel: {
    fontSize: 14,
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
    minHeight: 44,
    minWidth: 0,
  },
  typeBtnText: {
    fontSize: 14,
  },

  /* Qada Overview Card (Today tab) */
  qadaOverviewCard: {
    marginBottom: 14,
  },
  qadaSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  qadaSectionEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  qadaSectionTitle: {
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
    minHeight: 44,
  },
  stepperBtnText: {
    fontSize: 14,
  },
  qadaQuickList: {
    gap: 6,
  },
  missedQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
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
    minHeight: 44,
  },
  viewAllLedgerText: {
    fontSize: 13,
  },

  /* Voluntary Fasts */
  sectionHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  recCard: {
    marginBottom: 12,
  },
  recCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  recTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingEnd: 8,
  },
  recName: {
    fontSize: 15,
  },
  recArabic: {
    fontSize: 15,
    marginTop: 2,
  },
  statusPill: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.75,
  },
  statusPillText: {
    fontSize: 12,
  },
  recDesc: {
    fontSize: 14,
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
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
    minWidth: 0,
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
    minHeight: 44,
  },
  fastTodayActionText: {
    fontSize: 13,
  },

  /* Qada */
  qadaScorecard: {
    flexDirection: 'row',
    gap: 10,
  },
  qadaStatBox: {
    flex: 1,
    minWidth: 0,
  },
  qadaStatNumber: {
    fontSize: 24,
  },
  qadaStatText: {
    fontSize: 12,
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
    minHeight: 44,
  },
  addMissedBtnText: {
    fontSize: 13.5,
  },
  addMissedForm: {
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
  },
  textInput: {
    borderWidth: 0.75,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    minHeight: 44,
  },
  reasonPillText: {
    fontSize: 12,
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
    minHeight: 44,
  },
  missedItemCard: {
    minHeight: 56,

    marginBottom: 10,
  },
  missedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
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
    minWidth: 0,
  },
  missedDate: {
    fontSize: 14,
  },
  missedReason: {
    fontSize: 14,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    flexShrink: 0,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* History */
  statsCard: {
  },
  historyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statBig: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 3,
  },
  historyRow: {
    minHeight: 52,

    marginBottom: 10,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  historyDate: {
    fontSize: 14,
  },
  historyNote: {
    fontSize: 12,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.75,
    flexShrink: 0,
  },
  typeBadgeText: {
    fontSize: 12,
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
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
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
    minHeight: 44,
  },
  emptyActionText: {
    fontSize: 14,
  },

  historyRowContent: {
    padding: 14,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statsCardContent: {
    padding: 18,
  },

  missedItemCardContent: {
    padding: 14,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  qadaStatBoxContent: {
    alignItems: 'center',
  },
});

export default withUndoToast(FastingScreen);
