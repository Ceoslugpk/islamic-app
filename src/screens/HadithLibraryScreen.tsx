import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Share,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
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
}

export default function HadithLibraryScreen({ onBack }: HadithLibraryScreenProps) {
  const { colors } = useTheme();
  const { refreshKey } = useConnectivity();

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
        setCollectionsError('Unable to refresh collections. Showing offline list.');
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
        setBooksError('Failed to load books. Please check your connection and retry.');
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
        setHadithsError('Failed to load hadiths. Please check your connection and retry.');
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
    try {
      await Share.share({ message });
    } catch {
      // ignore
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
  const handleBack = () => {
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
  };

  // Determine back button label
  const backLabel = useMemo(() => {
    if (activeTab !== 'collections') {
      if (view.type === 'detail') return 'Back';
      return 'Library';
    }
    if (view.type === 'detail') {
      return view.from === 'hadiths' ? 'Hadiths' : 'Back';
    }
    if (view.type === 'hadiths') return 'Books';
    if (view.type === 'books') return 'Collections';
    return 'Library';
  }, [activeTab, view]);

  // Total read hadiths count
  const totalRead = useMemo(() => {
    return Object.values(readCounts).reduce((acc, v) => acc + v, 0);
  }, [readCounts]);

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isWide = width >= 600;
  const paddingH = isCompact ? 16 : 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Top Header Row with Back Button */}
      <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle, paddingHorizontal: paddingH }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backLabel}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← {backLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tabs (Collections | Saved | Recent | Progress) */}
      <View style={[styles.tabsWrap, { borderBottomColor: colors.borderSubtle }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {(
            [
              { key: 'collections', label: 'Collections', icon: 'albums' },
              { key: 'saved', label: `Saved (${savedList.length})`, icon: 'bookmark' },
              { key: 'recent', label: 'Recent', icon: 'time' },
              { key: 'progress', label: 'Progress', icon: 'analytics' },
            ] as const
          ).map((t) => {
            const isActive = activeTab === t.key && (t.key !== 'collections' || view.type === 'collections');
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => handleTabChange(t.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? colors.accent : colors.bgSurface,
                    borderColor: isActive ? colors.accent : colors.borderSubtle,
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={isActive ? colors.onAccent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? colors.onAccent : colors.textPrimary },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTENT AREA */}
      <View style={styles.flex1}>
        {/* TAB: SAVED HADITHS */}
        {activeTab === 'saved' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              compact
              eyebrow="Library"
              title="Saved Hadith"
              subtitle={
                savedList.length === 0
                  ? 'Bookmarks and saved prophetic traditions'
                  : `${savedList.length} saved tradition${savedList.length > 1 ? 's' : ''}`
              }
            />

            {savedList.length === 0 ? (
              <EmptyState
                icon="bookmark-outline"
                title="No saved hadiths yet"
                subtitle='While reading any hadith, tap the "Save" bookmark button to keep it here for quick access.'
              />
            ) : (
              <View style={[styles.gap12, isWide && styles.gridWide]}>
                {savedList.map((item) => (
                  <View key={item.id} style={isWide && styles.gridCell}>
                  <Card padded style={styles.savedCard}>
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
                        <View style={[styles.badge, { backgroundColor: colors.accentDim }]}>
                          <Text style={[styles.badgeText, { color: colors.accent }]}>
                            {item.collectionName || item.collection} · Book {item.bookNumber} : #
                            {item.hadithNumber}
                          </Text>
                        </View>
                        {item.grade ? (
                          <View
                            style={[
                              styles.gradeBadge,
                              { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
                            ]}
                          >
                            <Text style={[styles.gradeText, { color: colors.textMuted }]}>
                              {item.grade}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {item.arabicText ? (
                        <ArabicText size={20} numberOfLines={2} style={styles.savedArabic}>
                          {item.arabicText}
                        </ArabicText>
                      ) : null}

                      {item.englishText ? (
                        <Text
                          style={[styles.savedEnglish, { color: colors.textSecondary }]}
                          numberOfLines={3}
                        >
                          {item.englishText}
                        </Text>
                      ) : null}

                      <View style={styles.cardActionRow}>
                        <Text style={[styles.cardTapHint, { color: colors.accent }]}>
                          Read full hadith →
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            removeSavedHadith(item.id);
                            reloadStorageData();
                          }}
                          style={styles.unsaveBtn}
                          accessibilityLabel="Remove from saved"
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Card>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* TAB: RECENTLY READ */}
        {activeTab === 'recent' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              compact
              eyebrow="Library"
              title="Recently Read"
              subtitle="Prophetic traditions you recently viewed"
            />

            {recentList.length === 0 ? (
              <EmptyState
                icon="time-outline"
                title="No reading history yet"
                subtitle="As you browse collections and read hadith details, they will automatically appear here."
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
                        <View style={[styles.badge, { backgroundColor: colors.accentDim }]}>
                          <Text style={[styles.badgeText, { color: colors.accent }]}>
                            {item.collectionName || item.collection} · Book {item.bookNumber} : #
                            {item.hadithNumber}
                          </Text>
                        </View>
                        <Text style={[styles.dateText, { color: colors.textMuted }]}>
                          {new Date(item.readAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>

                      {item.arabicText ? (
                        <ArabicText size={20} numberOfLines={2} style={styles.savedArabic}>
                          {item.arabicText}
                        </ArabicText>
                      ) : null}

                      {item.englishText ? (
                        <Text
                          style={[styles.savedEnglish, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.englishText}
                        </Text>
                      ) : null}

                      <Text style={[styles.cardTapHint, { color: colors.accent, marginTop: 8 }]}>
                        Read full hadith →
                      </Text>
                    </TouchableOpacity>
                  </Card>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* TAB: READING PROGRESS */}
        {activeTab === 'progress' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              compact
              eyebrow="Library"
              title="Reading Progress"
              subtitle="Track prophetic traditions completed per collection"
            />

            {/* Scorecard Header */}
            <View style={styles.scoreRow}>
              <Card padded style={styles.scoreCard}>
                <Text style={[styles.scoreNumber, { color: colors.accent }]}>{totalRead}</Text>
                <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Hadiths Read</Text>
              </Card>
              <Card padded style={styles.scoreCard}>
                <Text style={[styles.scoreNumber, { color: colors.textPrimary }]}>
                  {Object.keys(readCounts).length}
                </Text>
                <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
                  Collections Explored
                </Text>
              </Card>
            </View>

            <View style={styles.sectionDivider}>
              <Text style={[styles.sectionDividerTitle, { color: colors.textPrimary }]}>
                Collections Breakdown
              </Text>
              <Text style={[styles.sectionDividerSub, { color: colors.textMuted }]}>
                Tap any collection to jump directly to its books
              </Text>
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
                          <Text style={[styles.colTitle, { color: colors.textPrimary }]}>
                            {col.name.en}
                          </Text>
                          <Text style={[styles.progressMeta, { color: colors.textMuted }]}>
                            {count} of {total.toLocaleString()} read
                          </Text>
                        </View>
                        <View style={styles.pctBadge}>
                          <Text style={[styles.pctText, { color: colors.accent }]}>{pct}%</Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View
                        style={[
                          styles.progressBarBg,
                          { backgroundColor: colors.borderSubtle },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: colors.accent,
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
          </ScrollView>
        )}

        {/* TAB: COLLECTIONS BROWSING FLOW */}
        {activeTab === 'collections' && view.type === 'collections' && (
          <ScrollView
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
                tintColor={colors.accent}
              />
            }
          >
            <SectionHeader
              compact
              eyebrow="Library"
              title="Hadith Library"
              subtitle="Browse 17 canonical collections, books & authentic narrations"
            />

            {/* Search Filter */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                value={collectionFilter}
                onChangeText={setCollectionFilter}
                placeholder="Search collections..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                clearButtonMode="while-editing"
                returnKeyType="search"
                onSubmitEditing={() => {
                  const q = collectionFilter.trim();
                  if (q.length >= 2) addCollectionQuery(q);
                }}
              />
              {collectionFilter.length > 0 && (
                <TouchableOpacity onPress={() => setCollectionFilter('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Recent Collection Searches */}
            {collectionHistory.length > 0 && !collectionFilter && (
              <View style={styles.recentWrap}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentLabel, { color: colors.textMuted }]}>Recent searches</Text>
                  <TouchableOpacity
                    onPress={clearCollectionHistory}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear hadith collection search history"
                  >
                    <Text style={[styles.recentClearText, { color: colors.textMuted }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentChipsScroll}
                >
                  {collectionHistory.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.recentChip,
                        { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
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
                        <Ionicons name="time-outline" size={13} color={colors.accent} />
                        <Text style={[styles.recentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeCollectionQuery(item)}
                        style={styles.recentChipRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item} from search history`}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                      >
                        <Ionicons name="close" size={12} color={colors.textMuted} />
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
                title="You're offline"
                subtitle={collectionsError}
                actionLabel="Retry"
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
                          <Text style={[styles.colTitle, { color: colors.textPrimary }]}>
                            {item.name.en}
                          </Text>
                          <Text style={[styles.colHadithCount, { color: colors.textMuted }]}>
                            {total > 0 ? `${total.toLocaleString()} hadiths` : 'Collection'}
                            {readCount > 0 ? ` · ${readCount} read` : ''}
                          </Text>
                        </View>
                        {item.name.ar ? (
                          <ArabicText size={22} style={styles.colArabic}>
                            {item.name.ar}
                          </ArabicText>
                        ) : null}
                      </View>

                      {item.intro?.en ? (
                        <Text
                          style={[styles.colIntro, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.intro.en}
                        </Text>
                      ) : null}

                      <View style={styles.colFooter}>
                        <Text style={[styles.browseBooksText, { color: colors.accent }]}>
                          Browse Books →
                        </Text>
                        <Text style={[styles.arrow, { color: colors.accent }]}>›</Text>
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
                title="No matches"
                subtitle={`No collections match "${collectionFilter}"`}
                actionLabel="Clear search"
                onAction={() => setCollectionFilter('')}
              />
            )}
          </ScrollView>
        )}

        {/* SUBVIEW: BOOKS IN COLLECTION */}
        {activeTab === 'collections' && view.type === 'books' && (
          <ScrollView
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
                tintColor={colors.accent}
              />
            }
          >
            <SectionHeader
              compact
              eyebrow={view.collection.name.en}
              title="Books"
              subtitle={
                books.length > 0
                  ? `${books.length} books in this collection`
                  : 'Chapters and books'
              }
            />

            {/* Book Filter */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                value={bookFilter}
                onChangeText={setBookFilter}
                placeholder="Search books by title or number..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                clearButtonMode="while-editing"
                returnKeyType="search"
                onSubmitEditing={() => {
                  const q = bookFilter.trim();
                  if (q.length >= 2) addBookQuery(q);
                }}
              />
              {bookFilter.length > 0 && (
                <TouchableOpacity onPress={() => setBookFilter('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Recent Book Searches */}
            {bookHistory.length > 0 && !bookFilter && (
              <View style={styles.recentWrap}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentLabel, { color: colors.textMuted }]}>Recent searches</Text>
                  <TouchableOpacity
                    onPress={clearBookHistory}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear hadith book search history"
                  >
                    <Text style={[styles.recentClearText, { color: colors.textMuted }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentChipsScroll}
                >
                  {bookHistory.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.recentChip,
                        { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
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
                        <Ionicons name="time-outline" size={13} color={colors.accent} />
                        <Text style={[styles.recentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeBookQuery(item)}
                        style={styles.recentChipRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item} from search history`}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                      >
                        <Ionicons name="close" size={12} color={colors.textMuted} />
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
                title="Couldn't load books"
                subtitle={booksError}
                actionLabel="Retry"
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
                      <View style={[styles.badge, { backgroundColor: colors.accentDim }]}>
                        <Text style={[styles.badgeText, { color: colors.accent }]}>
                          Book {item.bookNumber}
                        </Text>
                      </View>
                      <Text style={[styles.bookCountText, { color: colors.textMuted }]}>
                        {item.hadithCount} hadith{item.hadithCount !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    <Text style={[styles.bookTitleEn, { color: colors.textPrimary }]}>
                      {item.name.en || `Book ${item.bookNumber}`}
                    </Text>

                    {item.name.ar ? (
                      <ArabicText size={20} style={styles.bookTitleAr}>
                        {item.name.ar}
                      </ArabicText>
                    ) : null}

                    {item.hadithStartNumber && item.hadithEndNumber ? (
                      <Text style={[styles.hadithRange, { color: colors.textMuted }]}>
                        Hadiths {item.hadithStartNumber} – {item.hadithEndNumber}
                      </Text>
                    ) : null}

                    <View style={styles.bookFooter}>
                      <Text style={[styles.readHint, { color: colors.accent }]}>
                        View hadiths →
                      </Text>
                    </View>
                  </TouchableOpacity>
                                    </Card>
                                  </View>
                                ))}
                              </View>

                              {bookFilter.trim().length > 0 && filteredBooks.length === 0 && (
              <EmptyState
                icon="search-outline"
                title="No matches"
                subtitle={`No books match "${bookFilter}"`}
                actionLabel="Clear search"
                onAction={() => setBookFilter('')}
              />
            )}
          </ScrollView>
        )}

        {/* SUBVIEW: HADITHS IN BOOK */}
        {activeTab === 'collections' && view.type === 'hadiths' && (
          <FlatList
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
                tintColor={colors.accent}
              />
            }
            ListHeaderComponent={
              <View style={styles.listHeaderWrap}>
                <SectionHeader
                  compact
                  eyebrow={`${view.collection.name.en} · Book ${view.book.bookNumber}`}
                  title={view.book.name.en || `Book ${view.book.bookNumber}`}
                  subtitle={
                    hadithsTotal > 0
                      ? `${hadithsTotal} hadiths in this book`
                      : 'Prophetic traditions'
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
                    title="Couldn't load hadiths"
                    subtitle={hadithsError}
                    actionLabel="Retry"
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
                      <View style={[styles.badge, { backgroundColor: colors.accentDim }]}>
                        <Text style={[styles.badgeText, { color: colors.accent }]}>
                          Hadith #{item.hadithNumber}
                        </Text>
                      </View>
                      {grade ? (
                        <View
                          style={[
                            styles.gradeBadge,
                            { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
                          ]}
                        >
                          <Text style={[styles.gradeText, { color: colors.textMuted }]}>
                            {grade}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {item.chapterTitle?.en ? (
                      <Text
                        style={[styles.chapterTitle, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        Chapter: {item.chapterTitle.en}
                      </Text>
                    ) : null}

                    {arText ? (
                      <ArabicText size={20} numberOfLines={3} style={styles.hadithArabicPreview}>
                        {arText}
                      </ArabicText>
                    ) : null}

                    {enText ? (
                      <Text
                        style={[styles.hadithEnPreview, { color: colors.textSecondary }]}
                        numberOfLines={3}
                      >
                        {enText}
                      </Text>
                    ) : null}

                    <Text style={[styles.cardTapHint, { color: colors.accent, marginTop: 10 }]}>
                      Tap for full text & actions →
                    </Text>
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
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    {hadithsLoadingMore ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text style={[styles.loadMoreText, { color: colors.textPrimary }]}>
                        Load More ({hadiths.length} of {hadithsTotal})
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}

        {/* SUBVIEW: HADITH DETAIL */}
        {view.type === 'detail' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header info */}
            <SectionHeader
              compact
              eyebrow={`${view.collection.nameEn || view.collection.slug} · Book ${view.book?.bookNumber || view.hadith.bookNumber || '1'}`}
              title={`Hadith #${view.hadith.hadithNumber}`}
              subtitle={view.book?.nameEn || undefined}
            />

            {/* Chapter title if available */}
            {view.hadith.chapterTitle?.en || view.hadith.chapterTitle?.ar ? (
              <Card padded style={styles.mb16}>
                <Text style={[styles.chapterHeaderLabel, { color: colors.accent }]}>
                  CHAPTER {view.hadith.chapterNumber ? `#${view.hadith.chapterNumber}` : ''}
                </Text>
                {view.hadith.chapterTitle?.en ? (
                  <Text style={[styles.chapterTitleEn, { color: colors.textPrimary }]}>
                    {view.hadith.chapterTitle.en}
                  </Text>
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
                <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
                <Text style={[styles.gradeBannerText, { color: colors.textPrimary }]}>
                  Authenticity: {getHadithGrade(view.hadith)}
                </Text>
              </View>
            ) : null}

            {/* Full Arabic Text Card */}
            <Card padded style={styles.mb16}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.languageTag, { color: colors.textMuted }]}>ARABIC</Text>
              </View>
              <ArabicText size={26} style={styles.detailArabicText}>
                {cleanHadithText(view.hadith.ar?.text, view.hadith.ar?.body)}
              </ArabicText>
            </Card>

            {/* Full English Translation Card */}
            <Card padded style={styles.mb20}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.languageTag, { color: colors.textMuted }]}>TRANSLATION</Text>
              </View>
              <Text style={[styles.detailEnglishText, { color: colors.textPrimary }]}>
                {cleanHadithText(view.hadith.en?.text, view.hadith.en?.body)}
              </Text>
            </Card>

            {/* Action Bar (Save/Bookmark, Share) */}
            <View style={styles.actionsBar}>
              <TouchableOpacity
                onPress={toggleSaveCurrent}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isCurrentSaved ? colors.accent : colors.bgSurface,
                    borderColor: isCurrentSaved ? colors.accent : colors.borderSubtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={isCurrentSaved ? 'Unsave hadith' : 'Save hadith'}
              >
                <Ionicons
                  name={isCurrentSaved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isCurrentSaved ? colors.onAccent : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: isCurrentSaved ? colors.onAccent : colors.textPrimary },
                  ]}
                >
                  {isCurrentSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareCurrentHadith}
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share hadith"
              >
                <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Source Reference Footer */}
            <View style={styles.sourceFooter}>
              <Text style={[styles.sourceText, { color: colors.textMuted }]}>
                Reference: {view.collection.nameEn || view.collection.slug} Book{' '}
                {view.book?.bookNumber || view.hadith.bookNumber || '1'}, Hadith{' '}
                {view.hadith.hadithNumber}
              </Text>
              <Text style={[styles.recordedBadge, { color: colors.textMuted }]}>
                ✓ Recorded in Recently Read & Progress
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 40,
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
    borderBottomWidth: 1,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  tabsWrap: {
    borderBottomWidth: 1,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  tabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
    gap: 6,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    padding: 0,
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
    paddingRight: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 8,
    paddingRight: 4,
    height: 28,
  },
  recentChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  recentChipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    maxWidth: 140,
  },
  recentChipRemove: {
    padding: 4,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexBasis: '48%',
    minWidth: 0,
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
  },
  colHadithCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  colArabic: {
    textAlign: 'right',
  },
  colIntro: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 12,
  },
  arrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    lineHeight: 22,
  },
  bookTouch: {
    gap: 6,
  },
  bookHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
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
  },
  bookTitleAr: {
    textAlign: 'right',
    marginTop: 2,
  },
  hadithRange: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  bookFooter: {
    marginTop: 8,
  },
  readHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  hadithRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gradeBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chapterTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    marginBottom: 6,
  },
  hadithArabicPreview: {
    textAlign: 'right',
    lineHeight: 32,
    marginVertical: 4,
  },
  hadithEnPreview: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cardTapHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  loadMoreWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  loadMoreText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
    fontSize: 13,
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
    borderRadius: 10,
    borderWidth: 1,
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
    fontSize: 11,
  },
  savedCard: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  savedArabic: {
    textAlign: 'right',
    lineHeight: 30,
    marginVertical: 4,
  },
  savedEnglish: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
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
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
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
    paddingLeft: 8,
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
});
