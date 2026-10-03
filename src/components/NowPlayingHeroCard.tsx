import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { CurrentPlayback, PlaybackStatus } from '../lib/quranAudio';
import { formatDuration } from '../lib/formatDuration';

interface NowPlayingHeroCardProps {
  playback: CurrentPlayback | null;
  status: PlaybackStatus;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (positionMillis: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  canNext?: boolean;
  canPrevious?: boolean;
  repeatMode?: 'none' | 'one' | 'all';
  onCycleRepeat?: () => void;
  queueCount?: number;
  currentQueueIndex?: number;
  onResumeRecent?: () => void;
  recentTitle?: string | null;
}

export function NowPlayingHeroCard({
  playback,
  status,
  onPlayPause,
  onStop,
  onSeek,
  onNext,
  onPrevious,
  canNext = false,
  canPrevious = false,
  repeatMode = 'none',
  onCycleRepeat,
  queueCount = 0,
  currentQueueIndex = -1,
  onResumeRecent,
  recentTitle,
}: NowPlayingHeroCardProps) {
  const { colors } = useTheme();
  const [touchX, setTouchX] = useState<number | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(0);

  const durationSec = status.durationMillis > 0 ? status.durationMillis / 1000 : 0;
  const positionSec = status.positionMillis > 0 ? status.positionMillis / 1000 : 0;
  const progressRatio = status.durationMillis > 0 ? Math.min(1, Math.max(0, status.positionMillis / status.durationMillis)) : 0;

  const handleTrackPress = useCallback(
    (e: any) => {
      const width = progressWidth.current;
      if (width <= 0 || status.durationMillis <= 0) return;
      const x = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / width));
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
        const width = progressWidth.current;
        if (width <= 0 || status.durationMillis <= 0) return;
        const x = e.nativeEvent.locationX;
        setTouchX(x);
      },
      onPanResponderMove: (e: any) => {
        if (touchX === null) return;
        const width = progressWidth.current;
        if (width <= 0 || status.durationMillis <= 0) return;
        const x = e.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / width));
        progressAnim.setValue(ratio);
        setTouchX(x);
      },
      onPanResponderRelease: (e: any) => {
        if (touchX === null) return;
        const width = progressWidth.current;
        if (width <= 0 || status.durationMillis <= 0) {
          setTouchX(null);
          return;
        }
        const x = e.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / width));
        const positionMillis = Math.round(ratio * status.durationMillis);
        onSeek(positionMillis);
        setTouchX(null);
      },
      onPanResponderTerminate: () => {
        setTouchX(null);
      },
    })
  ).current;

  // Idle Card if nothing is currently loaded
  if (!playback) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.idleHeaderRow}>
          <View style={[styles.statusBadge, { backgroundColor: colors.accentDim }]}>
            <Ionicons name="headset-outline" size={13} color={colors.accent} />
            <Text style={[styles.statusBadgeText, { color: colors.accent }]}>AUDIO CENTER</Text>
          </View>
        </View>

        <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>
          Ready to Recite
        </Text>
        <Text style={[styles.idleSub, { color: colors.textMuted }]}>
          Select any reciter, curated playlist, or surah to begin listening.
        </Text>

        {onResumeRecent && recentTitle && (
          <TouchableOpacity
            onPress={onResumeRecent}
            style={[styles.resumeBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel={`Resume last played ${recentTitle}`}
          >
            <Ionicons name="play" size={14} color={colors.accent} />
            <Text style={[styles.resumeBtnText, { color: colors.accent }]} numberOfLines={1}>
              Resume: {recentTitle}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isQueueActive = queueCount > 0 && currentQueueIndex >= 0;
  const queueLabel = isQueueActive ? `Track ${currentQueueIndex + 1} of ${queueCount}` : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: status.isPlaying ? colors.accent : colors.borderSubtle,
        },
      ]}
    >
      {/* Top Meta Bar */}
      <View style={styles.topMetaRow}>
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
                styles.liveDot,
                {
                  backgroundColor: status.isPlaying ? colors.accent : colors.textMuted,
                },
              ]}
            />
          )}
          <Text
            style={[
              styles.statusBadgeText,
              {
                color: status.isPlaying || status.isBuffering ? colors.accent : colors.textMuted,
              },
            ]}
          >
            {status.isBuffering ? 'BUFFERING...' : status.isPlaying ? 'NOW PLAYING' : 'PAUSED'}
          </Text>
        </View>

        <View style={styles.topMetaRight}>
          {queueLabel && (
            <View style={[styles.queueChip, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
              <Ionicons name="list" size={11} color={colors.textSecondary} />
              <Text style={[styles.queueChipText, { color: colors.textSecondary }]}>
                {queueLabel}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onStop}
            style={[styles.dismissBtn, { borderColor: colors.borderSubtle }]}
            accessibilityRole="button"
            accessibilityLabel="Stop and close player"
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reciter & Track Info */}
      <View style={styles.trackInfo}>
        <Text style={[styles.reciterName, { color: colors.textPrimary }]} numberOfLines={1}>
          {playback.reciterName}
        </Text>
        <Text style={[styles.trackTitle, { color: colors.accent }]} numberOfLines={1}>
          {playback.title}
        </Text>
      </View>

      {/* Progress Bar & Seek */}
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
                width: `${Math.round(progressRatio * 100)}%`,
              },
            ]}
          />
        </TouchableOpacity>

        {/* Time stamps */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatDuration(positionSec)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {durationSec > 0 ? formatDuration(durationSec) : '--:--'}
          </Text>
        </View>
      </View>

      {/* Control Buttons Row */}
      <View style={styles.controlsRow}>
        {/* Repeat Toggle */}
        <TouchableOpacity
          onPress={onCycleRepeat}
          style={[
            styles.subCtrlBtn,
            {
              backgroundColor: repeatMode !== 'none' ? colors.accentDim : 'transparent',
              borderColor: repeatMode !== 'none' ? colors.accent : colors.borderSubtle,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Repeat mode: ${repeatMode}. Tap to change.`}
        >
          <Ionicons
            name={repeatMode === 'one' ? 'repeat-sharp' : 'repeat'}
            size={16}
            color={repeatMode !== 'none' ? colors.accent : colors.textMuted}
          />
          {repeatMode === 'one' && (
            <Text style={[styles.repeatBadgeText, { color: colors.accent }]}>1</Text>
          )}
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity
          onPress={onPrevious}
          disabled={!canPrevious}
          style={[
            styles.navBtn,
            {
              opacity: canPrevious ? 1 : 0.4,
              borderColor: colors.borderSubtle,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Previous track or verse"
        >
          <Ionicons name="play-skip-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Play / Pause Main Button */}
        <TouchableOpacity
          onPress={onPlayPause}
          style={[
            styles.playMainBtn,
            {
              backgroundColor: colors.accent,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={status.isPlaying ? 'Pause' : 'Play'}
          disabled={status.isBuffering}
        >
          {status.isBuffering ? (
            <ActivityIndicator size="small" color="#121110" />
          ) : (
            <Ionicons
              name={status.isPlaying ? 'pause' : 'play'}
              size={22}
              color="#121110"
              style={status.isPlaying ? undefined : { marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          onPress={onNext}
          disabled={!canNext}
          style={[
            styles.navBtn,
            {
              opacity: canNext ? 1 : 0.4,
              borderColor: colors.borderSubtle,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next track or verse"
        >
          <Ionicons name="play-skip-forward" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Stop button */}
        <TouchableOpacity
          onPress={onStop}
          style={[styles.subCtrlBtn, { borderColor: colors.borderSubtle }]}
          accessibilityRole="button"
          accessibilityLabel="Stop audio"
        >
          <Ionicons name="square" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  topMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  queueChipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    marginBottom: 12,
  },
  reciterName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 26,
  },
  trackTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  subCtrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  repeatBadgeText: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 9,
    fontFamily: 'Manrope_700Bold',
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMainBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  idleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  idleTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginBottom: 4,
  },
  idleSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  resumeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
});
