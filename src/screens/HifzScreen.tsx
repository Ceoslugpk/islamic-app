import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { ArabicText } from '../components/ArabicText';
import { SURAHS_114, SurahSummary } from '../lib/surahs114';
import { HifzStatus, saveHifzStatus, loadHifzStatuses } from '../lib/db';

type FilterTab = 'All' | 'Memorized' | 'Revising' | 'Not started';

const FILTER_TABS: FilterTab[] = ['All', 'Memorized', 'Revising', 'Not started'];

const NEXT_STATUS: Record<HifzStatus, HifzStatus> = {
  'not-started': 'revising',
  'revising': 'memorized',
  'memorized': 'not-started',
};

export default function HifzScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const [statuses, setStatuses] = useState<Record<number, HifzStatus>>({});
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loaded = loadHifzStatuses();
    setStatuses(loaded);
  }, []);

  const handleCycleStatus = useCallback(async (surahNumber: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    const current = statuses[surahNumber] || 'not-started';
    const next = NEXT_STATUS[current];

    setStatuses((prev) => ({
      ...prev,
      [surahNumber]: next,
    }));
    saveHifzStatus(surahNumber, next);
  }, [statuses]);

  // Statistics
  const stats = useMemo(() => {
    let memorized = 0;
    let revising = 0;
    let notStarted = 0;

    for (const surah of SURAHS_114) {
      const s = statuses[surah.number] || 'not-started';
      if (s === 'memorized') memorized++;
      else if (s === 'revising') revising++;
      else notStarted++;
    }

    const percent = Math.round((memorized / 114) * 100);
    return { memorized, revising, notStarted, percent };
  }, [statuses]);

  const filteredSurahs = useMemo(() => {
    let list = SURAHS_114;

    if (activeFilter === 'Memorized') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'memorized');
    } else if (activeFilter === 'Revising') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'revising');
    } else if (activeFilter === 'Not started') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'not-started');
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        s.number.toString() === q
    );
  }, [activeFilter, searchQuery, statuses]);

  const renderStatusBadge = (status: HifzStatus) => {
    if (status === 'memorized') {
      return (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.accent,
              borderColor: colors.accent,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={13} color={colors.bgBase} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: colors.bgBase }]}>Memorized</Text>
        </View>
      );
    }
    if (status === 'revising') {
      return (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.accentDim,
              borderColor: colors.accent,
            },
          ]}
        >
          <Ionicons name="sync-outline" size={13} color={colors.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: colors.accent }]}>Revising</Text>
        </View>
      );
    }
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.textMuted }]}>Not started</Text>
      </View>
    );
  };

  const renderSurah = ({ item }: { item: SurahSummary }) => {
    const status = statuses[item.number] || 'not-started';

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleCycleStatus(item.number)}
        accessibilityRole="button"
        accessibilityLabel={`Surah ${item.number} ${item.englishName}. Status: ${status}. Tap to change status.`}
      >
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

        <View style={styles.midCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.englishName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.englishName}
            </Text>
            <Text style={[styles.ayahCount, { color: colors.textMuted }]}>
              {item.numberOfAyahs} ayahs · {item.revelationType}
            </Text>
          </View>
          <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
            {renderStatusBadge(status)}
          </View>
        </View>

        <View style={styles.rightCol}>
          <ArabicText size={20} align="right" style={styles.arabicName}>
            {item.name}
          </ArabicText>
          <Text style={[styles.tapHint, { color: colors.textMuted }]}>
            Tap to cycle
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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

      <SectionHeader eyebrow="Memorization" title="Hifz Tracker" />

      {/* Summary Scorecard */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {stats.memorized}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            MEMORIZED
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.revising}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            REVISING
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: colors.textSecondary }]}>
            {stats.notStarted}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            NOT STARTED
          </Text>
        </View>
      </View>

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
          placeholder="Search surahs by name or number..."
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

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const isSelected = tab === activeFilter;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                  borderColor: isSelected ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setActiveFilter(tab)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? colors.bgBase : colors.textSecondary },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Surahs List */}
      <FlatList
        data={filteredSurahs}
        keyExtractor={(item) => item.number.toString()}
        renderItem={renderSurah}
        ItemSeparatorComponent={Hairline}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No surahs found in this category
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  listContent: {
    paddingBottom: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
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
  midCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'column',
    gap: 2,
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  ayahCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 70,
  },
  arabicName: {
    lineHeight: 28,
  },
  tapHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    marginTop: 2,
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
