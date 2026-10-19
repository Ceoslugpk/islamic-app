import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
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

export default function RamadanGuideScreen({
  onBack,
  backLabel = 'Library',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { t } = useTranslation();
  const { tokens } = useThemeTokens();
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

  const renderItem = (item: RamadanGuideItem, isLast = false) => {
    const update = updates[item.id];
    const arabic = update?.arabic ?? item.arabic;
    const translation = update?.translation ?? item.translation;
    const grades = update?.grades ?? item.grades;
    return (
      <PremiumCard
        key={item.id}
        borderRadius={cardTokens.borderRadius}
        style={[styles.itemCard, isLast && { marginBottom: 0 }]}
        contentStyle={styles.readingContent}
        padded
      >
        <AppText variant="rowTitle" style={styles.itemTitle}>{t(item.title)}</AppText>
        {arabic ? (
          <View style={[styles.passagePanel, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
            <ArabicText style={[styles.itemArabic, { color: tokens.textPrimary }]}>
              {arabic}
            </ArabicText>
          </View>
        ) : null}
        {item.transliteration ? (
          <AppText variant="subtitle" tone="faint" style={styles.itemTranslit}>
            {item.transliteration}
          </AppText>
        ) : null}
        <AppText variant="body" style={styles.itemTranslation}>
          {t(translation)}
        </AppText>
        <View style={[styles.refRow, { borderTopColor: tokens.cardBorder }]}>
          <Ionicons name="book-outline" size={14} color={tokens.textMuted} />
          <AppText variant="caption" tone="faint" style={styles.itemRef}>
            {item.reference}
          </AppText>
          {grades ? (
            <View
              style={[
                styles.gradePill,
                { backgroundColor: tokens.sagePill, borderColor: 'transparent' },
              ]}
            >
              <AppText variant="eyebrow" highlight style={styles.gradePillText}>{grades}</AppText>
            </View>
          ) : null}
        </View>
      </PremiumCard>
    );
  };

  const bannerTitle = banner
    ? banner.isRamadan
      ? t('Ramadan Mubarak')
      : banner.isEidAlFitr || banner.isEidAlAdha
        ? t('Eid Mubarak')
        : banner.daysUntilRamadan != null
          ? `${t('Ramadan in')} ${banner.daysUntilRamadan} ${t('days')}`
          : t('Seasonal Guidance')
    : null;

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgBase }}
      header={
        <SubHeader
          title={t('Ramadan & Eid Guide')}
          eyebrow={t('Guides')}
          subtitle={t('Fasting, Laylatul Qadr, Itikaf, Zakat al-Fitr, Eid and Tashriq — every narration verified with its collection, number and grade.')}
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
            alignSelf: 'center',
            width: '100%',
            maxWidth: maxW,
            paddingHorizontal: paddingH,
          },
        ]}
      >
        {banner && bannerTitle ? (
          <PremiumCard
            borderRadius={cardTokens.borderRadius}
            style={styles.bannerCard}
            padded
          >
            <View style={styles.bannerRow}>
              <View
                style={[
                  styles.bannerIcon,
                  { backgroundColor: tokens.iconCircleBg, borderColor: 'transparent' },
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
                  size={18}
                  color={tokens.iconCircleFg}
                />
              </View>
              <View style={styles.bannerTextCol}>
                <AppText variant="sectionTitle" style={styles.bannerTitle}>{bannerTitle}</AppText>
                {hijriLabel ? (
                  <AppText variant="caption" tone="faint" style={styles.bannerMeta}>{hijriLabel}</AppText>
                ) : null}
                {banner.isRamadan ? (
                  <AppText variant="caption" style={styles.bannerMeta}>
                    {banner.daysUntilLaylatulQadr != null && banner.daysUntilLaylatulQadr > 0
                      ? `Laylatul Qadr expected in ${banner.daysUntilLaylatulQadr} night${
                          banner.daysUntilLaylatulQadr === 1 ? '' : 's'
                        } — search for it on the odd nights.`
                      : t('Seek Laylatul Qadr on every odd night of the last ten nights.')}
                  </AppText>
                ) : null}
                {upcoming && upcoming.daysUntil > 0 ? (
                  <AppText variant="caption" tone="faint" style={styles.bannerMeta}>
                    {t('Next')}: {upcoming.name} {t('in')} {upcoming.daysUntil} day
                    {upcoming.daysUntil === 1 ? '' : 's'}
                  </AppText>
                ) : null}
              </View>
            </View>
          </PremiumCard>
        ) : null}

        {RAMADAN_GUIDE_SECTIONS.map((section, si) => {
          const isLastSection = si === RAMADAN_GUIDE_SECTIONS.length - 1;
          return (
            <View key={section.id} style={[styles.sectionWrap, isLastSection && { marginBottom: 0 }]}>
              <View style={styles.sectionHeadRow}>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: tokens.iconCircleBg, borderColor: 'transparent' },
                  ]}
                >
                  <Ionicons
                    name={
                      (SECTION_ICONS[section.id] ?? 'book-outline') as keyof typeof Ionicons.glyphMap
                    }
                    size={18}
                    color={tokens.iconCircleFg}
                  />
                </View>
                <View style={styles.sectionTitleCol}>
                  <AppText variant="sectionTitle" style={styles.sectionTitle}>
                    {t(section.title)}
                  </AppText>
                  {section.arabicTitle ? (
                    <ArabicText align="left" size={14} style={{ color: tokens.textSecondary, marginTop: 2 }}>
                      {section.arabicTitle}
                    </ArabicText>
                  ) : null}
                </View>
              </View>
              {section.items.map((item, ii) => {
                const isLastItem = isLastSection && ii === section.items.length - 1;
                return renderItem(item, isLastItem);
              })}
              {!isLastSection ? (
                <Hairline style={styles.sectionDivider} />
              ) : null}
            </View>
          );
        })}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  readingContent: { padding: 20 },
  passagePanel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  content: {},
  bannerCard: { marginBottom: 16 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerTextCol: { flex: 1, minWidth: 0 },
  bannerTitle: {
    fontSize: 18,
    letterSpacing: 0.1,
  },
  bannerMeta: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionWrap: { marginBottom: 18 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitleCol: { flex: 1, minWidth: 0 },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: 0.1,
  },
  sectionDivider: { marginTop: 16, marginBottom: 6 },
  itemCard: { marginBottom: 12 },
  itemTitle: {
    fontSize: 16,
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  itemArabic: {
    fontSize: 18,
    marginBottom: 6,
  },
  itemTranslit: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemTranslation: {
    fontSize: 14,
    lineHeight: 22,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemRef: {
    fontSize: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  gradePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0,
    flexShrink: 0,
  },
  gradePillText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
