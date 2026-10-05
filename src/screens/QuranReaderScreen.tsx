import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ViewabilityConfig, ViewToken } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../lib/haptics';
import { iconSizes } from '../lib/iconMap';
import { fetchSurah, fetchAyahTafsir, SurahDetail, Ayah } from '../lib/quran';
import { ArabicText, AyahText, QURAN_FONT_FAMILIES } from '../components/ArabicText';
import { useSettings, QURAN_FONT_SIZE_MIN, QURAN_FONT_SIZE_MAX, QURAN_FONT_SIZE_STEP } from '../lib/settings';
import { TAFSIR_SOURCES } from '../lib/tafsirSources';
import { Hairline } from '../components/Hairline';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { saveReadingPosition } from '../lib/continuing';
import { recordQuranReadingSession } from '../lib/quranProgress';
import { recordSurahVisit } from '../lib/recentSurahs';
import { preloadRemainingSurahsForEdition } from '../lib/quranPreloader';
import {
  addBookmark,
  getBookmarks,
  isBookmarked,
  removeBookmark,
  VerseRef,
} from '../lib/study';
import {
  addPlaybackListener,
  addPlaybackStatusListener,
  fetchReciters,
  getAyahAudioUrl,
  getCurrentPlayback,
  getReciterCountry,
  getSurahAudioUrl,
  getSurahBitrate,
  playAyah,
  playSurah,
  Reciter,
  stop,
} from '../lib/quranAudio';
import {
  downloadSurah,
  removeSurahDownload,
  isSurahDownloaded,
  getDownloadProgress,
  getDownloadedSurahs,
  formatBytes,
} from '../lib/surahDownloads';
import {
  loadAudioSettings,
  loadQuranCache,
  saveAudioSettings,
  saveLastReadPosition,
  saveRecentlyPlayed,
} from '../lib/db';

interface QuranReaderScreenProps {
  surahNumber: number;
  initialAyah?: number;
  onBack: () => void;
  onNavigateSurah?: (surah: number) => void;
}

type ReadingMode = 'cards' | 'mushaf';

const STORAGE_KEY_READING_MODE = 'quran-reading-mode';

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 1,
  minimumViewTime: 500,
};

/**
 * Strips leading Bismillah from ayah text if present.
 * AlQuran Cloud's `quran-uthmani` text embeds the Bismillah at the beginning of Ayah 1
 * for surahs 2-114 (except Surah 9).
 */
