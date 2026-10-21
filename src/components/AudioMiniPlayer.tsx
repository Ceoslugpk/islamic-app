import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { iconSizes } from '../lib/iconMap';
import { CurrentPlayback, PlaybackStatus } from '../lib/quranAudio';
import { formatProgress } from '../lib/formatDuration';
import { isRTL, t } from '../lib/i18n';
import { calculateTimelineRatio } from '../lib/rtl';
import { AppText } from './ui/AppText';

interface AudioMiniPlayerProps {
  playback: CurrentPlayback;
  status: PlaybackStatus;
  onPlayPause: () => void;
  onStop: () => void;
  onOpenAudio?: () => void;
  onSeek: (positionMillis: number) => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function EqualizerBars({ color, isPlaying }: { color: string; isPlaying: boolean }) {
  const [anim1] = useState(() => new Animated.Value(0.4));
  const [anim2] = useState(() => new Animated.Value(0.85));
  const [anim3] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    if (!isPlaying) {
      anim1.setValue(0.4);
      anim2.setValue(0.85);
      anim3.setValue(0.5);
      return;
    }

    let isCancelled = false;
    let loop1: Animated.CompositeAnimation | null = null;
    let loop2: Animated.CompositeAnimation | null = null;
    let loop3: Animated.CompositeAnimation | null = null;

    const startBars = () => {
      if (isCancelled) return;
      loop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(anim1, { toValue: 1.0, duration: 320, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(anim1, { toValue: 0.3, duration: 380, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      loop2 = Animated.loop(
        Animated.sequence([
          Animated.timing(anim2, { toValue: 0.25, duration: 270, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(anim2, { toValue: 1.0, duration: 340, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      loop3 = Animated.loop(
        Animated.sequence([
          Animated.timing(anim3, { toValue: 0.95, duration: 360, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(anim3, { toValue: 0.35, duration: 290, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      loop1.start();
      loop2.start();
      loop3.start();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          anim1.setValue(0.7);
          anim2.setValue(0.9);
          anim3.setValue(0.6);
          return;
        }
      }
      startBars();
    } else {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((reduced) => {
          if (reduced) {
            anim1.setValue(0.7);
            anim2.setValue(0.9);
            anim3.setValue(0.6);
          } else {
            startBars();
          }
        })
        .catch(() => startBars());
    }

    return () => {
      isCancelled = true;
      if (loop1) loop1.stop();
      if (loop2) loop2.stop();
      if (loop3) loop3.stop();
    };
  }, [isPlaying, anim1, anim2, anim3]);

  return (
    <View style={styles.equalizerContainer}>
      <Animated.View
        style={[
          styles.equalizerBar,
          {
            backgroundColor: color,
            transform: [{ scaleY: anim1 }],
            opacity: anim1.interpolate({ inputRange: [0.3, 1], outputRange: [0.75, 1] }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.equalizerBar,
          {
            backgroundColor: color,
            transform: [{ scaleY: anim2 }],
            opacity: anim2.interpolate({ inputRange: [0.25, 1], outputRange: [0.75, 1] }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.equalizerBar,
          {
            backgroundColor: color,
            transform: [{ scaleY: anim3 }],
            opacity: anim3.interpolate({ inputRange: [0.35, 1], outputRange: [0.75, 1] }),
          },
        ]}
      />
    </View>
  );
}

export function AudioMiniPlayer({
  playback,
  status,
  onPlayPause,
  onStop,
  onOpenAudio,
  onSeek,
}: AudioMiniPlayerProps) {
  const { colors } = useTheme();
  const [touchX, setTouchX] = useState<number | null>(null);
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [progressWidth, setProgressWidth] = useState(0);

  const handleProgressPress = useCallback(
    (e: any) => {
      if (progressWidth <= 0 || status.durationMillis <= 0) return;
      const ratio = calculateTimelineRatio(e.nativeEvent.locationX, progressWidth, isRTL());
      const positionMillis = Math.round(ratio * status.durationMillis);
      onSeek(positionMillis);
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
          progressAnim.setValue(status.positionMillis / Math.max(1, status.durationMillis));
          setTouchX(null);
        },
        onPanResponderTerminate: () => {
          setTouchX(null);
          progressAnim.setValue(status.positionMillis / Math.max(1, status.durationMillis));
        },
      }),
    [touchX, progressWidth, status.durationMillis, status.positionMillis, onSeek, progressAnim]
  );

  const progressRatio = status.durationMillis > 0 ? status.positionMillis / status.durationMillis : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderSubtle,
        },
      ]}
    >
      {/* Top interactive progress bar */}
      <View
        {...panResponder.panHandlers}
        hitSlop={{ top: 21, bottom: 21, left: 0, right: 0 }}
        style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}
        onLayout={(e) => {
          setProgressWidth(e.nativeEvent.layout.width);
        }}
        onTouchEnd={handleProgressPress}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.accent,
              width: `${Math.round(progressRatio * 100)}%`,
            },
          ]}
        />
      </View>

      <TouchableOpacity
        style={styles.infoArea}
        onPress={onOpenAudio}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('Now playing {{title}} by {{reciter}}. Tap to open audio player.', { title: playback.title, reciter: playback.reciterName })}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.iconCircleBg || colors.accentDim }]}>
          {status.isBuffering ? (
            <ActivityIndicator size="small" color={colors.iconCircleFg || colors.accent} />
          ) : (
            <Ionicons
              name={status.isPlaying ? 'volume-medium' : 'volume-mute'}
              size={18}
              color={colors.iconCircleFg || colors.accent}
            />
          )}
        </View>

        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
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
                <AppText
                  variant="caption"
                  highlight={playback.segmentType === 'arabic'}
                  style={styles.segmentBadgeText}
                >
                  {playback.segmentType === 'arabic' ? 'AR' : 'TR'}
                </AppText>
              </View>
            )}
            <AppText
              variant="rowTitle"
              style={styles.title}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {playback.title}
            </AppText>
          </View>
          <AppText
            variant="caption"
            style={styles.subtitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {playback.reciterName} · {formatProgress(status.positionMillis / 1000, status.durationMillis / 1000)}
          </AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={onPlayPause}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          style={[
            styles.ctrlBtn,
            { backgroundColor: status.isPlaying ? colors.accentDim : colors.accent },
          ]}
          accessibilityRole="button"
          accessibilityLabel={status.isPlaying ? t('Pause audio') : t('Play audio')}
          disabled={status.isBuffering}
        >
          {status.isBuffering ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : status.isPlaying ? (
            <EqualizerBars color={colors.accent} isPlaying={status.isPlaying} />
          ) : (
            <Ionicons
              name="play"
              size={iconSizes.small}
              color={colors.onAccent}
            />
            )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onStop}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          style={[styles.ctrlBtnSecondary, { borderColor: colors.borderSubtle }]}
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
    position: 'relative',
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
  },
  infoArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginEnd: 12,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  segmentBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    paddingVertical: 1,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 17,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingVertical: 2,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    paddingVertical: 2,
    minWidth: 0,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnSecondary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    width: 18,
    height: 18,
  },
  equalizerBar: {
    width: 2.8,
    height: 14,
    borderRadius: 1.5,
  },
});
