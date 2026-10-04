import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  FlatList,
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
} from '../lib/names99';
import { PROPHET_NAMES_99 } from '../lib/prophetNames';
import { useSettings } from '../lib/settings';
import {
  addPlaybackStatusListener,
  getCurrentPlayback,
  getPlaybackStatus,
  pause,
  playNameAudio,
  resume,
} from '../lib/quranAudio';
import { NameRowSkeleton } from '../components/Skeleton';

type LoadState = 'loading' | 'online' | 'offline';

/** Which dataset the screen renders: the Names of Allah or the Prophet's ﷺ names. */
export type NamesVariant = 'allah' | 'prophet';

interface NamesFeed {
  language: NamesLanguage;
  names: Name99[];
  source: 'cache' | 'api' | 'static';
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
  const supportsAudio = !isProphet;

  const [feed, setFeed] = useState<NamesFeed | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Load cached names instantly, then refresh from the keyless API (static fallback on failure).
  // The Prophet variant is bundled-only, so it skips the network entirely.
  useEffect(() => {
    if (isProphet) return;
    let mounted = true;
    (async () => {
      const cached = await loadCachedNames(language);
      if (mounted && cached) setFeed({ language, names: cached, source: 'cache' });

      const fresh = await fetchNames(language);
      if (!mounted) return;
      setFeed({ language, names: fresh, source: fresh === NAMES_99 ? 'static' : 'api' });
    })();
    return () => {
      mounted = false;
    };
  }, [language, isProphet]);

  // Track which name clip the global audio singleton is playing
  useEffect(() => {
    if (!supportsAudio) return;
    return addPlaybackStatusListener((status) => {
      const current = getCurrentPlayback();
      setPlayingUrl(current?.identifier === 'names99' ? current.url : null);
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
    });
  }, [supportsAudio]);

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

  const handleToggleAudio = (item: NameRow) => {
    if (!item.audioUrl) return;
    const current = getCurrentPlayback();
    if (current?.identifier === 'names99' && current.url === item.audioUrl) {
      const status = getPlaybackStatus();
      if (status.isPlaying) {
        pause().catch(() => {});
      } else if (
        status.isLoaded &&
        status.durationMillis > 0 &&
        status.positionMillis >= status.durationMillis - 300
      ) {
        // Clip already finished — start it over
        playNameAudio(item.audioUrl, `${item.transliteration} · 99 Names`).catch(() => {});
      } else {
        resume().catch(() => {});
      }
      return;
    }
    playNameAudio(item.audioUrl, `${item.transliteration} · 99 Names`).catch(() => {});
  };

  const renderItem = ({ item }: { item: NameRow }) => {
    const verseLabel = formatVerses(item.verses);
    const showAudio = supportsAudio && !!item.audioUrl;
    const isActive = showAudio && playingUrl === item.audioUrl;
    const showMeta = !!verseLabel || showAudio;

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

          {showMeta ? (
            <View style={styles.metaLine}>
              {verseLabel ? (
                <Text style={[styles.verse, { color: colors.textSecondary }]} numberOfLines={1}>
                  {verseLabel}
                </Text>
              ) : null}
              <View style={styles.metaSpacer} />
              {showAudio ? (
                <TouchableOpacity
                  onPress={() => handleToggleAudio(item)}
                  style={[
                    styles.playBtn,
                    {
                      borderColor: isActive ? colors.accent : colors.borderSubtle,
                      backgroundColor: isActive ? colors.accent : colors.accentDim,
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isActive && isPlaying
                      ? `Pause ${item.transliteration}`
                      : `Play ${item.transliteration}`
                  }
                >
                  {isActive && isBuffering && !isPlaying ? (
                    <ActivityIndicator size="small" color={isActive ? colors.onAccent : colors.accent} />
                  ) : (
                    <Ionicons
                      name={isActive && isPlaying ? 'pause' : 'play'}
                      size={13}
                      color={isActive ? colors.onAccent : colors.accent}
                    />
                  )}
                </TouchableOpacity>
              ) : null}
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
          eyebrow={isProphet ? 'Asma un-Nabi' : 'Asma ul-Husna'}
          title={isProphet ? '99 Names of the Prophet ﷺ' : '99 Names'}
          subtitle={
            isProphet
              ? 'The names and titles of the Prophet Muhammad ﷺ, drawn from the classical Shama\u2019il compilations.'
              : 'The 99 Beautiful Names of Allah, with Arabic, transliteration, and translated meanings.'
          }
        />

      {/* Language Chips (Allah variant only — the Prophet's names are bundled in English) */}
      {!isProphet && (
      <View style={styles.chipRow}>
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
      </View>
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
          Offline — showing the bundled list. Recitations are unavailable until you reconnect.
        </Text>
      ) : null}

      {/* Prophet variant: honest, graceful notice — no keyless recitation source exists yet */}
      {isProphet ? (
        <Text style={[styles.offlineNote, { color: colors.textMuted }]}>
          {'Recitations coming soon — no public audio source is available for the Prophet\u2019s ﷺ names yet. Meanings are shown in English.'}
        </Text>
      ) : null}

      {/* Count + translation source */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{countLabel}</Text>
        {!isProphet && loadState !== 'offline' ? (
          <Text style={[styles.sourceText, { color: colors.textMuted }]}>
            Translations · EsmaulHusna.org
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
    paddingVertical: 20,
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
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  chipSpinner: {
    marginLeft: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
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
  offlineNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
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
  metaSpacer: {
    flex: 1,
  },
  verse: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
