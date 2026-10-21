import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { iconSizes } from '../lib/iconMap';
import { CurrentPlayback, PlaybackStatus } from '../lib/quranAudio';
import { formatDuration } from '../lib/formatDuration';
import { isRTL, t } from '../lib/i18n';
import { calculateTimelineRatio } from '../lib/rtl';
import { AppText } from './ui/AppText';

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
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [progressWidth, setProgressWidth] = useState(0);

  const durationSec = status.durationMillis > 0 ? status.durationMillis / 1000 : 0;
  const positionSec = status.positionMillis > 0 ? status.positionMillis / 1000 : 0;
  const progressRatio = status.durationMillis > 0 ? Math.min(1, Math.max(0, status.positionMillis / status.durationMillis)) : 0;

  const handleTrackPress = useCallback(
    (e: any) => {
      if (progressWidth <= 0 || status.durationMillis <= 0) return;
      const ratio = calculateTimelineRatio(e.nativeEvent.locationX, progressWidth, isRTL());
      const targetMillis = Math.round(ratio * status.durationMillis);
      onSeek(targetMillis);
    },
    [progressWidth, status.durationMillis, onSeek]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: any) => {
          if (progressWidth <= 0 || status.durationMillis <= 0) return;
          const x = e.nativeEvent.locationX;
          setTouchX(x);
        },
        onPanResponderMove: (e: any) => {
          if (touchX === null) return;
          if (progressWidth <= 0 || status.durationMillis <= 0) return;
          const x = e.nativeEvent.locationX;
          const ratio = calculateTimelineRatio(x, progressWidth, isRTL());
          progressAnim.setValue(ratio);
          setTouchX(x);
        },
        onPanResponderRelease: (e: any) => {
          if (touchX === null) return;
          if (progressWidth <= 0 || status.durationMillis <= 0) {
            setTouchX(null);
            return;
          }
          const x = e.nativeEvent.locationX;
          const ratio = calculateTimelineRatio(x, progressWidth, isRTL());
          const positionMillis = Math.round(ratio * status.durationMillis);
          onSeek(positionMillis);
          setTouchX(null);
        },
        onPanResponderTerminate: () => {
          setTouchX(null);
        },
      }),
    [progressWidth, touchX, status.durationMillis, onSeek, progressAnim]
  );

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
            <AppText variant="eyebrow" style={styles.statusBadgeText}>{t('AUDIO CENTER')}</AppText>
          </View>
        </View>

        <AppText variant="title" style={styles.idleTitle}>
          {t('Ready to Recite')}
        </AppText>
        <AppText variant="subtitle" tone="faint" style={styles.idleSub}>
          {t('Select any reciter, curated playlist, or surah to begin listening.')}
        </AppText>

        {onResumeRecent && recentTitle && (
          <TouchableOpacity
            onPress={onResumeRecent}
            style={[styles.resumeBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel={t('Resume last played {{title}}', { title: recentTitle })}
          >
            <Ionicons name="play" size={14} color={colors.accent} />
            <AppText variant="link" style={styles.resumeBtnText} numberOfLines={2}>
              {t('Resume: {{title}}', { title: recentTitle })}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isQueueActive = queueCount > 0 && currentQueueIndex >= 0;
  const queueLabel = isQueueActive
    ? t('Track {{current}} of {{total}}', { current: currentQueueIndex + 1, total: queueCount })
    : null;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
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
              <ActivityIndicator size={10} color={colors.accent} style={{ marginEnd: 4 }} />
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
            <AppText
              variant="eyebrow"
              tone={status.isPlaying || status.isBuffering ? undefined : 'faint'}
              style={styles.statusBadgeText}
            >
              {status.isBuffering ? 'BUFFERING...' : status.isPlaying ? 'NOW PLAYING' : 'PAUSED'}
            </AppText>
          </View>

          {playback.segmentType && (
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
              <AppText
                variant="caption"
                highlight={playback.segmentType === 'arabic'}
                style={styles.segmentBadgeText}
              >
                {playback.segmentType === 'arabic'
                  ? t('ARABIC')
                  : playback.translationLang
                  ? t('TRANSLATION ({{language}})', { language: playback.translationLang.toUpperCase() })
                  : t('TRANSLATION')}
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.topMetaRight}>
          {queueLabel && (
            <View style={[styles.queueChip, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
              <Ionicons name="list" size={11} color={colors.textSecondary} />
              <AppText variant="caption" style={styles.queueChipText}>
                {queueLabel}
              </AppText>
            </View>
          )}

          <TouchableOpacity
            onPress={onStop}
            style={[styles.dismissBtn, { borderColor: colors.borderSubtle }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('Stop and close player')}
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reciter & Track Info */}
      <View style={styles.trackInfo}>
        <AppText variant="title" style={styles.reciterName} numberOfLines={2}>
          {playback.reciterName}
        </AppText>
        <AppText variant="subtitle" highlight style={styles.trackTitle} numberOfLines={2}>
          {playback.title}
        </AppText>
      </View>

      {/* Progress Bar & Seek */}
      <View style={styles.progressContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleTrackPress}
          {...panResponder.panHandlers}
          style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}
          onLayout={(e) => {
            setProgressWidth(e.nativeEvent.layout.width);
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={t('Audio timeline seeker')}
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
          <AppText variant="caption" tone="faint" style={styles.timeText}>
            {formatDuration(positionSec)}
          </AppText>
          <AppText variant="caption" tone="faint" style={styles.timeText}>
            {durationSec > 0 ? formatDuration(durationSec) : '--:--'}
          </AppText>
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
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t('Repeat mode: {{mode}}. Tap to change.', { mode: repeatMode })}
        >
          <Ionicons
            name={repeatMode === 'one' ? 'repeat-sharp' : 'repeat'}
            size={16}
            color={repeatMode !== 'none' ? colors.accent : colors.textMuted}
          />
          {repeatMode === 'one' && (
            <AppText variant="caption" highlight style={styles.repeatBadgeText}>
              1
            </AppText>
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
          hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
          accessibilityRole="button"
          accessibilityLabel={t('Previous track or verse')}
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
          accessibilityLabel={status.isPlaying ? t('Pause') : t('Play')}
          disabled={status.isBuffering}
        >
          {status.isBuffering ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Ionicons
              name={status.isPlaying ? 'pause' : 'play'}
              size={iconSizes.inlineLg}
              color={colors.onAccent}
              style={status.isPlaying ? undefined : { marginStart: 2 }}
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
          hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
          accessibilityRole="button"
          accessibilityLabel={t('Next track or verse')}
        >
          <Ionicons name="play-skip-forward" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Stop button */}
        <TouchableOpacity
          onPress={onStop}
          style={[styles.subCtrlBtn, { borderColor: colors.borderSubtle }]}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t('Stop audio')}
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
    paddingVertical: 2,
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
    paddingVertical: 2,
  },
  topMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
    paddingVertical: 2,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trackInfo: {
    marginBottom: 12,
    minWidth: 0,
  },
  reciterName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 26,
    paddingVertical: 2,
    minWidth: 0,
  },
  trackTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginTop: 2,
    letterSpacing: 0.2,
    paddingVertical: 2,
    minWidth: 0,
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
    alignSelf: 'flex-start',
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
    end: 4,
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
    paddingVertical: 2,
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
    maxWidth: '100%',
  },
  resumeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
});
