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
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import {
  PRAYER_GUIDE_SECTIONS,
  SECTION_ICONS,
  refreshGuideItems,
  type GuideUpdate,
  type PrayerGuideItem,
} from '../lib/prayerGuide';

export default function PrayerGuideScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

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
      <Card key={item.id} style={styles.itemCard}>
        <Text style={[styles.itemTitle, { color: colors.forestGreen || colors.accent }]}>{t(item.title)}</Text>
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
          {t(translation)}
        </Text>
        <View style={styles.refRow}>
          <Ionicons name="book-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.itemRef, { color: colors.textMuted }]}>{item.reference}</Text>
          {grades ? (
            <View
              style={[
                styles.gradePill,
                { backgroundColor: colors.sagePill || '#DBE7E1', borderColor: 'transparent' },
              ]}
            >
              <Text style={[styles.gradePillText, { color: colors.forestDark || colors.forestGreen || colors.accent }]}>{grades}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[
        styles.content,
        { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
      ]}
    >
      <ScreenHeader
        title={t('Prayer Guide (Fiqh)')}
        eyebrow={t('Guides')}
        subtitle={t('Wudu, Salah, praying in congregation, Janazah, Istikhara, Eid and Taraweeh — every narration verified with its collection, number and grade.')}
        onBack={onBack}
        backLabel={t('Library')}
      />

      {PRAYER_GUIDE_SECTIONS.map((section, si) => (
        <View key={section.id} style={styles.sectionWrap}>
          <View style={styles.sectionHeadRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.iconCircleBg || '#E0EAE5', borderColor: 'transparent' },
              ]}
            >
              <Ionicons
                name={
                  (SECTION_ICONS[section.id] ?? 'book-outline') as keyof typeof Ionicons.glyphMap
                }
                size={16}
                color={colors.iconCircleFg || colors.forestGreen || colors.accent}
              />
            </View>
            <View style={styles.sectionTitleCol}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t(section.title)}
              </Text>
              {section.arabicTitle ? (
                <ArabicText align="left" size={13} style={{ color: colors.textMuted }}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
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
