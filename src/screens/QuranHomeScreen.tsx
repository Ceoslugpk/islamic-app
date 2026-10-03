import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { fetchSurahList, fetchSurahListForLanguage, SurahMeta } from '../lib/quran';
import { ArabicText } from '../components/ArabicText';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { LastReadPosition, loadLastReadPosition } from '../lib/db';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';

interface QuranHomeScreenProps {
  onOpenSurah: (surahNumber: number, initialAyah?: number) => void;
  onOpenAudio: () => void;
  onOpenTafsir: () => void;
  onOpenTopics: () => void;
  onOpenCompare: () => void;
  onOpenBookmarks: () => void;
  onOpenNotes: () => void;
  onOpenPlans: () => void;
  onOpenHifz: () => void;
}

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

const JUZ_START_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23, 19: 25, 20: 27,
  21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

export default function QuranHomeScreen({
  onOpenSurah,
  onOpenAudio,
  onOpenTafsir,
  onOpenTopics,
  onOpenCompare,
  onOpenBookmarks,
  onOpenNotes,
  onOpenPlans,
  onOpenHifz,
}: QuranHomeScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const horizontalPadding = isCompact ? 12 : isNarrow ? 16 : 20;

  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [translatedNames, setTranslatedNames] = useState<Record<number, string> | null>(null);

  const [surahs, setSurahs] = useState<SurahMeta[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);

  const listRef = useRef<FlatList<SurahMeta>>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list] = await Promise.all([
        fetchSurahList(),
      ]);
      setSurahs(list);
    } catch {
      setError('Could not load the Quran. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load per-language surah names when selected language changes
  useEffect(() => {
    let mounted = true;
    if (language === 'en') {
      setTranslatedNames(null);
    } else {
      fetchSurahListForLanguage(language)
        .then((map) => {
          if (mounted) setTranslatedNames(map);
        })
        .catch(() => {
          if (mounted) setTranslatedNames(null);
        });
    }
    return () => {
      mounted = false;
    };
  }, [language]);

  // Refresh last read on focus/mount
  useEffect(() => {
    setLastRead(loadLastReadPosition());
  }, []);

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return surahs;
    return surahs.filter((s) => {
      const tr = translatedNames?.[s.number]?.toLowerCase() || '';
      return (
        s.englishName.toLowerCase().includes(query) ||
        s.englishNameTranslation.toLowerCase().includes(query) ||
        tr.includes(query) ||
        s.number.toString() === query
      );
    });
  }, [surahs, searchQuery, translatedNames]);

  const handleSelectJuz = (j: number) => {
    const nextJuz = selectedJuz === j ? null : j;
    setSelectedJuz(nextJuz);
    if (nextJuz !== null) {
      const targetSurah = JUZ_START_SURAH[nextJuz];
      const index = filteredSurahs.findIndex((s) => s.number === targetSurah);
      if (index >= 0) {
        try {
          listRef.current?.scrollToIndex({ index, animated: true });
        } catch {
          // ignore if unmeasured
        }
      }
    }
  };

  const handleResumeReading = () => {
    if (lastRead) {
      onOpenSurah(lastRead.surah, lastRead.ayah);
    } else {
      onOpenSurah(1, 1);
    }
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerArea}>
        <SectionHeader eyebrow="The Holy Quran" title="Quran" />

        {/* Translation Language Selector Banner */}
        <View
          style={[
            styles.langBar,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.langBarLeft}>
            <Text style={[styles.langBarLabel, { color: colors.accent }]}>TRANSLATION</Text>
            <Text style={[styles.langBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {flag} {edition.language} <Text style={{ color: colors.textSecondary, fontSize: 12 }}>· {edition.name}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.langChangeBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
            onPress={() => setLangPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Change translation language. Current: ${edition.language}`}
          >
            <Text style={[styles.langChangeBtnText, { color: colors.accent }]}>Change</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Continue Reading Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleResumeReading}
          style={[
            styles.continueCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              padding: isNarrow ? 12 : 16,
            },
          ]}
        >
          <View style={styles.continueLeft}>
            <View style={[styles.continueBadge, { backgroundColor: colors.accentDim }]}>
              <Text style={[styles.continueBadgeText, { color: colors.accent }]}>
                {lastRead ? 'CONTINUE READING' : 'START READING'}
              </Text>
            </View>
            <Text
              style={[
                styles.continueSurahName,
                { color: colors.textPrimary, fontSize: isNarrow ? 19 : 22 },
              ]}
              numberOfLines={1}
            >
              {lastRead?.surahName || (lastRead ? `Surah ${lastRead.surah}` : 'Al-Faatiha')}
            </Text>
            <Text
              style={[
                styles.continueAyahText,
                { color: colors.textSecondary, fontSize: isNarrow ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              {lastRead ? `Resuming at Ayah ${lastRead.ayah}` : 'The Opening · Ayah 1'}
            </Text>
          </View>
          <View
            style={[
              styles.resumeIconWrap,
              {
                backgroundColor: colors.accent,
                width: isNarrow ? 32 : 36,
                height: isNarrow ? 32 : 36,
                borderRadius: isNarrow ? 16 : 18,
              },
            ]}
          >
            <Ionicons name="arrow-forward" size={isNarrow ? 16 : 18} color={colors.onAccent} />
          </View>
        </TouchableOpacity>

        {/* Quick Hub Navigation Cards */}
        <View style={[styles.hubGrid, { gap: isNarrow ? 8 : 10 }]}>
          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenAudio}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="headset-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              Audio Center
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Reciters & Playlists
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenTafsir}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="library-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              Tafsir
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Jalalayn Commentary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenTopics}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="compass-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              Topics
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Thematic Passages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenCompare}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="git-compare-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              Compare
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Dual Translations
            </Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Hub Actions: Bookmarks, Notes, Plans, Hifz */}
        <View style={styles.hubChipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.hubChipsScroll, { gap: isNarrow ? 6 : 8 }]}
          >
            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenBookmarks}
            >
              <Ionicons name="bookmark-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                Bookmarks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenNotes}
            >
              <Ionicons name="create-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                Notes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenPlans}
            >
              <Ionicons name="calendar-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                Reading Plans
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenHifz}
            >
              <Ionicons name="school-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                Hifz Tracker
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Hairline style={styles.sectionDivider} />

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, fontSize: isCompact ? 12.5 : 13 }]}
            placeholder="Search by surah name or meaning..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Juz Filter Scroll */}
        <View style={[styles.juzRow, { gap: isNarrow ? 8 : 10 }]}>
          <Text style={[styles.juzLabel, { color: colors.textMuted }]}>JUZ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.juzScroll, { gap: isNarrow ? 5 : 6 }]}
          >
            {JUZ_LIST.map((j) => {
              const isSelected = selectedJuz === j;
              return (
                <TouchableOpacity
                  key={j}
                  style={[
                    styles.juzPill,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      paddingHorizontal: isCompact ? 9 : 11,
                      paddingVertical: isCompact ? 4 : 5,
                    },
                  ]}
                  onPress={() => handleSelectJuz(j)}
                >
                  <Text
                    style={[
                      styles.juzPillText,
                      {
                        color: isSelected ? colors.onAccent : colors.textSecondary,
                        fontSize: isCompact ? 11.5 : 12,
                      },
                    ]}
                  >
                    {j}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderSurahRow = ({ item }: { item: SurahMeta }) => {
    const trName = translatedNames?.[item.number];
    return (
      <TouchableOpacity
        style={[
          styles.surahRow,
          {
            borderBottomColor: colors.borderSubtle,
            paddingVertical: isCompact ? 11 : 14,
          },
        ]}
        onPress={() => onOpenSurah(item.number)}
        activeOpacity={0.7}
      >
        <View style={styles.surahLeft}>
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                width: isCompact ? 30 : 34,
                height: isCompact ? 30 : 34,
              },
            ]}
          >
            <Text
              style={[
                styles.numberText,
                { color: colors.textSecondary, fontSize: isCompact ? 11 : 12 },
              ]}
            >
              {item.number}
            </Text>
          </View>
          <View style={styles.nameBlock}>
            <Text
              style={[
                styles.englishName,
                { color: colors.textPrimary, fontSize: isCompact ? 14 : 15 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.englishName}
            </Text>
            <Text
              style={[
                styles.metaSubtitle,
                { color: colors.textMuted, fontSize: isCompact ? 11 : 12 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {trName ? `${flag} ${trName} · ` : ''}{item.englishNameTranslation} · {item.numberOfAyahs} ayahs · {item.revelationType}
            </Text>
          </View>
        </View>
        <ArabicText
          size={isCompact ? 18 : 22}
          numberOfLines={1}
          style={styles.arabicName}
        >
          {item.name}
        </ArabicText>
      </TouchableOpacity>
    );
  };

  if (loading && !surahs) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && !surahs) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.accent }]}
          onPress={loadData}
        >
          <Text style={[styles.retryBtnText, { color: colors.accent }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <FlatList
        ref={listRef}
        data={filteredSurahs}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderSurahRow}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={9}
        onScrollToIndexFailed={() => {}}
      />

      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: 8,
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  langBarLeft: {
    flex: 1,
    marginRight: 10,
  },
  langBarLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 1,
    marginBottom: 2,
  },
  langBarTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  langChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  langChangeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 14,
  },
  continueLeft: {
    flex: 1,
  },
  continueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  continueBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  continueSurahName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  continueAyahText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  resumeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  hubCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
  },
  hubIconBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCardTitle: {
    fontFamily: 'Manrope_600SemiBold',
  },
  hubCardSub: {
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  hubChipsRow: {
    marginBottom: 10,
  },
  hubChipsScroll: {},
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  hubChipText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  sectionDivider: {
    marginVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
  },
  juzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  juzLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  juzScroll: {},
  juzPill: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzPillText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  surahLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  numberBadge: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
  },
  metaSubtitle: {
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  arabicName: {
    marginLeft: 6,
    flexShrink: 0,
    maxWidth: '38%',
    textAlign: 'right',
  },
});
