import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  BackHandler,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getCardShadow, getHeroCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { ArabicText } from '../components/ArabicText';
import { SURAHS_114, SurahSummary } from '../lib/surahs114';
import { HifzStatus, saveHifzStatus, loadHifzStatuses } from '../lib/db';
import { EmptyState } from '../components/EmptyState';
import { HifzPracticeScreen } from './HifzPracticeScreen';

type FilterTab = 'All' | 'Memorized' | 'Revising' | 'Not started';

const FILTER_TABS: FilterTab[] = ['All', 'Memorized', 'Revising', 'Not started'];

const NEXT_STATUS: Record<HifzStatus, HifzStatus> = {
  'not-started': 'revising',
  'revising': 'memorized',
  'memorized': 'not-started',
};

export default function HifzScreen({ onBack }: { onBack?: () => void }) {
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;

  const [statuses, setStatuses] = useState<Record<number, HifzStatus>>(() => loadHifzStatuses());
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [practiceSurah, setPracticeSurah] = useState<number | null>(null);

  // Return from practice sub-screen on Android hardware back
  useEffect(() => {
    if (practiceSurah === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPracticeSurah(null);
      return true;
    });
    return () => sub.remove();
  }, [practiceSurah]);

  const handleCycleStatus = useCallback(async (surahNumber: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    const current = statuses[surahNumber] || 'not-started';
    const next = NEXT_STATUS[current];

    setStatuses((prev) => ({
      ...prev,
      [surahNumber]: next,
    }));
    saveHifzStatus(surahNumber, next);
  }, [statuses]);

  // Statistics
  const stats = useMemo(() => {
    let memorized = 0;
    let revising = 0;
    let notStarted = 0;

    for (const surah of SURAHS_114) {
      const s = statuses[surah.number] || 'not-started';
      if (s === 'memorized') memorized++;
      else if (s === 'revising') revising++;
      else notStarted++;
    }

    const percent = Math.round((memorized / 114) * 100);
    return { memorized, revising, notStarted, percent };
  }, [statuses]);

  const filteredSurahs = useMemo(() => {
    let list = SURAHS_114;

    if (activeFilter === 'Memorized') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'memorized');
    } else if (activeFilter === 'Revising') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'revising');
    } else if (activeFilter === 'Not started') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'not-started');
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        s.number.toString() === q
    );
  }, [activeFilter, searchQuery, statuses]);

  const renderStatusBadge = (status: HifzStatus) => {
    if (status === 'memorized') {
      return (
        <View
          style={[
            styles.badge,
            getPillShadow(mode),
            {
              backgroundColor: tokens.gold,
              borderColor: tokens.goldBorder,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={13} color={tokens.onGold} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: tokens.onGold }]}>{t('Memorized')}</Text>
        </View>
      );
    }
    if (status === 'revising') {
      return (
        <View
          style={[
            styles.badge,
            getPillShadow(mode),
            {
              backgroundColor: tokens.ringFill,
              borderColor: tokens.ringBorder,
            },
          ]}
        >
          <Ionicons name="sync-outline" size={13} color={tokens.goldText} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: tokens.goldText }]}>{t('Revising')}</Text>
        </View>
      );
    }
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: tokens.ringFill,
            borderColor: tokens.cardBorder,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: tokens.muted }]}>{t('Not started')}</Text>
      </View>
    );
  };

  const renderSurah = ({ item }: { item: SurahSummary }) => {
    const status = statuses[item.number] || 'not-started';
    const statusLabel = status === 'memorized' ? t('Memorized') : status === 'revising' ? t('Revising') : t('Not started');

    return (
      <TouchableOpacity
        style={[
          styles.rowCard,
          getCardShadow(mode),
          {
            backgroundColor: tokens.cardTop,
            borderColor: tokens.cardBorder,
          },
        ]}
        onPress={() => handleCycleStatus(item.number)}
        accessibilityRole="button"
        accessibilityLabel={`${t('Surah')} ${item.number} ${item.englishName}. ${t('Status')}: ${statusLabel}. ${t('Tap to cycle')}.`}
      >
        <View
          style={[
            styles.numberBox,
            getPillShadow(mode),
            {
              backgroundColor: tokens.ringFill,
              borderColor: tokens.ringBorder,
            },
          ]}
        >
          <Text style={[styles.numberText, { color: tokens.goldText }]}>
            {item.number}
          </Text>
        </View>

        <View style={styles.midCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.englishName, { color: tokens.text }]} numberOfLines={1}>
              {item.englishName}
            </Text>
            <Text style={[styles.ayahCount, { color: tokens.muted }]}>
              {item.numberOfAyahs} {t('ayahs')} · {t(item.revelationType)}
            </Text>
          </View>
          <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
            {renderStatusBadge(status)}
          </View>
        </View>

        <View style={styles.rightCol}>
          <ArabicText size={20} align="right" style={[styles.arabicName, { color: tokens.arabicName }]} numberOfLines={1}>
            {item.name}
          </ArabicText>
          <View style={styles.rowActions}>
            <TouchableOpacity
              onPress={() => setPracticeSurah(item.number)}
              style={[
                styles.practiceBtn,
                getPillShadow(mode),
                {
                  backgroundColor: tokens.ringFill,
                  borderColor: tokens.goldBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t('Practice')} ${item.englishName}`}
            >
              <Ionicons name="eye-outline" size={12} color={tokens.goldText} />
              <Text style={[styles.practiceText, { color: tokens.goldText }]}>{t('Practice')}</Text>
            </TouchableOpacity>
            <Text style={[styles.tapHint, { color: tokens.muted }]}>
              {t('Tap to cycle')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (practiceSurah !== null) {
    return (
      <HifzPracticeScreen
        surahNumber={practiceSurah}
        onBack={() => setPracticeSurah(null)}
      />
    );
  }

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Memorization')}
          title={t('Hifz Tracker')}
          subtitle={t('Track memorization progress, revisions, and test recall')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
          showFade
        />
      }
    >
      <View style={styles.contentWrap}>
        {/* Summary Scorecard */}
        <View style={{ paddingHorizontal: paddingH, paddingTop: 12 }}>
          <View
            style={[
              styles.summaryCard,
              getHeroCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: tokens.goldText }]}>
                {stats.memorized}
              </Text>
              <Text style={[styles.statLabel, { color: tokens.muted }]}>
                {t('MEMORIZED')}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: tokens.cardBorder }]} />

            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: tokens.text }]}>
                {stats.revising}
              </Text>
              <Text style={[styles.statLabel, { color: tokens.muted }]}>
                {t('REVISING')}
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: tokens.cardBorder }]} />

            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: tokens.muted }]}>
                {stats.notStarted}
              </Text>
              <Text style={[styles.statLabel, { color: tokens.muted }]}>
                {t('NOT STARTED')}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Input */}
        <View style={{ paddingHorizontal: paddingH }}>
          <View
            style={[
              styles.searchBox,
              getPillShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <Ionicons name="search" size={16} color={tokens.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('Search surahs by name or number...')}
              placeholderTextColor={tokens.muted}
              style={[
                styles.searchInput,
                { color: tokens.text },
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={tokens.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, { paddingHorizontal: paddingH }]}>
          {FILTER_TABS.map((tab) => {
            const isSelected = tab === activeFilter;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterTab,
                  getPillShadow(mode),
                  {
                    backgroundColor: isSelected ? tokens.gold : tokens.ringFill,
                    borderColor: isSelected ? tokens.goldBorder : tokens.ringBorder,
                  },
                ]}
                onPress={() => setActiveFilter(tab)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isSelected ? tokens.onGold : tokens.muted },
                  ]}
                >
                  {t(tab)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Surahs List */}
        <DetailScreen.FlatList
          data={filteredSurahs}
          keyExtractor={(item) => item.number.toString()}
          renderItem={renderSurah}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('No surahs found')}
              subtitle={
                searchQuery
                  ? `${t('Nothing matches')} "${searchQuery}". ${t('Try a different name or number.')}`
                  : t('Nothing in this category yet — tap a surah to start memorizing.')
              }
              actionLabel={t('Clear filters')}
              onAction={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
            />
          }
        />
      </View>
    </DetailScreen>
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: cardTokens.borderWidth,
    borderRadius: 20,
    paddingVertical: 14,
    marginBottom: 10,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: cardTokens.borderWidth,
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: cardTokens.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  headerWrap: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  listContent: {
    paddingTop: 8,
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: cardTokens.borderWidth,
    gap: 12,
  },
  numberBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: cardTokens.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
  },
  midCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'column',
    gap: 2,
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  ayahCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: cardTokens.borderWidth,
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 70,
    flexShrink: 1,
  },
  arabicName: {
    lineHeight: 28,
  },
  tapHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
    rowGap: 4,
    marginTop: 4,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: cardTokens.borderWidth,
  },
  practiceText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
});
