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
        title="Prayer Guide (Fiqh)"
        subtitle="Wudu, Salah, praying in congregation, Janazah, Istikhara, Eid and Taraweeh — every narration verified with its collection, number and grade."
      />

      {PRAYER_GUIDE_SECTIONS.map((section, si) => (
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
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
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
