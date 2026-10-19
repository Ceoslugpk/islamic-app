import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../lib/theme';
import { useThemeTokens } from '../theme/tokens';
import { useHaptics } from '../lib/haptics';
import { iconSizes } from '../lib/iconMap';
import { getCardShadow, getFloatingCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { TAB_PAD_BOTTOM, NAV_BOTTOM, NAV_HEIGHT } from '../components/layout/layout.constants';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { AudioPlayerModal } from '../components/AudioPlayerModal';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { t } from '../lib/i18n';
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
} from '../lib/quranAudio';
import { useSettings } from '../lib/settings';
import { checkNotificationPermission, requestNotificationPermission } from '../lib/notifications';
import { getLanguageFlag, getLocalizedTranslatorName, getLocalizedTranslationTitle } from '../lib/quranLanguages';
import { getLocalizedLanguageName } from '../lib/surahNamesLocalized';
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
} from '../lib/db';
import { fetchSurahList, SurahMeta } from '../lib/quran';
import { PRESET_PLAYLISTS, PresetPlaylist } from '../lib/audioPlaylists';
import { hScrollRTLStyle } from '../lib/rtl';

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

function QuranAudioScreen({ onBack }: QuranAudioScreenProps) {
  const { colors } = useTheme();
  const { tokens, mode } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { haptic } = useHaptics();
  const { saveUndoState } = useUndoToast();

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
  const transAudioEnabled = appSettings.translationAudioEnabled;

  // Media notification permission status
  const [mediaNotifStatus, setMediaNotifStatus] = useState<'granted' | 'denied' | 'undetermined'>('granted');

  useEffect(() => {
    checkNotificationPermission().then(setMediaNotifStatus).catch(() => {});
  }, [activeTab]);

  // Android hardware back: close modals or return from selected playlist before exiting Audio Center
  useEffect(() => {
    if (!audioModalOpen && !newPlaylistModalOpen && !selectedPlaylist) return;
    const onBackPress = () => {
      if (audioModalOpen) {
        setAudioModalOpen(false);
        return true;
      }
      if (newPlaylistModalOpen) {
        setNewPlaylistModalOpen(false);
        return true;
      }
      if (selectedPlaylist) {
        setSelectedPlaylist(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [audioModalOpen, newPlaylistModalOpen, selectedPlaylist]);

  const handleToggleTranslationAudio = (val: boolean) => {
    setAudioTranslationEnabled(val);
    setGlobalTranslationAudio(val);
  };

  const handleRetry = useCallback(async () => {
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
      setError(t('Could not load reciters. Please check your connection.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchReciters(),
      fetchSurahList().catch(() => [] as SurahMeta[]),
    ])
      .then(([reciterList, surahList]) => {
        if (!active) return;
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

        const savedIds = new Set(
          loadedPls
            .map((p) => {
              const match = p.id.match(/^pl-preset-(.+)/);
              return match ? match[1] : null;
            })
            .filter(Boolean) as string[]
        );
        setSavedPresetIds(savedIds);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(t('Could not load reciters. Please check your connection.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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

  const handleSavePreset = useCallback((preset: PresetPlaylist) => {
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
  }, []);

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
    const target = playlists.find((p) => p.id === id);
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
    if (!target) return;
    saveUndoState({
      id,
      action: t('Playlist deleted'),
      revert: () => {
        savePlaylist(target);
        setPlaylists(loadPlaylists());
        if (match) {
          setSavedPresetIds((prev) => new Set([...prev, match[1]]));
        }
      },
    });
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
    { key: 'reciters', label: t('Reciters'), icon: 'people-outline' },
    { key: 'translations', label: t('Translation Audio'), icon: 'language-outline' },
    { key: 'recent', label: t('Recent'), icon: 'time-outline' },
    { key: 'playlists', label: t('Playlists'), icon: 'list-outline' },
    {
      key: 'queue',
      label: t('Queue'),
      icon: 'play-forward-outline',
      badge: queue.length > 0 ? String(queue.length) : undefined,
    },
    { key: 'settings', label: t('Settings'), icon: 'settings-outline' },
  ] as const;

  const bottomClearance = playback
    ? NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 68 + 16
    : TAB_PAD_BOTTOM(insets.bottom);

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      customPadBottom={bottomClearance}
      header={
        <SubHeader
          eyebrow={t('Audio Center')}
          title={t('Quran Audio')}
          subtitle={t('Recitations, audio translations, playlists & player settings')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
        />
      }
    >
      <View style={styles.contentWrap}>

        {/* Sub-navigation Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: tokens.cardBorder }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.tabScroll, hScrollRTLStyle()]}
          >
            {tabsConfig.map((tItem) => {
              const isTabActive = activeTab === tItem.key;
              return (
                <TouchableOpacity
                  key={tItem.key}
                  onPress={() => setActiveTab(tItem.key)}
                  style={[
                    styles.tabItem,
                    {
                      borderBottomColor: isTabActive ? tokens.accent : 'transparent',
                    },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isTabActive }}
                >
                  <Ionicons
                    name={tItem.icon as any}
                    size={15}
                    color={isTabActive ? tokens.accent : tokens.muted}
                  />
                  <AppText
                    variant="caption"
                    highlight={isTabActive}
                    tone={!isTabActive ? 'faint' : undefined}
                    style={styles.tabLabel}
                  >
                    {tItem.label}
                  </AppText>
                  {'badge' in tItem && tItem.badge && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isTabActive ? tokens.gold : tokens.ringFill,
                        },
                      ]}
                    >
                      <AppText
                        variant="numeral"
                        tone={isTabActive ? 'onGold' : 'faint'}
                        style={styles.tabBadgeText}
                      >
                        {tItem.badge}
                      </AppText>
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
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomClearance }]}
          />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t("Couldn't load reciters")}
            subtitle={error}
            actionLabel={t('Retry')}
            onAction={handleRetry}
          />
        ) : activeTab === 'reciters' ? (
          /* Reciters Tab */
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View
              style={[
                styles.searchBar,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                placeholder={t('Search by reciter name or style...')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('Search by reciter name or style...')}
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
              <AppText variant="rowTitle" style={styles.reciterHeaderTitle}>
                {t('Arabic Reciters')} ({filteredReciters.length})
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.reciterHeaderSub}>
                {t('Select default reciter or tap Sample')}
              </AppText>
            </View>

            <FlatList
              data={filteredReciters}
              keyExtractor={(item) => item.identifier}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomClearance }]}
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
                      getCardShadow(mode),
                      {
                        backgroundColor: isSelected ? tokens.ringFill : tokens.cardTop,
                        borderColor: isSelected ? tokens.accent : tokens.cardBorder,
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
                            <Ionicons name="checkmark-circle" size={20} color={tokens.accent} />
                          ) : (
                            <Ionicons name="ellipse-outline" size={20} color={tokens.cardBorder} />
                          )}
                        </View>
                        <View style={styles.reciterNameCol}>
                          <AppText
                            variant="rowTitle"
                            highlight={isSelected}
                            style={styles.reciterName}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {item.englishName}
                          </AppText>
                          {country ? (
                            <AppText variant="caption" tone="faint" style={styles.reciterCountry}>
                              {country}
                            </AppText>
                          ) : null}
                          {item.name ? (
                            <AppText
                              variant="body"
                              tone="faint"
                              style={styles.reciterArabic}
                              numberOfLines={1}
                            >
                              {item.name}
                            </AppText>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePlayReciterSample(item)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={[
                          styles.sampleBtn,
                          {
                            backgroundColor: isSamplingThis ? tokens.gold : tokens.ringFill,
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
                          color={isSamplingThis ? tokens.onGold : tokens.goldText}
                        />
                        <AppText
                          variant="caption"
                          tone={isSamplingThis ? 'onGold' : undefined}
                          highlight={!isSamplingThis}
                          style={styles.sampleBtnText}
                        >
                          {isSamplingThis ? t('Playing') : t('Sample')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        ) : activeTab === 'translations' ? (
          /* Translation Audio Tab (Non-Arabic editions - strictly separate) */
          <ScrollView contentContainerStyle={[styles.translationTabScroll, { paddingBottom: bottomClearance }]}>
            {/* Active Translation Status Card */}
            <View
              style={[
                styles.translationStatusCard,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <View style={styles.translationStatusHeader}>
                <View style={[styles.translationStatusFlagWrap, { backgroundColor: tokens.ringFill }]}>
                  <AppText style={{ fontSize: 24 }}>{getLanguageFlag(audioLanguage)}</AppText>
                </View>
                <View style={{ flex: 1, marginStart: 12 }}>
                  <AppText variant="eyebrow" tone="faint" style={styles.translationStatusLabel}>
                    {t('ACTIVE TRANSLATION AUDIO')}
                  </AppText>
                  <AppText variant="sectionTitle" style={styles.translationStatusName}>
                    {audioLangName} ({audioLanguage.toUpperCase()})
                  </AppText>
                  <AppText variant="caption" highlight style={styles.translationStatusVoice}>
                    {t('Voice')}: {getLocalizedTranslatorName(audioEdition.identifier, audioEdition.englishName || audioEdition.name)}
                  </AppText>
                </View>
              </View>

              <View style={[styles.translationToggleRow, { borderTopColor: tokens.cardBorder }]}>
                <View style={{ flex: 1, marginEnd: 12 }}>
                  <AppText variant="rowTitle" style={styles.settingTitle}>
                    {t('Play translation after Arabic')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.settingSub}>
                    {t('Sequentially play translated audio after each Arabic ayah')}
                  </AppText>
                </View>
                <Switch
                  value={transAudioEnabled}
                  onValueChange={handleToggleTranslationAudio}
                  trackColor={{ false: tokens.cardBorder, true: tokens.gold }}
                  thumbColor={tokens.cardTop}
                  accessibilityLabel={t('Toggle play translation audio after Arabic')}
                />
              </View>
            </View>

            {/* Translation Audio Editions Directory */}
            <View style={styles.translationDirectoryHeader}>
              <AppText variant="sectionTitle" style={styles.sectionTitle}>
                {t('Verified Non-Arabic Recitations')}
              </AppText>
              <AppText variant="subtitle" tone="faint" style={styles.sectionSubtitle}>
                {t('13 verse-by-verse translation editions across 11 languages')}
              </AppText>
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
                      getCardShadow(mode),
                      {
                        backgroundColor: isSelectedEdition ? tokens.ringFill : tokens.cardTop,
                        borderColor: isSelectedEdition ? tokens.accent : tokens.cardBorder,
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
                              borderColor: isSelectedEdition ? tokens.gold : tokens.cardBorder,
                            },
                          ]}
                        >
                          {isSelectedEdition && (
                            <View style={[styles.radioDot, { backgroundColor: tokens.gold }]} />
                          )}
                        </View>
                        <View style={styles.reciterNameCol}>
                          <View style={styles.reciterTitleRow}>
                            <AppText style={{ fontSize: 16, marginEnd: 4 }}>{flagEmoji}</AppText>
                            <AppText
                              variant="rowTitle"
                              style={styles.reciterName}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {getLocalizedTranslationTitle(item.identifier, item.englishName)}
                            </AppText>
                            <View
                              style={[
                                styles.langTag,
                                {
                                  backgroundColor: isSelectedEdition ? tokens.gold : tokens.ringFill,
                                  borderColor: isSelectedEdition ? tokens.gold : tokens.ringBorder,
                                },
                              ]}
                            >
                              <AppText
                                variant="numeral"
                                tone={isSelectedEdition ? 'onGold' : undefined}
                                highlight={!isSelectedEdition}
                                style={styles.langTagText}
                              >
                                {item.language.toUpperCase()}
                              </AppText>
                            </View>
                          </View>
                          {item.name ? (
                            <AppText
                              variant="caption"
                              tone="faint"
                              style={styles.reciterArabic}
                              numberOfLines={1}
                            >
                              {getLocalizedTranslatorName(item.identifier, item.name)}
                            </AppText>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePlayReciterSample(item)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={[
                          styles.sampleBtn,
                          {
                            backgroundColor: isSamplingThis ? tokens.gold : tokens.ringFill,
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
                          color={isSamplingThis ? tokens.onGold : tokens.goldText}
                        />
                        <AppText
                          variant="caption"
                          tone={isSamplingThis ? 'onGold' : undefined}
                          highlight={!isSamplingThis}
                          style={styles.sampleBtnText}
                        >
                          {isSamplingThis ? t('Playing') : t('Sample')}
                        </AppText>
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
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomClearance }]}
              ListEmptyComponent={
                <EmptyState
                  icon="musical-notes-outline"
                  title={t('No recent audio')}
                  subtitle={t('Audio you play in the Quran reader or here will appear in this list.')}
                  actionLabel={t('Open the Quran')}
                  onAction={onBack}
                />
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
                      getCardShadow(mode),
                      {
                        backgroundColor: tokens.cardTop,
                        borderColor: isItemPlaying ? tokens.accent : tokens.cardBorder,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${item.title} by ${item.reciterName}`}
                  >
                    <View style={styles.recentInfo}>
                      <AppText
                        variant="rowTitle"
                        style={styles.recentTitle}
                        numberOfLines={2}
                      >
                        {item.title}
                      </AppText>
                      <AppText
                        variant="caption"
                        tone="faint"
                        style={styles.recentSub}
                        numberOfLines={2}
                      >
                        {item.reciterName} · {item.type.toUpperCase()}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.playCircleIcon,
                        {
                          backgroundColor: isItemPlaying ? tokens.gold : tokens.ringFill,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isItemPlaying ? 'pause' : 'play'}
                        size={16}
                        color={isItemPlaying ? tokens.onGold : tokens.goldText}
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
                    accessibilityLabel={t('Back to all playlists')}
                  >
                    <AppText variant="link" highlight style={styles.backToPlaylistsText}>
                      ← {t('All Playlists')}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePlayPlaylistItem(selectedPlaylist.items[0], selectedPlaylist, 0)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{ borderRadius: 18, overflow: 'hidden' }}
                    accessibilityRole="button"
                    accessibilityLabel={`Play all ${selectedPlaylist.items.length} tracks`}
                  >
                    <LinearGradient
                      colors={tokens.goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.playAllBtn}
                    >
                      <Ionicons name="play" size={14} color={tokens.onGold} />
                      <AppText variant="caption" tone="onGold" style={styles.playAllBtnText}>{t('Play All')}</AppText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <AppText variant="screenTitle" style={styles.playlistHeaderTitle}>
                  {selectedPlaylist.name}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.playlistHeaderMeta}>
                  {selectedPlaylist.items.length}{' '}
                  {selectedPlaylist.items.length === 1 ? t('track') : t('tracks')}
                </AppText>

                <FlatList
                  data={selectedPlaylist.items}
                  keyExtractor={(_, i) => String(i)}
                  contentContainerStyle={[styles.listContent, { paddingBottom: bottomClearance }]}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      onPress={() => handlePlayPlaylistItem(item, selectedPlaylist, index)}
                      style={[
                        styles.playlistTrackRow,
                        getCardShadow(mode),
                        {
                          backgroundColor: tokens.cardTop,
                          borderColor: tokens.cardBorder,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Play track ${index + 1}: ${item.title}`}
                    >
                      <View style={styles.trackNumCol}>
                        <AppText variant="numeral" tone="faint" style={styles.trackNumText}>
                          {index + 1}
                        </AppText>
                      </View>
                      <AppText variant="rowTitle" style={styles.trackTitle} numberOfLines={2}>
                        {item.title}
                      </AppText>
                      <Ionicons name="play-circle-outline" size={iconSizes.action} color={tokens.accent} />
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              <ScrollView contentContainerStyle={[styles.playlistsScrollContent, { paddingBottom: bottomClearance }]}>
                {/* Section 1: Curated Presets */}
                <View style={styles.playlistSectionHeaderRow}>
                  <AppText variant="sectionTitle" style={styles.sectionTitle}>
                    {t('Curated Presets')}
                  </AppText>
                  <AppText variant="subtitle" tone="faint" style={styles.sectionSubtitle}>
                    {t('Ready-to-listen devotional sets')}
                  </AppText>
                </View>

                <View style={styles.presetsGrid}>
                  {PRESET_PLAYLISTS.map((preset) => {
                    const isSaved = savedPresetIds.has(preset.id);
                    return (
                      <View
                        key={preset.id}
                        style={[
                          styles.presetCard,
                          getCardShadow(mode),
                          {
                            backgroundColor: tokens.cardTop,
                            borderColor: tokens.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.presetTopRow}>
                          <View style={styles.presetHeaderWrap}>
                            <AppText
                              variant="rowTitle"
                              style={styles.presetTitle}
                              numberOfLines={2}
                            >
                              {preset.title}
                            </AppText>
                            <AppText
                              variant="caption"
                              tone="faint"
                              style={styles.presetSubtitle}
                              numberOfLines={2}
                            >
                              {preset.subtitle}
                            </AppText>
                          </View>
                        </View>

                        <View style={styles.presetFooterRow}>
                          <View style={styles.presetCountBadge}>
                            <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
                            <AppText
                              variant="caption"
                              tone="faint"
                              style={styles.presetCountText}
                            >
                              {preset.items.length} {t('verses')}
                            </AppText>
                          </View>

                          <View style={styles.presetActionButtons}>
                            <TouchableOpacity
                              onPress={() => handleSavePreset(preset)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              style={[
                                styles.presetSaveBtn,
                                {
                                  borderColor: isSaved ? tokens.accent : tokens.cardBorder,
                                  backgroundColor: isSaved ? tokens.ringFill : 'transparent',
                                },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={isSaved ? t('Saved to playlists') : t('Save preset')}
                            >
                              <Ionicons
                                name={isSaved ? 'checkmark' : 'bookmark-outline'}
                                size={14}
                                color={isSaved ? tokens.accent : colors.textMuted}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handlePlayPreset(preset)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              style={{ borderRadius: 18, overflow: 'hidden' }}
                              accessibilityRole="button"
                              accessibilityLabel={`Play preset: ${preset.title}`}
                            >
                              <LinearGradient
                                colors={tokens.goldGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.presetPlayBtn}
                              >
                                <Ionicons name="play" size={14} color={tokens.onGold} />
                                <AppText variant="caption" tone="onGold" style={styles.presetPlayBtnText}>{t('Play')}</AppText>
                              </LinearGradient>
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
                    <AppText variant="sectionTitle" style={styles.sectionTitle}>
                      {t('Your Playlists')}
                    </AppText>
                    <AppText variant="subtitle" tone="faint" style={styles.sectionSubtitle}>
                      {t('Custom compilations & saved sets')}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setNewPlaylistModalOpen(true)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{ borderRadius: 18, overflow: 'hidden' }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Create a new playlist')}
                  >
                    <LinearGradient
                      colors={tokens.goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.createBtn}
                    >
                      <Ionicons name="add" size={16} color={tokens.onGold} />
                      <AppText variant="caption" tone="onGold" style={styles.createBtnText}>{t('New')}</AppText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {playlists.length === 0 ? (
                  <EmptyState
                    icon="albums-outline"
                    title={t('No playlists yet')}
                    subtitle={t('Create a playlist of your favorite surahs, or save one of the curated presets above.')}
                    actionLabel={t('Create playlist')}
                    onAction={() => setNewPlaylistModalOpen(true)}
                  />
                ) : (
                  <View style={styles.userPlaylistsList}>
                    {playlists.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.playlistCard,
                          getCardShadow(mode),
                          {
                            backgroundColor: tokens.cardTop,
                            borderColor: tokens.cardBorder,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => setSelectedPlaylist(item)}
                          style={styles.playlistCardMain}
                          accessibilityRole="button"
                          accessibilityLabel={`Open playlist ${item.name}`}
                        >
                          <AppText variant="rowTitle" style={styles.playlistName}>
                            {item.name}
                          </AppText>
                          <AppText variant="caption" tone="faint" style={styles.playlistItemCount}>
                            {item.items.length} {item.items.length === 1 ? t('track') : t('tracks')}
                          </AppText>
                        </TouchableOpacity>

                        <View style={styles.playlistRightControls}>
                          <TouchableOpacity
                            onPress={() => handlePlayPlaylistItem(item.items[0], item, 0)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={[styles.smallPlayBtn, { backgroundColor: tokens.ringFill }]}
                            accessibilityRole="button"
                            accessibilityLabel={`Play playlist ${item.name}`}
                          >
                            <Ionicons name="play" size={14} color={tokens.accent} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeletePlaylist(item.id)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                    getFloatingCardShadow(mode),
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <View style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]} />
                  <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
                    <AppText variant="title" style={styles.modalTitle}>
                      {t('New Playlist')}
                    </AppText>
                    <TouchableOpacity
                      onPress={() => setNewPlaylistModalOpen(false)}
                      style={styles.modalCloseBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('Close create playlist modal')}
                    >
                      <Ionicons name="close" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ width: '100%' }}
                  >
                    <View style={styles.modalBody}>
                      <AppText variant="rowTitle" tone="faint" style={styles.formLabel}>
                        {t('Playlist Name')}
                      </AppText>
                      <TextInput
                        placeholder={t('e.g. Daily Fajr, Heart Healing, Sleep')}
                        placeholderTextColor={colors.textMuted}
                        accessibilityLabel={t('Playlist Name')}
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

                    <AppText variant="rowTitle" tone="faint" style={[styles.formLabel, { marginTop: 12 }]}>
                      {t('Select First Surah')}
                    </AppText>
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
                            <AppText variant="numeral" highlight style={styles.surahPickNum}>
                              {s.number}.
                            </AppText>
                            <AppText variant="rowTitle" style={styles.surahPickName}>
                              {s.englishName}
                            </AppText>
                            <AppText
                              variant="caption"
                              tone="faint"
                              style={styles.surahPickTrans}
                              numberOfLines={1}
                            >
                              ({s.englishNameTranslation})
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.modalActionButtons}>
                      <TouchableOpacity
                        onPress={() => setNewPlaylistModalOpen(false)}
                        style={[styles.modalCancelBtn, { borderColor: colors.borderSubtle }]}
                      >
                        <AppText variant="caption" tone="faint" style={styles.modalCancelText}>
                          {t('Cancel')}
                        </AppText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleCreatePlaylist}
                        style={[styles.modalSubmitBtn, { overflow: 'hidden' }]}
                      >
                        <LinearGradient
                          colors={tokens.goldGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <AppText variant="caption" tone="onGold" style={styles.modalSubmitText}>
                          {t('Create Playlist')}
                        </AppText>
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
                <AppText variant="sectionTitle" style={styles.sectionTitle}>
                  {t('Playback Queue')} ({queue.length})
                </AppText>
                <AppText variant="subtitle" tone="faint" style={styles.sectionSubtitle}>
                  {queue.length > 0
                    ? queueIndex >= 0
                      ? `${t('Playing track')} ${queueIndex + 1} ${t('of')} ${queue.length}`
                      : t('Tracks will play in order')
                    : t('Add Surahs to queue for uninterrupted recitation')}
                </AppText>
              </View>
              {queue.length > 0 && (
                <TouchableOpacity onPress={handleClearQueue} style={styles.clearBtn}>
                  <AppText variant="caption" highlight style={styles.clearBtnText}>{t('Clear')}</AppText>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={queue}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={[styles.listContent, { paddingBottom: bottomClearance }]}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="play-skip-forward-outline" size={40} color={colors.textMuted} />
                  <AppText variant="rowTitle" style={styles.emptyTitle}>
                    {t('Queue is empty')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.emptyDesc}>
                    {t('Tap below to quickly queue popular Surahs for sequential recitation.')}
                  </AppText>
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
                          getPillShadow(mode),
                          {
                            backgroundColor: tokens.cardTop,
                            borderColor: tokens.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons name="add" size={14} color={colors.accent} />
                        <AppText variant="caption" style={styles.quickAddText}>
                          {item.name}
                        </AppText>
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
                      getCardShadow(mode),
                      {
                        backgroundColor: tokens.cardTop,
                        borderColor: isCurrentQueueItem ? tokens.accent : tokens.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.queueNum}>
                      {isPlayingThis ? (
                        <Ionicons name="volume-high" size={16} color={colors.accent} />
                      ) : (
                        <AppText
                          variant="numeral"
                          highlight={isCurrentQueueItem}
                          tone={!isCurrentQueueItem ? 'faint' : undefined}
                          style={styles.queueNumText}
                        >
                          {index + 1}
                        </AppText>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.queueMainPress}
                      onPress={() => handlePlayQueueIndex(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Play track ${index + 1}: ${item.title}`}
                      activeOpacity={0.7}
                    >
                      <AppText
                        variant="rowTitle"
                        highlight={isCurrentQueueItem}
                        style={[
                          styles.queueTitle,
                          {
                            fontFamily: isCurrentQueueItem
                              ? 'Manrope_600SemiBold'
                              : 'Manrope_500Medium',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </AppText>
                      {isCurrentQueueItem && (
                        <AppText variant="eyebrow" highlight style={styles.queuePlayingBadge}>
                          {isPlayingThis ? t('NOW PLAYING') : t('PAUSED')}
                        </AppText>
                      )}
                    </TouchableOpacity>

                    <View style={styles.queueControls}>
                      <TouchableOpacity
                        onPress={() => handlePlayQueueIndex(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
          <ScrollView contentContainerStyle={[styles.settingsContent, { paddingBottom: bottomClearance }]}>
            <AppText variant="eyebrow" highlight style={styles.settingsGroupTitle}>
              {t('RECITER & PLAYBACK PREFERENCES')}
            </AppText>

            {/* Default Reciter Card */}
            <View
              style={[
                styles.settingRowCard,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0, marginEnd: 12 }}>
                <AppText variant="rowTitle" style={styles.settingTitle}>
                  {t('Default Reciter')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.settingSub} numberOfLines={2}>
                  {currentReciterName}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab('reciters')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.changeReciterBtn, { backgroundColor: colors.accentDim }]}
                accessibilityRole="button"
                accessibilityLabel={t('Change default reciter')}
              >
                <AppText variant="caption" highlight style={styles.changeReciterText}>{t('Change')}</AppText>
              </TouchableOpacity>
            </View>

            {/* Autoplay Next Toggle */}
            <View
              style={[
                styles.settingRowCard,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <View style={{ flex: 1, marginEnd: 12 }}>
                <AppText variant="rowTitle" style={styles.settingTitle}>
                  {t('Autoplay Next')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.settingSub}>
                  {t('Automatically advance to next Ayah or queued Surah when track finishes')}
                </AppText>
              </View>
              <Switch
                value={settings.autoplayNext}
                onValueChange={handleToggleAutoplay}
                trackColor={{ false: colors.borderSubtle, true: tokens.gold }}
                thumbColor={tokens.cardTop}
                accessibilityLabel={t('Toggle autoplay next track')}
              />
            </View>

            {/* Play Translation After Arabic Toggle */}
            <View
              style={[
                styles.settingRowCard,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <View style={{ flex: 1, marginEnd: 12 }}>
                <AppText variant="rowTitle" style={styles.settingTitle}>
                  {t('Play translation after Arabic')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.settingSub}>
                  {t('Plays the same ayah in the selected translation language after the Arabic recitation')}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                  <AppText style={{ fontSize: 13 }}>{getLanguageFlag(audioEdition.language)}</AppText>
                  <AppText variant="caption" highlight style={[styles.settingSub, { fontFamily: 'Manrope_600SemiBold' }]}>
                    {getLocalizedLanguageName(audioLangName)} · {getLocalizedTranslatorName(audioEdition.identifier, audioEdition.englishName)}
                  </AppText>
                </View>
                <AppText variant="caption" tone="faint" style={[styles.settingSub, { marginTop: 2, fontSize: 11 }]}>
                  {t('Audio edition')}: {getLocalizedTranslationTitle(audioEdition.identifier, audioEdition.englishName)} ({audioEdition.language.toUpperCase()})
                </AppText>
                <TouchableOpacity
                  onPress={() => setActiveTab('translations')}
                  style={[styles.settingsBrowseBtn, { backgroundColor: tokens.ringFill, marginTop: 10 }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Browse non-Arabic translation audio editions')}
                >
                  <AppText variant="caption" highlight style={styles.settingsBrowseBtnText}>
                    {t('Browse Translation Editions')} ({NON_ARABIC_AUDIO_EDITIONS.length}) →
                  </AppText>
                </TouchableOpacity>
              </View>
              <Switch
                value={transAudioEnabled}
                onValueChange={handleToggleTranslationAudio}
                trackColor={{ false: colors.borderSubtle, true: tokens.gold }}
                thumbColor={tokens.cardTop}
                accessibilityLabel={t('Toggle play translation audio after Arabic')}
              />
            </View>

            {/* Repeat Mode Segmented */}
            <View
              style={[
                styles.repeatRowCard,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <View style={{ width: '100%', marginBottom: 10 }}>
                <AppText variant="rowTitle" style={styles.settingTitle}>
                  {t('Repeat Mode')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.settingSub}>
                  {settings.repeatMode === 'none'
                    ? t('No repeat (stops at the end of queue or surah)')
                    : settings.repeatMode === 'one'
                    ? t('Repeat current track continuously (ideal for memorization)')
                    : t('Repeat all tracks in queue or loop full recitation')}
                </AppText>
              </View>
              <View style={styles.repeatButtons}>
                {(['none', 'all', 'one'] as const).map((rMode) => {
                  const isSelected = settings.repeatMode === rMode;
                  return (
                    <TouchableOpacity
                      key={`repeat-${rMode}`}
                      onPress={() => handleSetRepeatMode(rMode)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={[
                        styles.repeatBtn,
                        getPillShadow(mode),
                        {
                          backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                          borderColor: isSelected ? tokens.gold : tokens.cardBorder,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Set repeat mode to ${rMode}`}
                    >
                      <AppText
                        variant="eyebrow"
                        tone={isSelected ? 'onGold' : 'faint'}
                        style={styles.repeatBtnText}
                      >
                        {rMode === 'none' ? t('OFF') : rMode === 'all' ? t('ALL') : t('REPEAT 1')}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Lock Screen & Notification Controls */}
            <View
              style={[
                styles.settingRowCard,
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <View style={{ flex: 1, marginEnd: 12 }}>
                <AppText variant="rowTitle" style={styles.settingTitle}>
                  {t('Lock Screen & Notification Controls')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.settingSub}>
                  {mediaNotifStatus === 'granted'
                    ? t('Active — media controls appear on your lock screen and notification shade')
                    : t('Show media playback controls on your lock screen and notification shade while playing')}
                </AppText>
              </View>
              {mediaNotifStatus === 'granted' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                  <AppText variant="caption" highlight style={[styles.settingSub, { fontFamily: 'Manrope_600SemiBold' }]}>
                    {t('Enabled')}
                  </AppText>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    if (Platform.OS === 'android' && mediaNotifStatus === 'undetermined') {
                      const granted = await requestNotificationPermission();
                      setMediaNotifStatus(granted ? 'granted' : 'denied');
                    } else {
                      Linking.openSettings().catch(() => {});
                    }
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[styles.changeReciterBtn, { backgroundColor: colors.accentDim }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Enable notification controls in settings')}
                >
                  <AppText variant="caption" highlight style={styles.changeReciterText}>
                    {mediaNotifStatus === 'undetermined' ? t('Enable') : t('Settings')}
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}

        {/* Floating Mini Player when audio is active (tapping expands full popup player) */}
        {playback && (
          <TouchableOpacity
            style={[
              styles.floatingMiniBar,
              getFloatingCardShadow(mode),
              {
                bottom: NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 10,
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
            onPress={() => setAudioModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Open audio player')}
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
                <AppText variant="rowTitle" style={styles.floatingMiniTitle} numberOfLines={1}>
                  {playback.title}
                </AppText>
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
                    <AppText
                      variant="eyebrow"
                      highlight={playback.segmentType === 'arabic'}
                      tone={playback.segmentType !== 'arabic' ? 'faint' : undefined}
                      style={styles.floatingMiniBadgeText}
                    >
                      {playback.segmentType === 'arabic' ? 'AR' : 'TR'}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="caption" tone="faint" style={styles.floatingMiniReciter} numberOfLines={1}>
                {playback.reciterName}
              </AppText>
            </View>
            <View style={[styles.floatingMiniOpenBtn, { overflow: 'hidden' }]}>
              <LinearGradient
                colors={tokens.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="chevron-up" size={16} color={tokens.onGold} />
            </View>
          </TouchableOpacity>
        )}

        {/* Advanced Audio Player Popup Modal */}
        <AudioPlayerModal
          visible={audioModalOpen}
          onClose={() => setAudioModalOpen(false)}
        />
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 2,
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
    minHeight: 44,
  },
  tabLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 12,
    marginStart: 2,
  },
  tabBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  tabContent: {
    flex: 1,
    minWidth: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: 22,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 0,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
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
    paddingBottom: 16,
  },
  reciterCard: {
    padding: 12,
    borderRadius: 18,
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
    minWidth: 0,
    marginEnd: 6,
    minHeight: 44,
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
    minWidth: 0,
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
    fontSize: 14,
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
    minHeight: 44,
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
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    minHeight: 64,
  },
  recentInfo: {
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  recentTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14.5,
  },
  recentSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  playCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playlistsScrollContent: {
    padding: 16,
    paddingBottom: 16,
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
    gap: 12,
  },
  presetCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 110,
  },
  presetTopRow: {
    marginBottom: 10,
  },
  presetHeaderWrap: {
    flex: 1,
    minWidth: 0,
  },
  presetTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginBottom: 3,
  },
  presetSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
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
    fontSize: 12,
  },
  presetActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  presetSaveBtn: {
    width: 44,
    minHeight: 44,
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
    borderRadius: 14,
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
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    minHeight: 56,
  },
  playlistCardMain: {
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
    minHeight: 44,
  },
  playlistName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    flexShrink: 1,
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
    flexShrink: 0,
  },
  smallPlayBtn: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePlaylistBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  selectedPlaylistWrap: {
    flex: 1,
    minWidth: 0,
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
    minHeight: 44,
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
    minHeight: 48,
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
    minWidth: 0,
    marginEnd: 8,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  clearBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    minHeight: 52,
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
    minWidth: 0,
    marginEnd: 6,
    minHeight: 44,
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
    flexShrink: 0,
  },
  queuePlayBtn: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueRemoveBtn: {
    width: 44,
    minHeight: 44,
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
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  repeatRowCard: {
    padding: 16,
    borderRadius: 14,
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
  },
  changeReciterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0,
    minHeight: 44,
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
    minHeight: 44,
    minWidth: 0,
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
    minWidth: 0,
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
    minHeight: 44,
  },
  modalBody: {
    padding: 18,
  },
  formLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
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
    minHeight: 44,
  },
  surahPickNum: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  surahPickName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  surahPickTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    flex: 1,
    minWidth: 0,
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
    minHeight: 44,
    minWidth: 0,
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
    minHeight: 44,
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
    flexWrap: 'wrap',
    gap: 4,
  },
  reciterHeaderTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  reciterHeaderSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  translationTabScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
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
    minHeight: 44,
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
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  floatingMiniIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  floatingMiniInfo: {
    flex: 1,
    marginEnd: 8,
    minWidth: 0,
  },
  floatingMiniTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  floatingMiniTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
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
    fontSize: 12,
  },
  floatingMiniOpenBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default withUndoToast(QuranAudioScreen);
