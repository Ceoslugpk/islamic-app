import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import {
  RAMADAN_GUIDE_SECTIONS,
  SECTION_ICONS,
  getSeasonalBanner,
  type RamadanGuideItem,
  type SeasonalBanner,
} from '../lib/ramadanGuide';
import { refreshGuideItems, type GuideUpdate } from '../lib/prayerGuide';
import { fetchHijriMonth, HIJRI_MONTHS } from '../lib/hijri';
import { getNextEvent } from '../lib/islamicEvents';

interface UpcomingEvent {
  name: string;
  daysUntil: number;
}

export default function RamadanGuideScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  const [updates, setUpdates] = useState<Record<string, GuideUpdate>>({});
  const [banner, setBanner] = useState<SeasonalBanner | null>(null);
  const [hijriLabel, setHijriLabel] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent | null>(null);

  const allItems = useMemo(
    () => RAMADAN_GUIDE_SECTIONS.flatMap((s) => s.items),
    []
  );

  useEffect(() => {
    let alive = true;
    refreshGuideItems(allItems)
      .then((u) => {
        if (alive && Object.keys(u).length > 0) setUpdates(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [allItems]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const now = new Date();
        const month = await fetchHijriMonth(now.getFullYear(), now.getMonth() + 1);
        const day = month.days.find((d) => d.gregorianDay === now.getDate());
        if (!alive || !day) return;
        setBanner(getSeasonalBanner(day.hijriYear, day.hijriMonth, day.hijriDay));
        setHijriLabel(
          `${day.hijriDay} ${HIJRI_MONTHS[(day.hijriMonth - 1) % 12]} ${day.hijriYear} AH`
        );
        const next = getNextEvent(day.hijriYear, day.hijriMonth, day.hijriDay);
        if (next) setUpcoming({ name: next.event.name, daysUntil: next.daysUntil });
      } catch {
        // offline: no seasonal banner
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const renderItem = (item: RamadanGuideItem) => {
    const update = updates[item.id];
    const arabic = update?.arabic ?? item.arabic;
    const translation = update?.translation ?? item.translation;
    const grades = update?.grades ?? item.grades;
    return (
      <Card key={item.id} style={styles.itemCard}>
        <Text style={[styles.itemTitle, { color: colors.accent }]}>{item.title}</Text>
        {arabic ? (
          <ArabicText style={[styles.itemArabic, { color: colors.textPrimary }]}>
            {arabic}
          </ArabicText>
        ) : null}
        {item.transliteration ? (
          <Text style={[styles.itemTranslit, { color: colors.textSecondary }]}>
            {item.transliteration}
          </Text>
        ) : null}
        <Text style={[styles.itemTranslation, { color: colors.textSecondary }]}>
          {translation}
        </Text>
        <View style={styles.refRow}>
          <Ionicons name="book-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.itemRef, { color: colors.textMuted }]} numberOfLines={2}>
            {item.reference}
          </Text>
          {grades ? (
            <View
              style={[
                styles.gradePill,
                { backgroundColor: colors.accent + '12', borderColor: colors.accent + '40' },
              ]}
            >
              <Text style={[styles.gradePillText, { color: colors.accent }]}>{grades}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  const bannerTitle = banner
    ? banner.isRamadan
      ? 'Ramadan Mubarak'
      : banner.isEidAlFitr || banner.isEidAlAdha
        ? 'Eid Mubarak'
        : banner.daysUntilRamadan != null
          ? `Ramadan in ${banner.daysUntilRamadan} days`
          : 'Seasonal Guidance'
    : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[
        styles.content,
        { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
      ]}
    >
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Library"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>
            ← Library
          </Text>
        </TouchableOpacity>
      )}

      <SectionHeader
        compact
        eyebrow="Guides"
        title="Ramadan & Eid Guide"
        subtitle="Fasting, Laylatul Qadr, Itikaf, Zakat al-Fitr, Eid and Tashriq — every narration verified with its collection, number and grade."
      />

      {banner && bannerTitle ? (
        <Card style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View
              style={[
                styles.bannerIcon,
                { backgroundColor: colors.accent + '18', borderColor: colors.accent + '50' },
              ]}
            >
              <Ionicons
                name={
                  banner.isRamadan
                    ? 'moon'
                    : banner.isEidAlFitr || banner.isEidAlAdha
                      ? 'sparkles'
                      : 'calendar-outline'
                }
                size={17}
                color={colors.accent}
              />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>{bannerTitle}</Text>
              {hijriLabel ? (
                <Text style={[styles.bannerMeta, { color: colors.textMuted }]}>{hijriLabel}</Text>
              ) : null}
              {banner.isRamadan ? (
                <Text style={[styles.bannerMeta, { color: colors.textSecondary }]}>
                  {banner.daysUntilLaylatulQadr != null && banner.daysUntilLaylatulQadr > 0
                    ? `Laylatul Qadr expected in ${banner.daysUntilLaylatulQadr} night${
                        banner.daysUntilLaylatulQadr === 1 ? '' : 's'
                      } — search for it on the odd nights.`
                    : 'Seek Laylatul Qadr on every odd night of the last ten nights.'}
                </Text>
              ) : null}
              {upcoming && upcoming.daysUntil > 0 ? (
                <Text style={[styles.bannerMeta, { color: colors.textMuted }]}>
                  Next: {upcoming.name} in {upcoming.daysUntil} day
                  {upcoming.daysUntil === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      ) : null}

      {RAMADAN_GUIDE_SECTIONS.map((section, si) => (
        <View key={section.id} style={styles.sectionWrap}>
          <View style={styles.sectionHeadRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' },
              ]}
            >
              <Ionicons
                name={
                  (SECTION_ICONS[section.id] ?? 'book-outline') as keyof typeof Ionicons.glyphMap
                }
                size={16}
                color={colors.accent}
              />
            </View>
            <View style={styles.sectionTitleCol}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {section.title}
              </Text>
              {section.arabicTitle ? (
                <ArabicText align="left" size={13} style={{ color: colors.textMuted }}>
                  {section.arabicTitle}
                </ArabicText>
              ) : null}
            </View>
          </View>
          {section.items.map(renderItem)}
          {si < RAMADAN_GUIDE_SECTIONS.length - 1 ? (
            <Hairline style={styles.sectionDivider} />
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  bannerCard: { marginBottom: 16, padding: 14 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextCol: { flex: 1 },
  bannerTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  bannerMeta: { fontFamily: 'Manrope_400Regular', fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  sectionWrap: { marginBottom: 18 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleCol: { flex: 1 },
  sectionTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  sectionDivider: { marginTop: 14 },
  itemCard: { marginBottom: 10, padding: 14 },
  itemTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  itemArabic: { fontSize: 17, lineHeight: 27, marginBottom: 6 },
  itemTranslit: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 4,
  },
  itemTranslation: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  itemRef: { fontFamily: 'Manrope_500Medium', fontSize: 10.5, maxWidth: '70%' },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  gradePillText: { fontFamily: 'Manrope_600SemiBold', fontSize: 9.5, letterSpacing: 0.3 },
});
