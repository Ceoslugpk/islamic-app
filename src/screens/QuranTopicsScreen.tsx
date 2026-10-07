import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { QURAN_TOPICS, QuranTopic, TopicVerse } from '../lib/quranTopics';

interface QuranTopicsScreenProps {
  onBack?: () => void;
  onOpenSurah: (surah: number, ayah: number) => void;
}

export default function QuranTopicsScreen({
  onBack,
  onOpenSurah,
}: QuranTopicsScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(QURAN_TOPICS[0].id);

  const toggleTopic = (id: string) => {
    setSelectedTopicId((curr) => (curr === id ? null : id));
  };

  const renderVerseItem = (verse: TopicVerse, index: number) => {
    return (
      <TouchableOpacity
        key={`${verse.surah}:${verse.ayah}-${index}`}
        activeOpacity={0.7}
        onPress={() => onOpenSurah(verse.surah, verse.ayah)}
        style={[
          styles.verseCard,
          {
            backgroundColor: colors.bgBase,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.verseHeader}>
          <View style={[styles.refBadge, { backgroundColor: colors.accentDim }]}>
            <Text style={[styles.refBadgeText, { color: colors.accent }]}>
              {verse.surahName} {verse.surah}:{verse.ayah}
            </Text>
          </View>
          <Text style={[styles.openLinkText, { color: colors.accent }]}>
            Read in Surah →
          </Text>
        </View>

        <ArabicText size={20} style={styles.verseArabic}>
          {verse.arabicExcerpt}
        </ArabicText>

        <Text style={[styles.verseTranslation, { color: colors.textSecondary }]}>
          "{verse.translation}"
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTopicCard = ({ item }: { item: QuranTopic }) => {
    const isExpanded = selectedTopicId === item.id;
    return (
      <View
        style={[
          styles.topicCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: isExpanded ? colors.accent : colors.borderSubtle,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleTopic(item.id)}
          style={styles.topicHeaderBtn}
          accessibilityRole="button"
          accessibilityLabel={`Toggle topic ${item.title}`}
        >
          <View style={styles.topicTitleRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isExpanded ? colors.accent : colors.bgBase,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={isExpanded ? colors.onAccent : colors.accent}
              />
            </View>
            <View style={styles.topicTextWrap}>
              <Text style={[styles.topicTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
              <ArabicText size={16} style={styles.topicArabicTitle}>
                {item.arabicTitle}
              </ArabicText>
            </View>
          </View>
          <View style={styles.topicActionWrap}>
            <View style={[styles.countPill, { backgroundColor: colors.bgBase }]}>
              <Text style={[styles.countPillText, { color: colors.textMuted }]}>
                {item.verses.length} verses
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Hairline style={styles.divider} />
            <Text style={[styles.topicDesc, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
            <View style={styles.versesList}>
              {item.verses.map((v, i) => renderVerseItem(v, i))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        <View style={[styles.header, { paddingHorizontal: paddingH }]}>
          <ScreenHeader
            eyebrow="Thematic Quran"
            title="Quran Topics"
            subtitle="Curated Quranic passages arranged by core themes of life, faith, and spirituality."
            onBack={onBack}
            backLabel="Quran"
          />
        </View>

        <FlatList
          data={QURAN_TOPICS}
          keyExtractor={(item) => item.id}
          renderItem={renderTopicCard}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
    paddingBottom: 40,
  },
  topicCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topicHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 10,
  },
  topicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topicTextWrap: {
    flex: 1,
  },
  topicTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    flexShrink: 1,
  },
  topicArabicTitle: {
    marginTop: 2,
    lineHeight: 22,
    textAlign: 'left',
  },
  topicActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  countPillText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    marginBottom: 12,
  },
  topicDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  versesList: {
    gap: 10,
  },
  verseCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  refBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
  },
  refBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  openLinkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    flexShrink: 0,
  },
  verseArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
    lineHeight: 30,
  },
  verseTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
});
