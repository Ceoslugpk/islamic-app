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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
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
              numberOfLines={1}
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

        {/* Verse Reference Footer Tag */}
        {verseLabel ? (
          <View style={styles.cardFooter}>
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
          </View>
        ) : null}
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
                      height: isCompact ? 30 : 32,
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
                        fontSize: isCompact ? 11 : 11.5,
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
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
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
});