const LEADING_BISMILLAH_REGEX =
  /^[\s\uFEFF]*ب[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*س[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*م[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s+[ٱا][\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ه[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s+[ٱا][\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ر[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ح[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*م[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ن[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s+[ٱا][\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ر[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ح[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ي[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*م[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s*/u;

export function stripBismillah(text: string): string {
  if (!text) return text;
  return text.replace(LEADING_BISMILLAH_REGEX, '');
}

/**
 * Returns the displayed Arabic text for an ayah card or mushaf view.
 * Strips the leading Bismillah from Ayah 1 of surahs 2-8 and 10-114
 * because the dedicated surah header already renders the Bismillah.
 * Surah 1 (where Bismillah IS Ayah 1) and Surah 9 (no Bismillah) are preserved.
 */
export function getDisplayedAyahText(
  surahNumber: number,
  numberInSurah: number,
  text: string
): string {
  if (surahNumber === 1 || surahNumber === 9 || numberInSurah !== 1) {
    return text;
  }
  return stripBismillah(text);
}

interface AyahBookmarkButtonProps {
  isBookmarked: boolean;
  onPress: () => void;
  accentColor: string;
  inactiveColor: string;
  ayahNumber: number;
}

function AyahBookmarkButton({
  isBookmarked,
  onPress,
  accentColor,
  inactiveColor,
  ayahNumber,
}: AyahBookmarkButtonProps) {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.35,
        duration: 110,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{
        padding: 6,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={`Bookmark Ayah ${ayahNumber}`}
    >
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <Ionicons
          name={isBookmarked ? 'heart' : 'heart-outline'}
          size={iconSizes.inlineLg}
          color={isBookmarked ? accentColor : inactiveColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function QuranReaderScreen({
  surahNumber,
  initialAyah,
  onBack,
  onNavigateSurah,
}: QuranReaderScreenProps) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const { settings, setQuranFontSize, setQuranShowTranslation, setTafsirSourceId } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [langPickerOpen, setLangPickerOpen] = useState<boolean>(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(false);
  const [tafsirSourcePickerOpen, setTafsirSourcePickerOpen] = useState<boolean>(false);
  const cacheKey = `surah:${surahNumber}:${edition.editionIdentifier}`;
  const [surah, setSurah] = useState<SurahDetail | null>(() => loadQuranCache<SurahDetail>(cacheKey));
  const [loading, setLoading] = useState<boolean>(() => !loadQuranCache<SurahDetail>(cacheKey));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fontSize = settings.quranFontSize;
  const showTranslation = settings.quranShowTranslation;
  const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
  const arabicFamilies = QURAN_FONT_FAMILIES[settings.quranArabicFont];
  const ayahLineHeight = Math.round(fontSize * settings.quranLineHeight);
  const [readingMode, setReadingMode] = useState<ReadingMode>('cards');
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);

  // Audio state
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string>('ar.alafasy');
  const [reciterChooserOpen, setReciterChooserOpen] = useState<boolean>(false);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);
  const [isPlayingSurah, setIsPlayingSurah] = useState<boolean>(false);

  // Ayah Tafsir state
  const [activeTafsirAyah, setActiveTafsirAyah] = useState<number | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState<boolean>(false);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirEdition, setTafsirEdition] = useState<string | null>(null);

  // Copy feedback state (which ayah was just copied)
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  // Track daily reading session minutes towards Quran goal
  useEffect(() => {
    const interval = setInterval(() => {
      recordQuranReadingSession({ minutes: 1 }, settings.quranGoal).catch(() => {});
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [settings.quranGoal]);

  const listRef = useRef<FlatList<Ayah>>(null);

  // Continue Reading tracking refs (handler must stay stable across renders)
  const surahNumberRef = useRef<number>(surahNumber);
  const lastSavedAyahRef = useRef<number>(initialAyah || 1);
  const trackingReadyRef = useRef<boolean>(!initialAyah || initialAyah <= 1);
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Ayah>[]; changed: ViewToken<Ayah>[] }) => {
      if (!trackingReadyRef.current) return;
      const first = viewableItems[0];
      if (!first || !first.item) return;
      const ayahNumber = first.item.numberInSurah;
      if (typeof ayahNumber !== 'number' || ayahNumber === lastSavedAyahRef.current) return;
      lastSavedAyahRef.current = ayahNumber;
      saveReadingPosition(surahNumberRef.current, ayahNumber);
    },
    []
  );

  // Load preferences and reciters
  useEffect(() => {
    (async () => {
      try {
        const [savedMode, audioSettings, reciterList] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_READING_MODE),
          Promise.resolve(loadAudioSettings()),
          fetchReciters().catch(() => [] as Reciter[]),
        ]);

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

  // Listen to audio status and synchronize with active ayah / surah playback
  useEffect(() => {
    const unsub = addPlaybackStatusListener((status) => {
      setIsPlayingAudio(status.isPlaying);
      const playback = getCurrentPlayback();
      if (playback && status.isPlaying && playback.surah === surahNumber) {
        if (playback.ayah) {
          setPlayingAyahNumber(playback.ayah);
        }
        setIsPlayingSurah(playback.type === 'surah' || playback.isSurahMode === true);
      } else if (!status.isPlaying && !status.isBuffering) {
        setPlayingAyahNumber(null);
        setIsPlayingSurah(false);
      }
    });
    return () => {
      unsub();
    };
  }, [surahNumber]);

  // Fetch Surah data (cache-first: instant display from cache, graceful background refresh if forced)
  const loadSurah = useCallback(async (force = false) => {
    const key = `surah:${surahNumber}:${edition.editionIdentifier}`;
    const cached = !force ? loadQuranCache<SurahDetail>(key) : null;
    const isCached = Boolean(cached && cached.ayahs && cached.ayahs.length > 0);
    if (isCached && cached) {
      setSurah(cached);
      setLoading(false);
    } else if (!force) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchSurah(surahNumber, true, edition.editionIdentifier, force);
      setSurah(data);

      // Save last read position
      const startAyah = initialAyah && initialAyah > 1 ? initialAyah : 1;
      saveLastReadPosition(surahNumber, startAyah, data.englishName);

      // Continue Reading position + Recently Read entry
      surahNumberRef.current = surahNumber;
      lastSavedAyahRef.current = startAyah;
      trackingReadyRef.current = startAyah <= 1;
      saveReadingPosition(surahNumber, startAyah);
      recordSurahVisit(surahNumber, data.englishName, data.name);

      // Auto-fetch on open: if this translation edition was NOT cached,
      // trigger background preload of the remaining surahs for this edition
      if (!isCached) {
        preloadRemainingSurahsForEdition(surahNumber, edition.editionIdentifier);
      }
    } catch {
      if (!isCached) {
        // Fallback: if Arabic text is available offline, display it so the user never sees "no data"
        const arCached = loadQuranCache<SurahDetail>(`surah:${surahNumber}:ar`);
        if (arCached && arCached.ayahs && arCached.ayahs.length > 0) {
          setSurah(arCached);
          return;
        }
        setError('Could not load Surah. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [surahNumber, initialAyah, edition.editionIdentifier]);

  // Synchronously update surah from cache on param/edition change to avoid unrendered frames
  useEffect(() => {
    const key = `surah:${surahNumber}:${edition.editionIdentifier}`;
    const cached = loadQuranCache<SurahDetail>(key);
    if (cached) {
      setSurah(cached);
      setLoading(false);
    }
  }, [surahNumber, edition.editionIdentifier]);

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
        trackingReadyRef.current = true;
      }, 300);
    }
  }, [surah, initialAyah]);

  const handleAdjustFontSize = (delta: number) => {
    setQuranFontSize(fontSize + delta);
  };

  const handleToggleTranslation = () => {
    setQuranShowTranslation(!showTranslation);
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
      haptic('light');
    } else {
      addBookmark({
        surah: surahNumber,
        ayah: ayahItem.numberInSurah,
        surahName: surah?.englishName,
        text: (ayahItem.text || '').slice(0, 100),
        translation: (ayahItem.translation || '').slice(0, 120),
      });
      haptic('success');
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
    const list = reciters.filter((r) => {
      if (r.language !== 'ar') return false;
      if (!query) return true;
      return (
        r.englishName.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query) ||
        r.identifier.toLowerCase().includes(query)
      );
    });

    // Ensure Alafasy is pinned at the top
    const alafasyIdx = list.findIndex((r) => r.identifier === 'ar.alafasy');
    if (alafasyIdx > 0) {
      const [alafasy] = list.splice(alafasyIdx, 1);
      list.unshift(alafasy);
    }
    return list;
  }, [reciters, reciterSearch]);

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
      await playSurah(selectedReciter, url, undefined, reciterLabel, surahNumber);
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
      await playAyah(selectedReciter, url, undefined, reciterLabel, surahNumber, ayahNumber);
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
      const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
      const res = await fetchAyahTafsir(surahNumber, ayahNumber, currentTafsirSource.identifier);
      setTafsirText(res.text);
      setTafsirEdition(res.edition);
    } catch {
      setTafsirText('Could not load Tafsir for this ayah. Please check your connection.');
    } finally {
      setTafsirLoading(false);
    }
  };

  // Surah Download (Save for Offline) — from the ⋯ menu
  const [surahDownloaded, setSurahDownloaded] = useState(() =>
    isSurahDownloaded(selectedReciter, surahNumber, getSurahBitrate(selectedReciter))
  );
  const [surahDownloading, setSurahDownloading] = useState(false);
  const [surahDownloadProgress, setSurahDownloadProgress] = useState<number | null>(null);
  const [surahDownloadSize, setSurahDownloadSize] = useState<string>('');

  const refreshDownloadState = useCallback(() => {
    const bitrate = getSurahBitrate(selectedReciter);
    setSurahDownloaded(isSurahDownloaded(selectedReciter, surahNumber, bitrate));
    const meta = getDownloadedSurahs().find(
      (d) => d.edition === selectedReciter && d.surah === surahNumber && d.bitrate === bitrate
    );
    setSurahDownloadSize(meta?.size ? formatBytes(meta.size) : '');
  }, [selectedReciter, surahNumber]);

  useEffect(() => {
    refreshDownloadState();
  }, [refreshDownloadState, surahNumber, selectedReciter]);

  const handleSaveOffline = async () => {
    const bitrate = getSurahBitrate(selectedReciter);
    if (surahDownloaded) {
      Alert.alert(
        'Remove Download',
        `Remove offline audio for Surah ${surah?.englishName ?? surahNumber} (${surahDownloadSize || '—'})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeSurahDownload(selectedReciter, surahNumber, bitrate)
                .then(refreshDownloadState)
                .catch(() => {});
            },
          },
        ]
      );
      return;
    }
    if (surahDownloading) return;
    setSurahDownloading(true);
    setSurahDownloadProgress(0);
    try {
      const meta = await downloadSurah(selectedReciter, surahNumber, bitrate, {
        surahName: surah?.name,
        surahEnglishName: surah?.englishName,
      });
      if (meta) {
        setSurahDownloadSize(formatBytes(meta.size));
      }
      refreshDownloadState();
    } catch {
      Alert.alert('Download Error', 'Could not download surah audio. Please check your connection.');
    } finally {
      setSurahDownloading(false);
      setSurahDownloadProgress(null);
    }
  };

  // Share
  const handleShareAyah = (item: Ayah) => {
    const textToShare = `"${item.text}"\n\n${item.translation || ''}\n\n— Quran ${surahNumber}:${item.numberInSurah}`;
    Share.share({ message: textToShare }).catch(() => {});
  };

  // Copy
  const handleCopyAyah = (item: Ayah) => {
    const textToCopy = `"${item.text}"\n\n${item.translation || ''}\n\n— Quran ${surahNumber}:${item.numberInSurah}`;
    try {
      Clipboard.setString(textToCopy);
      haptic('selection');
      setCopiedAyah(item.numberInSurah);
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = setTimeout(() => setCopiedAyah(null), 1500);
    } catch {
      // Clipboard unavailable — leave state unchanged
    }
  };

  const handleNavigateSurah = useCallback(
    (targetSurah: number) => {
      if (targetSurah < 1 || targetSurah > 114) return;
      if (!onNavigateSurah) return;
      saveReadingPosition(surahNumberRef.current, lastSavedAyahRef.current);
      onNavigateSurah(targetSurah);
    },
    [onNavigateSurah]
  );

  const renderSurahHeader = () => {
    if (!surah) return null;
    const titleFontSize = isCompact ? 24 : 28;
    const translationFontSize = isCompact ? 12 : 13;
    const arabicSize = isCompact ? 34 : 40;
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
          <View style={[styles.titleInfo, { minWidth: 0, flex: 1 }]}>
            <Text
              style={[styles.englishTitle, { color: colors.textPrimary, fontSize: titleFontSize }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {surah.englishName}
            </Text>
            <Text
              style={[styles.englishTranslation, { color: colors.textSecondary, fontSize: translationFontSize }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {surah.englishNameTranslation}
            </Text>
          </View>
          <ArabicText size={arabicSize} fontFamily={arabicFamilies.regular} style={styles.arabicSurahName}>
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
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Bismillah (except Surah 9 At-Tawbah and Surah 1 where it is Ayah 1) */}
        {surah.number !== 9 && surah.number !== 1 && (
          <View style={styles.bismillahBox}>
            <ArabicText
              size={26}
              fontFamily={arabicFamilies.regular}
              style={[styles.bismillahText, { color: colors.textPrimary }]}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
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

    const handleLongPress = () => {
      Alert.alert(
        `Ayah ${item.numberInSurah}`,
        undefined,
        [
          {
            text: 'Play',
            onPress: () => {
              handlePlayAyahToggle(item.numberInSurah);
            },
          },
          {
            text: 'Bookmark',
            onPress: () => {
              handleToggleBookmark(item);
            },
          },
          {
            text: 'Copy',
            onPress: () => {
              const textToCopy = `"${item.text}"\n\n${item.translation || ''}\n\n— Quran ${surahNumber}:${item.numberInSurah}`;
              Clipboard.setString(textToCopy);
              haptic('selection');
              setCopiedAyah(item.numberInSurah);
              if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
              copyResetTimerRef.current = setTimeout(() => setCopiedAyah(null), 1500);
            },
          },
          {
            text: 'Share',
            onPress: () => {
              const textToShare = `"${item.text}"\n\n${item.translation || ''}\n\n— Quran ${surahNumber}:${item.numberInSurah}`;
              Share.share({ message: textToShare }).catch(() => {});
            },
          },
        ],
        { cancelable: true }
      );
    };

    return (
      <View
        style={[
          styles.ayahCard,
          {
            backgroundColor: isAyahPlaying ? colors.accentDim : colors.bgSurface,
            borderColor: isAyahPlaying ? colors.accent : colors.borderSubtle,
          },
        ]}
        // @ts-ignore - onLongPress not in strict TS types for View
        onLongPress={handleLongPress}
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
              activeOpacity={0.75}
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
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Tafsir for Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={isTafsirOpen ? 'book' : 'book-outline'}
                size={iconSizes.inlineLg}
                color={isTafsirOpen ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Bookmark with heart icon and scale bounce micro-interaction */}
            <AyahBookmarkButton
              isBookmarked={isBookmarked}
              onPress={() => handleToggleBookmark(item)}
              accentColor={colors.accent}
              inactiveColor={colors.textSecondary}
              ayahNumber={item.numberInSurah}
            />

            {/* Share */}
            <TouchableOpacity
              onPress={() => handleShareAyah(item)}
              style={styles.actionBtn}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Share Ayah ${item.numberInSurah}`}
            >
              <Ionicons name="share-social-outline" size={iconSizes.inlineLg} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Copy */}
            <TouchableOpacity
              onPress={() => handleCopyAyah(item)}
              style={styles.actionBtn}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Copy Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={copiedAyah === item.numberInSurah ? 'checkmark' : 'copy-outline'}
                size={iconSizes.inlineLg}
                color={copiedAyah === item.numberInSurah ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arabic Text */}
        <AyahText
          text={getDisplayedAyahText(surahNumber, item.numberInSurah, item.text)}
          numberInSurah={item.numberInSurah}
          size={fontSize}
          fontFamily={arabicFamilies.regular}
          lineHeight={ayahLineHeight}
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
                {tafsirEdition || 'Tafsir'}
              </Text>
              <TouchableOpacity onPress={() => setActiveTafsirAyah(null)}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {tafsirLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
            ) : (
              <Text style={[
                styles.inlineTafsirText,
                { color: colors.textPrimary, fontFamily: 'Manrope_400Regular' }
              ]}>
                {tafsirText || ''}
              </Text>
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
      <ScrollView
        contentContainerStyle={styles.mushafScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSurah(true);
            }}
            tintColor={colors.accent}
          />
        }
      >
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
                    fontFamily: arabicFamilies.regular,
                    fontSize: fontSize + 2,
                    color: colors.textPrimary,
                    lineHeight: Math.round((fontSize + 2) * settings.quranLineHeight),
                    writingDirection: 'rtl',
                  }}
                >
                  {getDisplayedAyahText(surah.number, a.numberInSurah, a.text)}{' '}
                </Text>
                <Text
                  style={{
                    fontFamily: arabicFamilies.regular,
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
          onPress={() => loadSurah()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading surah"
        >
          <Text style={[styles.retryBtnText, { color: colors.accent }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const navBarPaddingH = isCompact ? 12 : 16;
  const navBarPaddingV = isCompact ? 8 : 10;
  const backTextSize = isCompact ? 13 : 14;
  const backIconSize = isCompact ? 18 : 20;
  const surahNavBtnSize = isCompact ? 32 : 36;
  const surahNavIconSize = isCompact ? 20 : 22;
  const dotsBtnSize = isCompact ? 36 : 40;
  const dotsIconSize = isCompact ? 20 : 22;
  const titleFontSizeNav = isCompact ? 16 : 18;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Top Navigation Bar - Clean single row */}
      <View
        style={[
          styles.navBar,
          { borderBottomColor: colors.borderSubtle },
          { paddingHorizontal: navBarPaddingH, paddingVertical: navBarPaddingV },
          isCompact ? styles.navBarCompact : styles.navBarTablet,
        ]}
      >
        {/* Back button - fixed left */}
        <TouchableOpacity
          style={[
            styles.backButton,
            { gap: isCompact ? 4 : 6, paddingVertical: isCompact ? 3 : 4 },
          ]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Quran"
        >
          <Ionicons name="arrow-back" size={backIconSize} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent, fontSize: backTextSize }]}>Quran</Text>
        </TouchableOpacity>

        {/* Center: Surah name as centerpiece with prev/next inline */}
        <View style={styles.navCenter}>
          <View style={styles.surahNavInline}>
            <TouchableOpacity
              style={[
                styles.surahNavBtn,
                { opacity: surahNumber <= 1 ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              onPress={() => handleNavigateSurah(surahNumber - 1)}
              disabled={surahNumber <= 1}
              accessibilityRole="button"
              accessibilityLabel="Previous Surah"
            >
              <Ionicons name="chevron-back" size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
            {surah && (
              <Text
                style={[
                  styles.navSurahTitle,
                  { color: colors.textPrimary, fontSize: titleFontSizeNav },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {surah.englishName}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.surahNavBtn,
                { opacity: surahNumber >= 114 ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              onPress={() => handleNavigateSurah(surahNumber + 1)}
              disabled={surahNumber >= 114}
              accessibilityRole="button"
              accessibilityLabel="Next Surah"
            >
              <Ionicons name="chevron-forward" size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dots menu button - fixed right */}
        <TouchableOpacity
          style={[
            styles.dotsButton,
            { width: dotsBtnSize, height: dotsBtnSize },
          ]}
          onPress={() => setToolsMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Reading tools"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={dotsIconSize} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Dots Menu Modal */}
      <Modal
        visible={toolsMenuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setToolsMenuOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.toolsMenuOverlay}>
          <TouchableWithoutFeedback onPress={() => setToolsMenuOpen(false)}>
            <View style={styles.toolsMenuBackdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.toolsMenuPanel, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            {/* Drag Pill */}
            <View style={[styles.toolsMenuDragPill, { backgroundColor: colors.borderSubtle }]} />
            {/* Reading Mode */}
            <TouchableOpacity
              style={styles.toolsMenuItem}
              onPress={() => { handleToggleReadingMode(); setToolsMenuOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={`Reading mode: ${readingMode}. Tap to toggle.`}
            >
              <View style={[styles.toolsMenuIcon, { backgroundColor: readingMode === 'mushaf' ? colors.accentDim : 'transparent' }]}>
                <Ionicons name={readingMode === 'mushaf' ? 'book' : 'list'} size={20} color={readingMode === 'mushaf' ? colors.accent : colors.textSecondary} />
              </View>
              <View style={styles.toolsMenuTextGroup}>
                <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>Reading Mode</Text>
                <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>{readingMode === 'mushaf' ? 'Mushaf (continuous)' : 'Cards (per ayah)'}</Text>
              </View>
              <View style={[styles.toolsMenuIndicator, { backgroundColor: readingMode === 'mushaf' ? colors.accent : 'transparent' }]} />
            </TouchableOpacity>

            <View style={[styles.toolsMenuDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Translation Language */}
            <TouchableOpacity
              style={styles.toolsMenuItem}
              onPress={() => { setLangPickerOpen(true); setToolsMenuOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={`Translation language: ${language} ${flag}. Tap to change.`}
            >
              <View style={[styles.toolsMenuIcon, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="globe-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.toolsMenuTextGroup}>
                <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>Translation Language</Text>
                <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>{flag} {language.toUpperCase()} — {edition.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.toolsMenuDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Show/Hide Translation */}
            <TouchableOpacity
              style={styles.toolsMenuItem}
              onPress={() => { handleToggleTranslation(); setToolsMenuOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={showTranslation ? 'Hide translation' : 'Show translation'}
            >
              <View style={[styles.toolsMenuIcon, { backgroundColor: showTranslation ? colors.accentDim : 'transparent' }]}>
                <Ionicons name={showTranslation ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={20} color={showTranslation ? colors.accent : colors.textSecondary} />
              </View>
              <View style={styles.toolsMenuTextGroup}>
                <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>Translation</Text>
                <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>{showTranslation ? 'Shown' : 'Hidden'}</Text>
              </View>
              <View style={[styles.toolsMenuIndicator, { backgroundColor: showTranslation ? colors.accent : 'transparent' }]} />
            </TouchableOpacity>

            <View style={[styles.toolsMenuDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Tafsir Source */}
            <TouchableOpacity
              style={styles.toolsMenuItem}
              onPress={() => { setTafsirSourcePickerOpen(true); setToolsMenuOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={`Tafsir source: ${currentTafsirSource.name}. Tap to change.`}
            >
              <View style={[styles.toolsMenuIcon, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="book-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.toolsMenuTextGroup}>
                <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>Tafsir Source</Text>
                <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>{currentTafsirSource.name} ({currentTafsirSource.language})</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.toolsMenuDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Save for Offline (Surah Download) */}
            <TouchableOpacity
              style={styles.toolsMenuItem}
              onPress={handleSaveOffline}
              accessibilityRole="button"
              accessibilityLabel={surahDownloaded ? `Remove offline audio for Surah ${surah?.englishName ?? surahNumber}` : `Download Surah ${surah?.englishName ?? surahNumber} audio for offline`}
            >
              <View style={[styles.toolsMenuIcon, { backgroundColor: surahDownloaded ? colors.accentDim : 'transparent' }]}>
                {surahDownloading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons
                    name={surahDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                    size={20}
                    color={surahDownloaded ? colors.accent : colors.textSecondary}
                  />
                )}
              </View>
              <View style={styles.toolsMenuTextGroup}>
                <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                  {surahDownloaded ? 'Available Offline' : 'Save for Offline'}
                </Text>
                <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                  {surahDownloading
                    ? `${surahDownloadProgress ?? 0}%`
                    : surahDownloaded
                    ? surahDownloadSize || 'Full Surah audio'
                    : 'Download this surah'}
                </Text>
              </View>
              {surahDownloaded ? (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              ) : null}
            </TouchableOpacity>

            <View style={[styles.toolsMenuDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Font Size */}
            <View style={styles.toolsMenuFontRow}>
              <View style={styles.toolsMenuFontLabel}>
                <View style={[styles.toolsMenuIcon, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="text-outline" size={20} color={colors.accent} />
                </View>
                <View style={styles.toolsMenuTextGroup}>
                  <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>Font Size</Text>
                  <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>{fontSize}pt</Text>
                </View>
              </View>
              <View style={styles.toolsMenuFontControls}>
                <TouchableOpacity
                  style={[
                    styles.toolsMenuFontBtn,
                    { borderColor: colors.borderSubtle, opacity: fontSize <= QURAN_FONT_SIZE_MIN ? 0.4 : 1 },
                  ]}
                  onPress={() => handleAdjustFontSize(-QURAN_FONT_SIZE_STEP)}
                  disabled={fontSize <= QURAN_FONT_SIZE_MIN}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease font size"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.toolsMenuFontBtnText, { color: colors.textPrimary }]}>A−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toolsMenuFontBtn,
                    { borderColor: colors.borderSubtle, opacity: fontSize >= QURAN_FONT_SIZE_MAX ? 0.4 : 1 },
                  ]}
                  onPress={() => handleAdjustFontSize(QURAN_FONT_SIZE_STEP)}
                  disabled={fontSize >= QURAN_FONT_SIZE_MAX}
                  accessibilityRole="button"
                  accessibilityLabel="Increase font size"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.toolsMenuFontBtnText, { color: colors.textPrimary }]}>A+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={handleViewableItemsChanged}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSurah(true);
              }}
              tintColor={colors.accent}
            />
          }
        />
      )}

      {/* Reciter Chooser Modal */}
      <Modal
        visible={reciterChooserOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setReciterChooserOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setReciterChooserOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            {/* Drag Pill */}
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />

            {/* Header: compact eyebrow + title + close */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.modalHeaderLeft}>
                <Text style={[styles.modalEyebrow, { color: colors.accent }]}>AUDIO RECITER</Text>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Select Reciter
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReciterChooserOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close reciter selection"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View
              style={[
                styles.reciterSearchWrap,
                { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                placeholder="Search reciter name..."
                placeholderTextColor={colors.textMuted}
                value={reciterSearch}
                onChangeText={setReciterSearch}
                style={[styles.reciterSearchInput, { color: colors.textPrimary }]}
              />
              {reciterSearch.length > 0 && (
                <TouchableOpacity onPress={() => setReciterSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Reciters List - Arabic only */}
            <FlatList
              data={filteredReciters}
              keyExtractor={(item) => item.identifier}
              contentContainerStyle={[
                styles.reciterList,
                { paddingBottom: Math.max(insets.bottom, 16) + 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={7}
              renderItem={({ item }) => {
                const isSelected = item.identifier === selectedReciter;
                const country = item.country || getReciterCountry(item.identifier);
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptic('selection');
                      handleSelectReciter(item.identifier);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.englishName}${country ? `, ${country}` : ''}`}
                  >
                    <View style={styles.reciterInfo}>
                      <Text
                        style={[
                          styles.reciterEngName,
                          { color: isSelected ? colors.accent : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.englishName}
                      </Text>
                      {country ? (
                        <Text style={[styles.reciterCountry, { color: colors.textMuted }]}>
                          {country}
                        </Text>
                      ) : null}
                      {item.name ? (
                        <Text style={[styles.reciterArabicName, { color: colors.textSecondary }]}>
                          {item.name}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.reciterTrailing}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={20} color={colors.borderSubtle} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Language Chooser Modal */}
      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />

      {/* Tafsir Source Chooser Modal */}
      <Modal
        visible={tafsirSourcePickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setTafsirSourcePickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setTafsirSourcePickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Tafsir Source
              </Text>
              <TouchableOpacity
                onPress={() => setTafsirSourcePickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={iconSizes.header} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={TAFSIR_SOURCES}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              renderItem={({ item }) => {
                const isSelected = item.id === settings.tafsirSourceId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => { setTafsirSourceId(item.id as any); setTafsirSourcePickerOpen(false); }}
                  >
                    <View style={styles.reciterInfo}>
                      <View style={styles.reciterTitleRow}>
                        <Text style={[styles.reciterEngName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.reciterLangBadge,
                            {
                              backgroundColor: item.languageCode === 'ar' ? colors.bgSurface : colors.accentDim,
                              borderColor: item.languageCode === 'ar' ? colors.borderSubtle : colors.accent,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.reciterLangBadgeText,
                              { color: item.languageCode === 'ar' ? colors.textMuted : colors.accent },
                            ]}
                          >
                            {item.language.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.reciterArabicName, { color: colors.textMuted }]}>
                        {item.author}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  navBarCompact: {
    minHeight: 44,
  },
  navBarTablet: {
    minHeight: 52,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  navCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  surahNavInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  surahNavBtn: {
    padding: 6,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNavLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    minWidth: 60,
    textAlign: 'center',
  },
  navSurahTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  dotsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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

  /* Tools Menu (dots) */
  toolsMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  toolsMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toolsMenuPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    overflow: 'hidden',
    maxWidth: 380,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    paddingBottom: 32,
  },
  toolsMenuDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  toolsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 56,
  },
  toolsMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsMenuTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  toolsMenuItemTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  toolsMenuItemSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  toolsMenuIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  toolsMenuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  toolsMenuFontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  toolsMenuFontLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  toolsMenuFontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolsMenuFontBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsMenuFontBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
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
    minWidth: 0,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  reciterSearchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    paddingVertical: 0,
  },
  reciterList: {
    paddingHorizontal: 20,
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  reciterInfo: {
    flex: 1,
    paddingRight: 12,
  },
  reciterEngName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  reciterCountry: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  reciterArabicName: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  reciterTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
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
