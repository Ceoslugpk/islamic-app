import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import {
  DUAS_DATA,
  DUA_CATEGORIES,
  DUA_COUNTS,
  DuaCategory,
  DuaItem,
} from '../lib/duas';
import { DuaCardSkeleton } from '../components/Skeleton';

export default function DuasScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [selectedCategory, setSelectedCategory] = useState<DuaCategory>('All');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const listRef = useRef<FlatList<DuaItem>>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (selectedCategory === 'All') return DUAS_DATA;
    return DUAS_DATA.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

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
            {item.title}
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
              {item.category}
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

        {/* Reference Footnote */}
        <View style={styles.refRow}>
          <Text style={[styles.refText, { color: colors.textMuted }]}>
            Source: {item.reference}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title="Duas & Adhkar"
        eyebrow="Supplications"
        onBack={onBack}
        backLabel="Library"
      />
      <View style={[styles.contentWrap, { paddingHorizontal: paddingH }]}>

      {/* Category Filter Chips + Random Dua */}
      <View style={styles.filterRow}>
        <View style={styles.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
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
                    {cat} ({DUA_COUNTS[cat]})
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
          accessibilityLabel="Show a random dua from the current filter"
        >
          <Text style={[styles.randomBtnText, { color: colors.accent }]}>
            🎲 Random
          </Text>
        </TouchableOpacity>
      </View>

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
    justifyContent: 'flex-end',
  },
  refText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
});
