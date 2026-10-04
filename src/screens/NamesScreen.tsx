import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
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

export default function NamesScreen({
  onBack,
  variant = 'allah',
}: {
  onBack?: () => void;
  variant?: NamesVariant;
}) {
  const { colors } = useTheme();
  const { settings, setNamesLanguage } = useSettings();
  const language: NamesLanguage = settings.namesLanguage;
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const isProphet = variant === 'prophet';

  const [feed, setFeed] = useState<NamesFeed | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const renderItem = ({ item }: { item: NameRow }) => {
    const verseLabel = formatVerses(item.verses);

    return (
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
          <View style={styles.topLine}>
            <Text
              style={[styles.translit, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.transliteration}
            </Text>
            <ArabicText size={23} numberOfLines={1} style={styles.arabicText}>
              {item.arabic}
            </ArabicText>
          </View>

          {item.name ? (
            <Text style={[styles.localName, { color: colors.accent }]} numberOfLines={1}>
              {item.name}
            </Text>
          ) : null}

          <Text style={[styles.meaning, { color: colors.textMuted }]} numberOfLines={2}>
            {item.meaning}
          </Text>

          {item.note ? (
            <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.note}
            </Text>
          ) : null}

          {verseLabel ? (
            <View style={styles.metaLine}>
              <Text style={[styles.verse, { color: colors.textSecondary }]} numberOfLines={1}>
                {verseLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase, paddingHorizontal: paddingH }]}>
      <View style={styles.contentWrap}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Library"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Library</Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          compact
          eyebrow={isProphet ? 'Asma un-Nabi' : 'Asma ul-Husna'}
          title={isProphet ? '99 Names of the Prophet ﷺ' : '99 Names'}
        />

      {/* Language chips (Allah variant only) — single horizontally-scrollable row */}
      {!isProphet && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipRowContent}
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
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show names in ${lang.label}`}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.onAccent : colors.textSecondary },
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
      )}

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

      {loadState === 'offline' ? (
        <Text style={[styles.offlineNote, { color: colors.textMuted }]}>
          Offline — showing the bundled list.
        </Text>
      ) : null}

      {/* Count + translation source */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{countLabel}</Text>
        {!isProphet && loadState !== 'offline' ? (
          <Text style={[styles.sourceText, { color: colors.textMuted }]}>
            {`Translations · ${activeFeed ? activeFeed.provider : 'islamic.app'}`}
          </Text>
        ) : null}
      </View>

      {isLoading && (
        <FlatList
          data={Array.from({ length: 10 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <NameRowSkeleton compact={isCompact} />}
          ItemSeparatorComponent={Hairline}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* List */}
      <FlatList
        data={filteredNames}
        keyExtractor={(item) => item.number.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={Hairline}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingRight: 12,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  chipRow: {
    marginBottom: 10,
  },
  chipRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  chip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  chipSpinner: {
    marginLeft: 2,
  },
  searchBox: {
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
    marginBottom: 4,
  },
  countText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sourceText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
    letterSpacing: 0.3,
    flexShrink: 1,
    textAlign: 'right',
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  translit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    flexShrink: 1,
  },
  arabicText: {
    lineHeight: 32,
    flexShrink: 1,
  },
  localName: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 3,
  },
  meaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  note: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  verse: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
});
