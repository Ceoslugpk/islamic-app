import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { iconSizes } from '../lib/iconMap';
import { SectionHeader } from '../components/SectionHeader';
import { AudioPlayerModal } from '../components/AudioPlayerModal';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import {
  addPlaybackStatusListener,
  addQueueListener,
  clearAudioQueue,
  CurrentPlayback,
  fetchReciters,
  getAudioQueue,
  getCurrentPlayback,
  getPlaybackStatus,
  getQueueIndex,
  getAyahAudioUrl,
  getReciterCountry,
  getSurahAudioUrl,
  getAudioEditionForLanguage,
  getAudioTranslationLangName,
  isAudioTranslationEnabled,
  NON_ARABIC_AUDIO_EDITIONS,
  pause,
  playAyah,
  PlaybackStatus,
  playQueueItem,
  playSurah,
  Reciter,
  removeQueueItem,
  resume,
  setAudioQueue,
  setAudioTranslationEnabled,
  updateAudioSettings,
  useAudioTranslation,
  VERIFIED_NON_ARABIC_EDITIONS,
} from '../lib/quranAudio';
import { useSettings } from '../lib/settings';
import { getLanguageFlag } from '../lib/quranLanguages';
import {
  AudioSettings,
  deletePlaylist,
  loadAudioSettings,
  loadPlaylists,
  loadRecentlyPlayed,
  Playlist,
  PlaylistItem,
  RecentlyPlayedItem,
  savePlaylist,
  saveRecentlyPlayed,
} from '../lib/db';
import { fetchSurahList, SurahMeta } from '../lib/quran';
import { PRESET_PLAYLISTS, PresetPlaylist } from '../lib/audioPlaylists';

type AudioTab =
  | 'reciters'
  | 'translations'
  | 'recent'
  | 'playlists'
  | 'queue'
  | 'settings';

interface QuranAudioScreenProps {
  onBack?: () => void;
}

