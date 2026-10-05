import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { iconSizes } from '../lib/iconMap';
import { CurrentPlayback, PlaybackStatus } from '../lib/quranAudio';
import { formatProgress } from '../lib/formatDuration';

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
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.85)).current;
  const anim3 = useRef(new Animated.Value(0.5)).current;

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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(0);

  const handleProgressPress = useCallback(
    (e: any) => {
      const width = progressWidth.current;
      if (width <= 0 || status.durationMillis <= 0) return;
      const x = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / width));
      const positionMillis = Math.round(ratio * status.durationMillis);
      onSeek(positionMillis);
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
        progressAnim.setValue(status.positionMillis / Math.max(1, status.durationMillis));
        setTouchX(null);
      },
      onPanResponderTerminate: () => {
        setTouchX(null);
        progressAnim.setValue(status.positionMillis / Math.max(1, status.durationMillis));
      },
    })
  ).current;

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
        style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}
        onLayout={(e) => {
          progressWidth.current = e.nativeEvent.layout.width;
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
        accessibilityLabel={`Now playing ${playback.title} by ${playback.reciterName}. Tap to open audio player.`}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
          {status.isBuffering ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name={status.isPlaying ? 'volume-medium' : 'volume-mute'}
              size={18}
              color={colors.accent}
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
                <Text
                  style={[
                    styles.segmentBadgeText,
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
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {playback.title}
            </Text>
          </View>
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {playback.reciterName} · {formatProgress(status.positionMillis / 1000, status.durationMillis / 1000)}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={onPlayPause}
          style={[
            styles.ctrlBtn,
            { backgroundColor: status.isPlaying ? colors.accentDim : colors.accent },
          ]}
          accessibilityRole="button"
          accessibilityLabel={status.isPlaying ? 'Pause audio' : 'Play audio'}
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
          style={[styles.ctrlBtnSecondary, { borderColor: colors.borderSubtle }]}
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
    position: 'relative',
    width: '100%',
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
    left: 0,
    top: 0,
    bottom: 0,
  },
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  segmentBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 17,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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