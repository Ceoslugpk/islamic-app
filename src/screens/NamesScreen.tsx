import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { ArabicText } from '../components/ArabicText';
import { NAMES_99, Name99 } from '../lib/names99';

export default function NamesScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return NAMES_99;
    return NAMES_99.filter(
      (item) =>
        item.transliteration.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.number.toString() === q
    );
  }, [searchQuery]);

  const renderItem = ({ item }: { item: Name99 }) => (
    <View style={styles.row}>
      {/* Number Badge */}
      <View
        style={[
          styles.numberBox,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.numberText, { color: colors.textSecondary }]}>
          {item.number}
        </Text>
      </View>

      {/* Main Info */}
      <View style={styles.textCol}>
        <Text style={[styles.translit, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.transliteration}
        </Text>
        <Text style={[styles.meaning, { color: colors.textMuted }]} numberOfLines={1}>
          {item.meaning}
        </Text>
      </View>

      {/* Arabic Right */}
      <View style={styles.arabicCol}>
        <ArabicText size={22} align="right" style={styles.arabicText}>
          {item.arabic}
        </ArabicText>
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

      <SectionHeader eyebrow="Asma ul-Husna" title="99 Names" />

      {/* Search Input */}
      <View
        style={[
          styles.searchBox,
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
          placeholder="Search by name, meaning, or number..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredNames}
        keyExtractor={(item) => item.number.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={Hairline}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No names matching "{searchQuery}"
            </Text>
          </View>
        }
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  numberBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  translit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  meaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  arabicCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 80,
  },
  arabicText: {
    lineHeight: 32,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
});
