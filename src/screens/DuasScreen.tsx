import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  type FlatList,
  TextInput,
  useWindowDimensions,
  Platform,
  Image,
  Share,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens, getBrandLogoSource, cardTokens, fontRoles } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { t, isRTL } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { EmptyState } from '../components/EmptyState';
import { PremiumCard } from '../components/ui';
import { useSearchHistory } from '../lib/searchHistory';
import {
  DUAS_DATA,
  DUA_CATEGORIES,
  DUA_COUNTS,
  DuaCategory,
  DuaItem,
} from '../lib/duas';
import { DuaCardSkeleton } from '../components/Skeleton';
import { hScrollRTLStyle } from '../lib/rtl';

export default function DuasScreen({
  onBack,
  backLabel = 'Library',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [selectedCategory, setSelectedCategory] = useState<DuaCategory>('All');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<FlatList<DuaItem>>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareCardRef = useRef<View>(null);
  const [shareDuaItem, setShareDuaItem] = useState<DuaItem | null>(null);
  const [, setIsSharingImage] = useState(false);

  const {
    history: searchHistory,
    addQuery,
    removeQuery: removeSearchHistoryQuery,
    clearHistory: clearSearchHistory,
  } = useSearchHistory('duas');

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredDuas = useMemo(() => {
    const byCategory = selectedCategory === 'All' ? DUAS_DATA : DUAS_DATA.filter((d) => d.category === selectedCategory);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.transliteration.toLowerCase().includes(q) ||
        d.translation.toLowerCase().includes(q) ||
        d.arabic.toLowerCase().includes(q)
    );
  }, [selectedCategory, searchQuery]);

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (q.length >= 2) addQuery(q);
  };

  const handleRandomDua = () => {
    if (filteredDuas.length === 0) return;
    const index = Math.floor(Math.random() * filteredDuas.length);
    setHighlightedId(filteredDuas[index].id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 3500);
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.15,
        });
      } catch {
        // item not measured yet — onScrollToIndexFailed handles it
      }
    });
  };

  const handleShareDua = async (item: DuaItem) => {
    const textToShare = `${item.title}\n\n${item.arabic}\n\n${item.transliteration}\n\n"${item.translation}"\n\n— Source: ${item.reference}`;
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
      setShareDuaItem(item);
      await new Promise((r) => setTimeout(r, 250));
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      setShareDuaItem(null);
      setIsSharingImage(false);
      const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Dua' });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      setShareDuaItem(null);
      setIsSharingImage(false);
      try {
        await Share.share({ message: textToShare });
      } catch {
        // ignore
      }
    }
  };

  const renderItem = ({ item }: { item: DuaItem }) => {
    const isHighlighted = item.id === highlightedId;
    return (
      <PremiumCard
        key={item.id}
        padded={false}
        borderRadius={cardTokens.borderRadius}
        style={[
          styles.duaCard,
          isHighlighted && {
            borderColor: tokens.goldBorder,
            shadowColor: tokens.gold,
            shadowOpacity: 0.55,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 0 },
            elevation: 5,
          },
        ]}
        contentStyle={styles.duaCardContent}
      >
        {/* Top Header of Card */}
        <View style={styles.cardHeader}>
          <AppText variant="title" style={styles.duaTitle}>
            {t(item.title)}
          </AppText>
          <View
            style={[
              styles.categoryBadge,
              getPillShadow(mode),
              {
                backgroundColor: tokens.ringFill,
                borderColor: tokens.ringBorder,
              },
            ]}
          >
            <AppText variant="eyebrow" highlight style={styles.categoryBadgeText}>
              {t(item.category)}
            </AppText>
          </View>
        </View>

        {/* Arabic Text */}
        <View style={styles.arabicWrap}>
          <ArabicText size={26} align="right" style={[styles.arabic, { color: tokens.textPrimary }]}>
            {item.arabic}
          </ArabicText>
        </View>

        <Hairline style={{ marginVertical: 12, backgroundColor: tokens.cardBorder }} />

        {/* Transliteration */}
        <AppText variant="subtitle" tone="faint" style={styles.translit}>
          {item.transliteration}
        </AppText>

        {/* Translation */}
        <AppText variant="body" style={styles.translation}>
          {`"${item.translation}"`}
        </AppText>

        {/* Reference Footnote & Share Button */}
        <View style={styles.refRow}>
          <AppText variant="caption" style={styles.refText}>
            {t('Source')}: {item.reference}
          </AppText>
          <TouchableOpacity
            onPress={() => handleShareDua(item)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Share')} ${t(item.title)}`}
            style={styles.shareBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={17} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>
      </PremiumCard>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={styles.detailScreen}
        header={
          <SubHeader
            title={t('Duas & Adhkar')}
            eyebrow={t('Supplications')}
            subtitle={t('Authentic supplications from the Quran and Sunnah')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
        <View style={[styles.contentWrap, { paddingHorizontal: paddingH }]}>

        {/* Category Filter Chips + Random Dua */}
        <View style={styles.filterRow}>
          <View style={styles.chipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={[styles.categoryScroll, hScrollRTLStyle()]}
            >
              {DUA_CATEGORIES.map((cat) => {
                const isSelected = cat === selectedCategory;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      getPillShadow(mode),
                      {
                        backgroundColor: isSelected
                          ? undefined
                          : tokens.cardTop,
                        borderColor: isSelected
                          ? tokens.goldBorder
                          : tokens.cardBorder,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={tokens.goldGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.categoryChipGradient}
                      >
                        <AppText
                          variant="caption"
                          tone="onGold"
                          style={styles.categoryChipText}
                        >
                          {t(cat)} ({DUA_COUNTS[cat]})
                        </AppText>
                      </LinearGradient>
                    ) : (
                      <View style={styles.categoryChipUnselected}>
                        <AppText
                          variant="caption"
                          style={styles.categoryChipText}
                        >
                          {t(cat)} ({DUA_COUNTS[cat]})
                        </AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[
              styles.randomBtn,
              getPillShadow(mode),
              {
                backgroundColor: 'transparent',
                borderColor: tokens.goldBorder,
              },
            ]}
            onPress={handleRandomDua}
            disabled={filteredDuas.length === 0}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={t('Show a random dua from the current filter')}
          >
            <AppText variant="link" style={styles.randomBtnText}>
              🎲 {t('Random')}
            </AppText>
          </TouchableOpacity>
        </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchWrap,
          getCardShadow(mode),
          {
            backgroundColor: tokens.cardTop,
            borderColor: tokens.cardBorder,
          },
        ]}
      >
        <Ionicons name="search" size={17} color={tokens.muted} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={isCompact ? t('Search duas...') : t('Search duas by title, transliteration, or meaning...')}
          placeholderTextColor={tokens.muted}
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
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={submitSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color={tokens.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Search Queries */}
      {searchHistory.length > 0 && !searchQuery && (
        <View style={styles.recentWrap}>
          <View style={styles.recentHeader}>
            <AppText variant="caption" style={styles.recentLabel}>{t('Recent searches')}</AppText>
            <TouchableOpacity
              onPress={clearSearchHistory}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('Clear duas search history')}
            >
              <AppText variant="caption" style={styles.clearAllText}>{t('Clear')}</AppText>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={[styles.recentChipsScroll, hScrollRTLStyle()]}
          >
            {searchHistory.map((item) => (
              <View
                key={item}
                style={[
                  styles.recentChip,
                  getPillShadow(mode),
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

      {/* Duas List */}
      {showSkeleton ? (
        <DetailScreen.FlatList
          data={Array.from({ length: 6 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <DuaCardSkeleton compact={isCompact} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <DetailScreen.FlatList
          ref={listRef}
          data={filteredDuas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('No duas found')}
              subtitle={`${t('No duas match')} "${searchQuery}"`}
              actionLabel={t('Clear search')}
              onAction={() => setSearchQuery('')}
            />
          }
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(() => {
              try {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                  viewPosition: 0.15,
                });
              } catch {
                // still unmeasured — highlight remains as fallback
              }
            }, 120);
          }}
        />
      )}
      </View>

      {/* Share-as-image capture card (rendered off-screen while sharing) */}
      {shareDuaItem && (
        <View style={styles.shareCardWrap} pointerEvents="none">
          <View
            ref={shareCardRef}
            collapsable={false}
            style={[styles.shareCard, { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}
          >
            <AppText variant="eyebrow" highlight style={styles.shareCardEyebrow}>
              {shareDuaItem.category} · Duas & Adhkar
            </AppText>
            <AppText variant="title" style={styles.shareCardTitle}>
              {shareDuaItem.title}
            </AppText>
            <AppText variant="body" style={styles.shareCardArabic}>
              {shareDuaItem.arabic}
            </AppText>
            <View style={[styles.shareCardRule, { backgroundColor: tokens.gold }]} />
            {shareDuaItem.transliteration ? (
              <AppText variant="subtitle" style={styles.shareCardTranslit}>
                {shareDuaItem.transliteration}
              </AppText>
            ) : null}
            <AppText variant="body" style={styles.shareCardTrans}>
              {`"${shareDuaItem.translation}"`}
            </AppText>
            <AppText variant="caption" style={styles.shareCardRef}>
              Source: {shareDuaItem.reference}
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
  container: {
    flex: 1,
    minWidth: 0,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
  },
  categoryScroll: {
    gap: 6,
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  chipsWrap: {
    flex: 1,
    minWidth: 0,
  },
  randomBtn: {
    marginStart: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  randomBtnText: {
    fontSize: 13,
  },
  categoryChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryChipGradient: {
    minHeight: 44,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipUnselected: {
    minHeight: 44,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  listContent: {},
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
  },
  clearBtn: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 12,
    letterSpacing: 0.2,
  },
  clearAllText: {
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
    borderRadius: 10,
    borderWidth: 1,
    paddingStart: 10,
    paddingEnd: 4,
    minHeight: 32,
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
    fontSize: 12,
    maxWidth: 140,
  },
  recentChipRemove: {
    padding: 6,
    marginStart: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 28,
  },
  duaCard: {
    borderRadius: cardTokens.borderRadius,
  },
  duaCardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  duaTitle: {
    fontSize: 20,
    flex: 1,
    minWidth: 0,
  },
  categoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  categoryBadgeText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  arabicWrap: {
    paddingVertical: 8,
  },
  arabic: {
    lineHeight: 42,
  },
  translit: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  translation: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  shareBtn: {
    padding: 6,
    flexShrink: 0,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
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
    marginBottom: 10,
  },
  shareCardTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 14,
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
  shareCardTranslit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
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
});
