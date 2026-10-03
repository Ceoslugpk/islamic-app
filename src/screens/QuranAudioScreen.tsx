import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { NowPlayingHeroCard } from '../components/NowPlayingHeroCard';
import {
  addPlaybackStatusListener,
  addQueueListener,
  canPlayNext,
  canPlayPrevious,
  clearAudioQueue,
  CurrentPlayback,
  fetchReciters,
  getAudioQueue,
  getCurrentPlayback,
  getPlaybackStatus,
  getQueueIndex,
  getAyahAudioUrl,
  getSurahAudioUrl,
  pause,
  playAyah,
  PlaybackStatus,
  playNext,
  playPrevious,
  playQueueItem,
  playSurah,
  Reciter,
  removeQueueItem,
  resume,
  seekTo,
  setAudioQueue,
  stop,
  updateAudioSettings,
} from '../lib/quranAudio';
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

type AudioTab = 'reciters' | 'recent' | 'playlists' | 'queue' | 'settings';
type LanguageFilter =
  | 'all'
  | 'ar'
  | 'en'
  | 'ur'
  | 'zh'
  | 'fr'
  | 'ru'
  | 'tr'
  | 'fa'
  | 'other';

interface QuranAudioScreenProps {
  onBack?: () => void;
}

export default function QuranAudioScreen({ onBack }: QuranAudioScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const isCompact = width <= 350;

  const [activeTab, setActiveTab] = useState<AudioTab>('reciters');

  // Reciters
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<LanguageFilter>('all');
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>('ar.alafasy');

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

  const handleStop = async () => {
    await stop(true);
  };

  const handleSeek = (positionMillis: number) => {
    seekTo(positionMillis);
  };

  const handleNext = async () => {
    await playNext();
  };

  const handlePrevious = async () => {
    await playPrevious();
  };

  const handleCycleRepeat = () => {
    const modes: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one'];
    const curIdx = modes.indexOf(settings.repeatMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    const updated = updateAudioSettings({ repeatMode: nextMode });
    setSettings(updated);
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

  // Filter Reciters with memo
  const filteredReciters = useMemo(() => {
    const query = reciterSearch.trim().toLowerCase();
    return reciters.filter((r) => {
      const langMatch =
        selectedLang === 'all' ||
        (selectedLang === 'other'
          ? !['ar', 'en', 'ur', 'zh', 'fr', 'ru', 'tr', 'fa'].includes(r.language)
          : r.language === selectedLang);

      if (!langMatch) return false;
      if (!query) return true;

      return (
        r.englishName.toLowerCase().includes(query) ||
        r.name.includes(query) ||
        r.identifier.toLowerCase().includes(query) ||
        r.language.toLowerCase().includes(query)
      );
    });
  }, [reciters, selectedLang, reciterSearch]);

  const tabsConfig = [
    { key: 'reciters', label: 'Reciters', icon: 'people-outline' },
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to Quran"
              onPress={onBack}
              style={styles.backBtn}
            >
              <Text style={[styles.backText, { color: colors.accent }]}>← Quran</Text>
            </TouchableOpacity>
          )}
          <SectionHeader eyebrow="Audio Center" title="Quran Audio" />
        </View>

        {/* Hero Now Playing Card (Single Source of Truth) */}
        <NowPlayingHeroCard
          playback={playback}
          status={playbackStatus}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSeek={handleSeek}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canNext={canPlayNext()}
          canPrevious={canPlayPrevious()}
          repeatMode={settings.repeatMode}
          onCycleRepeat={handleCycleRepeat}
          queueCount={queue.length}
          currentQueueIndex={queueIndex}
          onResumeRecent={handleResumeRecent}
          recentTitle={recentList[0]?.title}
        />

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
                          { color: isTabActive ? '#121110' : colors.textSecondary },
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
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading reciters & audio data...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity
              onPress={loadAllData}
              style={[styles.retryBtn, { borderColor: colors.accent }]}
            >
              <Text style={[styles.retryBtnText, { color: colors.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
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

            {/* Language Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipScroll}
            >
              {(
                [
                  { key: 'all', label: 'All Reciters' },
                  { key: 'ar', label: 'Arabic (العربية)' },
                  { key: 'en', label: 'English' },
                  { key: 'ur', label: 'Urdu (اردو)' },
                  { key: 'zh', label: 'Chinese (中文)' },
                  { key: 'fr', label: 'French (Français)' },
                  { key: 'ru', label: 'Russian (Русский)' },
                  { key: 'tr', label: 'Turkish (Türkçe)' },
                  { key: 'fa', label: 'Persian (فارسی)' },
                  { key: 'other', label: 'More (kk, uz, az, bs)' },
                ] as const
              ).map((chip) => {
                const isSelected = selectedLang === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    onPress={() => setSelectedLang(chip.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? '#121110' : colors.textSecondary },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FlatList
              data={filteredReciters}
              keyExtractor={(item) => item.identifier}
              contentContainerStyle={styles.listContent}
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={7}
              renderItem={({ item }) => {
                const isSelected = item.identifier === selectedIdentifier;
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
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.reciterMain}>
                      <TouchableOpacity
                        onPress={() => handleSelectDefaultReciter(item.identifier)}
                        style={styles.reciterSelectArea}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${item.englishName} as default reciter`}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            { borderColor: isSelected ? colors.accent : colors.borderSubtle },
                          ]}
                        >
                          {isSelected && (
                            <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                          )}
                        </View>
                        <View style={styles.reciterNameCol}>
                          <View style={styles.reciterTitleRow}>
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
                                  backgroundColor: item.language === 'ar' ? colors.bgBase : colors.accentDim,
                                  borderColor: item.language === 'ar' ? colors.borderSubtle : colors.accent,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.langTagText,
                                  { color: item.language === 'ar' ? colors.textMuted : colors.accent },
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
                          color={isSamplingThis ? '#121110' : colors.accent}
                        />
                        <Text
                          style={[
                            styles.sampleBtnText,
                            { color: isSamplingThis ? '#121110' : colors.accent },
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
                        color={isItemPlaying ? '#121110' : colors.accent}
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
                    <Ionicons name="play" size={14} color="#121110" />
                    <Text style={styles.playAllBtnText}>Play All</Text>
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
                      <Ionicons name="play-circle-outline" size={20} color={colors.accent} />
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
                                name={isSaved ? 'bookmark' : 'bookmark-outline'}
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
                              <Ionicons name="play" size={13} color="#121110" />
                              <Text style={styles.presetPlayBtnText}>Play</Text>
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
                    <Ionicons name="add" size={16} color="#121110" />
                    <Text style={styles.createBtnText}>New</Text>
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
            >
              <View style={styles.modalBackdrop}>
                <View
                  style={[
                    styles.modalBox,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
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
                          color={isPlayingThis ? '#121110' : colors.accent}
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
                          { color: isSelected ? '#121110' : colors.textSecondary },
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
    paddingTop: 16,
    paddingBottom: 4,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  tabBar: {
    borderBottomWidth: 1,
    marginTop: 4,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    flexShrink: 0,
  },
  tabLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
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
  reciterNameCol: {
    flex: 1,
  },
  reciterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reciterName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    flexShrink: 1,
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 10,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
    color: '#121110',
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
    color: '#121110',
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
    color: '#121110',
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
    width: 22,
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
    width: 28,
    height: 28,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
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
    color: '#121110',
  },
});
