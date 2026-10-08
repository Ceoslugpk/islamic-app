import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Share,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import {
  fetchNames,
  loadCachedNames,
  NAMES_99,
  NAMES_LANGUAGES,
  Name99,
  NameVerseRef,
  NamesLanguage,
  NamesProvider,
} from '../lib/names99';
import { PROPHET_NAMES_99 } from '../lib/prophetNames';
import { useSearchHistory } from '../lib/searchHistory';
import { useSettings } from '../lib/settings';
import { NameRowSkeleton } from '../components/Skeleton';

type LoadState = 'loading' | 'online' | 'offline';

/** Which dataset the screen renders: the Names of Allah or the Prophet's ﷺ names. */
export type NamesVariant = 'allah' | 'prophet';

interface NamesFeed {
  language: NamesLanguage;
  names: Name99[];
  source: 'cache' | 'api' | 'static';
  /** Which dataset produced the list (shown in the source label). */
  provider: NamesProvider;
}

/** Unified row shape across both variants (Name99 | ProphetName). */
interface NameRow {
  number: number;
  arabic: string;
  transliteration: string;
  meaning: string;
  name?: string;
  verses?: NameVerseRef[];
  audioUrl?: string;
  /** Prophet variant only: one-line note about the name. */
  note?: string;
}

