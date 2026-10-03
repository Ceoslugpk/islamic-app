import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../lib/theme';
import { fetchHijriMonth, HijriMonthData } from '../lib/hijri';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<HijriMonthData | null>(null);
  const [loading, setLoading] = useState(true);

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

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.content}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
        >
          <Text style={[styles.backText, { color: colors.accent }]}>← Tools</Text>
        </TouchableOpacity>
      )}

      <SectionHeader eyebrow="Hijri Calendar" title="Islamic Dates" />

      {/* Month navigation */}
      <View style={[styles.navRow, { borderColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => shift(-1)} accessibilityLabel="Previous month" style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.navTitle}>
          <Text style={[styles.monthName, { color: colors.textPrimary }]}>
            {data ? data.hijriMonthName : 'Loading'}
          </Text>
          <Text style={[styles.monthMeta, { color: colors.textMuted }]}>
            {data ? `${data.hijriYear} AH · ${monthName(month)} ${year}` : '...'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => shift(1)} accessibilityLabel="Next month" style={styles.navBtn}>
          <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
        </TouchableOpacity>
      </View>

      {loading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
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
              return (
                <View
                  key={day.gregorianDay}
                  style={[
                    styles.cell,
                    todayCell && {
                      backgroundColor: colors.accentDim,
                      borderColor: colors.accent,
                      borderWidth: 1,
                      borderRadius: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.gregDay,
                      { color: todayCell ? colors.accent : colors.textPrimary },
                    ]}
                  >
                    {day.gregorianDay}
                  </Text>
                  <Text
                    style={[
                      styles.hijriDay,
                      {
                        color: isFriday ? colors.accent : colors.textMuted,
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
            {data.source === 'api' ? 'Umm al-Qura calendar' : 'Offline approximate calendar'} · Hijri day shown under each date
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function monthName(m: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  center: { paddingVertical: 60, alignItems: 'center' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
  },
  navBtn: { padding: 8, minWidth: 44, alignItems: 'center' },
  navArrow: { fontSize: 26, lineHeight: 28 },
  navTitle: { alignItems: 'center' },
  monthName: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22 },
  monthMeta: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
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
  },
  gregDay: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  hijriDay: { fontFamily: 'Manrope_400Regular', fontSize: 10, marginTop: 2 },
  legend: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});
