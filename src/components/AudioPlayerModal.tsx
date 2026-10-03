import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
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
import { useAudioMiniPlayer } from '../lib/useAudioMiniPlayer';
import {
  addQueueListener,
  canPlayNext,
  canPlayPrevious,
  getAudioQueue,
  getQueueIndex,
  playNext,
  playPrevious,
  playQueueItem,
  PlaylistItem,
  safeLoadSettings,
  updateAudioSettings,
} from '../lib/quranAudio';
import { formatDuration } from '../lib/formatDuration';

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
  const isTablet = width >= 640;

  const { playback, status, onPlayPause, onStop, onSeek } = useAudioMiniPlayer();

  const [queue, setQueue] = useState<PlaylistItem[]>(getAudioQueue());
  const [queueIndex, setQueueIndex] = useState<number>(getQueueIndex());
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>(
    () => safeLoadSettings().repeatMode || 'none'
  );

  const [touchX, setTouchX] = useState<number | null>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const progressWidth = useRef<number>(0);

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

        <View
          style={[
            styles.sheetContainer,
            isTablet && styles.sheetContainerTablet,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {/* Drag Pill */}
          <View style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]} />

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
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Track Details or Standby */}
          {playback ? (
            <View style={styles.trackContent}>
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
                    <ActivityIndicator size="small" color="#121110" />
                  ) : (
                    <Ionicons
                      name={status.isPlaying ? 'pause' : 'play'}
                      size={26}
                      color="#121110"
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
            </View>
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
        </View>
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
});
