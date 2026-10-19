/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Share,
  RefreshControl,
  useWindowDimensions,
  BackHandler,
  Platform,
  Image,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens, getBrandLogoSource, fontRoles } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { isRTL, t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { SectionHeader } from '../components/SectionHeader';
import { ArabicText } from '../components/ArabicText';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import {
  HadithCollection,
  HadithBook,
  HadithItem,
  FALLBACK_COLLECTIONS,
  cleanHadithText,
  getHadithGrade,
  fetchHadithCollections,
  fetchHadithBooks,
  fetchHadithsInBook,
} from '../lib/hadithApi';
import { CollectionCardSkeleton, HadithRowSkeleton, BookSkeleton } from '../components/Skeleton';
import {
  SavedHadithItem,
  RecentHadithItem,
  saveSavedHadith,
  removeSavedHadith,
  loadSavedHadiths,
  isHadithSaved,
  saveRecentHadith,
  loadRecentHadiths,
  recordHadithRead,
  loadHadithReadCounts,
} from '../lib/db';
import { useConnectivity } from '../lib/useConnectivity';
import { useSearchHistory } from '../lib/searchHistory';
import { hScrollRTLStyle } from '../lib/rtl';

type MainTab = 'collections' | 'saved' | 'recent' | 'progress';

type SubView =
  | { type: 'collections' }
  | { type: 'books'; collection: HadithCollection }
  | { type: 'hadiths'; collection: HadithCollection; book: HadithBook }
  | {
      type: 'detail';
      collection: { slug: string; nameEn?: string; nameAr?: string };
      book?: { bookNumber: string; nameEn?: string; nameAr?: string };
      hadith: HadithItem;
      from: 'hadiths' | 'saved' | 'recent';
    };

interface HadithLibraryScreenProps {
  onBack?: () => void;
  backLabel?: string;
}

export default function HadithLibraryScreen({ onBack, backLabel: customBackLabel }: HadithLibraryScreenProps) {
  const { tokens, mode } = useThemeTokens();
  const { refreshKey } = useConnectivity();

  const shareCardRef = useRef<View>(null);
  const [shareHadithData, setShareHadithData] = useState<{
    arabicText: string;
    englishText: string;
    collectionName: string;
    hadithNumber: string;
    source: string;
  } | null>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);

  const {
    history: collectionHistory,
    addQuery: addCollectionQuery,
    removeQuery: removeCollectionQuery,
    clearHistory: clearCollectionHistory,
  } = useSearchHistory('hadith-collections');

  const {
    history: bookHistory,
    addQuery: addBookQuery,
    removeQuery: removeBookQuery,
    clearHistory: clearBookHistory,
  } = useSearchHistory('hadith-books');

  // Navigation state
  const [activeTab, setActiveTab] = useState<MainTab>('collections');
  const [view, setView] = useState<SubView>({ type: 'collections' });

  // Collections state
  const [collections, setCollections] = useState<HadithCollection[]>(FALLBACK_COLLECTIONS);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsRefreshing, setCollectionsRefreshing] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState('');

  // Books state
  const [books, setBooks] = useState<HadithBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksRefreshing, setBooksRefreshing] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [bookFilter, setBookFilter] = useState('');

  // Hadiths list state
  const [hadiths, setHadiths] = useState<HadithItem[]>([]);
  const [hadithsLoading, setHadithsLoading] = useState(false);
  const [hadithsRefreshing, setHadithsRefreshing] = useState(false);
  const [hadithsLoadingMore, setHadithsLoadingMore] = useState(false);
  const [hadithsError, setHadithsError] = useState<string | null>(null);
  const [hadithsOffset, setHadithsOffset] = useState(0);
  const [hadithsTotal, setHadithsTotal] = useState(0);

  // Saved & Recent & Progress state
  const [savedList, setSavedList] = useState<SavedHadithItem[]>([]);
  const [recentList, setRecentList] = useState<RecentHadithItem[]>([]);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});

  // Detail item state
  const [isCurrentSaved, setIsCurrentSaved] = useState(false);

  // Load collections on mount
  const loadCollections = useCallback(async (force = false) => {
    if (!force) setCollectionsLoading(true);
    setCollectionsError(null);
    try {
      const data = await fetchHadithCollections(force);
      setCollections(data);
    } catch {
      if (collections.length === 0) {
        setCollectionsError(t('Unable to refresh collections. Showing offline list.'));
      }
    } finally {
      setCollectionsLoading(false);
      setCollectionsRefreshing(false);
    }
  }, [collections.length]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Auto-refresh collections when connectivity returns and we're on the collections view
  useEffect(() => {
    if (refreshKey > 0 && activeTab === 'collections' && view.type === 'collections' && collections.length > 0) {
      loadCollections(true);
    }
  }, [refreshKey, activeTab, view, collections.length, loadCollections]);

  // Load saved / recent / progress whenever tab or view changes
  const reloadStorageData = useCallback(() => {
    setSavedList(loadSavedHadiths());
    setRecentList(loadRecentHadiths());
    setReadCounts(loadHadithReadCounts());
  }, []);

  useEffect(() => {
    reloadStorageData();
  }, [activeTab, view, reloadStorageData]);

  // When a detail view is active, update saved flag & record read marker
  useEffect(() => {
    if (view.type === 'detail') {
      const { collection, book, hadith } = view;
      const bNum = book?.bookNumber || hadith.bookNumber || '1';
      const id = `${collection.slug}:${bNum}:${hadith.hadithNumber}`;
      setIsCurrentSaved(isHadithSaved(id));

      const arText = cleanHadithText(hadith.ar?.text, hadith.ar?.body);
      const enText = cleanHadithText(hadith.en?.text, hadith.en?.body);
      const grade = getHadithGrade(hadith);

      // Record progress & recent read
      recordHadithRead(collection.slug, bNum, hadith.hadithNumber);
      saveRecentHadith({
        id,
        collection: collection.slug,
        collectionName: collection.nameEn,
        bookNumber: bNum,
        bookName: book?.nameEn,
        hadithNumber: hadith.hadithNumber,
        arabicText: arText,
        englishText: enText,
        grade,
      });

      reloadStorageData();
    }
  }, [view, reloadStorageData]);

  // Handle opening a collection -> load books
  const openCollection = useCallback(async (col: HadithCollection, force = false) => {
    setView({ type: 'books', collection: col });
    setBookFilter('');
    setBooksLoading(true);
    setBooksError(null);
    try {
      const data = await fetchHadithBooks(col.slug, force);
      setBooks(data);
    } catch {
      if (books.length === 0) {
        setBooksError(t('Failed to load books. Please check your connection and retry.'));
      }
    } finally {
      setBooksLoading(false);
      setBooksRefreshing(false);
    }
  }, [books.length]);

  // Handle opening a book -> load hadiths
  const openBook = useCallback(async (col: HadithCollection, b: HadithBook, force = false) => {
    setView({ type: 'hadiths', collection: col, book: b });
    setHadithsLoading(true);
    setHadithsError(null);
    setHadithsOffset(0);
    try {
      const data = await fetchHadithsInBook(col.slug, b.bookNumber, 20, 0, force);
      setHadiths(data.hadiths);
      setHadithsTotal(data.total);
    } catch {
      if (hadiths.length === 0) {
        setHadithsError(t('Failed to load hadiths. Please check your connection and retry.'));
      }
    } finally {
      setHadithsLoading(false);
      setHadithsRefreshing(false);
    }
  }, [hadiths.length]);

  // Auto-refresh books when connectivity returns and we're on the books view
  useEffect(() => {
    if (refreshKey > 0 && activeTab === 'collections' && view.type === 'books' && books.length > 0) {
      openCollection(view.collection, true);
    }
  }, [refreshKey, activeTab, view, books.length, openCollection]);

  // Auto-refresh hadiths when connectivity returns and we're on the hadiths view
  useEffect(() => {
    if (refreshKey > 0 && activeTab === 'collections' && view.type === 'hadiths' && hadiths.length > 0) {
      openBook(view.collection, view.book, true);
    }
  }, [refreshKey, activeTab, view, hadiths.length, openBook]);

  // Load more hadiths pagination
  const loadMoreHadiths = useCallback(async () => {
    if (view.type !== 'hadiths' || hadithsLoading || hadithsLoadingMore) return;
    if (hadiths.length >= hadithsTotal && hadithsTotal > 0) return;

    const nextOffset = hadithsOffset + 20;
    setHadithsLoadingMore(true);
    try {
      const data = await fetchHadithsInBook(
        view.collection.slug,
        view.book.bookNumber,
        20,
        nextOffset,
        false
      );
      setHadiths((prev) => [...prev, ...data.hadiths]);
      setHadithsOffset(nextOffset);
      setHadithsTotal(data.total);
    } catch {
      // Non-fatal pagination error
    } finally {
      setHadithsLoadingMore(false);
    }
  }, [view, hadithsLoading, hadithsLoadingMore, hadiths.length, hadithsTotal, hadithsOffset]);

  // Open detail view
  const openDetail = useCallback(
    (
      hadith: HadithItem,
      collection: { slug: string; nameEn?: string; nameAr?: string },
      book?: { bookNumber: string; nameEn?: string; nameAr?: string },
      from: 'hadiths' | 'saved' | 'recent' = 'hadiths'
    ) => {
      setView({
        type: 'detail',
        collection,
        book,
        hadith,
        from,
      });
    },
    []
  );

  // Toggle bookmark (Save / Unsave)
  const toggleSaveCurrent = useCallback(() => {
    if (view.type !== 'detail') return;
    const { collection, book, hadith } = view;
    const bNum = book?.bookNumber || hadith.bookNumber || '1';
    const id = `${collection.slug}:${bNum}:${hadith.hadithNumber}`;
    const arText = cleanHadithText(hadith.ar?.text, hadith.ar?.body);
    const enText = cleanHadithText(hadith.en?.text, hadith.en?.body);
    const grade = getHadithGrade(hadith);

    if (isCurrentSaved) {
      removeSavedHadith(id);
      setIsCurrentSaved(false);
    } else {
      saveSavedHadith({
        id,
        collection: collection.slug,
        collectionName: collection.nameEn,
        bookNumber: bNum,
        bookName: book?.nameEn,
        hadithNumber: hadith.hadithNumber,
        arabicText: arText,
        englishText: enText,
        grade,
        savedAt: Date.now(),
      });
      setIsCurrentSaved(true);
    }
    reloadStorageData();
  }, [view, isCurrentSaved, reloadStorageData]);

  // Share current hadith
  const shareCurrentHadith = useCallback(async () => {
    if (view.type !== 'detail') return;
    const { collection, book, hadith } = view;
    const bNum = book?.bookNumber || hadith.bookNumber || '1';
    const arText = cleanHadithText(hadith.ar?.text, hadith.ar?.body);
    const enText = cleanHadithText(hadith.en?.text, hadith.en?.body);
    const source = `${collection.nameEn || collection.slug} ${bNum}:${hadith.hadithNumber}`;
    const message = `${arText}\n\n${enText}\n\n— ${source}`;

    if (Platform.OS === 'web') {
      try {
        await Share.share({ message });
      } catch {
        // ignore
      }
      return;
    }

    try {
      setIsSharingImage(true);
      setShareHadithData({
        arabicText: arText,
        englishText: enText,
        collectionName: collection.nameEn || collection.slug,
        hadithNumber: String(hadith.hadithNumber),
        source,
      });
      // Wait a frame for the card to render off-screen.
      await new Promise((r) => setTimeout(r, 250));
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      setShareHadithData(null);
      setIsSharingImage(false);
      const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('Share hadith') });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      setShareHadithData(null);
      setIsSharingImage(false);
      // Fall back to text share on any capture failure.
      try {
        await Share.share({ message });
      } catch {
        // ignore
      }
    }
  }, [view]);

  // Filtered collections
  const filteredCollections = useMemo(() => {
    if (!collectionFilter.trim()) return collections;
    const q = collectionFilter.toLowerCase().trim();
    return collections.filter(
      (c) =>
        c.name.en.toLowerCase().includes(q) ||
        c.name.ar.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [collections, collectionFilter]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    if (!bookFilter.trim()) return books;
    const q = bookFilter.toLowerCase().trim();
    return books.filter(
      (b) =>
        b.name.en.toLowerCase().includes(q) ||
        b.name.ar.toLowerCase().includes(q) ||
        b.bookNumber.includes(q)
    );
  }, [books, bookFilter]);

  // Tab change handler
  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    if (tab === 'collections') {
      setView({ type: 'collections' });
    }
  };

  // Header back navigation
  const handleBack = useCallback(() => {
    if (activeTab !== 'collections') {
      if (view.type === 'detail') {
        if (view.from === 'saved') {
          setActiveTab('saved');
          return;
        }
        if (view.from === 'recent') {
          setActiveTab('recent');
          return;
        }
      }
      onBack?.();
      return;
    }

    if (view.type === 'detail') {
      if (view.from === 'hadiths' && view.book) {
        // Find collection and book objects
        const col = collections.find((c) => c.slug === view.collection.slug) || {
          slug: view.collection.slug,
          type: 'hadith',
          name: { en: view.collection.nameEn || view.collection.slug, ar: view.collection.nameAr || '' },
          intro: { en: null, ar: null },
          hasBooks: true,
          hasChapters: true,
          totalHadith: 0,
          totalAvailable: 0,
        };
        const b = books.find((x) => x.bookNumber === view.book?.bookNumber) || {
          collection: view.collection.slug,
          bookNumber: view.book.bookNumber,
          name: { en: view.book.nameEn || '', ar: view.book.nameAr || '' },
          intro: { en: null, ar: null },
          hadithStartNumber: 1,
          hadithEndNumber: 1,
          hadithCount: 1,
        };
        setView({ type: 'hadiths', collection: col, book: b });
      } else {
        setView({ type: 'collections' });
      }
      return;
    }

    if (view.type === 'hadiths') {
      setView({ type: 'books', collection: view.collection });
      return;
    }

    if (view.type === 'books') {
      setView({ type: 'collections' });
      return;
    }

    onBack?.();
  }, [activeTab, view, onBack, collections, books]);

  // Hardware back press handler on Android for nested views
  useEffect(() => {
    if (activeTab === 'collections' && view.type === 'collections') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [activeTab, view, handleBack]);

  // Determine back button label
  const backLabel = useMemo(() => {
    if (activeTab !== 'collections') {
      if (view.type === 'detail') return t('Back');
      return customBackLabel ? t(customBackLabel) : t('Library');
    }
    if (view.type === 'detail') {
      return view.from === 'hadiths' ? t('Hadiths') : t('Back');
    }
    if (view.type === 'hadiths') return t('Books');
    if (view.type === 'books') return t('Collections');
    return customBackLabel ? t(customBackLabel) : t('Library');
  }, [activeTab, view, customBackLabel]);

  // Total read hadiths count
  const totalRead = useMemo(() => {
    return Object.values(readCounts).reduce((acc, v) => acc + v, 0);
  }, [readCounts]);

  const headerInfo = useMemo(() => {
    if (view.type === 'detail') {
      return {
        eyebrow: view.collection.nameEn || t('Hadith'),
        title: view.hadith.hadithNumber ? `${t('Hadith')} ${view.hadith.hadithNumber}` : t('Hadith Detail'),
        subtitle: view.book?.nameEn || t('Authentic Narration'),
      };
    }
    if (view.type === 'hadiths') {
      return {
        eyebrow: view.collection.name?.en || t('Hadiths'),
        title: view.book.name?.en || t('Hadiths'),
        subtitle: t('Browse narrations in this book'),
      };
    }
    if (view.type === 'books') {
      return {
        eyebrow: t('Collection'),
        title: view.collection.name?.en || t('Books'),
        subtitle: t('Browse books in this collection'),
      };
    }
    if (activeTab === 'saved') {
      return {
        eyebrow: t('Bookmarks'),
        title: t('Saved Hadiths'),
        subtitle: `${savedList.length} ${t('saved narrations')}`,
      };
    }
    if (activeTab === 'recent') {
      return {
        eyebrow: t('History'),
        title: t('Recent Hadiths'),
        subtitle: `${recentList.length} ${t('recently viewed narrations')}`,
      };
    }
    if (activeTab === 'progress') {
      return {
        eyebrow: t('Reading Stats'),
        title: t('Reading Progress'),
        subtitle: `${totalRead} ${t('hadiths read across collections')}`,
      };
    }
    return {
      eyebrow: t('Library'),
      title: t('Hadith Library'),
      subtitle: t('Browse 17 canonical collections, books & authentic narrations'),
    };
  }, [activeTab, view, savedList.length, recentList.length, totalRead]);

  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  return (
    <View style={styles.screenContainer}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={[styles.container, styles.detailScreen]}
        header={
          <SubHeader
            eyebrow={headerInfo.eyebrow}
            title={headerInfo.title}
            subtitle={headerInfo.subtitle}
            backLabel={backLabel}
            onBack={handleBack}
            borderBottom
            showFade
          />
        }
      >

        {/* Main Tabs (Collections | Saved | Recent | Progress) */}
        <View style={[styles.tabsWrap, { borderBottomColor: tokens.cardBorder }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={[styles.tabsScroll, hScrollRTLStyle()]}
          >
            {(
              [
                { key: 'collections', label: t('Collections'), icon: 'albums' },
                { key: 'saved', label: `${t('Saved')} (${savedList.length})`, icon: 'bookmark' },
                { key: 'recent', label: t('Recent'), icon: 'time' },
                { key: 'progress', label: t('Progress'), icon: 'analytics' },
              ] as const
            ).map((tabItem) => {
              const isActive = activeTab === tabItem.key && (tabItem.key !== 'collections' || view.type === 'collections');
              return (
                <TouchableOpacity
                  key={tabItem.key}
                  onPress={() => handleTabChange(tabItem.key)}
                  style={[
                    styles.tabChip,
                    getPillShadow(mode),
                    {
                      backgroundColor: isActive ? 'transparent' : tokens.cardTop,
                      borderColor: isActive ? tokens.goldBorder : tokens.cardBorder,
                      overflow: 'hidden',
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  {isActive && (
                    <LinearGradient
                      colors={tokens.goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Ionicons
                    name={tabItem.icon as any}
                    size={14}
                    color={isActive ? tokens.onGold : tokens.muted}
                  />
                  <AppText
                    variant="caption"
                    tone={isActive ? 'onGold' : undefined}
                    style={styles.tabChipText}
                  >
                    {tabItem.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

      {/* CONTENT AREA */}
      <View style={styles.flex1}>
        {/* TAB: SAVED HADITHS */}
        {activeTab === 'saved' && (
          <DetailScreen.ScrollView contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              compact
              eyebrow={t('Library')}
              title={t('Saved Hadith')}
              subtitle={
                savedList.length === 0
                  ? t('Bookmarks and saved prophetic traditions')
                  : `${savedList.length} ${savedList.length === 1 ? t('saved tradition') : t('saved traditions')}`
              }
            />

            {savedList.length === 0 ? (
              <EmptyState
                icon="bookmark-outline"
                title={t('No saved hadiths yet')}
                subtitle={t('While reading any hadith, tap the "Save" bookmark button to keep it here for quick access.')}
              />
            ) : (
              <View style={[styles.gap12, isWide && styles.gridWide]}>
                {savedList.map((item) => (
                  <View key={item.id} style={isWide && styles.gridCell}>
                  <Card padded style={styles.savedCard} contentStyle={styles.savedCardContent}>
                    <TouchableOpacity
                      onPress={() =>
                        openDetail(
                          {
                            collection: item.collection,
                            bookNumber: item.bookNumber,
                            hadithNumber: item.hadithNumber,
                            en: { text: item.englishText },
                            ar: { text: item.arabicText },
                          },
                          { slug: item.collection, nameEn: item.collectionName },
                          { bookNumber: item.bookNumber, nameEn: item.bookName },
                          'saved'
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.metaRow}>
                        <View style={[styles.badge, { backgroundColor: tokens.ringFill }]}>
                          <AppText variant="caption" highlight style={styles.badgeText}>
                            {item.collectionName || item.collection} · {t('Book')} {item.bookNumber} : #
                            {item.hadithNumber}
                          </AppText>
                        </View>
                        {item.grade ? (
                          <View
                            style={[
                              styles.gradeBadge,
                              { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill },
                            ]}
                          >
                            <AppText variant="caption" tone="faint" style={styles.gradeText}>
                              {item.grade}
                            </AppText>
                          </View>
                        ) : null}
                      </View>

                      {item.arabicText ? (
                        <ArabicText size={20} numberOfLines={2} style={styles.savedArabic}>
                          {item.arabicText}
                        </ArabicText>
                      ) : null}

                      {item.englishText ? (
                        <AppText
                          variant="body"
                          tone="faint"
                          style={styles.savedEnglish}
                          numberOfLines={3}
                        >
                          {item.englishText}
                        </AppText>
                      ) : null}

                      <View style={styles.cardActionRow}>
                        <AppText variant="link" style={styles.cardTapHint}>
                          {t('Read full hadith')} →
                        </AppText>
                        <TouchableOpacity
                          onPress={() => {
                            removeSavedHadith(item.id);
                            reloadStorageData();
                          }}
                          style={styles.unsaveBtn}
                          accessibilityLabel={t('Remove from saved')}
                        >
                          <Ionicons name="trash-outline" size={16} color={tokens.muted} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Card>
                  </View>
                ))}
              </View>
            )}
          </DetailScreen.ScrollView>
        )}

        {/* TAB: RECENTLY READ */}
        {activeTab === 'recent' && (
          <DetailScreen.ScrollView contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              compact
              eyebrow={t('Library')}
              title={t('Recently Read')}
              subtitle={t('Prophetic traditions you recently viewed')}
            />

            {recentList.length === 0 ? (
              <EmptyState
                icon="time-outline"
                title={t('No reading history yet')}
                subtitle={t('As you browse collections and read hadith details, they will automatically appear here.')}
              />
            ) : (
              <View style={[styles.gap12, isWide && styles.gridWide]}>
                {recentList.map((item) => (
                  <View key={item.id} style={isWide && styles.gridCell}>
                  <Card padded>
                    <TouchableOpacity
                      onPress={() =>
                        openDetail(
                          {
                            collection: item.collection,
                            bookNumber: item.bookNumber,
                            hadithNumber: item.hadithNumber,
                            en: { text: item.englishText },
                            ar: { text: item.arabicText },
                          },
                          { slug: item.collection, nameEn: item.collectionName },
                          { bookNumber: item.bookNumber, nameEn: item.bookName },
                          'recent'
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.metaRow}>
                        <View style={[styles.badge, { backgroundColor: tokens.ringFill }]}>
                          <AppText variant="caption" highlight style={styles.badgeText}>
                            {item.collectionName || item.collection} · {t('Book')} {item.bookNumber} : #
                            {item.hadithNumber}
                          </AppText>
                        </View>
                        <AppText variant="caption" tone="faint" style={styles.dateText}>
                          {new Date(item.readAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </AppText>
                      </View>

                      {item.arabicText ? (
                        <ArabicText size={20} numberOfLines={2} style={styles.savedArabic}>
                          {item.arabicText}
                        </ArabicText>
                      ) : null}

                      {item.englishText ? (
                        <AppText
                          variant="body"
                          tone="faint"
                          style={styles.savedEnglish}
                          numberOfLines={2}
                        >
                          {item.englishText}
                        </AppText>
                      ) : null}

                      <AppText variant="link" style={[styles.cardTapHint, { marginTop: 8 }]}>
                        {t('Read full hadith')} →
                      </AppText>
                    </TouchableOpacity>
                  </Card>
                  </View>
                ))}
              </View>
            )}
          </DetailScreen.ScrollView>
        )}

        {/* TAB: READING PROGRESS */}
        {activeTab === 'progress' && (
          <DetailScreen.ScrollView contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              compact
              eyebrow={t('Library')}
              title={t('Reading Progress')}
              subtitle={t('Track prophetic traditions completed per collection')}
            />

            {/* Scorecard Header */}
            <View style={styles.scoreRow}>
              <Card padded style={styles.scoreCard} contentStyle={styles.scoreCardContent}>
                <AppText variant="numeral" highlight style={styles.scoreNumber}>{totalRead}</AppText>
                <AppText variant="eyebrow" tone="faint" style={styles.scoreLabel}>{t('Hadiths Read')}</AppText>
              </Card>
              <Card padded style={styles.scoreCard} contentStyle={styles.scoreCardContent}>
                <AppText variant="numeral" style={styles.scoreNumber}>
                  {Object.keys(readCounts).length}
                </AppText>
                <AppText variant="eyebrow" tone="faint" style={styles.scoreLabel}>
                  {t('Collections Explored')}
                </AppText>
              </Card>
            </View>

            <View style={styles.sectionDivider}>
              <AppText variant="title" style={styles.sectionDividerTitle}>
                {t('Collections Breakdown')}
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.sectionDividerSub}>
                {t('Tap any collection to jump directly to its books')}
              </AppText>
            </View>

            <View style={[styles.gap12, isWide && styles.gridWide]}>
              {collections.map((col) => {
                const count = readCounts[col.slug] || 0;
                const total = col.totalAvailable || col.totalHadith || 1;
                const pct = total > 0 ? Math.min(100, Math.round((count / total) * 1000) / 10) : 0;

                return (
                  <View key={col.slug} style={isWide && styles.gridCell}>
                  <Card padded>
                    <TouchableOpacity
                      onPress={() => {
                        setActiveTab('collections');
                        openCollection(col);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.progressHeaderRow}>
                        <View style={styles.flex1}>
                          <AppText variant="title" style={styles.colTitle}>
                            {col.name.en}
                          </AppText>
                          <AppText variant="caption" tone="faint" style={styles.progressMeta}>
                            {count} {t('of')} {total.toLocaleString()} {t('read')}
                          </AppText>
                        </View>
                        <View style={styles.pctBadge}>
                          <AppText variant="caption" highlight style={styles.pctText}>{pct}%</AppText>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View
                        style={[
                          styles.progressBarBg,
                          { backgroundColor: tokens.cardBorder },
                        ]}
                      >
                        <LinearGradient
                          colors={tokens.goldGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.max(pct > 0 ? 3 : 0, pct)}%`,
                            },
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  </Card>
                  </View>
                );
              })}
            </View>
          </DetailScreen.ScrollView>
        )}

        {/* TAB: COLLECTIONS BROWSING FLOW */}
        {activeTab === 'collections' && view.type === 'collections' && (
          <DetailScreen.ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={collectionsRefreshing}
                onRefresh={() => {
                  setCollectionsRefreshing(true);
                  loadCollections(true);
                }}
                tintColor={tokens.accent}
              />
            }
          >
            {/* Search Filter */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
              ]}
            >
              <Ionicons name="search" size={16} color={tokens.muted} style={styles.searchIcon} />
              <TextInput
                value={collectionFilter}
                onChangeText={setCollectionFilter}
                placeholder={t('Search collections...')}
                placeholderTextColor={tokens.muted}
                accessibilityLabel={t('Search collections...')}
                style={[
                  styles.searchInput,
                  {
                    color: tokens.text,
                    fontFamily: isRTL() ? fontRoles.arabicNoto : 'Manrope_400Regular',
                    textAlign: isRTL() ? 'right' : 'left',
                    writingDirection: isRTL() ? 'rtl' : 'ltr',
                    fontSize: isRTL() ? 15 : 14,
                  },
                ]}
                clearButtonMode="while-editing"
                returnKeyType="search"
                onSubmitEditing={() => {
                  const q = collectionFilter.trim();
                  if (q.length >= 2) addCollectionQuery(q);
                }}
              />
              {collectionFilter.length > 0 && (
                <TouchableOpacity onPress={() => setCollectionFilter('')}>
                  <Ionicons name="close-circle" size={16} color={tokens.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Recent Collection Searches */}
            {collectionHistory.length > 0 && !collectionFilter && (
              <View style={styles.recentWrap}>
                <View style={styles.recentHeader}>
                  <AppText variant="caption" tone="faint" style={styles.recentLabel}>{t('Recent searches')}</AppText>
                  <TouchableOpacity
                    onPress={clearCollectionHistory}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Clear hadith collection search history')}
                  >
                    <AppText variant="caption" tone="faint" style={styles.recentClearText}>{t('Clear')}</AppText>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={[styles.recentChipsScroll, hScrollRTLStyle()]}
                >
                  {collectionHistory.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.recentChip,
                        { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setCollectionFilter(item);
                          addCollectionQuery(item);
                        }}
                        style={styles.recentChipBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Search for ${item}`}
                      >
                        <Ionicons name="time-outline" size={13} color={tokens.accent} />
                        <AppText variant="caption" style={styles.recentChipText} numberOfLines={1}>
                          {item}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeCollectionQuery(item)}
                        style={styles.recentChipRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Remove')} ${item} ${t('from search history')}`}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                      >
                        <Ionicons name="close" size={12} color={tokens.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {collectionsLoading && (
              <View style={styles.gap12}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <CollectionCardSkeleton key={i} />
                ))}
              </View>
            )}

            {collectionsError && (
              <EmptyState
                icon="cloud-offline-outline"
                title={t("You're offline")}
                subtitle={collectionsError}
                actionLabel={t('Retry')}
                onAction={loadCollections}
              />
            )}

            {/* Collections List */}
            <View style={[styles.gap12, isWide && styles.gridWide]}>
              {filteredCollections.map((item) => {
                const readCount = readCounts[item.slug] || 0;
                const total = item.totalAvailable || item.totalHadith || 0;

                return (
                  <View key={item.slug} style={isWide && styles.gridCell}>
                  <Card padded>
                    <TouchableOpacity
                      onPress={() => openCollection(item)}
                      style={styles.colTouch}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.name.en}`}
                    >
                      <View style={styles.colTop}>
                        <View style={styles.flex1}>
                          <AppText variant="title" style={styles.colTitle}>
                            {item.name.en}
                          </AppText>
                          <AppText variant="caption" highlight style={styles.colHadithCount}>
                            {total > 0 ? `${total.toLocaleString()} ${t('hadiths')}` : t('Collection')}
                            {readCount > 0 ? ` · ${readCount} ${t('read')}` : ''}
                          </AppText>
                        </View>
                        {item.name.ar ? (
                          <ArabicText size={22} style={styles.colArabic}>
                            {item.name.ar}
                          </ArabicText>
                        ) : null}
                      </View>

                      {item.intro?.en ? (
                        <AppText
                          variant="caption"
                          tone="faint"
                          style={styles.colIntro}
                        >
                          {item.intro.en}
                        </AppText>
                      ) : null}

                      <View style={styles.colFooter}>
                        <AppText variant="link" style={styles.browseBooksText}>
                          {t('Browse Books')} →
                        </AppText>
                        <AppText variant="link" style={styles.arrow}>{isRTL() ? '‹' : '›'}</AppText>
                      </View>
                    </TouchableOpacity>
                  </Card>
                  </View>
                );
              })}
            </View>

            {collectionFilter.trim().length > 0 && filteredCollections.length === 0 && (
              <EmptyState
                icon="search-outline"
                title={t('No matches')}
                subtitle={`${t('No collections match')} "${collectionFilter}"`}
                actionLabel={t('Clear search')}
                onAction={() => setCollectionFilter('')}
              />
            )}
          </DetailScreen.ScrollView>
        )}

        {/* SUBVIEW: BOOKS IN COLLECTION */}
        {activeTab === 'collections' && view.type === 'books' && (
          <DetailScreen.ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={booksRefreshing}
                onRefresh={() => {
                  setBooksRefreshing(true);
                  openCollection(view.collection, true);
                }}
                tintColor={tokens.accent}
              />
            }
          >
            <SectionHeader
              compact
              eyebrow={view.collection.name.en}
              title={t('Books')}
              subtitle={
                books.length > 0
                  ? `${books.length} ${t('books in this collection')}`
                  : t('Chapters and books')
              }
            />

            {/* Book Filter */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
              ]}
            >
              <Ionicons name="search" size={16} color={tokens.muted} style={styles.searchIcon} />
              <TextInput
                value={bookFilter}
                onChangeText={setBookFilter}
                placeholder={t('Search books by title or number...')}
                placeholderTextColor={tokens.muted}
                accessibilityLabel={t('Search books by title or number...')}
                style={[
                  styles.searchInput,
                  {
                    color: tokens.text,
                    fontFamily: isRTL() ? fontRoles.arabicNoto : 'Manrope_400Regular',
                    textAlign: isRTL() ? 'right' : 'left',
                    writingDirection: isRTL() ? 'rtl' : 'ltr',
                    fontSize: isRTL() ? 15 : 14,
                  },
                ]}
                clearButtonMode="while-editing"
                returnKeyType="search"
                onSubmitEditing={() => {
                  const q = bookFilter.trim();
                  if (q.length >= 2) addBookQuery(q);
                }}
              />
              {bookFilter.length > 0 && (
                <TouchableOpacity onPress={() => setBookFilter('')}>
                  <Ionicons name="close-circle" size={16} color={tokens.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Recent Book Searches */}
            {bookHistory.length > 0 && !bookFilter && (
              <View style={styles.recentWrap}>
                <View style={styles.recentHeader}>
                  <AppText variant="caption" tone="faint" style={styles.recentLabel}>{t('Recent searches')}</AppText>
                  <TouchableOpacity
                    onPress={clearBookHistory}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Clear hadith book search history')}
                  >
                    <AppText variant="caption" tone="faint" style={styles.recentClearText}>{t('Clear')}</AppText>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={[styles.recentChipsScroll, hScrollRTLStyle()]}
                >
                  {bookHistory.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.recentChip,
                        { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setBookFilter(item);
                          addBookQuery(item);
                        }}
                        style={styles.recentChipBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Search for ${item}`}
                      >
                        <Ionicons name="time-outline" size={13} color={tokens.accent} />
                        <AppText variant="caption" style={styles.recentChipText} numberOfLines={1}>
                          {item}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeBookQuery(item)}
                        style={styles.recentChipRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item} from search history`}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                      >
                        <Ionicons name="close" size={12} color={tokens.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {booksLoading && (
              <View style={styles.gap12}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <BookSkeleton key={i} />
                ))}
              </View>
            )}

            {booksError && (
              <EmptyState
                icon="cloud-offline-outline"
                title={t("Couldn't load books")}
                subtitle={booksError}
                actionLabel={t("Retry")}
                onAction={() => openCollection(view.collection)}
              />
            )}

            {/* Books List */}
            <View style={[styles.gap12, isWide && styles.gridWide]}>
              {filteredBooks.map((item) => (
                <View key={item.bookNumber} style={isWide && styles.gridCell}>
                <Card padded>
                  <TouchableOpacity
                    onPress={() => openBook(view.collection, item)}
                    style={styles.bookTouch}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Book ${item.bookNumber}: ${item.name.en}`}
                  >
                    <View style={styles.bookHeaderRow}>
                      <View style={[styles.badge, { backgroundColor: tokens.ringFill }]}>
                        <AppText variant="caption" highlight style={styles.badgeText}>
                          Book {item.bookNumber}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="faint" style={styles.bookCountText}>
                        {item.hadithCount} hadith{item.hadithCount !== 1 ? 's' : ''}
                      </AppText>
                    </View>

                    <AppText variant="title" style={styles.bookTitleEn}>
                      {item.name.en || `Book ${item.bookNumber}`}
                    </AppText>

                    {item.name.ar ? (
                      <ArabicText size={20} style={styles.bookTitleAr}>
                        {item.name.ar}
                      </ArabicText>
                    ) : null}

                    {item.hadithStartNumber && item.hadithEndNumber ? (
                      <AppText variant="caption" tone="faint" style={styles.hadithRange}>
                        Hadiths {item.hadithStartNumber} – {item.hadithEndNumber}
                      </AppText>
                    ) : null}

                    <View style={styles.bookFooter}>
                      <AppText variant="link" style={styles.readHint}>
                        View hadiths →
                      </AppText>
                    </View>
                  </TouchableOpacity>
                                    </Card>
                                  </View>
                                ))}
                              </View>

                              {bookFilter.trim().length > 0 && filteredBooks.length === 0 && (
              <EmptyState
                icon="search-outline"
                title={t("No matches")}
                subtitle={`No books match "${bookFilter}"`}
                actionLabel={t("Clear search")}
                onAction={() => setBookFilter('')}
              />
            )}
          </DetailScreen.ScrollView>
        )}

        {/* SUBVIEW: HADITHS IN BOOK */}
        {activeTab === 'collections' && view.type === 'hadiths' && (
          <DetailScreen.FlatList
            data={hadiths}
            keyExtractor={(item) => `${item.collection}:${item.bookNumber}:${item.hadithNumber}`}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={hadithsRefreshing}
                onRefresh={() => {
                  setHadithsRefreshing(true);
                  openBook(view.collection, view.book, true);
                }}
                tintColor={tokens.accent}
              />
            }
            ListHeaderComponent={
              <View style={styles.listHeaderWrap}>
                <SectionHeader
                  compact
                  eyebrow={`${view.collection.name.en} · ${t('Book')} ${view.book.bookNumber}`}
                  title={view.book.name.en || `${t('Book')} ${view.book.bookNumber}`}
                  subtitle={
                    hadithsTotal > 0
                      ? `${hadithsTotal} ${t('hadiths in this book')}`
                      : t('Prophetic traditions')
                  }
                />
                {hadithsLoading && (
                  <View style={styles.gap12}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <HadithRowSkeleton key={i} />
                    ))}
                  </View>
                )}
                {hadithsError && (
                  <EmptyState
                    icon="cloud-offline-outline"
                    title={t("Couldn't load hadiths")}
                    subtitle={hadithsError}
                    actionLabel={t("Retry")}
                    onAction={() => openBook(view.collection, view.book)}
                  />
                )}
              </View>
            }
            renderItem={({ item }) => {
              const arText = cleanHadithText(item.ar?.text, item.ar?.body);
              const enText = cleanHadithText(item.en?.text, item.en?.body);
              const grade = getHadithGrade(item);

              return (
                <Card padded style={styles.mb12}>
                  <TouchableOpacity
                    onPress={() =>
                      openDetail(
                        item,
                        { slug: view.collection.slug, nameEn: view.collection.name.en },
                        { bookNumber: view.book.bookNumber, nameEn: view.book.name.en },
                        'hadiths'
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.hadithRowTop}>
                      <View style={[styles.badge, { backgroundColor: tokens.ringFill }]}>
                        <AppText variant="caption" highlight style={styles.badgeText}>
                          {t('Hadith')} #{item.hadithNumber}
                        </AppText>
                      </View>
                      {grade ? (
                        <View
                          style={[
                            styles.gradeBadge,
                            { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill },
                          ]}
                        >
                          <AppText variant="caption" tone="faint" style={styles.gradeText}>
                            {grade}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    {item.chapterTitle?.en ? (
                      <AppText
                        variant="caption"
                        tone="faint"
                        style={styles.chapterTitle}
                        numberOfLines={2}
                      >
                        Chapter: {item.chapterTitle.en}
                      </AppText>
                    ) : null}

                    {arText ? (
                      <ArabicText size={20} numberOfLines={3} style={styles.hadithArabicPreview}>
                        {arText}
                      </ArabicText>
                    ) : null}

                    {enText ? (
                      <AppText
                        variant="body"
                        tone="faint"
                        style={styles.hadithEnPreview}
                        numberOfLines={3}
                      >
                        {enText}
                      </AppText>
                    ) : null}

                    <AppText variant="link" style={[styles.cardTapHint, { marginTop: 10 }]}>
                      Tap for full text & actions →
                    </AppText>
                  </TouchableOpacity>
                </Card>
              );
            }}
            ListFooterComponent={
              hadiths.length < hadithsTotal ? (
                <View style={styles.loadMoreWrap}>
                  <TouchableOpacity
                    onPress={loadMoreHadiths}
                    disabled={hadithsLoadingMore}
                    style={[
                      styles.loadMoreBtn,
                      { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
                    ]}
                  >
                    {hadithsLoadingMore ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <AppText variant="rowTitle" style={styles.loadMoreText}>
                        Load More ({hadiths.length} of {hadithsTotal})
                      </AppText>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}

        {/* SUBVIEW: HADITH DETAIL */}
        {view.type === 'detail' && (
          <DetailScreen.ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header info */}
            <SectionHeader
              compact
              eyebrow={`${view.collection.nameEn || view.collection.slug} · ${t('Book')} ${view.book?.bookNumber || view.hadith.bookNumber || '1'}`}
              title={`${t('Hadith')} #${view.hadith.hadithNumber}`}
              subtitle={view.book?.nameEn || undefined}
            />

            {/* Chapter title if available */}
            {view.hadith.chapterTitle?.en || view.hadith.chapterTitle?.ar ? (
              <Card padded style={styles.mb16}>
                <AppText variant="eyebrow" highlight style={styles.chapterHeaderLabel}>
                  {t('Chapter')} {view.hadith.chapterNumber ? `#${view.hadith.chapterNumber}` : ''}
                </AppText>
                {view.hadith.chapterTitle?.en ? (
                  <AppText variant="title" style={styles.chapterTitleEn}>
                    {view.hadith.chapterTitle.en}
                  </AppText>
                ) : null}
                {view.hadith.chapterTitle?.ar ? (
                  <ArabicText size={20} style={styles.chapterTitleAr}>
                    {view.hadith.chapterTitle.ar}
                  </ArabicText>
                ) : null}
              </Card>
            ) : null}

            {/* Authenticity Grade */}
            {getHadithGrade(view.hadith) ? (
              <View style={styles.gradeBanner}>
                <Ionicons name="shield-checkmark" size={16} color={tokens.accent} />
                <AppText variant="rowTitle" style={styles.gradeBannerText}>
                  Authenticity: {getHadithGrade(view.hadith)}
                </AppText>
              </View>
            ) : null}

            {/* Full Arabic Text Card */}
            <Card padded style={styles.mb16}>
              <View style={styles.cardHeaderRow}>
                <AppText variant="eyebrow" tone="faint" style={styles.languageTag}>{t('ARABIC')}</AppText>
              </View>
              <ArabicText size={26} style={styles.detailArabicText}>
                {cleanHadithText(view.hadith.ar?.text, view.hadith.ar?.body)}
              </ArabicText>
            </Card>

            {/* Full English Translation Card */}
            <Card padded style={styles.mb20}>
              <View style={styles.cardHeaderRow}>
                <AppText variant="eyebrow" tone="faint" style={styles.languageTag}>{t('TRANSLATION')}</AppText>
              </View>
              <AppText variant="body" style={styles.detailEnglishText}>
                {cleanHadithText(view.hadith.en?.text, view.hadith.en?.body)}
              </AppText>
            </Card>

            {/* Action Bar (Save/Bookmark, Share) */}
            <View style={styles.actionsBar}>
              <TouchableOpacity
                onPress={toggleSaveCurrent}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isCurrentSaved ? 'transparent' : tokens.cardTop,
                    borderColor: isCurrentSaved ? tokens.goldBorder : tokens.cardBorder,
                    overflow: 'hidden',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={isCurrentSaved ? t('Unsave hadith') : t('Save hadith')}
              >
                {isCurrentSaved && (
                  <LinearGradient
                    colors={tokens.goldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Ionicons
                  name={isCurrentSaved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isCurrentSaved ? tokens.onGold : tokens.text}
                />
                <AppText
                  variant="rowTitle"
                  tone={isCurrentSaved ? 'onGold' : undefined}
                  style={styles.actionBtnText}
                >
                  {isCurrentSaved ? t('Saved') : t('Save')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareCurrentHadith}
                disabled={isSharingImage}
                style={[
                  styles.actionBtn,
                  { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('Share hadith')}
              >
                {isSharingImage ? (
                  <ActivityIndicator size="small" color={tokens.text} />
                ) : (
                  <Ionicons name="share-outline" size={18} color={tokens.text} />
                )}
                <AppText variant="rowTitle" style={styles.actionBtnText}>{t('Share')}</AppText>
              </TouchableOpacity>
            </View>

            {/* Source Reference Footer */}
            <View style={styles.sourceFooter}>
              <AppText variant="caption" tone="faint" style={styles.sourceText}>
                {t('Reference')}: {view.collection.nameEn || view.collection.slug} {t('Book')}{' '}
                {view.book?.bookNumber || view.hadith.bookNumber || '1'}, {t('Hadith')}{' '}
                {view.hadith.hadithNumber}
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.recordedBadge}>
                {t('✓ Recorded in Recently Read & Progress')}
              </AppText>
            </View>
          </DetailScreen.ScrollView>
        )}
      </View>

      {/* Share-as-image capture card (rendered off-screen while sharing) */}
      {shareHadithData && (
        <View style={styles.shareCardWrap} pointerEvents="none">
          <View
            ref={shareCardRef}
            collapsable={false}
            style={[styles.shareCard, { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}
          >
            <AppText variant="eyebrow" highlight style={styles.shareCardEyebrow}>
              {shareHadithData.collectionName}
            </AppText>
            {shareHadithData.arabicText ? (
              <AppText variant="body" style={styles.shareCardArabic}>
                {shareHadithData.arabicText}
              </AppText>
            ) : null}
            <LinearGradient
              colors={tokens.goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareCardRule}
            />
            {shareHadithData.englishText ? (
              <AppText variant="body" style={styles.shareCardTrans}>
                {shareHadithData.englishText}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="faint" style={styles.shareCardRef}>
              {shareHadithData.source}
            </AppText>

            {/* App Brand Footer: Logo + ISLAMIC wordmark */}
            <View style={[styles.shareCardBrandFooter, { borderTopColor: tokens.cardBorder }]} collapsable={false}>
              <View collapsable={false} style={styles.shareCardLogoWrap}>
                <Image
                  source={getBrandLogoSource(mode)}
                  style={styles.shareCardLogo}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
              <AppText
                variant="eyebrow"
                style={styles.shareCardBrandWordmark}
              >
                {isRTL() ? 'اسلامک' : 'ISLAMIC'}
              </AppText>
            </View>
          </View>
        </View>
      )}
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    minWidth: 0,
  },
  detailScreen: {
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    borderRadius: 14,
    borderWidth: 0.75,
    padding: 16,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  listHeaderWrap: {
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 0.75,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingEnd: 10,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  tabsWrap: {
    borderBottomWidth: 0.75,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 6,
    gap: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 0.75,
  },
  tabChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.75,
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 44,
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {
    marginEnd: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    padding: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
  },
  recentWrap: {
    marginBottom: 10,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  recentClearText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  recentChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingEnd: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 0.75,
    paddingStart: 8,
    paddingEnd: 4,
    minHeight: 28,
    paddingVertical: 2,
  },
  recentChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    minHeight: 44,
  },
  recentChipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    maxWidth: 140,
  },
  recentChipRemove: {
    padding: 4,
    marginStart: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  loadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  gap12: {
    gap: 12,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCell: {
    flexBasis: '47%',
    minWidth: 0,
    flexGrow: 0,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
  mb20: {
    marginBottom: 20,
  },
  colTouch: {
    gap: 8,
    minHeight: 44,
  },
  colTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  colTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 26,
    // Reusable long-title guard: flex:1 so the English title takes the
    // available width and wraps/ellipsizes instead of collapsing when the
    // Arabic sibling is long.
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  colHadithCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  colArabic: {
    textAlign: 'right',
    // Cap Arabic width so it wraps within the card instead of pushing the
    // English title into a collapsed column.
    flexShrink: 1,
    maxWidth: '55%',
  },
  colIntro: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  colFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  browseBooksText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  arrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    lineHeight: 22,
  },
  bookTouch: {
    gap: 6,
    minHeight: 44,
  },
  bookHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  bookCountText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  bookTitleEn: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    lineHeight: 24,
    marginTop: 4,
    // Keep the title inside the card: stretch to the card width so a long
    // Arabic sibling can never widen the column and squeeze this text
    // into a one-character column. Long English titles wrap or ellipsize.
    flexShrink: 1,
    width: '100%',
  },
  bookTitleAr: {
    textAlign: 'right',
    marginTop: 2,
    // Arabic must wrap within the card, never force the column wider.
    flexShrink: 1,
    width: '100%',
  },
  hadithRange: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  bookFooter: {
    marginTop: 8,
  },
  readHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  hadithRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gradeBadge: {
    borderWidth: 0.75,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chapterTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 6,
  },
  hadithArabicPreview: {
    textAlign: 'right',
    lineHeight: 32,
    marginVertical: 4,
  },
  hadithEnPreview: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4,
  },
  cardTapHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  loadMoreWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.75,
    minHeight: 44,
  },
  loadMoreText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  chapterHeaderLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  chapterTitleEn: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
    lineHeight: 22,
  },
  chapterTitleAr: {
    textAlign: 'right',
    marginTop: 4,
  },
  gradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  gradeBannerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  cardHeaderRow: {
    marginBottom: 10,
  },
  languageTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  detailArabicText: {
    textAlign: 'right',
    lineHeight: 44,
  },
  detailEnglishText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 25,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.75,
    minHeight: 44,
    minWidth: 0,
  },
  actionBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  sourceFooter: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  sourceText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  recordedBadge: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  savedCard: {
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  savedArabic: {
    textAlign: 'right',
    lineHeight: 30,
    marginVertical: 4,
  },
  savedEnglish: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  unsaveBtn: {
    padding: 6,
    minHeight: 44,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  scoreCard: {
    flex: 1,
    minWidth: 0,
  },
  scoreNumber: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
  },
  scoreLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDivider: {
    marginBottom: 14,
  },
  sectionDividerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  sectionDividerSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  pctBadge: {
    paddingStart: 8,
  },
  pctText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  shareCardWrap: {
    position: 'absolute',
    left: -2000,
    top: 0,
    width: 360,
    padding: 20,
  },
  shareCard: {
    borderRadius: 20,
    borderWidth: 0.75,
    padding: 24,
    alignItems: 'stretch',
  },
  shareCardEyebrow: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  shareCardArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 14,
  },
  shareCardRule: {
    height: 2,
    borderRadius: 1,
    marginBottom: 14,
    width: '40%',
    alignSelf: 'center',
  },
  shareCardTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  shareCardRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  shareCardBrandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  shareCardLogoWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardLogo: {
    width: 32,
    height: 32,
  },
  shareCardBrandWordmark: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  scoreCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },

  savedCardContent: {
    gap: 6,
  },
});
