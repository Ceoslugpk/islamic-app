import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { useConnectivity } from '../lib/useConnectivity';
import { SurahSkeleton, Skeleton } from '../components/Skeleton';
import {
  downloadSurah,
  removeSurahDownload,
  useSurahDownloads,
  formatBytes,
} from '../lib/surahDownloads';
import { playSurah, resolveReciterName, getSurahBitrate } from '../lib/quranAudio';
import { loadAudioSettings } from '../lib/db';


interface QuranScreenProps {
  onOpenSurah: (n: number) => void;
  onBack?: () => void;
}

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

const JUZ_START_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23, 19: 25, 20: 27,
  21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

const REVELATION_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'Meccan' as const, label: 'Meccan' },
  { value: 'Medinan' as const, label: 'Medinan' },
] as const;

function SurahDownloadAction({
  surah,
  surahName,
  arabicName,
  reciter,
  isOnline,
  isCompact,
}: {
  surah: number;
  surahName: string;
  arabicName: string;
  reciter: string;
  isOnline: boolean;
  isCompact: boolean;
}) {
  const { colors } = useTheme();
  const bitrate = getSurahBitrate(reciter);
  const { isDownloaded, getProgress, downloadedSurahs } = useSurahDownloads();
  const [downloading, setDownloading] = useState(false);

  const downloaded = isDownloaded(reciter, surah, bitrate);
  const progress = getProgress(reciter, surah, bitrate);
  const isCurrentlyDownloading = downloading || progress !== null;

  const downloadMeta = downloadedSurahs.find(
    (d) => d.edition === reciter && d.surah === surah && d.bitrate === bitrate
  );

  const handlePress = async () => {
    if (downloaded) {
      if (!isOnline) {
        // Offline UX: play local audio file immediately with no network request
        await playSurah(reciter, undefined, surahName, resolveReciterName(reciter), surah).catch(() => {});
      } else {
        // Online: tap shows confirm to remove
        Alert.alert(
          'Remove Download',
          `Remove offline audio for Surah ${surahName} (${formatBytes(downloadMeta?.size || 0)})?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                removeSurahDownload(reciter, surah, bitrate).catch(() => {});
              },
            },
          ]
        );
      }
    } else {
      if (isCurrentlyDownloading) return;
      try {
        setDownloading(true);
        await downloadSurah(reciter, surah, bitrate, {
          surahName: arabicName,
          surahEnglishName: surahName,
        });
      } catch {
        Alert.alert('Download Error', 'Could not download surah audio. Please check your connection.');
      } finally {
        setDownloading(false);
      }
    }
  };

  const handleLongPress = () => {
    if (downloaded) {
      Alert.alert(
        'Remove Download',
        `Remove offline audio for Surah ${surahName} (${formatBytes(downloadMeta?.size || 0)})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeSurahDownload(reciter, surah, bitrate).catch(() => {});
            },
          },
        ]
      );
    }
  };

  if (isCurrentlyDownloading) {
    return (
      <View style={styles.downloadActionWrap}>
        <ActivityIndicator size="small" color={colors.accent} style={{ transform: [{ scale: 0.75 }] }} />
        <Text style={[styles.downloadProgressText, { color: colors.accent }]}>
          {progress !== null ? `${progress}%` : '...'}
        </Text>
      </View>
    );
  }

  if (downloaded) {
    if (!isOnline) {
      return (
        <TouchableOpacity
          style={[styles.offlinePlayBadge, { backgroundColor: colors.accent }]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          accessibilityRole="button"
          accessibilityLabel={`Play Surah ${surahName} offline`}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="play" size={10} color={colors.onAccent} />
          <Text style={[styles.offlinePlayText, { color: colors.onAccent }]}>Offline</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.downloadActionWrap}
        onPress={handlePress}
        onLongPress={handleLongPress}
        accessibilityRole="button"
        accessibilityLabel={`Downloaded. Tap to remove Surah ${surahName}`}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
        <Text style={[styles.downloadedSizeText, { color: colors.textMuted }]}>
          {downloadMeta?.size ? formatBytes(downloadMeta.size) : 'Offline'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.downloadActionWrap,
        styles.downloadActionBtn,
        { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Download Surah ${surahName} audio`}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
    >
      <Ionicons name="cloud-download-outline" size={14} color={colors.accent} />
      <Text style={[styles.downloadLabelText, { color: colors.textSecondary }]}>Save</Text>
    </TouchableOpacity>
  );
}

export default function QuranScreen({ onOpenSurah, onBack }: QuranScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const horizontalPadding = isCompact ? 12 : isNarrow ? 16 : 20;

  const { refreshKey, isOnline } = useConnectivity();
  const [reciter] = useState(() => loadAudioSettings().reciter || 'ar.alafasy');


  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [translatedNames, setTranslatedNames] = useState<Record<number, string> | null>(null);

  const [surahs, setSurahs] = useState<SurahMeta[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [selectedRevelation, setSelectedRevelation] = useState<'Meccan' | 'Medinan' | null>(null);
  const listRef = useRef<FlatList<SurahMeta>>(null);

  const loadSurahs = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    setError(null);
    try {
      const data = await fetchSurahList(force);
      setSurahs(data);
    } catch {
      if (!surahs) {
        setError('Could not load the Quran. Check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [surahs]);

  useEffect(() => {
    loadSurahs();
  }, [loadSurahs]);

  // Auto-refresh when connectivity returns
  useEffect(() => {
    if (refreshKey > 0 && surahs) {
      loadSurahs(true);
    }
  }, [refreshKey, surahs, loadSurahs]);

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

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    let result = surahs;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => {
        const tr = translatedNames?.[s.number]?.toLowerCase() || '';
        return (
          s.englishName.toLowerCase().includes(query) ||
          s.englishNameTranslation.toLowerCase().includes(query) ||
          tr.includes(query)
        );
      });
    }

    if (selectedJuz !== null) {
      const startSurah = JUZ_START_SURAH[selectedJuz];
      const nextJuz = selectedJuz < 30 ? selectedJuz + 1 : null;
      const endSurah = nextJuz ? JUZ_START_SURAH[nextJuz] - 1 : 114;
      result = result.filter((s) => s.number >= startSurah && s.number <= endSurah);
    }

    if (selectedRevelation !== null) {
      result = result.filter((s) => s.revelationType === selectedRevelation);
    }

    return result;
  }, [surahs, searchQuery, translatedNames, selectedJuz, selectedRevelation]);

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

  if (loading && !surahs) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bgBase }]}>
        <View style={styles.contentWrap}>
          <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
            <SectionHeader
              compact
              eyebrow="The Holy Quran"
              title="Surahs"
              style={styles.sectionHeader}
            />
            <View
              style={[
                styles.langBar,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.langBarLeft}>
                <Text style={[styles.langBarLabel, { color: colors.accent }]}>TRANSLATION</Text>
                <Skeleton width="60%" height={13} borderRadius={4} />
              </View>
              <Skeleton width={80} height={32} borderRadius={6} />
            </View>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
            >
              <Skeleton width="100%" height={24} borderRadius={8} />
            </View>
            <View style={styles.juzSection}>
              <Skeleton width="40" height={11} borderRadius={4} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.juzScrollView}
                contentContainerStyle={styles.juzScroll}
              >
                {JUZ_LIST.slice(0, 10).map((j) => (
                  <Skeleton key={j} width={40} height={40} borderRadius={20} />
                ))}
              </ScrollView>
            </View>
          </View>
          <FlatList
            data={Array.from({ length: 15 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
            ItemSeparatorComponent={() => <Hairline />}
            renderItem={() => <SurahSkeleton compact={isCompact} />}
          />
        </View>
      </View>
    );
  }

  if (error && !surahs) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <View style={styles.contentWrap}>
          <View style={styles.errorInner}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity
              style={[
                styles.retryBtn,
                { borderColor: colors.accent, backgroundColor: colors.bgSurface },
              ]}
              onPress={() => loadSurahs()}
              accessibilityRole="button"
              accessibilityLabel="Retry loading surahs"
            >
              <Text style={[styles.retryBtnText, { color: colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          {onBack && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to Library"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.backText, { color: colors.accent, fontSize: isNarrow ? 13 : 14 }]}>← Library</Text>
            </TouchableOpacity>
          )}
          <SectionHeader
            compact
            eyebrow="The Holy Quran"
            title="Surahs"
            style={styles.sectionHeader}
          />

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

          {/* Search input */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TextInput
              style={[
                styles.searchInput,
                { color: colors.textPrimary, fontSize: isCompact ? 13 : 14 },
              ]}
              placeholder="Search by name or meaning..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.clearSearchText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

{/* Juz Section Header */}
          <View style={styles.juzSection}>
            <Text style={[styles.juzLabel, { color: colors.textMuted }]}>JUZ</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.juzScrollView, { marginHorizontal: -horizontalPadding }]}
              contentContainerStyle={[
                styles.juzScroll,
                { paddingHorizontal: horizontalPadding, gap: isCompact ? 6 : 8 },
              ]}
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
                        minWidth: isCompact ? 36 : 40,
                        height: isCompact ? 36 : 40,
                        borderRadius: isCompact ? 18 : 20,
                      },
                    ]}
                    onPress={() => handleSelectJuz(j)}
                    accessibilityRole="button"
                    accessibilityLabel={`Juz ${j}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.juzPillText,
                        {
                          color: isSelected ? colors.onAccent : colors.textSecondary,
                          fontSize: isCompact ? 12 : 13,
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

          {/* Revelation Type Filter Chips */}
          <View style={styles.revelationSection}>
            <Text style={[styles.revelationLabel, { color: colors.textMuted }]}>REVELATION</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.revelationScrollView, { marginHorizontal: -horizontalPadding }]}
              contentContainerStyle={[
                styles.revelationScroll,
                { paddingHorizontal: horizontalPadding, gap: isCompact ? 4 : 6 },
              ]}
            >
              {REVELATION_OPTIONS.map((opt) => {
                const isSelected = selectedRevelation === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.revelationChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        paddingHorizontal: isCompact ? 10 : 12,
                        height: isCompact ? 28 : 32,
                        borderRadius: isCompact ? 14 : 16,
                      },
                    ]}
                    onPress={() => setSelectedRevelation(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.revelationChipText,
                        {
                          color: isSelected ? colors.onAccent : colors.textSecondary,
                          fontSize: isCompact ? 10 : 11,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {surahs && (
              <Text
                style={[
                  styles.revelationCounts,
                  { color: colors.textMuted, fontSize: isCompact ? 9 : 10 },
                ]}
              >
                Meccan {surahs.filter((s) => s.revelationType === 'Meccan').length} · Medinan{' '}
                {surahs.filter((s) => s.revelationType === 'Medinan').length} · {surahs.length}
              </Text>
            )}
          </View>
        </View>

        <FlatList
          ref={listRef}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          data={filteredSurahs}
          keyExtractor={(s) => String(s.number)}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
          ItemSeparatorComponent={() => <Hairline />}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={11}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSurahs(true);
              }}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                { paddingVertical: isCompact ? 11 : 14, gap: isCompact ? 10 : 12 },
              ]}
              onPress={() => onOpenSurah(item.number)}
              accessibilityLabel={`Open Surah ${item.englishName}`}
            >
              <View
                style={[
                  styles.numberBadge,
                  {
                    borderColor: colors.borderSubtle,
                    width: isCompact ? 30 : 34,
                    height: isCompact ? 30 : 34,
                    borderRadius: isCompact ? 15 : 17,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.number,
                    { color: colors.accent, fontSize: isCompact ? 12 : 13 },
                  ]}
                >
                  {item.number}
                </Text>
              </View>
              <View style={styles.rowMain}>
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
                    styles.translation,
                    { color: colors.textMuted, fontSize: isCompact ? 11 : 12 },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {translatedNames?.[item.number] ? `${flag} ${translatedNames[item.number]} · ` : ''}{item.englishNameTranslation} · {item.revelationType}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <ArabicText
                  size={isCompact ? 16 : 18}
                  numberOfLines={1}
                  style={styles.arabicName}
                >
                  {item.name}
                </ArabicText>
                <Text
                  style={[
                    styles.ayahCount,
                    { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
                  ]}
                  numberOfLines={1}
                >
                  {item.numberOfAyahs} ayahs
                </Text>
              </View>
              <SurahDownloadAction
                surah={item.number}
                surahName={item.englishName}
                arabicName={item.name}
                reciter={reciter}
                isOnline={isOnline}
                isCompact={isCompact}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No Surahs match &ldquo;{searchQuery}&rdquo;
              </Text>
            </View>
          }
        />
      </View>

      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 12,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  langBarLeft: {
    flex: 1,
    marginRight: 10,
  },
  langBarLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 1,
  },
  langBarTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  langChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  langChangeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    height: '100%',
    padding: 0,
  },
  clearSearchBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  clearSearchText: {
    fontSize: 13,
  },
  juzSection: {
    marginTop: 0,
    marginBottom: 4,
  },
  juzLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  juzScrollView: {
    marginHorizontal: -20,
  },
  juzScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  juzPill: {
    minWidth: 34,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  numberBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  number: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  rowMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  translation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: '30%',
    gap: 2,
  },
  arabicName: {
    textAlign: 'right',
  },
  ayahCount: { fontFamily: 'Manrope_400Regular', fontSize: 11 },
  downloadActionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 0,
  },
  downloadLabelText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  downloadProgressText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    marginTop: 2,
  },
  downloadedSizeText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  offlinePlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    flexShrink: 0,
  },
  offlinePlayText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },
  revelationSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  revelationLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  revelationScrollView: {
    marginHorizontal: -20,
  },
  revelationScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  revelationChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revelationChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  revelationCounts: {
    marginTop: 6,
    fontFamily: 'Manrope_400Regular',
  },
});
