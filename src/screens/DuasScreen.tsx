import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  useWindowDimensions,
  Platform,
  Image,
  Share,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t, isRTL } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { EmptyState } from '../components/EmptyState';
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

export default function DuasScreen({ onBack }: { onBack?: () => void }) {
  const { colors, mode } = useTheme();
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
  const [isSharingImage, setIsSharingImage] = useState(false);

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
      <View
        style={[
          styles.duaCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: isHighlighted ? colors.accent : colors.borderSubtle,
          },
          isHighlighted && {
            shadowColor: colors.accent,
            shadowOpacity: 0.55,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 0 },
            elevation: 5,
          },
        ]}
      >
        {/* Top Header of Card */}
        <View style={styles.cardHeader}>
          <Text style={[styles.duaTitle, { color: colors.textPrimary }]}>
            {t(item.title)}
          </Text>
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: colors.accentDim,
                borderColor: colors.accent,
              },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: colors.accent }]}>
              {t(item.category)}
            </Text>
          </View>
        </View>

        {/* Arabic Text */}
        <View style={styles.arabicWrap}>
          <ArabicText size={26} align="right" style={styles.arabic}>
            {item.arabic}
          </ArabicText>
        </View>

        <Hairline style={{ marginVertical: 12 }} />

        {/* Transliteration */}
        <Text style={[styles.translit, { color: colors.textSecondary }]}>
          {item.transliteration}
        </Text>

        {/* Translation */}
        <Text style={[styles.translation, { color: colors.textPrimary }]}>
          "{item.translation}"
        </Text>

        {/* Reference Footnote & Share Button */}
        <View style={styles.refRow}>
          <Text style={[styles.refText, { color: colors.textMuted }]}>
            {t('Source')}: {item.reference}
          </Text>
          <TouchableOpacity
            onPress={() => handleShareDua(item)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Share')} ${t(item.title)}`}
            style={styles.shareBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title={t('Duas & Adhkar')}
        eyebrow={t('Supplications')}
        onBack={onBack}
        backLabel={t('Library')}
      />
      <View style={[styles.contentWrap, { paddingHorizontal: paddingH }]}>

      {/* Category Filter Chips + Random Dua */}
      <View style={styles.filterRow}>
        <View style={styles.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoryScroll, hScrollRTLStyle()]}
          >
            {DUA_CATEGORIES.map((cat) => {
              const isSelected = cat === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : colors.bgSurface,
                      borderColor: isSelected
                        ? colors.accent
                        : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isSelected ? colors.onAccent : colors.textSecondary },
                    ]}
                  >
                    {t(cat)} ({DUA_COUNTS[cat]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[
            styles.randomBtn,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.accent,
            },
          ]}
          onPress={handleRandomDua}
          disabled={filteredDuas.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('Show a random dua from the current filter')}
        >
          <Text style={[styles.randomBtnText, { color: colors.accent }]}>
            🎲 {t('Random')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('Search duas by title, transliteration, or meaning...')}
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus
          onSubmitEditing={submitSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Search Queries */}
      {searchHistory.length > 0 && !searchQuery && (
        <View style={styles.recentWrap}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentLabel, { color: colors.textMuted }]}>{t('Recent searches')}</Text>
            <TouchableOpacity
              onPress={clearSearchHistory}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('Clear duas search history')}
            >
              <Text style={[styles.clearAllText, { color: colors.textMuted }]}>{t('Clear')}</Text>
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
                  accessibilityLabel={`${t('Search for')} ${item}`}
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
                  accessibilityLabel={`${t('Remove')} ${item}`}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                >
                  <Ionicons name="close" size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Duas List */}
      {showSkeleton ? (
        <FlatList
          data={Array.from({ length: 6 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <DuaCardSkeleton compact={isCompact} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={filteredDuas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
            style={[styles.shareCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <Text style={[styles.shareCardEyebrow, { color: colors.accent }]}>
              {shareDuaItem.category} · Duas & Adhkar
            </Text>
            <Text style={[styles.shareCardTitle, { color: colors.textPrimary }]}>
              {shareDuaItem.title}
            </Text>
            <Text style={[styles.shareCardArabic, { color: colors.textPrimary }]}>
              {shareDuaItem.arabic}
            </Text>
            <View style={[styles.shareCardRule, { backgroundColor: colors.accent }]} />
            {shareDuaItem.transliteration ? (
              <Text style={[styles.shareCardTranslit, { color: colors.textSecondary }]}>
                {shareDuaItem.transliteration}
              </Text>
            ) : null}
            <Text style={[styles.shareCardTrans, { color: colors.textPrimary }]}>
              "{shareDuaItem.translation}"
            </Text>
            <Text style={[styles.shareCardRef, { color: colors.textMuted }]}>
              Source: {shareDuaItem.reference}
            </Text>

            {/* App Brand Footer: Logo + ISLAMIC wordmark */}
            <View style={styles.shareCardBrandFooter} collapsable={false}>
              <View collapsable={false} style={styles.shareCardLogoWrap}>
                <Image
                  source={
                    mode === 'paper'
                      ? require('../../assets/logo-master-black.png')
                      : require('../../assets/logo-master-ivory.png')
                  }
                  style={styles.shareCardLogo}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
              <Text
                style={[
                  styles.shareCardBrandWordmark,
                  { color: mode === 'paper' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                {isRTL() ? 'اسلامک' : 'ISLAMIC'}
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
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
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
    height: 32,
  },
  randomBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  categoryChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  listContent: {
    paddingBottom: 30,
    gap: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
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
  duaCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  duaTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arabicWrap: {
    paddingVertical: 6,
  },
  arabic: {
    lineHeight: 42,
  },
  translit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  translation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  shareBtn: {
    padding: 4,
  },
  refText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    flex: 1,
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
    includeFontPadding: false,
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
    borderTopColor: '#E2E8F0',
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