function formatVerses(verses?: NameVerseRef[]): string | null {
  if (!verses || verses.length === 0) return null;
  return `Quran ${verses.map((verse) => `${verse.surah}:${verse.ayah}`).join(' · ')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export default function NamesScreen({
  onBack,
  variant = 'allah',
}: {
  onBack?: () => void;
  variant?: NamesVariant;
}) {
  const { colors, mode } = useTheme();
  const { settings, setNamesLanguage } = useSettings();
  const language: NamesLanguage = settings.namesLanguage;

  const shareCardRef = useRef<View>(null);
  const [shareNameItem, setShareNameItem] = useState<NameRow | null>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const isProphet = variant === 'prophet';

  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    scrollOffsetRef.current = contentOffset.x;
    const isEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 12;
    setCanScrollRight(!isEnd);
  };

  const handleContentSizeChange = (contentWidth: number) => {
    const availableWidth = width - (isCompact ? 32 : 40);
    if (contentWidth <= availableWidth) {
      setCanScrollRight(false);
    }
  };

  const handleScrollRight = () => {
    const nextOffset = scrollOffsetRef.current + 160;
    scrollRef.current?.scrollTo({ x: nextOffset, animated: true });
  };

  const [feed, setFeed] = useState<NamesFeed | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Recent-search history (persisted per scope)
  const {
    history: searchHistory,
    addQuery,
    removeQuery: removeSearchHistoryQuery,
    clearHistory: clearSearchHistory,
  } = useSearchHistory(isProphet ? 'names-prophet' : 'names');

  // Load cached names instantly, then refresh from the keyless APIs (islamic.app primary,
  // UmmahAPI secondary, static fallback on failure). The Prophet variant is bundled-only,
  // so it skips the network entirely.
  useEffect(() => {
    if (isProphet) return;
    let mounted = true;
    (async () => {
      const cached = await loadCachedNames(language);
      if (mounted && cached) {
        setFeed({ language, names: cached.names, source: 'cache', provider: cached.provider });
      }

      const fresh = await fetchNames(language);
      if (!mounted) return;
      setFeed({
        language,
        names: fresh.names,
        source: fresh.provider === 'Bundled' ? 'static' : 'api',
        provider: fresh.provider,
      });
    })();
    return () => {
      mounted = false;
    };
  }, [language, isProphet]);

const activeFeed = !isProphet && feed && feed.language === language ? feed : null;
  const names: NameRow[] = isProphet
    ? PROPHET_NAMES_99
    : activeFeed
    ? activeFeed.names
    : NAMES_99;
  const loadState: LoadState = isProphet
    ? 'online'
    : !activeFeed
    ? 'loading'
    : activeFeed.source === 'static'
    ? 'offline'
    : 'online';
  const isLoading = loadState === 'loading' && !isProphet && !activeFeed;

  const filteredNames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return names;
    return names.filter(
      (item) =>
        item.transliteration.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        (item.name ? item.name.toLowerCase().includes(q) : false) ||
        (item.note ? item.note.toLowerCase().includes(q) : false) ||
        item.number.toString() === q
    );
  }, [names, searchQuery]);

  const countLabel =
    filteredNames.length === names.length
      ? `${names.length} Names`
      : `${filteredNames.length} of ${names.length} Names`;

  const handleShareName = async (item: NameRow) => {
    const title = isProphet ? 'Names of the Prophet ﷺ' : '99 Names of Allah';
    const verseText = formatVerses(item.verses);
    const textToShare = `${title}\n\n#${item.number} ${item.arabic}\n${item.transliteration}${item.name ? ` (${item.name})` : ''}\n\n${item.meaning}${item.note ? `\n\nNote: ${item.note}` : ''}${verseText ? `\n\n${verseText}` : ''}`;

    if (Platform.OS === 'web') {
      try {
        await Share.share({ message: textToShare });
      } catch {
        // ignore
      }
      return;
    }

    try {
      setIsSharingImage(true);
      setShareNameItem(item);
      await new Promise((r) => setTimeout(r, 80));
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      setShareNameItem(null);
      setIsSharingImage(false);
      const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Share ${item.transliteration}` });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      setShareNameItem(null);
      setIsSharingImage(false);
      try {
        await Share.share({ message: textToShare });
      } catch {
        // ignore
      }
    }
  };

  const renderItem = ({ item }: { item: NameRow }) => {
    const verseLabel = formatVerses(item.verses);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
            padding: isCompact ? 14 : 16,
          },
        ]}
      >
        {/* Top Header Row: Circular Number Badge & Prominent Arabic Name */}
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: colors.accentDim,
                width: isCompact ? 30 : 32,
                height: isCompact ? 30 : 32,
              },
            ]}
          >
            <Text
              style={[
                styles.numberText,
                {
                  color: colors.accent,
                  fontSize: isCompact ? 13 : 14,
                },
              ]}
            >
              {item.number}
            </Text>
          </View>

          <View style={styles.arabicWrap}>
            <ArabicText
              size={isCompact ? 23 : 27}
              align="right"
              numberOfLines={2}
              style={styles.arabicName}
            >
              {item.arabic}
            </ArabicText>
          </View>
        </View>

        {/* Name Details */}
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.translit,
              {
                color: colors.textPrimary,
                fontSize: isCompact ? 15 : 16,
              },
            ]}
            numberOfLines={1}
          >
            {item.transliteration}
          </Text>

          {item.name ? (
            <Text style={[styles.localName, { color: colors.accent }]} numberOfLines={1}>
              {item.name}
            </Text>
          ) : null}

          <Text
            style={[
              styles.meaning,
              {
                color: colors.textSecondary,
                fontSize: isCompact ? 12.5 : 13.5,
              },
            ]}
            numberOfLines={3}
          >
            {item.meaning}
          </Text>

          {item.note ? (
            <Text
              style={[
                styles.note,
                {
                  color: colors.textMuted,
                  fontSize: isCompact ? 12 : 13,
                },
              ]}
              numberOfLines={2}
            >
              {item.note}
            </Text>
          ) : null}
        </View>

        {/* Footer: Verse Reference Tag & Share Button */}
        <View style={styles.cardFooter}>
          {verseLabel ? (
            <View
              style={[
                styles.verseTag,
                {
                  backgroundColor: colors.bgBase,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons name="book-outline" size={11} color={colors.textMuted} />
              <Text
                style={[
                  styles.verse,
                  {
                    color: colors.textMuted,
                    fontSize: isCompact ? 10 : 10.5,
                  },
                ]}
                numberOfLines={1}
              >
                {verseLabel}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <TouchableOpacity
            onPress={() => handleShareName(item)}
            accessibilityRole="button"
            accessibilityLabel={`Share ${item.transliteration}`}
            style={styles.cardShareBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase, paddingHorizontal: paddingH }]}>
      <View style={styles.contentWrap}>
        <ScreenHeader
          eyebrow={isProphet ? 'Asma un-Nabi' : 'Asma ul-Husna'}
          title={isProphet ? '99 Names of the Prophet ﷺ' : '99 Names'}
          onBack={onBack}
          backLabel="Library"
        />

        {/* Language chips (Allah variant only) — single horizontally-scrollable row */}
        {!isProphet && (
          <View style={styles.chipRowWrap}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={styles.chipRowContent}
              onScroll={handleScroll}
              onContentSizeChange={handleContentSizeChange}
              scrollEventThrottle={16}
            >
              {NAMES_LANGUAGES.map((lang) => {
                const selected = lang.code === language;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setNamesLanguage(lang.code)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.accent : colors.bgSurface,
                        borderColor: selected ? colors.accent : colors.borderSubtle,
                        height: isCompact ? 32 : 34,
                        paddingHorizontal: isCompact ? 14 : 16,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Show names in ${lang.label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    delayPressIn={0}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selected ? colors.onAccent : colors.textSecondary,
                          fontSize: isCompact ? 11.5 : 12,
                        },
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {loadState === 'loading' ? (
                <ActivityIndicator size="small" color={colors.accent} style={styles.chipSpinner} />
              ) : null}
            </ScrollView>

            {canScrollRight && (
              <View style={styles.fadeContainer} pointerEvents="box-none">
                <LinearGradient
                  colors={[hexToRgba(colors.bgBase, 0), colors.bgBase]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.75, y: 0 }}
                  style={styles.fadeGradient}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  style={[
                    styles.scrollHint,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  onPress={handleScrollRight}
                  accessibilityRole="button"
                  accessibilityLabel="Scroll more languages"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={12} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              height: isCompact ? 36 : 38,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, meaning, or number..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary, fontSize: isCompact ? 12.5 : 13 }]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoFocus
            onSubmitEditing={() => {
              if (searchQuery.trim().length >= 2) {
                addQuery(searchQuery.trim());
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Search Queries */}
        {searchHistory.length > 0 && !searchQuery && (
          <View style={styles.recentSearchesWrap}>
            <View style={styles.recentSearchesHeader}>
              <Text style={[styles.recentLabel, { color: colors.textMuted }]}>Recent searches</Text>
              <TouchableOpacity
                onPress={clearSearchHistory}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Clear names search history"
              >
                <Text style={[styles.clearAllText, { color: colors.textMuted }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentChipsScroll}
            >
              {searchHistory.map((item) => (
                <View
                  key={item}
                  style={[
                    styles.recentChip,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery(item);
                      addQuery(item);
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
                    onPress={() => removeSearchHistoryQuery(item)}
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

        {loadState === 'offline' ? (
          <Text style={[styles.offlineNote, { color: colors.textMuted }]}>
            Offline — showing the bundled list.
          </Text>
        ) : null}

        {/* Count */}
        <View style={styles.countRow}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>{countLabel}</Text>
        </View>

        {isLoading && (
          <FlatList
            data={Array.from({ length: 8 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderItem={() => <NameRowSkeleton compact={isCompact} />}
            ItemSeparatorComponent={() => <View style={{ height: isCompact ? 8 : 10 }} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Names List */}
        <FlatList
          data={filteredNames}
          keyExtractor={(item) => item.number.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: isCompact ? 8 : 10 }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No names found"
              subtitle={`No names match "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          }
        />
      </View>

      {/* Share-as-image capture card (rendered off-screen while sharing) */}
      {shareNameItem && (
        <View style={styles.shareCardWrap} pointerEvents="none">
          <View
            ref={shareCardRef}
            collapsable={false}
            style={[styles.shareCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <Text style={[styles.shareCardEyebrow, { color: colors.accent }]}>
              {isProphet ? 'أسماء النبي ﷺ · Names of the Prophet' : 'أسماء الله الحسنى · The 99 Names of Allah'}
            </Text>
            <Text style={[styles.shareCardArabic, { color: colors.textPrimary }]}>
              {shareNameItem.arabic}
            </Text>
            <View style={[styles.shareCardRule, { backgroundColor: colors.accent }]} />
            <Text style={[styles.shareCardTranslit, { color: colors.textPrimary }]}>
              #{shareNameItem.number} · {shareNameItem.transliteration}
              {shareNameItem.name ? ` (${shareNameItem.name})` : ''}
            </Text>
            <Text style={[styles.shareCardTrans, { color: colors.textSecondary }]}>
              {shareNameItem.meaning}
            </Text>
            {shareNameItem.note ? (
              <Text style={[styles.shareCardNote, { color: colors.textMuted }]}>
                {shareNameItem.note}
              </Text>
            ) : null}
            {formatVerses(shareNameItem.verses) ? (
              <Text style={[styles.shareCardRef, { color: colors.textMuted }]}>
                {formatVerses(shareNameItem.verses)}
              </Text>
            ) : null}

            {/* App Brand Footer: Logo + ISLAMIC wordmark */}
            <View style={styles.shareCardBrandFooter}>
              <Image
                source={
                  mode === 'paper'
                    ? require('../../assets/logo-small-black.png')
                    : require('../../assets/logo-small-ivory.png')
                }
                style={styles.shareCardLogo}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.shareCardBrandWordmark,
                  { color: mode === 'paper' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                ISLAMIC
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  chipRowWrap: {
    position: 'relative',
    marginBottom: 10,
    justifyContent: 'center',
  },
  chipRow: {},
  chipRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 36,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    includeFontPadding: false,
  },
  chipSpinner: {
    marginLeft: 2,
    flexShrink: 0,
  },
  fadeContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
  },
  scrollHint: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 0,
  },
  offlineNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 8,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  countText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  numberBadge: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: 'Manrope_700Bold',
    lineHeight: 16,
  },
  arabicWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  arabicName: {
    lineHeight: 34,
  },
  cardContent: {
    gap: 4,
  },
  translit: {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.2,
  },
  localName: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  meaning: {
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  note: {
    fontFamily: 'InstrumentSerif_400Regular',
    lineHeight: 18,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardShareBtn: {
    padding: 4,
  },
  verseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verse: {
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.2,
  },
  recentSearchesWrap: {
    marginBottom: 10,
  },
  recentSearchesHeader: {
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
  clearAllText: {
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
  shareCardWrap: {
    position: 'absolute',
    left: -2000,
    top: 0,
    width: 360,
    padding: 20,
    backgroundColor: '#F8FAF9',
  },
  shareCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'stretch',
  },
  shareCardEyebrow: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
  },
  shareCardArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 28,
    lineHeight: 44,
    textAlign: 'center',
    includeFontPadding: false,
    marginBottom: 12,
  },
  shareCardRule: {
    height: 2,
    borderRadius: 1,
    marginBottom: 14,
    width: '40%',
    alignSelf: 'center',
  },
  shareCardTranslit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  shareCardTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 10,
  },
  shareCardNote: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  shareCardRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
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
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  shareCardLogo: {
    width: 22,
    height: 22,
  },
  shareCardBrandWordmark: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
