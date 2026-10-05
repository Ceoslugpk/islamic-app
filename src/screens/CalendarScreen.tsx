import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../lib/theme';
import { fetchHijriMonth, HijriMonthData, gregorianToHijriString, HIJRI_MONTHS } from '../lib/hijri';
import { ISLAMIC_EVENTS, IslamicEvent, getEventsForMonth, getNextEvent, formatHijriDate, HIJRI_MONTH_NAMES } from '../lib/islamicEvents';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
import { CalendarGridSkeleton } from '../components/Skeleton';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GREG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const cellSize = isCompact ? 40 : 44;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<HijriMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Current hijri date (for today panel)
  const currentHijri = useMemo(() => {
    const str = gregorianToHijriString(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const match = str.match(/^(\d+)\s+(.+?)\s+(\d+)\s+AH$/);
    if (match) {
      return { day: parseInt(match[1], 10), monthName: match[2], year: parseInt(match[3], 10) };
    }
    return null;
  }, []);

  // Current hijri month/year from data (for month-jump chips)
  const currentHijriMonth = data?.hijriMonth ?? 1;
  const currentHijriYear = data?.hijriYear ?? 1448;

  // Next upcoming event
  const nextEvent = useMemo(() => {
    if (!currentHijri) return null;
    return getNextEvent(currentHijri.year, currentHijriMonth, currentHijri.day);
  }, [currentHijri, currentHijriMonth, currentHijriYear]);

  // Events for current displayed month
  const currentMonthEvents = useMemo(() => {
    if (!data) return [];
    return getEventsForMonth(data.hijriMonth);
  }, [data]);

  // All events with days until
  const allEventsWithCountdown = useMemo(() => {
    if (!currentHijri) return [];
    return ISLAMIC_EVENTS.map((event) => {
      const next = getNextEvent(currentHijri.year, currentHijriMonth, currentHijri.day);
      let daysUntil = 0;
      if (next && next.event.hijriMonth === event.hijriMonth && next.event.hijriDay === event.hijriDay) {
        daysUntil = next.daysUntil;
      } else {
        // Calculate for this specific event
        const thisYearOrdinal = hijriToOrdinal(currentHijri.year, event.hijriMonth, event.hijriDay);
        const currentOrdinal = hijriToOrdinal(currentHijri.year, currentHijriMonth, currentHijri.day);
        daysUntil = thisYearOrdinal - currentOrdinal;
        if (daysUntil < 0) {
          const nextYearOrdinal = hijriToOrdinal(currentHijri.year + 1, event.hijriMonth, event.hijriDay);
          daysUntil = nextYearOrdinal - currentOrdinal;
        }
      }
      return { ...event, daysUntil, inCurrentMonth: data?.hijriMonth === event.hijriMonth };
    });
  }, [currentHijri, currentHijriMonth, currentHijriYear, data?.hijriMonth]);

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

  const isCurrentMonthEvent = (hijriDay: number) =>
    currentMonthEvents.some((e) => e.hijriDay === hijriDay);

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
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.contentWrap}>
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

        <SectionHeader compact eyebrow="Hijri Calendar" title="Islamic Dates" />

        {/* NEW: Today Panel */}
        <Card style={styles.todayCard} padded>
          <View style={styles.todayRow}>
            <View style={styles.todayMain}>
              <Text style={[styles.todayLabel, { color: colors.textMuted }]}>TODAY</Text>
              {currentHijri ? (
                <Text style={[styles.todayHijriDate, { color: colors.textPrimary }]}>
                  {formatHijriDate(currentHijri.day, HIJRI_MONTH_NAMES.indexOf(currentHijri.monthName) + 1, currentHijri.year)}
                </Text>
              ) : (
                <Text style={[styles.todayHijriDate, { color: colors.textPrimary }]}>Loading…</Text>
              )}
              <Text style={[styles.todayGregorian, { color: colors.textSecondary }]}>
                {GREG_MONTHS[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
              </Text>
              {data && (
                <Text style={[styles.todayProgress, { color: colors.textMuted }]}>
                  Day {data.days.find(d => d.gregorianDay === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear())?.hijriDay ?? '?'} of {data.days.length > 0 ? (data.days[data.days.length - 1].hijriDay) : '29/30'} in {data.hijriMonthName}
                </Text>
              )}
            </View>
            <View style={styles.todayAccent}>
              <Ionicons name="calendar-outline" size={48} color={colors.accent} />
            </View>
          </View>
          {nextEvent && (
            <View style={styles.nextEventRow}>
              <Hairline style={{ marginVertical: 12, backgroundColor: colors.borderSubtle }} />
              <View style={styles.nextEventContent}>
                <Text style={[styles.nextEventLabel, { color: colors.textMuted }]}>Next event</Text>
                <Text style={[styles.nextEventName, { color: colors.textPrimary }]}>
                  {nextEvent.event.name} {nextEvent.event.arabic ? `(${nextEvent.event.arabic})` : ''}
                </Text>
                <Text style={[styles.nextEventCountdown, { color: colors.accent }]}>
                  {nextEvent.daysUntil === 0 ? 'Today' : nextEvent.daysUntil === 1 ? 'Tomorrow' : `in ${nextEvent.daysUntil} days`}
                </Text>
                <Text style={[styles.nextEventSignificance, { color: colors.textSecondary }]}>
                  {nextEvent.event.significance}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Month navigation */}
        <View style={[styles.navRow, { borderColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => shift(-1)} accessibilityLabel="Previous month" style={styles.navBtn}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.navTitle}>
            <Text style={[styles.monthName, { color: colors.textPrimary }]}>
              {data ? data.hijriMonthName : 'Loading…'}
            </Text>
            <Text style={[styles.monthMeta, { color: colors.textMuted }]}>
              {data ? `${data.hijriYear} AH · ${GREG_MONTHS[month - 1]} ${year}` : '...'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => shift(1)} accessibilityLabel="Next month" style={styles.navBtn}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* NEW: Today jump button */}
        <TouchableOpacity onPress={jumpToToday} style={styles.todayJumpBtn} accessibilityLabel="Jump to today">
          <Text style={[styles.todayJumpText, { color: colors.accent }]}>• Today</Text>
        </TouchableOpacity>

        {/* NEW: Month overview strip - 12 Hijri months as chips */}
        <View style={styles.monthStripContainer}>
          <Text style={[styles.monthStripLabel, { color: colors.textMuted }]}>Hijri months</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthStrip}
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
                    isActive ? styles.monthChipActive : null,
                    { borderColor: isActive ? colors.accent : colors.borderSubtle },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${m}`}
                  accessibilityState={{ selected: isActive ? true : undefined }}
                >
                  <Text
                    style={[
                      styles.monthChipText,
                      { color: isActive ? colors.accent : colors.textSecondary },
                    ]}
                  >
                    {m.slice(0, 3)}
                  </Text>
                  {isActive && <Text style={[styles.monthChipDot, { backgroundColor: colors.accent }]} />}
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
                <Text key={d} style={[styles.weekday, { color: colors.textMuted }]}>
                  {d}
                </Text>
              ))}
            </View>
            <Hairline style={{ marginBottom: 10 }} />

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
                      todayCell && { backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.accent, borderRadius: 8 },
                      isFriday && styles.cellFriday,
                      event && styles.cellEvent,
                    ]}
                  >
                    {eventIconName && (
                      <Ionicons
                        name={eventIconName}
                        size={12}
                        color={colors.accent}
                        style={styles.cellEventIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.gregDay,
                        { color: todayCell ? colors.onAccent : isFriday ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {day.gregorianDay}
                    </Text>
                    <Text
                      style={[
                        styles.hijriDay,
                        {
                          color: todayCell ? colors.onAccent : isFriday ? colors.accent : colors.textMuted,
                        },
                      ]}
                    >
                      {day.hijriDay}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.legend, { color: colors.textMuted }]}>
              Hijri date shown under each day
              {'\n'}Amber = today · Orange = Friday · Amber dot + icon = Islamic event
            </Text>

            {/* NEW: Events list */}
            <View style={styles.eventsSection}>
              <Hairline style={{ marginVertical: 16, backgroundColor: colors.borderSubtle }} />
              <SectionHeader eyebrow="Islamic Events" title="This Year" subtitle={`${ISLAMIC_EVENTS.length} major dates · by Hijri month`} compact={isCompact} />
              <View style={styles.eventsList}>
                {allEventsWithCountdown.map((event) => (
                  <TouchableOpacity
                    key={`${event.hijriMonth}-${event.hijriDay}`}
                    style={[
                      styles.eventRow,
                      event.inCurrentMonth && styles.eventRowCurrentMonth,
                      { 
                        borderColor: event.inCurrentMonth ? colors.accent : colors.borderSubtle,
                        backgroundColor: event.inCurrentMonth ? '#D4A84310' : colors.bgSurface,
                      },
                    ]}
                    onPress={() => {
                      // Could navigate to that month - for now just feedback
                    }}
                    accessibilityLabel={`${event.name}, ${event.daysUntil} days away`}
                  >
                    <View style={[styles.eventIconWrapper, { backgroundColor: colors.bgRaised }]}>
                      <Ionicons name={getEventIcon(event)} size={20} color={event.inCurrentMonth ? colors.accent : colors.textMuted} />
                    </View>
                    <View style={styles.eventInfo}>
                      <View style={styles.eventHeader}>
                        <Text style={[styles.eventName, { color: colors.textPrimary }]}>{event.name}</Text>
                        {event.inCurrentMonth && (
                          <Text style={styles.eventCurrentBadge}>This month</Text>
                        )}
                      </View>
                      <Text style={[styles.eventArabic, { color: colors.accent }]}>{event.arabic}</Text>
                      <Text style={[styles.eventDate, { color: colors.textSecondary }]}>
                        {event.hijriDay} {HIJRI_MONTH_NAMES[event.hijriMonth - 1]}
                      </Text>
                      <Text style={[styles.eventSignificance, { color: colors.textMuted }]}>{event.significance}</Text>
                    </View>
                    <View style={styles.eventCountdown}>
                      <Text style={[styles.countdownValue, { color: colors.accent }]}>
                        {event.daysUntil === 0 ? 'Today' : event.daysUntil === 1 ? 'Tomorrow' : `${event.daysUntil}d`}
                      </Text>
                      <Text style={[styles.countdownLabel, { color: colors.textMuted }]}>{event.daysUntil === 0 ? '' : 'away'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <Text style={[styles.offlineNote, { color: colors.textMuted }]}>
          Offline, dates follow the tabular Umm al-Qura calendar and may differ by a day from a sighting.
        </Text>
      </View>
    </ScrollView>
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
  content: { paddingVertical: 12, paddingBottom: 40 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
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
  center: { paddingVertical: 60, alignItems: 'center' },

  // Today Panel
  todayCard: { marginBottom: 10 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayMain: { flex: 1 },
  todayLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  todayHijriDate: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 2,
  },
  todayGregorian: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 6,
  },
  todayProgress: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  todayAccent: { padding: 8 },
  nextEventRow: { paddingTop: 4 },
  nextEventContent: {},
  nextEventLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nextEventName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 2,
  },
  nextEventCountdown: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  nextEventSignificance: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  // Navigation
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    marginBottom: 6,
  },
  navBtn: { padding: 6, minWidth: 38, alignItems: 'center' },
  navArrow: { fontSize: 24, lineHeight: 26 },
  navTitle: { alignItems: 'center', flex: 1 },
  monthName: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 20 },
  monthMeta: { fontFamily: 'Manrope_400Regular', fontSize: 11.5, marginTop: 1 },

  // Today jump button
  todayJumpBtn: {
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  todayJumpText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Month strip
  monthStripContainer: { marginBottom: 10 },
  monthStripLabel: {
    fontFamily: 'Manrope_600SemiBold',
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
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChipActive: {
    backgroundColor: '#00000000', // handled by border
  },
  monthChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  monthChipDot: {
    position: 'absolute',
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Grid
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    paddingVertical: 8,
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
  cellFriday: {
    // Friday accent handled via text color
  },
  cellEvent: {
    // Event day indicator
  },
  cellEventIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  gregDay: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  hijriDay: { fontFamily: 'Manrope_400Regular', fontSize: 10, marginTop: 2 },

  // Legend
  legend: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Events list
  eventsSection: { marginTop: 8 },
  eventsList: { gap: 10 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  eventRowCurrentMonth: {
    backgroundColor: '#D4A84310', // subtle amber tint
  },
  eventIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  eventInfo: { flex: 1, minWidth: 0 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  eventName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  eventCurrentBadge: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: '#D4A843',
    backgroundColor: '#D4A84320',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
    writingDirection: 'rtl',
  },
  eventDate: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: 2,
  },
  eventSignificance: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  eventCountdown: {
    alignItems: 'flex-end',
    minWidth: 60,
    paddingTop: 2,
  },
  countdownValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  countdownLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  offlineNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 24,
    textAlign: 'center',
    lineHeight: 16,
  },
});