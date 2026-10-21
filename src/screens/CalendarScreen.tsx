/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { fetchHijriMonth, HijriMonthData, gregorianToHijri, HIJRI_MONTHS } from '../lib/hijri';
import { ISLAMIC_EVENTS, IslamicEvent, getEventsForMonth, getNextEvent, formatHijriDate, HIJRI_MONTH_NAMES } from '../lib/islamicEvents';
import { SectionHeader } from '../components/SectionHeader';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { Hairline } from '../components/Hairline';
import { CalendarGridSkeleton } from '../components/Skeleton';
import { isRTL, t } from '../lib/i18n';
import { hScrollRTLStyle } from '../lib/rtl';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GREG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HIJRI_CHIP_LABELS: string[] = [
  'Muh', 'Saf', 'Rab I', 'Rab II', 'Jum I', 'Jum II',
  'Raj', 'Sha', 'Ram', 'Shaw', 'Dhu Q', 'Dhu H',
];

export function getCalendarNavGlyph(direction: 'previous' | 'next', rtl: boolean): '‹' | '›' {
  if (direction === 'previous') return rtl ? '›' : '‹';
  return rtl ? '‹' : '›';
}

export default function CalendarScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const rtl = isRTL();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<HijriMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Current hijri date (for today panel)
  const currentHijri = useMemo(() => {
    const now = new Date();
    return gregorianToHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  // Current hijri month/year from data (for month-jump chips)
  const currentHijriMonth = data?.hijriMonth ?? 1;

  // Next upcoming event
  const nextEvent = useMemo(() => {
    if (!currentHijri) return null;
    return getNextEvent(currentHijri.year, currentHijri.month, currentHijri.day);
  }, [currentHijri]);

  // Events for current displayed month
  const currentMonthEvents = useMemo(() => {
    if (!data) return [];
    return getEventsForMonth(data.hijriMonth);
  }, [data]);

  // All events with days until
  const allEventsWithCountdown = useMemo(() => {
    if (!currentHijri) return [];
    return ISLAMIC_EVENTS.map((event) => {
      const next = getNextEvent(currentHijri.year, currentHijri.month, currentHijri.day);
      let daysUntil = 0;
      if (next && next.event.hijriMonth === event.hijriMonth && next.event.hijriDay === event.hijriDay) {
        daysUntil = next.daysUntil;
      } else {
        // Calculate for this specific event
        const thisYearOrdinal = hijriToOrdinal(currentHijri.year, event.hijriMonth, event.hijriDay);
        const currentOrdinal = hijriToOrdinal(currentHijri.year, currentHijri.month, currentHijri.day);
        daysUntil = thisYearOrdinal - currentOrdinal;
        if (daysUntil < 0) {
          const nextYearOrdinal = hijriToOrdinal(currentHijri.year + 1, event.hijriMonth, event.hijriDay);
          daysUntil = nextYearOrdinal - currentOrdinal;
        }
      }
      return { ...event, daysUntil, inCurrentMonth: data?.hijriMonth === event.hijriMonth };
    });
  }, [currentHijri, data?.hijriMonth]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHijriMonth(year, month).then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await fetchHijriMonth(year, month, true);
      setData(d);
    } catch {
      // keep existing data on error
    } finally {
      setRefreshing(false);
    }
  }, [year, month]);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  function jumpToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  }

  function jumpToHijriMonth(targetHijriMonth: number) {
    // Best-effort: find the gregorian month where this hijri month starts in the current hijri year
    // We'll approximate by fetching a few months around the current time
    // For simplicity, we just shift to the gregorian month that roughly corresponds
    // This is marked as "approx" in the UI
    const approxGregorianMonth = ((targetHijriMonth - currentHijriMonth + 12) % 12) + month;
    const approxYear = year + Math.floor((month + (targetHijriMonth - currentHijriMonth) - 1) / 12);
    setMonth(((approxGregorianMonth - 1) % 12) + 1);
    setYear(approxYear + (approxGregorianMonth > 12 ? 1 : 0));
  }

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  const getEventIcon = (event: IslamicEvent) => {
    if (event.name.includes('Eid') || event.name.includes('Mawlid')) return 'star';
    if (event.hijriMonth === 9) return 'moon'; // Ramadan events
    if (event.name.includes('Ashura')) return 'hand-left';
    if (event.name.includes('Isra') || event.name.includes('Mi\'raj')) return 'rocket';
    if (event.name.includes('Arafah') || event.name.includes('Hajj')) return 'location';
    if (event.name.includes('Nisf') || event.name.includes('Nuzul')) return 'book';
    return 'calendar';
  };

  const getEventIconForDay = (hijriDay: number) => {
    const event = currentMonthEvents.find((e) => e.hijriDay === hijriDay);
    return event ? getEventIcon(event) : null;
  };

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
            eyebrow={t('Hijri Calendar')}
            title={t('Islamic Dates')}
            subtitle={t('Gregorian to Hijri mapping, Islamic months & holy dates')}
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
          {
            paddingHorizontal: paddingH,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.accent}
          />
        }
      >
        <View style={styles.contentWrap}>
          {/* Today Panel */}
          <PremiumCard style={styles.todayCard} borderRadius={cardTokens.borderRadius} padded>
            <View style={styles.todayRow}>
              <View style={styles.todayMain}>
                <AppText variant="eyebrow" tone="faint" style={styles.todayLabel}>{t('TODAY')}</AppText>
                {currentHijri ? (
                  <AppText variant="headerTitle" style={styles.todayHijriDate}>
                    {formatHijriDate(currentHijri.day, currentHijri.month, currentHijri.year)}
                  </AppText>
                ) : (
                  <AppText variant="headerTitle" style={styles.todayHijriDate}>{t('Loading…')}</AppText>
                )}
                <AppText variant="body" style={styles.todayGregorian}>
                  {t(GREG_MONTHS[today.getMonth()])} {today.getDate()}, {today.getFullYear()}
                </AppText>
                {data && (() => {
                  const todayDay = data.days.find(
                    (d) => d.gregorianDay === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
                  );
                  const activeHijriMonth = todayDay?.hijriMonth ?? currentHijri?.month ?? data.hijriMonth;
                  const activeMonthName = HIJRI_MONTHS[(activeHijriMonth - 1) % 12];
                  const activeMonthLength = data.days.length > 0 ? data.days[data.days.length - 1].hijriDay : '29/30';
                  const dayNum = todayDay?.hijriDay ?? currentHijri?.day ?? '?';
                  return (
                    <AppText variant="caption" tone="faint" style={styles.todayProgress}>
                      {t('Day')} {dayNum} {t('of')} {activeMonthLength} {t('in')} {activeMonthName}
                    </AppText>
                  );
                })()}
              </View>
              <View style={styles.todayAccent}>
                <Ionicons name="calendar-outline" size={44} color={tokens.accent} />
              </View>
            </View>
            {nextEvent && (
              <View style={styles.nextEventRow}>
                <Hairline style={{ marginVertical: 12, backgroundColor: tokens.cardBorder }} />
                <View style={styles.nextEventContent}>
                  <AppText variant="eyebrow" tone="faint" style={styles.nextEventLabel}>{t('Next event')}</AppText>
                  <AppText variant="sectionTitle" style={styles.nextEventName}>
                    {nextEvent.event.name} {nextEvent.event.arabic ? `(${nextEvent.event.arabic})` : ''}
                  </AppText>
                  <AppText variant="caption" highlight style={styles.nextEventCountdown}>
                    {nextEvent.daysUntil === 0 ? t('Today') : nextEvent.daysUntil === 1 ? t('Tomorrow') : `${t('in')} ${nextEvent.daysUntil} ${t('days')}`}
                  </AppText>
                  <AppText variant="body" tone="faint" style={styles.nextEventSignificance}>
                    {nextEvent.event.significance}
                  </AppText>
                </View>
              </View>
            )}
          </PremiumCard>

          {/* Month navigation */}
          <View
            style={[
              styles.navRow,
              getCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <TouchableOpacity onPress={() => shift(-1)} accessibilityLabel={t('Previous month')} style={styles.navBtn}>
              <AppText variant="title" highlight style={styles.navArrow}>{getCalendarNavGlyph('previous', rtl)}</AppText>
            </TouchableOpacity>
            <View style={styles.navTitle}>
              <AppText variant="title" style={styles.monthName}>
                {data ? data.hijriMonthName : t('Loading…')}
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.monthMeta}>
                {data ? `${data.hijriYear} AH · ${t(GREG_MONTHS[month - 1])} ${year}` : '...'}
              </AppText>
            </View>
            <TouchableOpacity onPress={() => shift(1)} accessibilityLabel={t('Next month')} style={styles.navBtn}>
              <AppText variant="title" highlight style={styles.navArrow}>{getCalendarNavGlyph('next', rtl)}</AppText>
            </TouchableOpacity>
          </View>

          {/* Today jump button */}
          <TouchableOpacity onPress={jumpToToday} style={styles.todayJumpBtn} accessibilityLabel={t('Jump to today')}>
            <AppText variant="link" style={styles.todayJumpText}>• {t('Today')}</AppText>
          </TouchableOpacity>

          {/* Month overview strip */}
          <View style={styles.monthStripContainer}>
            <AppText variant="eyebrow" tone="faint" style={styles.monthStripLabel}>{t('Hijri months')}</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.monthStrip, hScrollRTLStyle()]}
            >
              {HIJRI_MONTH_NAMES.map((m, i) => {
                const hijriMonthNum = i + 1;
                const isActive = data && hijriMonthNum === data.hijriMonth;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => jumpToHijriMonth(hijriMonthNum)}
                    style={[
                      styles.monthChip,
                      getPillShadow(mode),
                      {
                        backgroundColor: isActive ? undefined : tokens.cardTop,
                        borderColor: isActive ? tokens.goldBorder : tokens.cardBorder,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Jump to')} ${m}`}
                    accessibilityState={{ selected: isActive ? true : undefined }}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={tokens.goldGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.monthChipGradient}
                      >
                        <AppText
                          variant="caption"
                          tone="onGold"
                          style={styles.monthChipText}
                        >
                          {HIJRI_CHIP_LABELS[i] || m.slice(0, 3)}
                        </AppText>
                        <View style={[styles.monthChipDot, { backgroundColor: tokens.onGold }]} />
                      </LinearGradient>
                    ) : (
                      <AppText
                        variant="caption"
                        style={[styles.monthChipText, { paddingHorizontal: 10, paddingVertical: 4 }]}
                      >
                        {HIJRI_CHIP_LABELS[i] || m.slice(0, 3)}
                      </AppText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {loading || !data ? (
            <View style={styles.contentWrap}>
              <CalendarGridSkeleton compact={isCompact} />
            </View>
          ) : (
            <>
              {/* Weekday header */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((d) => (
                  <AppText key={d} variant="caption" tone="faint" style={styles.weekday}>
                    {t(d)}
                  </AppText>
                ))}
              </View>
              <Hairline style={{ marginBottom: 10, backgroundColor: tokens.cardBorder }} />

              {/* Grid */}
              <View style={styles.grid}>
                {Array.from({ length: data.leadingBlanks }).map((_, i) => (
                  <View key={`blank-${i}`} style={styles.cell} />
                ))}
                {data.days.map((day) => {
                  const todayCell = isToday(day.gregorianDay);
                  const isFriday = day.weekday === 5;
                  const eventIconName = getEventIconForDay(day.hijriDay);
                  const event = currentMonthEvents.find((e) => e.hijriDay === day.hijriDay);
                  return (
                    <View
                      key={day.gregorianDay}
                      style={[
                        styles.cell,
                        isFriday && styles.cellFriday,
                        event && styles.cellEvent,
                        todayCell && styles.cellToday,
                        todayCell && { borderColor: tokens.goldBorder },
                      ]}
                    >
                      {todayCell && (
                        <LinearGradient
                          colors={tokens.goldGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      {eventIconName && (
                        <Ionicons
                          name={eventIconName}
                          size={12}
                          color={todayCell ? tokens.onGold : tokens.accent}
                          style={styles.cellEventIcon}
                        />
                      )}
                      <AppText
                        variant="numeral"
                        tone={todayCell ? 'onGold' : undefined}
                        highlight={!todayCell && isFriday}
                        style={styles.gregDay}
                      >
                        {day.gregorianDay}
                      </AppText>
                      <AppText
                        variant="caption"
                        tone={todayCell ? 'onGold' : !isFriday ? 'faint' : undefined}
                        highlight={!todayCell && isFriday}
                        style={styles.hijriDay}
                      >
                        {day.hijriDay}
                      </AppText>
                    </View>
                  );
                })}
              </View>

              <AppText variant="caption" tone="faint" style={styles.legend}>
                {t('Hijri date shown under each day\nAmber = today · Orange = Friday · Amber dot + icon = Islamic event')}
              </AppText>

              {/* Events list */}
              <View style={styles.eventsSection}>
                <Hairline style={{ marginVertical: 16, backgroundColor: tokens.cardBorder }} />
                <SectionHeader eyebrow={t('Islamic Events')} title={t('This Year')} subtitle={`${ISLAMIC_EVENTS.length} ${t('major dates · by Hijri month')}`} compact={isCompact} />
                <View style={styles.eventsList}>
                  {allEventsWithCountdown.map((event) => (
                    <PremiumCard
                      key={`${event.hijriMonth}-${event.hijriDay}`}
                      borderRadius={cardTokens.borderRadius}
                      borderColor={event.inCurrentMonth ? tokens.goldBorder : tokens.cardBorder}
                      padded={false}
                      style={styles.eventRowCard}
                      contentStyle={[
                        styles.eventRowContent,
                        event.inCurrentMonth && { backgroundColor: tokens.ringFill },
                      ]}
                    >
                      <View style={[styles.eventIconWrapper, { backgroundColor: tokens.ringFill }]}>
                        <Ionicons name={getEventIcon(event)} size={20} color={event.inCurrentMonth ? tokens.accent : tokens.muted} />
                      </View>
                      <View style={styles.eventInfo}>
                        <View style={styles.eventHeader}>
                          <AppText variant="sectionTitle" style={styles.eventName}>{event.name}</AppText>
                          {event.inCurrentMonth && (
                            <AppText variant="eyebrow" highlight style={[styles.eventCurrentBadge, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder, borderWidth: 1 }]}>
                              {t('This month')}
                            </AppText>
                          )}
                        </View>
                        <AppText variant="body" style={[styles.eventArabic, { color: tokens.arabicName }]}>{event.arabic}</AppText>
                        <AppText variant="caption" tone="faint" style={styles.eventDate}>
                          {event.hijriDay} {HIJRI_MONTH_NAMES[event.hijriMonth - 1]}
                        </AppText>
                        <AppText variant="body" tone="faint" style={styles.eventSignificance}>{event.significance}</AppText>
                      </View>
                      <View style={styles.eventCountdown}>
                        <AppText variant="numeral" highlight style={styles.countdownValue}>
                          {event.daysUntil === 0 ? t('Today') : event.daysUntil === 1 ? t('Tomorrow') : `${event.daysUntil}d`}
                        </AppText>
                        <AppText variant="caption" tone="faint" style={styles.countdownLabel}>{event.daysUntil === 0 ? '' : t('away')}</AppText>
                      </View>
                    </PremiumCard>
                  ))}
                </View>
              </View>
            </>
          )}

          {data?.source === 'local' && (
            <AppText accessibilityRole="alert" variant="caption" tone="faint" style={styles.offlineNote}>
              {t('Offline, dates follow the tabular Umm al-Qura calendar and may differ by a day from a sighting.')}
            </AppText>
          )}
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
    </View>
  );
}

// Helper: approximate ordinal for countdown calculations (duplicated from islamicEvents for use here)
function hijriToOrdinal(year: number, month: number, day: number): number {
  let ordinal = day;
  for (let m = 1; m < month; m++) {
    ordinal += getHijriMonthLength(year, m);
  }
  for (let y = 1400; y < year; y++) {
    ordinal += isHijriLeapYear(y) ? 355 : 354;
  }
  return ordinal;
}

function isHijriLeapYear(year: number): boolean {
  const cycle = year % 30;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cycle);
}

function getHijriMonthLength(year: number, month: number): number {
  const base = month % 2 === 1 ? 30 : 29;
  return month === 12 && isHijriLeapYear(year) ? 30 : base;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  content: {},
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  center: { paddingVertical: 60, alignItems: 'center' },

  // Today Panel
  todayCard: {
    borderRadius: cardTokens.borderRadius,
    marginBottom: 12,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayMain: {
    flex: 1,
    minWidth: 0,
  },
  todayLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  todayHijriDate: {
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 2,
  },
  todayGregorian: {
    fontSize: 14,
    marginBottom: 6,
  },
  todayProgress: {
    fontSize: 12,
  },
  todayAccent: { padding: 8 },
  nextEventRow: { paddingTop: 4 },
  nextEventContent: {},
  nextEventLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nextEventName: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 2,
  },
  nextEventCountdown: {
    fontSize: 14,
    marginBottom: 4,
  },
  nextEventSignificance: {
    fontSize: 14,
    lineHeight: 18,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: cardTokens.borderRadius,
    padding: 6,
    marginBottom: 6,
  },
  navBtn: {
    padding: 6,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  navArrow: { fontSize: 24, lineHeight: 26 },
  navTitle: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  monthName: { fontSize: 20 },
  monthMeta: { fontSize: 12, marginTop: 1 },

  // Today jump button
  todayJumpBtn: {
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayJumpText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // Month strip
  monthStripContainer: { marginBottom: 10 },
  monthStripLabel: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  monthStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  monthChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  monthChipGradient: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: 44,
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  monthChipActive: {
    backgroundColor: 'transparent',
  },
  monthChipText: {
    fontSize: 12,
  },
  monthChipDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Grid
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    textTransform: 'uppercase',
    paddingVertical: 8,
    minWidth: 0,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  cellToday: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cellFriday: {
    // Friday accent handled via text color
  },
  cellEvent: {
    // Event day indicator
  },
  cellEventIcon: {
    position: 'absolute',
    top: 2,
    end: 2,
  },
  gregDay: { fontSize: 14 },
  hijriDay: { fontSize: 12, marginTop: 2 },

  // Legend
  legend: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Events list
  eventsSection: { marginTop: 8 },
  eventsList: { gap: 10 },
  eventRowCard: {
    borderRadius: cardTokens.borderRadius,
    marginBottom: 0,
  },
  eventRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: cardTokens.borderRadius,
    borderWidth: 1,
    gap: 12,
  },
  eventRowCurrentMonth: {},
  eventIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  eventInfo: { flex: 1, minWidth: 0 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  eventName: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
    minWidth: 0,
  },
  eventCurrentBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  eventArabic: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
    writingDirection: 'rtl',
  },
  eventDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  eventSignificance: {
    fontSize: 14,
    lineHeight: 16,
  },
  eventCountdown: {
    alignItems: 'flex-end',
    minWidth: 60,
    paddingTop: 2,
  },
  countdownValue: {
    fontSize: 16,
    lineHeight: 20,
  },
  countdownLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  offlineNote: {
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
    lineHeight: 16,
  },
});
