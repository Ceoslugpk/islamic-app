import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { iconSizes } from '../lib/iconMap';
import { useAudioMiniPlayer } from '../lib/useAudioMiniPlayer';
import {
  addQueueListener,
  canPlayNext,
  canPlayPrevious,
  getAudioQueue,
  getAudioTranslationLangName,
  getQueueIndex,
  NON_ARABIC_AUDIO_EDITIONS,
  PlaybackSegmentType,
  playNext,
  playPrevious,
  playQueueItem,
  PlaylistItem,
  safeLoadSettings,
  switchToLanguageSegment,
  updateAudioSettings,
  useAudioTranslation,
} from '../lib/quranAudio';
import { formatDuration } from '../lib/formatDuration';
import { getLanguageFlag } from '../lib/quranLanguages';

export interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAudioCenter?: () => void;
}

export function AudioPlayerModal({
  visible,
  onClose,
  onOpenAudioCenter,
}: AudioPlayerModalProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 640;

  const { playback, status, onPlayPause, onStop, onSeek } = useAudioMiniPlayer();
  const { audioEdition, audioLanguage, audioLangName, setAudioTranslation } = useAudioTranslation();
  const activeSegment: PlaybackSegmentType = playback?.segmentType || 'arabic';

  const [switchingSegment, setSwitchingSegment] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const [queue, setQueue] = useState<PlaylistItem[]>(getAudioQueue());
  const [queueIndex, setQueueIndex] = useState<number>(getQueueIndex());
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>(
    () => safeLoadSettings().repeatMode || 'none'
  );

  const [touchX, setTouchX] = useState<number | null>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const progressWidth = useRef<number>(0);

  const handleSwitchSegment = async (target: PlaybackSegmentType) => {
    if (switchingSegment) return;
    if (target === 'translation' && !audioEdition) return;
    setSwitchingSegment(true);
    try {
      await switchToLanguageSegment(target);
    } finally {
      setSwitchingSegment(false);
    }
  };

  const handleSelectAudioEdition = async (editionIdentifier: string) => {
    await setAudioTranslation(editionIdentifier);
    setLangPickerOpen(false);
    if (playback && activeSegment !== 'translation') {
      await switchToLanguageSegment('translation');
    }
  };

  const handleSelectArabicSegment = async () => {
    setLangPickerOpen(false);
    if (playback && activeSegment !== 'arabic') {
      await handleSwitchSegment('arabic');
    }
  };

  // Subscribe to queue updates
  useEffect(() => {
    const unsub = addQueueListener((q, idx) => {
      setQueue(q);
      setQueueIndex(idx);
    });
    return () => {
      unsub();
    };
  }, []);

  // Update repeatMode from settings when modal becomes visible
  useEffect(() => {
    if (visible) {
      setRepeatMode(safeLoadSettings().repeatMode || 'none');
    }
  }, [visible]);

  const canNext = canPlayNext();
  const canPrev = canPlayPrevious();

  const durationSec = status.durationMillis > 0 ? status.durationMillis / 1000 : 0;
  const positionSec = status.positionMillis > 0 ? status.positionMillis / 1000 : 0;

  const realProgressRatio =
    status.durationMillis > 0
      ? Math.min(1, Math.max(0, status.positionMillis / status.durationMillis))
      : 0;

  const displayedRatio = dragRatio !== null ? dragRatio : realProgressRatio;

  const handleTrackPress = useCallback(
    (e: any) => {
      const w = progressWidth.current;
      if (w <= 0 || status.durationMillis <= 0) return;
      const x = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / w));
      const targetMillis = Math.round(ratio * status.durationMillis);
      onSeek(targetMillis);
    },
    [status.durationMillis, onSeek]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: any) => {
        const w = progressWidth.current;
        if (w <= 0 || status.durationMillis <= 0) return;
        const x = e.nativeEvent.locationX;
        setTouchX(x);
        setDragRatio(Math.max(0, Math.min(1, x / w)));
      },
      onPanResponderMove: (e: any) => {
        if (touchX === null) return;
        const w = progressWidth.current;
        if (w <= 0 || status.durationMillis <= 0) return;
        const x = e.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / w));
        setDragRatio(ratio);
        setTouchX(x);
      },
      onPanResponderRelease: (e: any) => {
        const w = progressWidth.current;
        if (w <= 0 || status.durationMillis <= 0 || touchX === null) {
          setTouchX(null);
          setDragRatio(null);
          return;
        }
        const x = e.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / w));
        const positionMillis = Math.round(ratio * status.durationMillis);
        onSeek(positionMillis);
        setTouchX(null);
        setDragRatio(null);
      },
      onPanResponderTerminate: () => {
        setTouchX(null);
        setDragRatio(null);
      },
    })
  ).current;

  const handleCycleRepeat = () => {
    const modes: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one'];
    const curIdx = modes.indexOf(repeatMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    const updated = updateAudioSettings({ repeatMode: nextMode });
    setRepeatMode(updated.repeatMode);
  };

  const handleNext = async () => {
    await playNext();
  };

  const handlePrevious = async () => {
    await playPrevious();
  };

  const handleOpenAudioCenterScreen = () => {
    onClose();
    if (onOpenAudioCenter) {
      onOpenAudioCenter();
    }
  };

  const [sheetAnim] = useState(() => new Animated.Value(0));

  // Drag-to-dismiss: dragging the grab pill (or any non-scroll area) downward
  // pulls the sheet; releasing past a threshold closes it.
  const dragY = useRef(new Animated.Value(0)).current;
  const dragging = useRef<Animated.Value>(new Animated.Value(0)).current;
  const dismissPanRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && g.dy > 0,
      onPanResponderMove: (_e, g) => {
        if (g.dy < 0) return;
        dragY.setValue(g.dy);
        dragging.setValue(Math.min(1, g.dy / 200));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 140) {
          onClose();
        }
        Animated.parallel([
          Animated.timing(dragY, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dragging, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.timing(dragY, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dragging, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [visible, sheetAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheetContainer,
            isTablet && styles.sheetContainerTablet,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              opacity: sheetAnim,
              transform: [
                {
                  translateY: Animated.add(
                    sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [80, 0],
                    }),
                    dragY
                  ),
                },
              ],
            },
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {/* Drag Pill */}
          <View
            style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]}
            {...dismissPanRef.panHandlers}
          />
          {/* Dim the backdrop while dragging */}
          <Animated.View
            style={[
              styles.dragDim,
              { opacity: dragging.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) },
            ]}
            pointerEvents="none"
          />

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: status.isBuffering
                      ? colors.accentDim
                      : status.isPlaying
                      ? colors.accentDim
                      : colors.bgBase,
                  },
                ]}
              >
                {status.isBuffering ? (
                  <ActivityIndicator size={10} color={colors.accent} style={{ marginRight: 4 }} />
                ) : (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: status.isPlaying ? colors.accent : colors.textMuted },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        status.isPlaying || status.isBuffering
                          ? colors.accent
                          : colors.textMuted,
                    },
                  ]}
                >
                  {status.isBuffering ? 'BUFFERING' : status.isPlaying ? 'NOW PLAYING' : 'PAUSED'}
                </Text>
              </View>

              {playback?.segmentType && (
                <View
                  style={[
                    styles.segmentBadge,
                    {
                      backgroundColor:
                        playback.segmentType === 'arabic' ? colors.accentDim : colors.bgBase,
                      borderColor:
                        playback.segmentType === 'arabic' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Ionicons
                    name={playback.segmentType === 'arabic' ? 'volume-medium' : 'language'}
                    size={11}
                    color={playback.segmentType === 'arabic' ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentBadgeText,
                      {
                        color:
                          playback.segmentType === 'arabic' ? colors.accent : colors.textSecondary,
                      },
                    ]}
                  >
                    {playback.segmentType === 'arabic'
                      ? 'AR'
                      : `TR${playback.translationLang ? ` (${playback.translationLang.toUpperCase()})` : ''}`}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              accessibilityRole="button"
              accessibilityLabel="Close audio player modal"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Track Details or Standby */}
          {playback ? (
            <ScrollView
              style={styles.trackContent}
              contentContainerStyle={styles.trackContentInner}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.infoArea}>
                <Text
                  style={[styles.reciterName, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {playback.reciterName}
                </Text>
                <Text
                  style={[styles.trackTitle, { color: colors.accent }]}
                  numberOfLines={2}
                >
                  {playback.title}
                </Text>
                {playback.surah && (
                  <Text style={[styles.surahTag, { color: colors.textMuted }]}>
                    Surah {playback.surah}
                    {playback.ayah ? ` · Ayah ${playback.ayah}` : ' · Full Surah'}
                  </Text>
                )}
              </View>

              {/* Dual-Language Segmented Switch (Arabic vs Translation) */}
              <View
                style={[
                  styles.langSegmentContainer,
                  {
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                {/* Arabic Segment */}
                <TouchableOpacity
                  onPress={() => handleSwitchSegment('arabic')}
                  disabled={switchingSegment}
                  style={[
                    styles.langSegmentBtn,
                    activeSegment === 'arabic' && [
                      styles.langSegmentBtnActive,
                      { backgroundColor: colors.accent, borderColor: colors.accent },
                    ],
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to Arabic recitation"
                  accessibilityState={{ selected: activeSegment === 'arabic' }}
                >
                  <View style={styles.langSegmentHeader}>
                    <Text
                      style={[
                        styles.langSegmentTitle,
                        { color: activeSegment === 'arabic' ? colors.onAccent : colors.textPrimary },
                      ]}
                    >
                      العربية
                    </Text>
                    <View
                      style={[
                        styles.langSegmentMiniBadge,
                        {
                          backgroundColor:
                            activeSegment === 'arabic' ? 'rgba(0,0,0,0.14)' : colors.bgSurface,
                          borderColor:
                            activeSegment === 'arabic' ? 'rgba(0,0,0,0.2)' : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.langSegmentMiniBadgeText,
                          { color: activeSegment === 'arabic' ? '#121110' : colors.accent },
                        ]}
                      >
                        AR
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.langSegmentSub,
                      {
                        color:
                          activeSegment === 'arabic' ? colors.onAccent : colors.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {playback?.arabicReciterName || playback?.reciterName || 'Alafasy'}
                  </Text>
                </TouchableOpacity>

                {/* Translation Segment */}
                <TouchableOpacity
                  onPress={() => handleSwitchSegment('translation')}
                  disabled={switchingSegment || !audioEdition}
                  style={[
                    styles.langSegmentBtn,
                    activeSegment === 'translation' && [
                      styles.langSegmentBtnActive,
                      { backgroundColor: colors.accent, borderColor: colors.accent },
                    ],
                    !audioEdition && { opacity: 0.5 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    audioEdition
                      ? `Switch to ${audioLangName} translation audio`
                      : 'Translation audio unavailable'
                  }
                  accessibilityState={{ selected: activeSegment === 'translation' }}
                >
                  <View style={styles.langSegmentHeader}>
                    <Text
                      style={[
                        styles.langSegmentTitle,
                        { color: activeSegment === 'translation' ? colors.onAccent : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {getLanguageFlag(audioLanguage)} {audioLangName}
                    </Text>
                    <View
                      style={[
                        styles.langSegmentMiniBadge,
                        {
                          backgroundColor:
                            activeSegment === 'translation' ? 'rgba(0,0,0,0.14)' : colors.bgSurface,
                          borderColor:
                            activeSegment === 'translation' ? 'rgba(0,0,0,0.2)' : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.langSegmentMiniBadgeText,
                          { color: activeSegment === 'translation' ? '#121110' : colors.textSecondary },
                        ]}
                      >
                        {audioLanguage.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.langSegmentSub,
                      {
                        color:
                          activeSegment === 'translation' ? colors.onAccent : colors.textMuted,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {audioEdition ? (audioEdition.englishName || audioEdition.name) : 'No audio'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Translation Edition & Quick Switch Action */}
              <View style={styles.langSwitchBar}>
                <View style={styles.langSwitchLeft}>
                  <Ionicons
                    name={audioEdition ? 'volume-medium-outline' : 'alert-circle-outline'}
                    size={13}
                    color={audioEdition ? colors.accent : '#E5A93C'}
                  />
                  <Text
                    style={[
                      styles.langSwitchNotice,
                      { color: audioEdition ? colors.textMuted : '#E5A93C' },
                    ]}
                    numberOfLines={1}
                  >
                    {audioEdition
                      ? `Voice: ${audioEdition.englishName || audioEdition.name}`
                      : 'Audio translation unavailable'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setLangPickerOpen(true)}
                  style={[
                    styles.changeLangPill,
                    {
                      backgroundColor: colors.bgBase,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Change translation audio language"
                >
                  <Text style={[styles.changeLangPillText, { color: colors.accent }]}>
                    Change Lang
                  </Text>
                  <Ionicons name="chevron-forward" size={10} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Progress & Seeker */}
              <View style={styles.progressContainer}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleTrackPress}
                  {...panResponder.panHandlers}
                  style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}
                  onLayout={(e) => {
                    progressWidth.current = e.nativeEvent.layout.width;
                  }}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Audio timeline seeker"
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${Math.round(displayedRatio * 100)}%`,
                      },
                    ]}
                  />
                </TouchableOpacity>

                <View style={styles.timeRow}>
                  <Text style={[styles.timeText, { color: colors.textMuted }]}>
                    {dragRatio !== null && durationSec > 0
                      ? formatDuration(dragRatio * durationSec)
                      : formatDuration(positionSec)}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.textMuted }]}>
                    {durationSec > 0 ? formatDuration(durationSec) : '--:--'}
                  </Text>
                </View>
              </View>

              {/* Controls Row */}
              <View style={styles.controlsRow}>
                {/* Repeat Button */}
                <TouchableOpacity
                  onPress={handleCycleRepeat}
                  style={[
                    styles.subCtrlBtn,
                    {
                      backgroundColor: repeatMode !== 'none' ? colors.accentDim : colors.bgBase,
                      borderColor: repeatMode !== 'none' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Repeat mode: ${repeatMode}. Tap to cycle.`}
                >
                  <Ionicons
                    name={repeatMode === 'one' ? 'repeat-sharp' : 'repeat'}
                    size={18}
                    color={repeatMode !== 'none' ? colors.accent : colors.textMuted}
                  />
                  {repeatMode === 'one' && (
                    <Text style={[styles.repeatBadgeText, { color: colors.accent }]}>1</Text>
                  )}
                </TouchableOpacity>

                {/* Previous Button */}
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={!canPrev}
                  style={[
                    styles.navBtn,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.bgBase,
                      opacity: canPrev ? 1 : 0.35,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Previous track or verse"
                >
                  <Ionicons name="play-skip-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                {/* Play / Pause Main Button */}
                <TouchableOpacity
                  onPress={onPlayPause}
                  disabled={status.isBuffering}
                  style={[
                    styles.mainPlayBtn,
                    {
                      backgroundColor: colors.accent,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={status.isPlaying ? 'Pause audio' : 'Play audio'}
                >
                  {status.isBuffering ? (
                    <ActivityIndicator size="small" color={colors.onAccent} />
                  ) : (
                    <Ionicons
                      name={status.isPlaying ? 'pause' : 'play'}
                      size={iconSizes.featured}
                      color={colors.onAccent}
                      style={status.isPlaying ? undefined : { marginLeft: 3 }}
                    />
                  )}
                </TouchableOpacity>

                {/* Next Button */}
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={!canNext}
                  style={[
                    styles.navBtn,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.bgBase,
                      opacity: canNext ? 1 : 0.35,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Next track or verse"
                >
                  <Ionicons name="play-skip-forward" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                {/* Stop Button */}
                <TouchableOpacity
                  onPress={onStop}
                  style={[
                    styles.subCtrlBtn,
                    { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Stop audio"
                >
                  <Ionicons name="square" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Queue peek if queue exists */}
              {queue.length > 0 && (
                <View style={[styles.queueSection, { borderTopColor: colors.borderSubtle }]}>
                  <View style={styles.queueHeaderRow}>
                    <View style={styles.queueHeaderTitle}>
                      <Ionicons name="list" size={13} color={colors.textSecondary} />
                      <Text style={[styles.queueHeaderText, { color: colors.textSecondary }]}>
                        UP NEXT IN QUEUE ({queue.length})
                      </Text>
                    </View>
                    {queueIndex >= 0 && (
                      <Text style={[styles.queueIndexText, { color: colors.textMuted }]}>
                        Track {queueIndex + 1} of {queue.length}
                      </Text>
                    )}
                  </View>

                  <ScrollView
                    style={styles.queueList}
                    contentContainerStyle={styles.queueListContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {queue.slice(0, 5).map((item, idx) => {
                      const isCurrent = idx === queueIndex;
                      return (
                        <TouchableOpacity
                          key={`${item.surah}-${item.ayah ?? 'all'}-${idx}`}
                          onPress={() => playQueueItem(idx)}
                          style={[
                            styles.queueItemRow,
                            {
                              backgroundColor: isCurrent ? colors.accentDim : 'transparent',
                              borderColor: isCurrent ? colors.accent : colors.borderSubtle,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Play track ${idx + 1}: ${item.title}`}
                        >
                          <View style={styles.queueItemLeft}>
                            <Text
                              style={[
                                styles.queueItemNum,
                                { color: isCurrent ? colors.accent : colors.textMuted },
                              ]}
                            >
                              {idx + 1}
                            </Text>
                            <Text
                              style={[
                                styles.queueItemTitle,
                                { color: isCurrent ? colors.accent : colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                          </View>
                          {isCurrent && (
                            <Ionicons
                              name={status.isPlaying ? 'volume-medium' : 'pause'}
                              size={14}
                              color={colors.accent}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="headset-outline" size={28} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Audio Playing
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Choose any surah or reciter from the Quran tab or Audio Center to start listening.
              </Text>
            </View>
          )}

          {/* Open Audio Center Affordance */}
          <TouchableOpacity
            onPress={handleOpenAudioCenterScreen}
            style={[
              styles.audioCenterBtn,
              {
                backgroundColor: colors.bgBase,
                borderColor: colors.borderSubtle,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open full Audio Center"
          >
            <Ionicons name="musical-notes-outline" size={16} color={colors.accent} />
            <Text style={[styles.audioCenterBtnText, { color: colors.textPrimary }]}>
              Open Audio Center (Reciters, Playlists, Queue)
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Translation Language Picker Modal */}
        <Modal
          visible={langPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLangPickerOpen(false)}
        >
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback onPress={() => setLangPickerOpen(false)}>
              <View style={styles.pickerBackdrop} />
            </TouchableWithoutFeedback>

            <View
              style={[
                styles.pickerContainer,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={[styles.pickerHeader, { borderBottomColor: colors.borderSubtle }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                    Audio Language & Reciter
                  </Text>
                  <Text style={[styles.pickerSubtitle, { color: colors.textMuted }]}>
                    Arabic recitation + 11 translation languages ({NON_ARABIC_AUDIO_EDITIONS.length + 1} options)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setLangPickerOpen(false)}
                  style={[styles.pickerCloseBtn, { borderColor: colors.borderSubtle }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close language picker"
                >
                  <Ionicons name="close" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.pickerList}
                contentContainerStyle={styles.pickerListContent}
                nestedScrollEnabled
              >
                {/* Arabic Recitation Option */}
                <TouchableOpacity
                  onPress={handleSelectArabicSegment}
                  style={[
                    styles.pickerOption,
                    {
                      backgroundColor: activeSegment === 'arabic' ? colors.accentDim : colors.bgBase,
                      borderColor: activeSegment === 'arabic' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Select Arabic recitation"
                >
                  <View style={styles.pickerOptionLeft}>
                    <Text style={styles.pickerFlag}>🇸🇦</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.pickerOptionTitle,
                          { color: activeSegment === 'arabic' ? colors.accent : colors.textPrimary },
                        ]}
                      >
                        العربية · Arabic (Original)
                      </Text>
                      <Text style={[styles.pickerOptionSub, { color: colors.textMuted }]} numberOfLines={1}>
                        Reciter: {playback?.arabicReciterName || playback?.reciterName || 'Alafasy'}
                      </Text>
                    </View>
                  </View>
                  {activeSegment === 'arabic' && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  )}
                </TouchableOpacity>

                {/* Section Header */}
                <View style={styles.pickerSectionDivider}>
                  <Text style={[styles.pickerSectionLabel, { color: colors.accent }]}>
                    TRANSLATION VOICES (11 LANGUAGES)
                  </Text>
                </View>

                {/* Non-Arabic Translation Editions */}
                {NON_ARABIC_AUDIO_EDITIONS.map((ed) => {
                  const isSelected =
                    activeSegment === 'translation' && audioEdition.identifier === ed.identifier;
                  const flagEmoji = getLanguageFlag(ed.language);
                  const langTitle = getAudioTranslationLangName(ed.language);
                  return (
                    <TouchableOpacity
                      key={ed.identifier}
                      onPress={() => handleSelectAudioEdition(ed.identifier)}
                      style={[
                        styles.pickerOption,
                        {
                          backgroundColor: isSelected ? colors.accentDim : colors.bgBase,
                          borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${langTitle} - ${ed.englishName}`}
                    >
                      <View style={styles.pickerOptionLeft}>
                        <Text style={styles.pickerFlag}>{flagEmoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.pickerOptionTitle,
                              { color: isSelected ? colors.accent : colors.textPrimary },
                            ]}
                          >
                            {langTitle} ({ed.language.toUpperCase()})
                          </Text>
                          <Text style={[styles.pickerOptionSub, { color: colors.textMuted }]} numberOfLines={1}>
                            {ed.englishName}
                          </Text>
                          {ed.name ? (
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                              {ed.name}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  sheetContainerTablet: {
    maxWidth: 600,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 40,
  },
  dragDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: -1,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  segmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  segmentBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackContent: {
    width: '100%',
    flexShrink: 1,
  },
  trackContentInner: {
    paddingBottom: 4,
  },
  infoArea: {
    marginBottom: 16,
  },
  reciterName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  trackTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    lineHeight: 30,
    marginBottom: 4,
  },
  surahTag: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 18,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  subCtrlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  repeatBadgeText: {
    position: 'absolute',
    top: 5,
    right: 7,
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
  },
  navBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  queueSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueHeaderText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  queueIndexText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  queueList: {
    maxHeight: 110,
  },
  queueListContent: {
    gap: 6,
  },
  queueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  queueItemNum: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    width: 16,
  },
  queueItemTitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  audioCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  audioCenterBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  langSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 6,
    marginBottom: 8,
  },
  langSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSegmentBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  langSegmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 2,
  },
  langSegmentTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  langSegmentMiniBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  langSegmentMiniBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 0.4,
  },
  langSegmentSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
    maxWidth: '96%',
  },
  langSwitchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
    gap: 8,
  },
  langSwitchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  langSwitchNotice: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    flex: 1,
  },
  changeLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  changeLangPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 25,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  pickerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  pickerSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  pickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerList: {
    maxHeight: 380,
  },
  pickerListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  pickerSectionDivider: {
    paddingTop: 8,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  pickerSectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  pickerFlag: {
    fontSize: 20,
  },
  pickerOptionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  pickerOptionSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
});