export default function QuranAudioScreen({ onBack }: QuranAudioScreenProps) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const isCompact = width <= 350;

  const [activeTab, setActiveTab] = useState<AudioTab>('reciters');

  // Reciters (strictly Arabic reciters list)
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>('ar.alafasy');

  // Advanced popup player modal visibility
  const [audioModalOpen, setAudioModalOpen] = useState<boolean>(false);

  // Live Audio Playback (Single Source of Truth)
  const [playback, setPlayback] = useState<CurrentPlayback | null>(getCurrentPlayback());
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>(getPlaybackStatus());

  // Live Queue (Single Source of Truth)
  const [queue, setQueue] = useState<PlaylistItem[]>(getAudioQueue());
  const [queueIndex, setQueueIndex] = useState<number>(getQueueIndex());

  // Recently Played
  const [recentList, setRecentList] = useState<RecentlyPlayedItem[]>([]);

  // Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistModalOpen, setNewPlaylistModalOpen] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [savedPresetIds, setSavedPresetIds] = useState<Set<string>>(new Set());

  // Surahs for playlist creation & quick add
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [selectedSurahForPlaylist, setSelectedSurahForPlaylist] = useState<number>(1);

  // Settings
  const [settings, setSettings] = useState<AudioSettings>({
    reciter: 'ar.alafasy',
    autoplayNext: true,
    repeatMode: 'none',
  });

  // Translation audio preferences
  const { settings: appSettings, setTranslationAudioEnabled: setGlobalTranslationAudio } = useSettings();
  const { audioEdition, audioLanguage, audioLangName, setAudioTranslation } = useAudioTranslation();
  const [transAudioEnabled, setTransAudioEnabled] = useState<boolean>(isAudioTranslationEnabled());

  useEffect(() => {
    setTransAudioEnabled(appSettings.translationAudioEnabled);
  }, [appSettings.translationAudioEnabled]);

  const handleToggleTranslationAudio = (val: boolean) => {
    setTransAudioEnabled(val);
    setAudioTranslationEnabled(val);
    setGlobalTranslationAudio(val);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reciterList, surahList] = await Promise.all([
        fetchReciters(),
        fetchSurahList().catch(() => [] as SurahMeta[]),
      ]);
      setReciters(reciterList);
      setSurahs(surahList);

      const savedSettings = loadAudioSettings();
      setSettings(savedSettings);
      setSelectedIdentifier(savedSettings.reciter || 'ar.alafasy');

      setRecentList(loadRecentlyPlayed());
      const loadedPls = loadPlaylists();
      setPlaylists(loadedPls);
      setQueue(getAudioQueue());
      setQueueIndex(getQueueIndex());

      // Identify presets that have been saved
      const savedIds = new Set(
        loadedPls
          .map((p) => {
            const match = p.id.match(/^pl-preset-(.+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[]
      );
      setSavedPresetIds(savedIds);
    } catch {
      setError('Could not load reciters. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Audio Playback Listener (Status & Metadata)
  useEffect(() => {
    const unsubStatus = addPlaybackStatusListener((status) => {
      setPlaybackStatus(status);
      const current = getCurrentPlayback();
      setPlayback(current);
    });

    const unsubQueue = addQueueListener((q, idx) => {
      setQueue(q);
      setQueueIndex(idx);
    });

    return () => {
      unsubStatus();
      unsubQueue();
    };
  }, []);

  const currentReciterObj = reciters.find((r) => r.identifier === selectedIdentifier);
  const currentReciterName = currentReciterObj ? currentReciterObj.englishName : 'Alafasy';

  // Play Actions
  const handlePlayPause = () => {
    if (playbackStatus.isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handlePlayRecent = async (item: RecentlyPlayedItem) => {
    try {
      if (item.type === 'surah') {
        const url = getSurahAudioUrl(item.identifier, item.surah);
        await playSurah(item.identifier, url, item.title, item.reciterName, item.surah);
      } else {
        const ayah = item.ayah || 1;
        const url = getAyahAudioUrl(item.identifier, item.surah, ayah);
        await playAyah(item.identifier, url, item.title, item.reciterName, item.surah, ayah);
      }
      setRecentList(loadRecentlyPlayed());
    } catch {
      // ignore
    }
  };

  const handleResumeRecent = () => {
    if (recentList.length > 0) {
      handlePlayRecent(recentList[0]);
    }
  };

  const handlePlayReciterSample = async (reciter: Reciter) => {
    try {
      // If already playing this reciter's sample, toggle pause/play
      const isCurrentSample =
        playback?.identifier === reciter.identifier &&
        playback?.type === 'ayah' &&
        playback?.surah === 1 &&
        playback?.ayah === 1;

      if (isCurrentSample) {
        if (playbackStatus.isPlaying) {
          await pause();
        } else {
          await resume();
        }
        return;
      }

      const url = getAyahAudioUrl(reciter.identifier, 1, 1);
      await playAyah(
        reciter.identifier,
        url,
        'Al-Faatiha 1:1',
        reciter.englishName,
        1,
        1
      );
      setRecentList(loadRecentlyPlayed());
    } catch {
      // ignore
    }
  };

  const handleSelectDefaultReciter = (identifier: string) => {
    haptic('selection');
    setSelectedIdentifier(identifier);
    const updated = updateAudioSettings({ reciter: identifier });
    setSettings(updated);
  };

  // Preset & Playlist Actions
  const handlePlayPreset = async (preset: PresetPlaylist) => {
    const items: PlaylistItem[] = preset.items.map((it) => ({
      surah: it.surah,
      ayah: it.ayah,
      title: it.label,
    }));
    setAudioQueue(items, 0);
    await playQueueItem(0);
    setRecentList(loadRecentlyPlayed());
  };

  const handleSavePreset = (preset: PresetPlaylist) => {
    const items: PlaylistItem[] = preset.items.map((it) => ({
      surah: it.surah,
      ayah: it.ayah,
      title: it.label,
    }));
    const newPl: Playlist = {
      id: `pl-preset-${preset.id}`,
      name: preset.title,
      items,
      createdAt: Date.now(),
    };
    savePlaylist(newPl);
    setPlaylists(loadPlaylists());
    setSavedPresetIds((prev) => new Set([...prev, preset.id]));
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const targetSurah = surahs.find((s) => s.number === selectedSurahForPlaylist);
    const initialItem: PlaylistItem = {
      surah: selectedSurahForPlaylist,
      title: targetSurah ? `Surah ${targetSurah.englishName}` : `Surah ${selectedSurahForPlaylist}`,
    };
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      items: [initialItem],
      createdAt: Date.now(),
    };
    savePlaylist(newPl);
    setPlaylists(loadPlaylists());
    setNewPlaylistName('');
    setNewPlaylistModalOpen(false);
  };

  const handleDeletePlaylist = (id: string) => {
    deletePlaylist(id);
    const updated = loadPlaylists();
    setPlaylists(updated);
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(null);
    }
    const match = id.match(/^pl-preset-(.+)/);
    if (match) {
      setSavedPresetIds((prev) => {
        const next = new Set(prev);
        next.delete(match[1]);
        return next;
      });
    }
  };

  const handlePlayPlaylistItem = async (item: PlaylistItem, playlistContext?: Playlist, index = 0) => {
    try {
      if (playlistContext && playlistContext.items.length > 1) {
        setAudioQueue(playlistContext.items, index);
        await playQueueItem(index);
      } else {
        const reciter = selectedIdentifier;
        if (item.ayah !== undefined && item.ayah !== null) {
          const url = getAyahAudioUrl(reciter, item.surah, item.ayah);
          await playAyah(reciter, url, item.title, currentReciterName, item.surah, item.ayah);
        } else {
          const url = getSurahAudioUrl(reciter, item.surah);
          await playSurah(reciter, url, item.title, currentReciterName, item.surah);
        }
      }
      setRecentList(loadRecentlyPlayed());
    } catch {
      // ignore
    }
  };

  // Queue Actions
  const handleAddToQueue = (surahNum: number) => {
    const s = surahs.find((item) => item.number === surahNum);
    const item: PlaylistItem = {
      surah: surahNum,
      title: s ? `Surah ${s.englishName}` : `Surah ${surahNum}`,
    };
    const updated = [...queue, item];
    setAudioQueue(updated, queueIndex);
  };

  const handlePlayQueueIndex = async (index: number) => {
    await playQueueItem(index);
    setRecentList(loadRecentlyPlayed());
  };

  const handleRemoveQueueItem = (index: number) => {
    removeQueueItem(index);
  };

  const handleClearQueue = () => {
    clearAudioQueue();
  };

  // Settings Toggles
  const handleToggleAutoplay = (value: boolean) => {
    const updated = updateAudioSettings({ autoplayNext: value });
    setSettings(updated);
  };

  const handleSetRepeatMode = (mode: 'none' | 'one' | 'all') => {
    const updated = updateAudioSettings({ repeatMode: mode });
    setSettings(updated);
  };

  // Filter Reciters with memo - strictly Arabic
  const filteredReciters = useMemo(() => {
    const query = reciterSearch.trim().toLowerCase();
    return reciters.filter((r) => {
      if (r.language !== 'ar') return false;
      if (!query) return true;

      return (
        r.englishName.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query) ||
        r.identifier.toLowerCase().includes(query)
      );
    });
  }, [reciters, reciterSearch]);

  const tabsConfig = [
    { key: 'reciters', label: 'Reciters', icon: 'people-outline' },
    { key: 'translations', label: 'Translation Audio', icon: 'language-outline' },
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'playlists', label: 'Playlists', icon: 'list-outline' },
    {
      key: 'queue',
      label: 'Queue',
      icon: 'play-forward-outline',
      badge: queue.length > 0 ? String(queue.length) : undefined,
    },
    { key: 'settings', label: 'Settings', icon: 'settings-outline' },
  ] as const;

  const paddingH = isNarrow ? 16 : 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: paddingH }]}>
          {onBack && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to Quran"
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Quran</Text>
            </TouchableOpacity>
          )}
          <SectionHeader compact eyebrow="Audio Center" title="Quran Audio" />
        </View>


        {/* Sub-navigation Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {tabsConfig.map((t) => {
              const isTabActive = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setActiveTab(t.key)}
                  style={[
                    styles.tabItem,
                    {
                      borderBottomColor: isTabActive ? colors.accent : 'transparent',
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isTabActive }}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={15}
                    color={isTabActive ? colors.accent : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isTabActive ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {t.label}
                  </Text>
                  {'badge' in t && t.badge && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isTabActive ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          { color: isTabActive ? colors.onAccent : colors.textSecondary },
                        ]}
                      >
                        {t.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {loading ? (
          <FlatList
            data={Array.from({ length: 6 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderItem={() => <SkeletonCard lines={3} lineHeight={15} avatar avatarSize={36} style={styles.skeletonCard} />}
            contentContainerStyle={styles.listContent}
          />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load reciters"
            subtitle={error}
            actionLabel="Retry"
            onAction={loadAllData}
          />
        ) : activeTab === 'reciters' ? (
          /* Reciters Tab */
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                placeholder="Search by reciter name or style..."
                placeholderTextColor={colors.textMuted}
                value={reciterSearch}
                onChangeText={setReciterSearch}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {reciterSearch.length > 0 && (
                <TouchableOpacity onPress={() => setReciterSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Arabic Reciters Header Info */}
            <View style={styles.reciterHeaderRow}>
              <Text style={[styles.reciterHeaderTitle, { color: colors.textSecondary }]}>
                Arabic Reciters ({filteredReciters.length})
              </Text>
              <Text style={[styles.reciterHeaderSub, { color: colors.textMuted }]}>
                Select default reciter or tap Sample
              </Text>
            </View>

            <FlatList
              data={filteredReciters}
              keyExtractor={(item) => item.identifier}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={7}
              renderItem={({ item }) => {
                const isSelected = item.identifier === selectedIdentifier;
                const country = item.country || getReciterCountry(item.identifier);
                const isSamplingThis =
                  playback?.identifier === item.identifier &&
                  playback?.type === 'ayah' &&
                  playback?.surah === 1 &&
                  playback?.ayah === 1 &&
                  playbackStatus.isPlaying;

                return (
                  <View
                    style={[
                      styles.reciterCard,
                      {
                        backgroundColor: isSelected ? colors.accentDim : colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.reciterMain}>
                      <TouchableOpacity
                        onPress={() => handleSelectDefaultReciter(item.identifier)}
                        style={styles.reciterSelectArea}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${item.englishName}${country ? `, ${country}` : ''} as default reciter`}
                      >
                        <View style={styles.radioArea}>
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                          ) : (
                            <Ionicons name="ellipse-outline" size={20} color={colors.borderSubtle} />
                          )}
                        </View>
                        <View style={styles.reciterNameCol}>
                          <Text
                            style={[
                              styles.reciterName,
                              { color: isSelected ? colors.accent : colors.textPrimary },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.englishName}
                          </Text>
                          {country ? (
                            <Text style={[styles.reciterCountry, { color: colors.textMuted }]}>
                              {country}
                            </Text>
                          ) : null}
                          {item.name ? (
                            <Text
                              style={[styles.reciterArabic, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePlayReciterSample(item)}
                        style={[
                          styles.sampleBtn,
                          {
                            backgroundColor: isSamplingThis ? colors.accent : colors.accentDim,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isSamplingThis
                            ? `Pause sample of ${item.englishName}`
                            : `Listen to sample of ${item.englishName}`
                        }
                      >
                        <Ionicons
                          name={isSamplingThis ? 'pause' : 'volume-medium'}
                          size={14}
                          color={isSamplingThis ? colors.onAccent : colors.accent}
                        />
                        <Text
                          style={[
                            styles.sampleBtnText,
                            { color: isSamplingThis ? colors.onAccent : colors.accent },
                          ]}
                        >
                          {isSamplingThis ? 'Playing' : 'Sample'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        ) : activeTab === 'translations' ? (
          /* Translation Audio Tab (Non-Arabic editions - strictly separate) */
          <ScrollView contentContainerStyle={styles.translationTabScroll}>
            {/* Active Translation Status Card */}
            <View
              style={[
                styles.translationStatusCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.translationStatusHeader}>
                <View style={[styles.translationStatusFlagWrap, { backgroundColor: colors.accentDim }]}>
                  <Text style={{ fontSize: 24 }}>{getLanguageFlag(audioLanguage)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.translationStatusLabel, { color: colors.textMuted }]}>
                    ACTIVE TRANSLATION AUDIO
                  </Text>
                  <Text style={[styles.translationStatusName, { color: colors.textPrimary }]}>
                    {audioLangName} ({audioLanguage.toUpperCase()})
                  </Text>
                  <Text style={[styles.translationStatusVoice, { color: colors.accent }]}>
                    Voice: {audioEdition.englishName || audioEdition.name}
                  </Text>
                </View>
              </View>

              <View style={[styles.translationToggleRow, { borderTopColor: colors.borderSubtle }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                    Play translation after Arabic
                  </Text>
                  <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                    Sequentially play translated audio after each Arabic ayah
                  </Text>
                </View>
                <Switch
                  value={transAudioEnabled}
                  onValueChange={handleToggleTranslationAudio}
                  trackColor={{ false: colors.borderSubtle, true: colors.accent }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle play translation audio after Arabic"
                />
              </View>
            </View>

            {/* Translation Audio Editions Directory */}
            <View style={styles.translationDirectoryHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Verified Non-Arabic Recitations
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                13 verse-by-verse translation editions across 11 languages
              </Text>
            </View>

            <View style={styles.translationListWrap}>
              {NON_ARABIC_AUDIO_EDITIONS.map((item) => {
                const isSelectedEdition = audioEdition.identifier === item.identifier;
                const flagEmoji = getLanguageFlag(item.language);
                const isSamplingThis =
                  playback?.identifier === item.identifier &&
                  playback?.type === 'ayah' &&
                  playback?.surah === 1 &&
                  playback?.ayah === 1 &&
                  playbackStatus.isPlaying;

                return (
                  <View
                    key={item.identifier}
                    style={[
                      styles.reciterCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelectedEdition ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.reciterMain}>
                      <TouchableOpacity
                        onPress={() => setAudioTranslation(item.identifier)}
                        style={styles.reciterSelectArea}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${item.englishName} for Quran translation audio`}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelectedEdition ? colors.accent : colors.borderSubtle,
                            },
                          ]}
                        >
                          {isSelectedEdition && (
                            <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                          )}
                        </View>
                        <View style={styles.reciterNameCol}>
                          <View style={styles.reciterTitleRow}>
                            <Text style={{ fontSize: 16, marginRight: 4 }}>{flagEmoji}</Text>
                            <Text
                              style={[styles.reciterName, { color: colors.textPrimary }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {item.englishName}
                            </Text>
                            <View
                              style={[
                                styles.langTag,
                                {
                                  backgroundColor: isSelectedEdition ? colors.accent : colors.accentDim,
                                  borderColor: colors.accent,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.langTagText,
                                  { color: isSelectedEdition ? colors.onAccent : colors.accent },
                                ]}
                              >
                                {item.language.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          {item.name ? (
                            <Text
                              style={[styles.reciterArabic, { color: colors.textMuted }]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePlayReciterSample(item)}
                        style={[
                          styles.sampleBtn,
                          {
                            backgroundColor: isSamplingThis ? colors.accent : colors.accentDim,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isSamplingThis
                            ? `Pause sample of ${item.englishName}`
                            : `Listen to sample of ${item.englishName}`
                        }
                      >
                        <Ionicons
                          name={isSamplingThis ? 'pause' : 'volume-medium'}
                          size={14}
                          color={isSamplingThis ? colors.onAccent : colors.accent}
                        />
                        <Text
                          style={[
                            styles.sampleBtnText,
                            { color: isSamplingThis ? colors.onAccent : colors.accent },
                          ]}
                        >
                          {isSamplingThis ? 'Playing' : 'Sample'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : activeTab === 'recent' ? (
          /* Recently Played Tab */
          <View style={styles.tabContent}>
            <FlatList
              data={recentList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No recent audio
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    Audio recitations you play in the Quran reader or Audio center will appear here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isItemPlaying =
                  playback?.identifier === item.identifier &&
                  playback?.surah === item.surah &&
                  (item.ayah ? playback?.ayah === item.ayah : true) &&
                  playbackStatus.isPlaying;

                return (
                  <TouchableOpacity
                    onPress={() => handlePlayRecent(item)}
                    style={[
                      styles.recentCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isItemPlaying ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${item.title} by ${item.reciterName}`}
                  >
                    <View style={styles.recentInfo}>
                      <Text
                        style={[styles.recentTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.recentSub, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {item.reciterName} · {item.type.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.playCircleIcon,
                        {
                          backgroundColor: isItemPlaying ? colors.accent : colors.accentDim,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isItemPlaying ? 'pause' : 'play'}
                        size={16}
                        color={isItemPlaying ? colors.onAccent : colors.accent}
                      />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ) : activeTab === 'playlists' ? (
          /* Playlists Tab */
          <View style={styles.tabContent}>
            {selectedPlaylist ? (
              <View style={styles.selectedPlaylistWrap}>
                <View style={styles.playlistDetailHeader}>
                  <TouchableOpacity
                    onPress={() => setSelectedPlaylist(null)}
                    style={styles.backToPlaylistsBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Back to all playlists"
                  >
                    <Text style={[styles.backToPlaylistsText, { color: colors.accent }]}>
                      ← All Playlists
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePlayPlaylistItem(selectedPlaylist.items[0], selectedPlaylist, 0)}
                    style={[styles.playAllBtn, { backgroundColor: colors.accent }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Play all ${selectedPlaylist.items.length} tracks`}
                  >
                    <Ionicons name="play" size={14} color={colors.onAccent} />
                    <Text style={[styles.playAllBtnText, { color: colors.onAccent }]}>Play All</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.playlistHeaderTitle, { color: colors.textPrimary }]}>
                  {selectedPlaylist.name}
                </Text>
                <Text style={[styles.playlistHeaderMeta, { color: colors.textMuted }]}>
                  {selectedPlaylist.items.length}{' '}
                  {selectedPlaylist.items.length === 1 ? 'track' : 'tracks'}
                </Text>

                <FlatList
                  data={selectedPlaylist.items}
                  keyExtractor={(_, i) => String(i)}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => handlePlayPlaylistItem(item, selectedPlaylist, index)}
                      style={[
                        styles.playlistTrackRow,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Play track ${index + 1}: ${item.title}`}
                    >
                      <View style={styles.trackNumCol}>
                        <Text style={[styles.trackNumText, { color: colors.textMuted }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={[styles.trackTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Ionicons name="play-circle-outline" size={iconSizes.action} color={colors.accent} />
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.playlistsScrollContent}>
                {/* Section 1: Curated Presets */}
                <View style={styles.playlistSectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Curated Presets
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                    Ready-to-listen devotional sets
                  </Text>
                </View>

                <View style={styles.presetsGrid}>
                  {PRESET_PLAYLISTS.map((preset) => {
                    const isSaved = savedPresetIds.has(preset.id);
                    return (
                      <View
                        key={preset.id}
                        style={[
                          styles.presetCard,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <View style={styles.presetTopRow}>
                          <View style={styles.presetHeaderWrap}>
                            <Text
                              style={[styles.presetTitle, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {preset.title}
                            </Text>
                            <Text
                              style={[styles.presetSubtitle, { color: colors.textMuted }]}
                              numberOfLines={2}
                            >
                              {preset.subtitle}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.presetFooterRow}>
                          <View style={styles.presetCountBadge}>
                            <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
                            <Text
                              style={[styles.presetCountText, { color: colors.textSecondary }]}
                            >
                              {preset.items.length} verses
                            </Text>
                          </View>

                          <View style={styles.presetActionButtons}>
                            <TouchableOpacity
                              onPress={() => handleSavePreset(preset)}
                              style={[
                                styles.presetSaveBtn,
                                {
                                  borderColor: isSaved ? colors.accent : colors.borderSubtle,
                                  backgroundColor: isSaved ? colors.accentDim : 'transparent',
                                },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={isSaved ? 'Saved to playlists' : 'Save preset'}
                            >
                              <Ionicons
                                name={isSaved ? 'checkmark' : 'bookmark-outline'}
                                size={14}
                                color={isSaved ? colors.accent : colors.textMuted}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handlePlayPreset(preset)}
                              style={[styles.presetPlayBtn, { backgroundColor: colors.accent }]}
                              accessibilityRole="button"
                              accessibilityLabel={`Play preset: ${preset.title}`}
                            >
                              <Ionicons name="play" size={14} color={colors.onAccent} />
                              <Text style={[styles.presetPlayBtnText, { color: colors.onAccent }]}>Play</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Section 2: User Playlists */}
                <View style={[styles.playlistActionRow, { marginTop: 16 }]}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      Your Playlists
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                      Custom compilations & saved sets
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setNewPlaylistModalOpen(true)}
                    style={[styles.createBtn, { backgroundColor: colors.accent }]}
                    accessibilityRole="button"
                    accessibilityLabel="Create a new playlist"
                  >
                    <Ionicons name="add" size={16} color={colors.onAccent} />
                    <Text style={[styles.createBtnText, { color: colors.onAccent }]}>New</Text>
                  </TouchableOpacity>
                </View>

                {playlists.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="albums-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                      No custom playlists yet
                    </Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                      Create a playlist of your favorite Surahs or save a curated preset above.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.userPlaylistsList}>
                    {playlists.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.playlistCard,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => setSelectedPlaylist(item)}
                          style={styles.playlistCardMain}
                          accessibilityRole="button"
                          accessibilityLabel={`Open playlist ${item.name}`}
                        >
                          <Text style={[styles.playlistName, { color: colors.textPrimary }]}>
                            {item.name}
                          </Text>
                          <Text style={[styles.playlistItemCount, { color: colors.textMuted }]}>
                            {item.items.length} {item.items.length === 1 ? 'track' : 'tracks'}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.playlistRightControls}>
                          <TouchableOpacity
                            onPress={() => handlePlayPlaylistItem(item.items[0], item, 0)}
                            style={[styles.smallPlayBtn, { backgroundColor: colors.accentDim }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Play playlist ${item.name}`}
                          >
                            <Ionicons name="play" size={14} color={colors.accent} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeletePlaylist(item.id)}
                            style={styles.deletePlaylistBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete playlist ${item.name}`}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            {/* New Playlist Modal */}
            <Modal
              visible={newPlaylistModalOpen}
              animationType="fade"
              transparent
              onRequestClose={() => setNewPlaylistModalOpen(false)}
              statusBarTranslucent
            >
              <View style={styles.modalBackdrop}>
                <TouchableWithoutFeedback onPress={() => setNewPlaylistModalOpen(false)}>
                  <View style={styles.modalBackdropDim} />
                </TouchableWithoutFeedback>
                <View
                  style={[
                    styles.modalBox,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]} />
                  <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      New Playlist
                    </Text>
                    <TouchableOpacity
                      onPress={() => setNewPlaylistModalOpen(false)}
                      style={styles.modalCloseBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Close create playlist modal"
                    >
                      <Ionicons name="close" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ width: '100%' }}
                  >
                    <View style={styles.modalBody}>
                      <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                        Playlist Name
                      </Text>
                      <TextInput
                        placeholder="e.g. Daily Fajr, Heart Healing, Sleep"
                        placeholderTextColor={colors.textMuted}
                        value={newPlaylistName}
                        onChangeText={setNewPlaylistName}
                        style={[
                          styles.modalInput,
                          {
                            color: colors.textPrimary,
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      />

                    <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                      Select First Surah
                    </Text>
                    <ScrollView style={styles.surahPickerScroll}>
                      {surahs.map((s) => {
                        const isPicked = selectedSurahForPlaylist === s.number;
                        return (
                          <TouchableOpacity
                            key={`pick-surah-${s.number}`}
                            onPress={() => setSelectedSurahForPlaylist(s.number)}
                            style={[
                              styles.surahPickRow,
                              {
                                backgroundColor: isPicked ? colors.accentDim : colors.bgBase,
                                borderColor: isPicked ? colors.accent : colors.borderSubtle,
                              },
                            ]}
                          >
                            <Text style={[styles.surahPickNum, { color: colors.accent }]}>
                              {s.number}.
                            </Text>
                            <Text style={[styles.surahPickName, { color: colors.textPrimary }]}>
                              {s.englishName}
                            </Text>
                            <Text
                              style={[styles.surahPickTrans, { color: colors.textMuted }]}
                              numberOfLines={1}
                            >
                              ({s.englishNameTranslation})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        onPress={() => setNewPlaylistModalOpen(false)}
                        style={[styles.modalCancelBtn, { borderColor: colors.borderSubtle }]}
                      >
                        <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleCreatePlaylist}
                        style={[styles.modalSubmitBtn, { backgroundColor: colors.accent }]}
                      >
                        <Text style={styles.modalSubmitText}>Create Playlist</Text>
                      </TouchableOpacity>
                    </View>
                    </View>
                  </KeyboardAvoidingView>
                </View>
              </View>
            </Modal>
          </View>
        ) : activeTab === 'queue' ? (
          /* Queue Tab */
          <View style={styles.tabContent}>
            <View style={styles.playlistActionRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Playback Queue ({queue.length})
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  {queue.length > 0
                    ? queueIndex >= 0
                      ? `Playing track ${queueIndex + 1} of ${queue.length}`
                      : 'Tracks will play in order'
                    : 'Add Surahs to queue for uninterrupted recitation'}
                </Text>
              </View>
              {queue.length > 0 && (
                <TouchableOpacity onPress={handleClearQueue} style={styles.clearBtn}>
                  <Text style={[styles.clearBtnText, { color: colors.accent }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={queue}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="play-skip-forward-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Queue is empty
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                    Tap below to quickly queue popular Surahs for sequential recitation.
                  </Text>
                  <View style={styles.quickAddGrid}>
                    {[
                      { num: 36, name: 'Ya-Sin (36)' },
                      { num: 67, name: 'Al-Mulk (67)' },
                      { num: 55, name: 'Ar-Rahman (55)' },
                      { num: 56, name: 'Al-Waqi’ah (56)' },
                      { num: 18, name: 'Al-Kahf (18)' },
                      { num: 2, name: 'Al-Baqarah (2)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.num}
                        onPress={() => handleAddToQueue(item.num)}
                        style={[
                          styles.quickAddBtn,
                          {
                            backgroundColor: colors.bgSurface,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <Ionicons name="add" size={14} color={colors.accent} />
                        <Text style={[styles.quickAddText, { color: colors.textPrimary }]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
              renderItem={({ item, index }) => {
                const isCurrentQueueItem = index === queueIndex;
                const isPlayingThis = isCurrentQueueItem && playbackStatus.isPlaying;

                return (
                  <View
                    style={[
                      styles.queueCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isCurrentQueueItem ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.queueNum}>
                      {isPlayingThis ? (
                        <Ionicons name="volume-high" size={16} color={colors.accent} />
                      ) : (
                        <Text
                          style={[
                            styles.queueNumText,
                            { color: isCurrentQueueItem ? colors.accent : colors.textMuted },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.queueMainPress}
                      onPress={() => handlePlayQueueIndex(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Play track ${index + 1}: ${item.title}`}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.queueTitle,
                          {
                            color: isCurrentQueueItem ? colors.accent : colors.textPrimary,
                            fontFamily: isCurrentQueueItem
                              ? 'Manrope_600SemiBold'
                              : 'Manrope_500Medium',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {isCurrentQueueItem && (
                        <Text style={[styles.queuePlayingBadge, { color: colors.accent }]}>
                          {isPlayingThis ? 'NOW PLAYING' : 'PAUSED'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View style={styles.queueControls}>
                      <TouchableOpacity
                        onPress={() => handlePlayQueueIndex(index)}
                        style={[
                          styles.queuePlayBtn,
                          {
                            backgroundColor: isPlayingThis ? colors.accent : colors.accentDim,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Play track ${index + 1}: ${item.title}`}
                      >
                        <Ionicons
                          name={isPlayingThis ? 'pause' : 'play'}
                          size={14}
                          color={isPlayingThis ? colors.onAccent : colors.accent}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemoveQueueItem(index)}
                        style={styles.queueRemoveBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.title} from queue`}
                      >
                        <Ionicons name="close" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        ) : (
          /* Settings Tab */
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <Text style={[styles.settingsGroupTitle, { color: colors.accent }]}>
              RECITER & PLAYBACK PREFERENCES
            </Text>

            {/* Default Reciter Card */}
            <View
              style={[
                styles.settingRowCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Default Reciter
                </Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {currentReciterName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab('reciters')}
                style={[styles.changeReciterBtn, { backgroundColor: colors.accentDim }]}
                accessibilityRole="button"
                accessibilityLabel="Change default reciter"
              >
                <Text style={[styles.changeReciterText, { color: colors.accent }]}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Autoplay Next Toggle */}
            <View
              style={[
                styles.settingRowCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Autoplay Next
                </Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                  Automatically advance to next Ayah or queued Surah when track finishes
                </Text>
              </View>
              <Switch
                value={settings.autoplayNext}
                onValueChange={handleToggleAutoplay}
                trackColor={{ false: colors.borderSubtle, true: colors.accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Toggle autoplay next track"
              />
            </View>

            {/* Play Translation After Arabic Toggle */}
            <View
              style={[
                styles.settingRowCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Play translation after Arabic
                </Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                  Plays the same ayah in the selected translation language after the Arabic recitation
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                  <Text style={{ fontSize: 13 }}>{getLanguageFlag(audioEdition.language)}</Text>
                  <Text style={[styles.settingSub, { color: colors.accent, fontFamily: 'Manrope_600SemiBold' }]}>
                    {audioLangName} · {audioEdition.englishName}
                  </Text>
                </View>
                <Text style={[styles.settingSub, { color: colors.textSecondary, marginTop: 2, fontSize: 11 }]}>
                  Audio edition: {audioEdition.englishName} ({audioEdition.language.toUpperCase()})
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('translations')}
                  style={[styles.settingsBrowseBtn, { backgroundColor: colors.accentDim, marginTop: 10 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Browse non-Arabic translation audio editions"
                >
                  <Text style={[styles.settingsBrowseBtnText, { color: colors.accent }]}>
                    Browse Translation Editions ({NON_ARABIC_AUDIO_EDITIONS.length}) →
                  </Text>
                </TouchableOpacity>
              </View>
              <Switch
                value={transAudioEnabled}
                onValueChange={handleToggleTranslationAudio}
                trackColor={{ false: colors.borderSubtle, true: colors.accent }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Toggle play translation audio after Arabic"
              />
            </View>

            {/* Repeat Mode Segmented */}
            <View
              style={[
                styles.repeatRowCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ width: '100%', marginBottom: 10 }}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Repeat Mode
                </Text>
                <Text style={[styles.settingSub, { color: colors.textMuted }]}>
                  {settings.repeatMode === 'none'
                    ? 'No repeat (stops at the end of queue or surah)'
                    : settings.repeatMode === 'one'
                    ? 'Repeat current track continuously (ideal for memorization)'
                    : 'Repeat all tracks in queue or loop full recitation'}
                </Text>
              </View>
              <View style={styles.repeatButtons}>
                {(['none', 'all', 'one'] as const).map((mode) => {
                  const isSelected = settings.repeatMode === mode;
                  return (
                    <TouchableOpacity
                      key={`repeat-${mode}`}
                      onPress={() => handleSetRepeatMode(mode)}
                      style={[
                        styles.repeatBtn,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.bgBase,
                          borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Set repeat mode to ${mode}`}
                    >
                      <Text
                        style={[
                          styles.repeatBtnText,
                          { color: isSelected ? colors.onAccent : colors.textSecondary },
                        ]}
                      >
                        {mode === 'none' ? 'OFF' : mode === 'all' ? 'ALL' : 'REPEAT 1'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Floating Mini Player when audio is active (tapping expands full popup player) */}
        {playback && (
          <TouchableOpacity
            style={[
              styles.floatingMiniBar,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
            onPress={() => setAudioModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open audio player"
          >
            <View style={[styles.floatingMiniIconWrap, { backgroundColor: colors.accentDim }]}>
              <Ionicons
                name={playbackStatus.isPlaying ? 'volume-medium' : 'volume-mute'}
                size={16}
                color={colors.accent}
              />
            </View>
            <View style={styles.floatingMiniInfo}>
              <View style={styles.floatingMiniTitleRow}>
                <Text style={[styles.floatingMiniTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {playback.title}
                </Text>
                {playback.segmentType && (
                  <View
                    style={[
                      styles.floatingMiniBadge,
                      {
                        backgroundColor:
                          playback.segmentType === 'arabic' ? colors.accentDim : colors.bgBase,
                        borderColor:
                          playback.segmentType === 'arabic' ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.floatingMiniBadgeText,
                        {
                          color:
                            playback.segmentType === 'arabic' ? colors.accent : colors.textSecondary,
                        },
                      ]}
                    >
                      {playback.segmentType === 'arabic' ? 'AR' : 'TR'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.floatingMiniReciter, { color: colors.textMuted }]} numberOfLines={1}>
                {playback.reciterName}
              </Text>
            </View>
            <View style={[styles.floatingMiniOpenBtn, { backgroundColor: colors.accent }]}>
              <Ionicons name="chevron-up" size={16} color={colors.onAccent} />
            </View>
          </TouchableOpacity>
        )}

        {/* Advanced Audio Player Popup Modal */}
        <AudioPlayerModal
          visible={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
        />
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 2,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 12,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  tabBar: {
    borderBottomWidth: 1,
    marginTop: 2,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    flexShrink: 0,
  },
  tabLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  tabBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  filterChipScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  reciterCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reciterMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reciterSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 6,
  },
  radioArea: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reciterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  langTagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
  },
  reciterNameCol: {
    flex: 1,
  },
  reciterName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  reciterCountry: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  reciterArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 13,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0,
    minHeight: 32,
    justifyContent: 'center',
  },
  sampleBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  skeletonCard: {
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.14)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  recentInfo: {
    flex: 1,
    marginRight: 8,
  },
  recentTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  recentSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  playCircleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistsScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  playlistSectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  presetsGrid: {
    gap: 10,
  },
  presetCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetTopRow: {
    marginBottom: 10,
  },
  presetHeaderWrap: {
    flex: 1,
  },
  presetTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginBottom: 3,
  },
  presetSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  presetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  presetCountText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  presetActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetSaveBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetPlayBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  playlistActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 32,
  },
  createBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  userPlaylistsList: {
    gap: 10,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  playlistCardMain: {
    flex: 1,
    marginRight: 8,
  },
  playlistName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  playlistItemCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  playlistRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePlaylistBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPlaylistWrap: {
    flex: 1,
  },
  playlistDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backToPlaylistsBtn: {
    paddingVertical: 6,
  },
  backToPlaylistsText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  playAllBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  playlistHeaderTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  playlistHeaderMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  playlistTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  trackNumCol: {
    width: 24,
    alignItems: 'center',
  },
  trackNumText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  trackTitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  queueNum: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueNumText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  queueMainPress: {
    flex: 1,
    marginRight: 6,
  },
  queueTitle: {
    fontSize: 14,
  },
  queuePlayingBadge: {
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  queueControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queuePlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueRemoveBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickAddText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  settingsContent: {
    padding: 16,
    gap: 14,
  },
  settingsGroupTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  settingRowCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  repeatRowCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  settingTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  settingSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  changeReciterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0,
    minHeight: 32,
    justifyContent: 'center',
  },
  changeReciterText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  repeatButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  repeatBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginTop: 10,
  },
  emptyDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdropDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    overflow: 'hidden',
    maxHeight: '92%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 18,
  },
  formLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  surahPickerScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  surahPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 5,
    gap: 8,
  },
  surahPickNum: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  surahPickName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  surahPickTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    flex: 1,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  reciterHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reciterHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  reciterHeaderSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  translationTabScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 60,
    gap: 14,
  },
  translationStatusCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  translationStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  translationStatusFlagWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translationStatusLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  translationStatusName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    marginBottom: 2,
  },
  translationStatusVoice: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  translationToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  translationDirectoryHeader: {
    marginTop: 4,
  },
  translationListWrap: {
    gap: 8,
  },
  settingsBrowseBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  settingsBrowseBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  floatingMiniBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  floatingMiniIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  floatingMiniInfo: {
    flex: 1,
    marginRight: 8,
  },
  floatingMiniTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  floatingMiniTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    flexShrink: 1,
  },
  floatingMiniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  floatingMiniBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 0.4,
  },
  floatingMiniReciter: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  floatingMiniOpenBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
