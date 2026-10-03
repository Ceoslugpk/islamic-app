import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { fetchSurah, fetchAyahTafsir, SurahDetail, Ayah } from '../lib/quran';
import { ArabicText, AyahText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import {
  addBookmark,
  getBookmarks,
  isBookmarked,
  removeBookmark,
  VerseRef,
} from '../lib/study';
import {
  addPlaybackListener,
  fetchReciters,
  getAyahAudioUrl,
  getSurahAudioUrl,
  playAyah,
  playSurah,
  Reciter,
  stop,
} from '../lib/quranAudio';
import {
  loadAudioSettings,
  saveAudioSettings,
  saveLastReadPosition,
  saveRecentlyPlayed,
} from '../lib/db';

interface QuranReaderScreenProps {
  surahNumber: number;
  initialAyah?: number;
  onBack: () => void;
}

type ReadingMode = 'cards' | 'mushaf';

const STORAGE_KEY_FONT_SIZE = 'quran-font-size';
const STORAGE_KEY_SHOW_TRANSLATION = 'quran-show-translation';
const STORAGE_KEY_READING_MODE = 'quran-reading-mode';

const DEFAULT_FONT_SIZE = 24;
const MIN_FONT_SIZE = 18;
const MAX_FONT_SIZE = 40;
const FONT_SIZE_STEP = 2;

export default function QuranReaderScreen({
  surahNumber,
  initialAyah,
  onBack,
}: QuranReaderScreenProps) {
  const { colors } = useTheme();
  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState<boolean>(false);
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>('cards');
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);

  // Audio state
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string>('ar.alafasy');
  const [reciterChooserOpen, setReciterChooserOpen] = useState<boolean>(false);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const [reciterLangFilter, setReciterLangFilter] = useState<string>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);
  const [isPlayingSurah, setIsPlayingSurah] = useState<boolean>(false);

  // Ayah Tafsir state
  const [activeTafsirAyah, setActiveTafsirAyah] = useState<number | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState<boolean>(false);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirEdition, setTafsirEdition] = useState<string | null>(null);

  const listRef = useRef<FlatList<Ayah>>(null);

  // Load preferences and reciters
  useEffect(() => {
    (async () => {
      try {
        const [savedFontSize, savedShowTranslation, savedMode, audioSettings, reciterList] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY_FONT_SIZE),
            AsyncStorage.getItem(STORAGE_KEY_SHOW_TRANSLATION),
            AsyncStorage.getItem(STORAGE_KEY_READING_MODE),
            Promise.resolve(loadAudioSettings()),
            fetchReciters().catch(() => [] as Reciter[]),
          ]);

        if (savedFontSize) {
          const parsed = parseInt(savedFontSize, 10);
          if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
            setFontSize(parsed);
          }
        }
        if (savedShowTranslation !== null) {
          setShowTranslation(savedShowTranslation === 'true');
        }
        if (savedMode === 'mushaf' || savedMode === 'cards') {
          setReadingMode(savedMode);
        }
        if (audioSettings && audioSettings.reciter) {
          setSelectedReciter(audioSettings.reciter);
        }
        if (reciterList && reciterList.length > 0) {
          setReciters(reciterList);
        }
        setBookmarks(getBookmarks());
      } catch {
        // use defaults
      }
    })();
  }, []);

  // Listen to audio status
  useEffect(() => {
    const unsub = addPlaybackListener((playing) => {
      setIsPlayingAudio(playing);
      if (!playing) {
        setPlayingAyahNumber(null);
        setIsPlayingSurah(false);
      }
    });
    return () => {
      unsub();
      stop();
    };
  }, []);

  // Fetch Surah data
  const loadSurah = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSurah(surahNumber, true, edition.editionIdentifier);
      setSurah(data);

      // Save last read position
      saveLastReadPosition(surahNumber, initialAyah || 1, data.englishName);
    } catch {
      setError('Could not load Surah. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [surahNumber, initialAyah, edition.editionIdentifier]);

  useEffect(() => {
    loadSurah();
  }, [loadSurah]);

  // Handle auto-scroll to initialAyah if provided
  useEffect(() => {
    if (surah && initialAyah && initialAyah > 1) {
      const targetIndex = initialAyah - 1;
      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
        } catch {
          // ignore measurement miss
        }
      }, 300);
    }
  }, [surah, initialAyah]);

  const handleAdjustFontSize = (delta: number) => {
    setFontSize((current) => {
      const updated = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, current + delta));
      AsyncStorage.setItem(STORAGE_KEY_FONT_SIZE, String(updated)).catch(() => {});
      return updated;
    });
  };

  const handleToggleTranslation = () => {
    setShowTranslation((curr) => {
      const next = !curr;
      AsyncStorage.setItem(STORAGE_KEY_SHOW_TRANSLATION, String(next)).catch(() => {});
      return next;
    });
  };

  const handleToggleReadingMode = () => {
    setReadingMode((curr) => {
      const next = curr === 'cards' ? 'mushaf' : 'cards';
      AsyncStorage.setItem(STORAGE_KEY_READING_MODE, next).catch(() => {});
      return next;
    });
  };

  const handleToggleBookmark = (ayahItem: Ayah) => {
    const bookmarked = isBookmarked(surahNumber, ayahItem.numberInSurah);
    if (bookmarked) {
      removeBookmark(surahNumber, ayahItem.numberInSurah);
    } else {
      addBookmark({
        surah: surahNumber,
        ayah: ayahItem.numberInSurah,
        surahName: surah?.englishName,
        text: (ayahItem.text || '').slice(0, 100),
        translation: (ayahItem.translation || '').slice(0, 120),
      });
    }
    setBookmarks(getBookmarks());
  };

  const bookmarkedSet = useMemo(() => {
    const set = new Set<number>();
    for (const b of bookmarks) {
      if (b.surah === surahNumber) {
        set.add(b.ayah);
      }
    }
    return set;
  }, [bookmarks, surahNumber]);

  // Audio Playback
  const currentReciterObj = reciters.find((r) => r.identifier === selectedReciter);
  const reciterLabel = currentReciterObj ? currentReciterObj.englishName : 'Alafasy';

  const filteredReciters = useMemo(() => {
    const query = reciterSearch.trim().toLowerCase();
    const primaryLangs = ['ar', 'en', 'ur', 'zh', 'fr', 'ru', 'tr', 'fa'];
    return reciters.filter((r) => {
      const langMatch =
        reciterLangFilter === 'all' ||
        (reciterLangFilter === 'other'
          ? !primaryLangs.includes(r.language)
          : r.language === reciterLangFilter);
      if (!langMatch) return false;
      if (!query) return true;
      return (
        r.englishName.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query) ||
        r.identifier.toLowerCase().includes(query) ||
        r.language.toLowerCase().includes(query)
      );
    });
  }, [reciters, reciterSearch, reciterLangFilter]);

  const handlePlaySurahToggle = async () => {
    if (isPlayingSurah) {
      await stop();
      setIsPlayingSurah(false);
      return;
    }
    try {
      const url = getSurahAudioUrl(selectedReciter, surahNumber);
      setIsPlayingSurah(true);
      setPlayingAyahNumber(null);
      await playSurah(selectedReciter, url);
      if (surah) {
        saveRecentlyPlayed({
          type: 'surah',
          identifier: selectedReciter,
          reciterName: reciterLabel,
          surah: surahNumber,
          title: `Surah ${surah.englishName}`,
        });
      }
    } catch {
      setIsPlayingSurah(false);
    }
  };

  const handlePlayAyahToggle = async (ayahNumber: number) => {
    if (playingAyahNumber === ayahNumber && isPlayingAudio) {
      await stop();
      setPlayingAyahNumber(null);
      return;
    }
    try {
      const url = getAyahAudioUrl(selectedReciter, surahNumber, ayahNumber);
      setPlayingAyahNumber(ayahNumber);
      setIsPlayingSurah(false);
      await playAyah(selectedReciter, url);
      if (surah) {
        saveRecentlyPlayed({
          type: 'ayah',
          identifier: selectedReciter,
          reciterName: reciterLabel,
          surah: surahNumber,
          ayah: ayahNumber,
          title: `${surah.englishName} ${surahNumber}:${ayahNumber}`,
        });
      }
    } catch {
      setPlayingAyahNumber(null);
    }
  };

  const handleSelectReciter = (identifier: string) => {
    setSelectedReciter(identifier);
    setReciterChooserOpen(false);
    saveAudioSettings({
      reciter: identifier,
      autoplayNext: true,
      repeatMode: 'none',
    });
  };

  // Tafsir Modal / Panel
  const handleOpenTafsir = async (ayahNumber: number) => {
    if (activeTafsirAyah === ayahNumber) {
      setActiveTafsirAyah(null);
      return;
    }
    setActiveTafsirAyah(ayahNumber);
    setTafsirLoading(true);
    setTafsirText(null);
    setTafsirEdition(null);
    try {
      const res = await fetchAyahTafsir(surahNumber, ayahNumber);
      setTafsirText(res.text);
      setTafsirEdition(res.edition);
    } catch {
      setTafsirText('Could not load Tafsir for this ayah. Please check your connection.');
    } finally {
      setTafsirLoading(false);
    }
  };

  // Share
  const handleShareAyah = (item: Ayah) => {
    const textToShare = `${item.text}\n\n"${item.translation || ''}"\n\n— Surah ${surah?.englishName || ''} [${surahNumber}:${item.numberInSurah}]`;
    Share.share({ message: textToShare }).catch(() => {});
  };

  const renderSurahHeader = () => {
    if (!surah) return null;
    return (
      <View style={styles.surahHeader}>
        <View style={styles.surahEyebrowRow}>
          <Text style={[styles.surahEyebrow, { color: colors.accent }]}>
            SURAH {surah.number}
          </Text>
          <Text style={[styles.surahAyahCount, { color: colors.textMuted }]}>
            {surah.numberOfAyahs} AYAHS
          </Text>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleInfo}>
            <Text style={[styles.englishTitle, { color: colors.textPrimary }]}>
              {surah.englishName}
            </Text>
            <Text style={[styles.englishTranslation, { color: colors.textSecondary }]}>
              {surah.englishNameTranslation}
            </Text>
          </View>
          <ArabicText size={40} style={styles.arabicSurahName}>
            {surah.name}
          </ArabicText>
        </View>

        {/* Audio Bar */}
        <View
          style={[
            styles.audioControlsBar,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.playSurahBtn,
              { backgroundColor: isPlayingSurah ? colors.accent : colors.accentDim },
            ]}
            onPress={handlePlaySurahToggle}
            accessibilityRole="button"
            accessibilityLabel={isPlayingSurah ? 'Pause Surah Audio' : 'Play Surah Audio'}
          >
            <Ionicons
              name={isPlayingSurah ? 'pause' : 'play'}
              size={16}
              color={isPlayingSurah ? colors.onAccent : colors.accent}
            />
            <Text
              style={[
                styles.playSurahBtnText,
                { color: isPlayingSurah ? colors.onAccent : colors.accent },
              ]}
            >
              {isPlayingSurah ? 'Playing Surah' : 'Play Full Surah'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reciterPill}
            onPress={() => setReciterChooserOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose reciter"
          >
            <Ionicons name="mic-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.reciterNameText, { color: colors.textSecondary }]} numberOfLines={1}>
              {reciterLabel}
            </Text>
            {currentReciterObj && currentReciterObj.language !== 'ar' && (
              <View
                style={[
                  styles.inlineLangTag,
                  { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
              >
                <Text style={[styles.inlineLangTagText, { color: colors.accent }]}>
                  {currentReciterObj.language.toUpperCase()}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Bismillah (except Surah 9 At-Tawbah and Surah 1 where it is Ayah 1) */}
        {surah.number !== 9 && surah.number !== 1 && (
          <View style={styles.bismillahBox}>
            <ArabicText size={26} style={[styles.bismillahText, { color: colors.textPrimary }]}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </ArabicText>
          </View>
        )}

        <Hairline style={styles.headerHairline} />
      </View>
    );
  };

  const renderAyahItem = ({ item }: { item: Ayah }) => {
    const isBookmarked = bookmarkedSet.has(item.numberInSurah);
    const isAyahPlaying = isPlayingAudio && playingAyahNumber === item.numberInSurah;
    const isTafsirOpen = activeTafsirAyah === item.numberInSurah;

    return (
      <View
        style={[
          styles.ayahCard,
          {
            backgroundColor: isAyahPlaying ? colors.accentDim : colors.bgSurface,
            borderColor: isAyahPlaying ? colors.accent : colors.borderSubtle,
          },
        ]}
      >
        {/* Action Header */}
        <View style={styles.ayahActionBar}>
          <View style={[styles.ayahBadge, { backgroundColor: colors.accentDim }]}>
            <Text style={[styles.ayahBadgeText, { color: colors.accent }]}>
              {item.numberInSurah}
            </Text>
          </View>

          <View style={styles.actionsGroup}>
            {/* Play Ayah */}
            <TouchableOpacity
              onPress={() => handlePlayAyahToggle(item.numberInSurah)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel={`Play Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={isAyahPlaying ? 'pause-circle' : 'play-circle-outline'}
                size={22}
                color={isAyahPlaying ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Tafsir */}
            <TouchableOpacity
              onPress={() => handleOpenTafsir(item.numberInSurah)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel={`Tafsir for Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={isTafsirOpen ? 'book' : 'book-outline'}
                size={19}
                color={isTafsirOpen ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Bookmark */}
            <TouchableOpacity
              onPress={() => handleToggleBookmark(item)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel={`Bookmark Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={19}
                color={isBookmarked ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              onPress={() => handleShareAyah(item)}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel={`Share Ayah ${item.numberInSurah}`}
            >
              <Ionicons name="share-social-outline" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arabic Text */}
        <AyahText
          text={item.text}
          numberInSurah={item.numberInSurah}
          size={fontSize}
        />

        {/* Translation */}
        {showTranslation && item.translation && (
          <View style={styles.translationWrap}>
            <Text style={[styles.translationTag, { color: colors.textMuted }]}>
              {flag} {edition.name}
            </Text>
            <Text style={[styles.translationText, { color: colors.textSecondary }]}>
              {item.translation}
            </Text>
          </View>
        )}

        {/* Inline Tafsir Panel if opened */}
        {isTafsirOpen && (
          <View
            style={[
              styles.inlineTafsirBox,
              { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.tafsirHeader}>
              <Text style={[styles.tafsirTitle, { color: colors.accent }]}>
                {tafsirEdition || 'Tafsir al-Jalalayn'}
              </Text>
              <TouchableOpacity onPress={() => setActiveTafsirAyah(null)}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {tafsirLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
            ) : (
              <ArabicText size={17} style={styles.inlineTafsirText}>
                {tafsirText || ''}
              </ArabicText>
            )}
          </View>
        )}
      </View>
    );
  };

  // Mushaf continuous text view
  const renderMushafMode = () => {
    if (!surah) return null;
    return (
      <ScrollView contentContainerStyle={styles.mushafScrollContent}>
        {renderSurahHeader()}

        <View
          style={[
            styles.mushafContainer,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          <Text style={styles.mushafParagraph}>
            {surah.ayahs.map((a) => (
              <Text key={`mushaf-${a.numberInSurah}`}>
                <Text
                  style={{
                    fontFamily: 'Amiri_400Regular',
                    fontSize: fontSize + 2,
                    color: colors.textPrimary,
                    lineHeight: Math.round((fontSize + 2) * 2.1),
                    writingDirection: 'rtl',
                  }}
                >
                  {a.text}{' '}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Amiri_400Regular',
                    fontSize: fontSize - 2,
                    color: colors.accent,
                  }}
                >
                  ۝{toArabicNumerals(a.numberInSurah)}{' '}
                </Text>
              </Text>
            ))}
          </Text>
        </View>

        {showTranslation && (
          <View style={styles.mushafTranslationsWrap}>
            <Text style={[styles.mushafTranslationsHeading, { color: colors.accent }]}>
              TRANSLATION ({flag} {edition.name.toUpperCase()})
            </Text>
            {surah.ayahs.map((a) => (
              <View key={`tr-${a.numberInSurah}`} style={styles.mushafTranslationRow}>
                <Text style={[styles.mushafAyahBadge, { color: colors.accent }]}>
                  {a.numberInSurah}
                </Text>
                <Text style={[styles.mushafTranslationText, { color: colors.textSecondary }]}>
                  {a.translation}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  if (loading && !surah) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && !surah) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.accent }]}
          onPress={loadSurah}
          accessibilityRole="button"
          accessibilityLabel="Retry loading surah"
        >
          <Text style={[styles.retryBtnText, { color: colors.accent }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Quran"
        >
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent }]}>Quran</Text>
        </TouchableOpacity>

        {/* Toolbar: Mode Toggle, Translation, Font adjustments */}
        <View style={styles.toolbar}>
          {/* Reading Mode Switcher */}
          <TouchableOpacity
            style={[
              styles.toolBtn,
              {
                backgroundColor: readingMode === 'mushaf' ? colors.accentDim : 'transparent',
                borderColor: readingMode === 'mushaf' ? colors.accent : colors.borderSubtle,
              },
            ]}
            onPress={handleToggleReadingMode}
            accessibilityRole="button"
            accessibilityLabel={`Toggle mode. Current: ${readingMode}`}
          >
            <Ionicons
              name={readingMode === 'mushaf' ? 'book' : 'list'}
              size={17}
              color={readingMode === 'mushaf' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Language Picker Button: opens modal */}
          <TouchableOpacity
            style={[
              styles.langToolBtn,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
            onPress={() => setLangPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Change translation language. Current: ${edition.language} ${flag}`}
          >
            <Text style={[styles.langToolText, { color: colors.accent }]}>
              {language.toUpperCase()} {flag}
            </Text>
          </TouchableOpacity>

          {/* Translation Toggle */}
          <TouchableOpacity
            style={[
              styles.toolBtn,
              {
                backgroundColor: showTranslation ? colors.accentDim : 'transparent',
                borderColor: showTranslation ? colors.accent : colors.borderSubtle,
              },
            ]}
            onPress={handleToggleTranslation}
            accessibilityRole="button"
            accessibilityLabel={showTranslation ? 'Hide Translation' : 'Show Translation'}
          >
            <Ionicons
              name={showTranslation ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={15}
              color={showTranslation ? colors.accent : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Font size down */}
          <TouchableOpacity
            style={[styles.toolBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => handleAdjustFontSize(-FONT_SIZE_STEP)}
            accessibilityRole="button"
            accessibilityLabel="Decrease font size"
          >
            <Text style={[styles.toolBtnText, { color: colors.textPrimary }]}>A−</Text>
          </TouchableOpacity>

          {/* Font size up */}
          <TouchableOpacity
            style={[styles.toolBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => handleAdjustFontSize(FONT_SIZE_STEP)}
            accessibilityRole="button"
            accessibilityLabel="Increase font size"
          >
            <Text style={[styles.toolBtnText, { color: colors.textPrimary }]}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main View: Cards vs Mushaf */}
      {readingMode === 'mushaf' ? (
        renderMushafMode()
      ) : (
        <FlatList
          ref={listRef}
          data={surah?.ayahs || []}
          keyExtractor={(item) => String(item.numberInSurah)}
          renderItem={renderAyahItem}
          ListHeaderComponent={renderSurahHeader}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          onScrollToIndexFailed={() => {}}
        />
      )}

      {/* Reciter Chooser Modal */}
      <Modal
        visible={reciterChooserOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setReciterChooserOpen(false)}
      >
        <View style={[styles.modalWrap, { backgroundColor: colors.bgBase }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Select Reciter
            </Text>
            <TouchableOpacity
              onPress={() => setReciterChooserOpen(false)}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.reciterSearchWrap,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              placeholder="Search reciters or languages..."
              placeholderTextColor={colors.textMuted}
              value={reciterSearch}
              onChangeText={setReciterSearch}
              style={[styles.reciterSearchInput, { color: colors.textPrimary }]}
            />
            {reciterSearch.length > 0 && (
              <TouchableOpacity onPress={() => setReciterSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Language Filter Chips */}
          <View style={{ height: 44 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reciterFilterChipScroll}
            >
              {(
                [
                  { key: 'all', label: 'All Reciters' },
                  { key: 'ar', label: 'Arabic' },
                  { key: 'en', label: 'English' },
                  { key: 'ur', label: 'Urdu' },
                  { key: 'zh', label: 'Chinese' },
                  { key: 'fr', label: 'French' },
                  { key: 'ru', label: 'Russian' },
                  { key: 'tr', label: 'Turkish' },
                  { key: 'fa', label: 'Persian' },
                  { key: 'other', label: 'More' },
                ] as const
              ).map((chip) => {
                const isSelected = reciterLangFilter === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    onPress={() => setReciterLangFilter(chip.key)}
                    style={[
                      styles.reciterFilterChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reciterFilterChipText,
                        { color: isSelected ? '#121110' : colors.textSecondary },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={filteredReciters}
            keyExtractor={(item) => item.identifier}
            contentContainerStyle={styles.reciterList}
            renderItem={({ item }) => {
              const isSelected = item.identifier === selectedReciter;
              return (
                <TouchableOpacity
                  style={[
                    styles.reciterRow,
                    {
                      borderBottomColor: colors.borderSubtle,
                      backgroundColor: isSelected ? colors.accentDim : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelectReciter(item.identifier)}
                >
                  <View style={styles.reciterInfo}>
                    <View style={styles.reciterTitleRow}>
                      <Text style={[styles.reciterEngName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.englishName}
                      </Text>
                      <View
                        style={[
                          styles.reciterLangBadge,
                          {
                            backgroundColor: item.language === 'ar' ? colors.bgSurface : colors.accentDim,
                            borderColor: item.language === 'ar' ? colors.borderSubtle : colors.accent,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.reciterLangBadgeText,
                            { color: item.language === 'ar' ? colors.textMuted : colors.accent },
                          ]}
                        >
                          {item.language.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {item.name ? (
                      <Text style={[styles.reciterArabicName, { color: colors.textMuted }]}>
                        {item.name}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Language Chooser Modal */}
      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />
    </View>
  );
}

function toArabicNumerals(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((c) => digits[parseInt(c, 10)] ?? c)
    .join('');
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  langToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  langToolText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  translationWrap: {
    marginTop: 8,
    gap: 3,
  },
  translationTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  surahHeader: {
    marginBottom: 16,
  },
  surahEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  surahEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  surahAyahCount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  titleInfo: {
    flex: 1,
  },
  englishTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
  },
  englishTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  arabicSurahName: {
    marginLeft: 12,
  },
  audioControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  playSurahBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  playSurahBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  reciterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reciterNameText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
  bismillahBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  bismillahText: {
    textAlign: 'center',
  },
  headerHairline: {
    marginTop: 8,
  },
  ayahCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ayahActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ayahBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ayahBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  arabicAyahText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  translationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  inlineTafsirBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tafsirHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tafsirTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  inlineTafsirText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 28,
  },
  mushafScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mushafContainer: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  mushafParagraph: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mushafTranslationsWrap: {
    gap: 10,
  },
  mushafTranslationsHeading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mushafTranslationRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  mushafAyahBadge: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    minWidth: 24,
  },
  mushafTranslationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  modalWrap: {
    flex: 1,
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  closeBtn: {
    padding: 6,
  },
  reciterList: {
    paddingHorizontal: 20,
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  reciterInfo: {
    flex: 1,
  },
  reciterEngName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  reciterArabicName: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  inlineLangTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  inlineLangTagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
  },
  reciterSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  reciterSearchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },
  reciterFilterChipScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 10,
  },
  reciterFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  reciterFilterChipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  reciterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reciterLangBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  reciterLangBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
  },
});
