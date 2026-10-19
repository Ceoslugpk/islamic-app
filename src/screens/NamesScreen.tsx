import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
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
import { AppText } from '../components/ui/AppText';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, getBrandLogoSource } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { t, isRTL } from '../lib/i18n';
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
import { hScrollRTLStyle } from '../lib/rtl';
import { getForwardIcon } from '../lib/iconMap';

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
  backLabel = 'Library',
  variant = 'allah',
}: {
  onBack?: () => void;
  backLabel?: string;
  variant?: NamesVariant;
}) {
  const { tokens, mode } = useThemeTokens();
  const { settings, setNamesLanguage } = useSettings();
  const language: NamesLanguage = settings.namesLanguage;

  const shareCardRef = useRef<View>(null);
  const [shareNameItem, setShareNameItem] = useState<NameRow | null>(null);
  const [, setIsSharingImage] = useState(false);
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
      ? `${names.length} ${t('Names')}`
      : `${filteredNames.length} ${t('of')} ${names.length} ${t('Names')}`;

  const handleShareName = async (item: NameRow) => {
    const title = isProphet ? t('99 Names of the Prophet ﷺ') : t('99 Names of Allah');
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
      await new Promise((r) => setTimeout(r, 250));
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
      <PremiumCard
        key={item.number}
        padded={false}
        borderRadius={18}
        style={styles.card}
        contentStyle={{ padding: isCompact ? 14 : 16 }}
      >
        {/* Top Header Row: Circular Number Badge & Prominent Arabic Name */}
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: tokens.ringFill,
                borderColor: tokens.ringBorder,
                borderWidth: 1,
                minWidth: isCompact ? 30 : 32,
                minHeight: isCompact ? 30 : 32,
                paddingHorizontal: 2,
              },
            ]}
          >
            <AppText
              variant="numeral"
              highlight
              style={[
                styles.numberText,
                {
                  fontSize: isCompact ? 13 : 14,
                },
              ]}
            >
              {item.number}
            </AppText>
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
          <AppText
            variant="sectionTitle"
            style={[
              styles.translit,
              {
                fontSize: isCompact ? 15 : 16,
              },
            ]}
            numberOfLines={1}
          >
            {item.transliteration}
          </AppText>

          {item.name ? (
            <AppText variant="caption" highlight style={styles.localName} numberOfLines={2}>
              {item.name}
            </AppText>
          ) : null}

          <AppText
            variant="body"
            style={[
              styles.meaning,
              {
                fontSize: isCompact ? 12.5 : 13.5,
              },
            ]}
          >
            {item.meaning}
          </AppText>

          {item.note ? (
            <AppText
              variant="subtitle"
              style={[
                styles.note,
                {
                  fontSize: isCompact ? 12 : 13,
                },
              ]}
            >
              {item.note}
            </AppText>
          ) : null}
        </View>

        {/* Footer: Verse Reference Tag & Share Button */}
        <View style={styles.cardFooter}>
          {verseLabel ? (
            <View
              style={[
                styles.verseTag,
                {
                  backgroundColor: tokens.ringFill,
                  borderColor: tokens.ringBorder,
                },
              ]}
            >
              <Ionicons name="book-outline" size={11} color={tokens.gold} />
              <AppText
                variant="caption"
                highlight
                style={[
                  styles.verse,
                  {
                    fontSize: isCompact ? 10 : 10.5,
                  },
                ]}
                numberOfLines={1}
              >
                {verseLabel}
              </AppText>
            </View>
          ) : (
            <View />
          )}

          <TouchableOpacity
            onPress={() => handleShareName(item)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Share')} ${item.transliteration}`}
            style={styles.cardShareBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={16} color={tokens.muted} />
          </TouchableOpacity>
        </View>
      </PremiumCard>
    );
  };

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t(isProphet ? 'Asma un-Nabi' : 'Asma ul-Husna')}
          title={t(isProphet ? '99 Names of the Prophet ﷺ' : '99 Names of Allah')}
          subtitle={t(isProphet ? 'Noble attributes and titles of Prophet Muhammad ﷺ' : 'Divine attributes and meanings of Allah (SWT)')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <View style={[styles.contentWrap, { paddingHorizontal: paddingH }]}>
        {/* Language chips (Allah variant only) — single horizontally-scrollable row */}
        {!isProphet && (
          <View style={styles.chipRowWrap}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={[styles.chipRowContent, hScrollRTLStyle()]}
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
                      selected ? getPillShadow(mode) : null,
                      {
                        backgroundColor: selected ? tokens.gold : tokens.cardTop,
                        borderColor: selected ? tokens.gold : tokens.cardBorder,
                        minHeight: isCompact ? 32 : 34,
                        paddingVertical: 4,
                        paddingHorizontal: isCompact ? 14 : 16,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${t('Show names in')} ${lang.label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    delayPressIn={0}
                  >
                    <AppText
                      variant="caption"
                      tone={selected ? 'onGold' : undefined}
                      style={[
                        styles.chipText,
                        {
                          fontSize: isCompact ? 11.5 : 12,
                        },
                      ]}
                    >
                      {lang.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
              {loadState === 'loading' ? (
                <ActivityIndicator size="small" color={tokens.goldText} style={styles.chipSpinner} />
              ) : null}
            </ScrollView>

            {canScrollRight && (
              <View style={styles.fadeContainer} pointerEvents="box-none">
                <LinearGradient
                  colors={[hexToRgba(tokens.bgTop, 0), tokens.bgTop]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.75, y: 0 }}
                  style={styles.fadeGradient}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  style={[
                    styles.scrollHint,
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                  onPress={handleScrollRight}
                  accessibilityRole="button"
                  accessibilityLabel={t('Scroll more languages')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={getForwardIcon()} size={12} color={tokens.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Search Input */}
        <View
          style={[
            styles.searchBox,
            getCardShadow(mode),
            {
              backgroundColor: tokens.cardTop,
              borderColor: tokens.cardBorder,
              minHeight: isCompact ? 38 : 42,
              borderRadius: isCompact ? 16 : 18,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={tokens.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('Search by name, meaning, or number...')}
            placeholderTextColor={tokens.muted}
            accessibilityLabel={t('Search by name, meaning, or number...')}
            style={[styles.searchInput, { color: tokens.text, fontSize: isCompact ? 12.5 : 13 }]}
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
              <Ionicons name="close-circle" size={16} color={tokens.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Search Queries */}
        {searchHistory.length > 0 && !searchQuery && (
          <View style={styles.recentSearchesWrap}>
            <View style={styles.recentSearchesHeader}>
              <AppText variant="caption" style={styles.recentLabel}>{t('Recent searches')}</AppText>
              <TouchableOpacity
                onPress={clearSearchHistory}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={t('Clear names search history')}
              >
                <AppText variant="caption" style={styles.clearAllText}>{t('Clear')}</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.recentChipsScroll, hScrollRTLStyle()]}
            >
              {searchHistory.map((item) => (
                <View
                  key={item}
                  style={[
                    styles.recentChip,
                    { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery(item);
                      addQuery(item);
                    }}
                    style={styles.recentChipBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Search for')} ${item}`}
                  >
                    <Ionicons name="time-outline" size={13} color={tokens.accent} />
                    <AppText variant="caption" style={styles.recentChipText} numberOfLines={1}>
                      {item}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeSearchHistoryQuery(item)}
                    style={styles.recentChipRemove}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Remove')} ${item}`}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                  >
                    <Ionicons name="close" size={12} color={tokens.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {loadState === 'offline' ? (
          <AppText variant="caption" style={styles.offlineNote}>
            {t('Offline — showing the bundled list.')}
          </AppText>
        ) : null}

        {/* Count */}
        <View style={styles.countRow}>
          <AppText variant="eyebrow" style={styles.countText}>{countLabel}</AppText>
        </View>

        {isLoading && (
          <DetailScreen.FlatList
            data={Array.from({ length: 8 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderItem={() => <NameRowSkeleton compact={isCompact} />}
            ItemSeparatorComponent={() => <View style={{ height: isCompact ? 8 : 10 }} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Names List */}
        <DetailScreen.FlatList
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
              title={t('No names found')}
              subtitle={`${t('No names match')} "${searchQuery}"`}
              actionLabel={t('Clear search')}
              onAction={() => setSearchQuery('')}
            />
          }
        />
      </View>

      {/* Share-as-image capture card (rendered off-screen while sharing) */}
      {shareNameItem && (
        <View style={[styles.shareCardWrap, { backgroundColor: tokens.cardTop }]} pointerEvents="none">
          <View
            ref={shareCardRef}
            collapsable={false}
            style={[styles.shareCard, { backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }]}
          >
            <AppText variant="eyebrow" highlight style={styles.shareCardEyebrow}>
              {isProphet ? 'أسماء النبي ﷺ · Names of the Prophet' : 'أسماء الله الحسنى · The 99 Names of Allah'}
            </AppText>
            <AppText variant="body" style={styles.shareCardArabic}>
              {shareNameItem.arabic}
            </AppText>
            <View style={[styles.shareCardRule, { backgroundColor: tokens.goldBorder }]} />
            <AppText variant="sectionTitle" style={styles.shareCardTranslit}>
              #{shareNameItem.number} · {shareNameItem.transliteration}
              {shareNameItem.name ? ` (${shareNameItem.name})` : ''}
            </AppText>
            <AppText variant="body" style={styles.shareCardTrans}>
              {shareNameItem.meaning}
            </AppText>
            {shareNameItem.note ? (
              <AppText variant="subtitle" style={styles.shareCardNote}>
                {shareNameItem.note}
              </AppText>
            ) : null}
            {formatVerses(shareNameItem.verses) ? (
              <AppText variant="caption" style={styles.shareCardRef}>
                {formatVerses(shareNameItem.verses)}
              </AppText>
            ) : null}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
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
    paddingEnd: 36,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minHeight: 44,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  chipSpinner: {
    marginStart: 2,
    flexShrink: 0,
  },
  fadeContainer: {
    position: 'absolute',
    end: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fadeGradient: {
    position: 'absolute',
    end: 0,
    top: 0,
    bottom: 0,
    width: 48,
  },
  scrollHint: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 2,
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
    marginEnd: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  offlineNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
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
    paddingBottom: 16,
  },
  card: {
    borderRadius: 18,
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
    flexShrink: 0,
  },
  numberText: {
    fontFamily: 'Manrope_700Bold',
  },
  arabicWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 0,
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
  },
  note: {
    fontFamily: 'InstrumentSerif_400Regular',
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardShareBtn: {
    padding: 4,
    flexShrink: 0,
    minHeight: 44,
  },
  verseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  verse: {
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.2,
    flexShrink: 1,
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
    paddingEnd: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
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
  shareCardWrap: {
    position: 'absolute',
    left: -2000,
    top: 0,
    width: 360,
    padding: 20,
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
});
