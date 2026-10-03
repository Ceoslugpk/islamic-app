import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { DUAS_DATA, DUA_CATEGORIES, DuaCategory, DuaItem } from '../lib/duas';

export default function DuasScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<DuaCategory>('All');

  const filteredDuas = useMemo(() => {
    if (selectedCategory === 'All') return DUAS_DATA;
    return DUAS_DATA.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  const renderItem = ({ item }: { item: DuaItem }) => (
    <View
      style={[
        styles.duaCard,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Library"
        >
          <Text style={[styles.backText, { color: colors.accent }]}>← Library</Text>
        </TouchableOpacity>
      )}

      <SectionHeader eyebrow="Supplications" title="Duas & Adhkar" />

      {/* Category Filter Chips */}
      <View style={{ height: 44, marginBottom: 12 }}>
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
                    backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                    borderColor: isSelected ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? colors.bgBase : colors.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Duas List */}
      <FlatList
        data={filteredDuas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 0,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  categoryScroll: {
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
