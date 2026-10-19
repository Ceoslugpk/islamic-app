import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { QURAN_TOPICS, QuranTopic, TopicVerse } from '../lib/quranTopics';
import { t } from '../lib/i18n';

interface QuranTopicsScreenProps {
  onBack?: () => void;
  onOpenSurah: (surah: number, ayah: number) => void;
}

export default function QuranTopicsScreen({
  onBack,
  onOpenSurah,
}: QuranTopicsScreenProps) {
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;
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
          getCardShadow(mode),
          {
            backgroundColor: tokens.cardTop,
            borderColor: tokens.cardBorder,
          },
        ]}
      >
        <View style={styles.verseHeader}>
          <View style={[styles.refBadge, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, borderWidth: 1 }]}>
            <AppText variant="caption" highlight style={styles.refBadgeText}>
              {verse.surahName} {verse.surah}:{verse.ayah}
            </AppText>
          </View>
          <AppText variant="link" style={styles.openLinkText}>
            {t('Read in Surah →')}
          </AppText>
        </View>

        <ArabicText size={20} style={[styles.verseArabic, { color: tokens.text }]}>
          {verse.arabicExcerpt}
        </ArabicText>

        <AppText variant="body" tone="faint" style={styles.verseTranslation}>
          {`"${verse.translation}"`}
        </AppText>
      </TouchableOpacity>
    );
  };

  const renderTopicCard = ({ item }: { item: QuranTopic }) => {
    const isExpanded = selectedTopicId === item.id;
    return (
      <PremiumCard
        style={styles.topicCard}
        padded={false}
        borderColor={isExpanded ? tokens.gold : tokens.cardBorder}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleTopic(item.id)}
          style={styles.topicHeaderBtn}
          accessibilityRole="button"
          accessibilityLabel={`${t('Toggle topic')} ${t(item.title)}`}
        >
          <View style={styles.topicTitleRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isExpanded ? tokens.gold : tokens.ringFill,
                  borderColor: isExpanded ? tokens.gold : tokens.ringBorder,
                },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={isExpanded ? tokens.onGold : tokens.goldText}
              />
            </View>
            <View style={styles.topicTextWrap}>
              <AppText variant="sectionTitle" style={styles.topicTitle} numberOfLines={2}>
                {t(item.title)}
              </AppText>
              <ArabicText size={16} style={[styles.topicArabicTitle, { color: tokens.arabicName }]}>
                {item.arabicTitle}
              </ArabicText>
            </View>
          </View>
          <View style={styles.topicActionWrap}>
            <View style={[styles.countPill, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, borderWidth: 1 }]}>
              <AppText variant="caption" highlight style={styles.countPillText}>
                {item.verses.length} {t('verses')}
              </AppText>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.muted}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Hairline style={styles.divider} />
            <AppText variant="body" tone="faint" style={styles.topicDesc}>
              {t(item.description)}
            </AppText>
            <View style={styles.versesList}>
              {item.verses.map((v, i) => renderVerseItem(v, i))}
            </View>
          </View>
        )}
      </PremiumCard>
    );
  };

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Thematic Quran')}
          title={t('Quran Topics')}
          subtitle={t('Curated Quranic passages arranged by core themes of life, faith, and spirituality.')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
        />
      }
    >
      <DetailScreen.FlatList
        style={styles.contentWrap}
        data={QURAN_TOPICS}
        keyExtractor={(item) => item.id}
        renderItem={renderTopicCard}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: paddingH },
        ]}
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
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
  },
  listContent: {},
  topicCard: {
    borderRadius: 14,
    minHeight: 56,
  },
  topicHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 52,
    gap: 10,
  },
  topicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topicTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  topicTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    flexShrink: 1,
  },
  topicArabicTitle: {
    marginTop: 2,
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
    borderRadius: 12,
    flexShrink: 0,
  },
  countPillText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
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
    fontSize: 14,
    marginBottom: 14,
  },
  versesList: {
    gap: 10,
  },
  verseCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 80,
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
    borderRadius: 12,
    flexShrink: 0,
  },
  refBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  openLinkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    flexShrink: 0,
  },
  verseArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  verseTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
