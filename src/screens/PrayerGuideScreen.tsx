import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { isRTL, t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, Chip } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { hScrollRTLStyle } from '../lib/rtl';
import {
  PRAYER_GUIDE_SECTIONS,
  SECTION_ICONS,
  refreshGuideItems,
  type GuideUpdate,
  type PrayerGuideItem,
} from '../lib/prayerGuide';

export default function PrayerGuideScreen({
  onBack,
  backLabel = 'Library',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { tokens } = useThemeTokens();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  const [selectedSectionId, setSelectedSectionId] = useState<string>(PRAYER_GUIDE_SECTIONS[0]?.id || '');
  const [updates, setUpdates] = useState<Record<string, GuideUpdate>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const allItems = useMemo(
    () => PRAYER_GUIDE_SECTIONS.flatMap((s) => s.items),
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

  const renderItem = (item: PrayerGuideItem, isLast = false) => {
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
          <AppText variant="caption" tone="faint" style={styles.itemTranslit}>
            {item.transliteration}
          </AppText>
        ) : null}
        <AppText variant="body" style={styles.itemTranslation}>
          {t(translation)}
        </AppText>
        <View style={[styles.refRow, { borderTopColor: tokens.cardBorder }]}>
          <Ionicons name="book-outline" size={14} color={tokens.textMuted} />
          <AppText variant="caption" tone="faint" style={styles.itemRef}>{item.reference}</AppText>
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

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgBase }}
      header={
        <SubHeader
          title={t('Prayer Guide (Fiqh)')}
          eyebrow={t('Guides')}
          subtitle={t('Wudu, Salah, praying in congregation, Janazah, Istikhara, Eid and Taraweeh — every narration verified with its collection, number and grade.')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[
          styles.content,
          { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
        ]}
      >
        {/* Section Quick Jump Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.chipsScroll, hScrollRTLStyle()]}
        >
          {PRAYER_GUIDE_SECTIONS.map((sec) => (
            <Chip
              key={sec.id}
              label={t(sec.title.replace('Purification: ', ''))}
              selected={selectedSectionId === sec.id}
              onPress={() => {
                setSelectedSectionId(sec.id);
                const offset = sectionOffsets.current[sec.id];
                if (offset !== undefined) {
                  scrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
                }
              }}
            />
          ))}
        </ScrollView>

        {PRAYER_GUIDE_SECTIONS.map((section, si) => {
          const isLastSection = si === PRAYER_GUIDE_SECTIONS.length - 1;
          return (
            <View
              key={section.id}
              onLayout={(event) => { sectionOffsets.current[section.id] = event.nativeEvent.layout.y; }}
              style={[styles.sectionWrap, isLastSection && { marginBottom: 0 }]}
            >
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
                    <ArabicText align={isRTL() ? 'right' : 'left'} size={14} style={{ color: tokens.textSecondary, marginTop: 2 }}>
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
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingEnd: 4,
  },
  sectionWrap: { marginBottom: 20 },
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
  itemCard: { marginBottom: 16 },
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
