import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens } from '../theme/tokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, Chip } from '../components/ui';
import { fontRoles } from '../theme/tokens';
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

  const renderItem = (item: PrayerGuideItem) => {
    const update = updates[item.id];
    const arabic = update?.arabic ?? item.arabic;
    const translation = update?.translation ?? item.translation;
    const grades = update?.grades ?? item.grades;
    return (
      <PremiumCard key={item.id} style={styles.itemCard} padded>
        <Text style={[styles.itemTitle, { color: tokens.textPrimary }]}>{t(item.title)}</Text>
        {arabic ? (
          <ArabicText style={[styles.itemArabic, { color: tokens.textPrimary }]}>
            {arabic}
          </ArabicText>
        ) : null}
        {item.transliteration ? (
          <Text style={[styles.itemTranslit, { color: tokens.textSecondary }]}>
            {item.transliteration}
          </Text>
        ) : null}
        <Text style={[styles.itemTranslation, { color: tokens.textSecondary }]}>
          {t(translation)}
        </Text>
        <View style={styles.refRow}>
          <Ionicons name="book-outline" size={12} color={tokens.textMuted} />
          <Text style={[styles.itemRef, { color: tokens.textMuted }]}>{item.reference}</Text>
          {grades ? (
            <View
              style={[
                styles.gradePill,
                { backgroundColor: tokens.sagePill, borderColor: 'transparent' },
              ]}
            >
              <Text style={[styles.gradePillText, { color: tokens.goldText }]}>{grades}</Text>
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
          contentContainerStyle={[styles.chipsScroll, hScrollRTLStyle()]}
        >
          {PRAYER_GUIDE_SECTIONS.map((sec) => (
            <Chip
              key={sec.id}
              label={t(sec.title.replace('Purification: ', ''))}
              selected={selectedSectionId === sec.id}
              onPress={() => setSelectedSectionId(sec.id)}
            />
          ))}
        </ScrollView>

        {PRAYER_GUIDE_SECTIONS.map((section, si) => (
          <View key={section.id} style={styles.sectionWrap}>
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
                  size={17}
                  color={tokens.iconCircleFg}
                />
              </View>
              <View style={styles.sectionTitleCol}>
                <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
                  {t(section.title)}
                </Text>
                {section.arabicTitle ? (
                  <ArabicText align="left" size={13} style={{ color: tokens.text }}>
                    {section.arabicTitle}
                  </ArabicText>
                ) : null}
              </View>
            </View>
            {section.items.map(renderItem)}
            {si < PRAYER_GUIDE_SECTIONS.length - 1 ? (
              <Hairline style={styles.sectionDivider} />
            ) : null}
          </View>
        ))}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12 },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingRight: 4,
  },
  sectionWrap: { marginBottom: 20 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleCol: { flex: 1 },
  sectionTitle: {
    fontFamily: fontRoles.title,
    fontSize: 18,
    letterSpacing: 0.2,
  },
  sectionDivider: { marginTop: 16, marginBottom: 6 },
  itemCard: { marginBottom: 12 },
  itemTitle: {
    fontFamily: fontRoles.uiBold,
    fontSize: 14.5,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  itemArabic: {
    fontFamily: fontRoles.arabic,
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 6,
  },
  itemTranslit: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 4,
  },
  itemTranslation: { fontFamily: fontRoles.ui, fontSize: 13.5, lineHeight: 20 },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  itemRef: { fontFamily: fontRoles.ui, fontSize: 11, maxWidth: '70%' },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  gradePillText: { fontFamily: fontRoles.uiBold, fontSize: 9.5, letterSpacing: 0.3 },
});
