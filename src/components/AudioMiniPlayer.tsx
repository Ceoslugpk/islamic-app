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
import { formatProgress } from '../lib/formatDuration';

interface AudioMiniPlayerProps {
  playback: CurrentPlayback;
  status: PlaybackStatus;
  onPlayPause: () => void;
  onStop: () => void;
  onOpenAudio?: () => void;
  onSeek: (positionMillis: number) => void;
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
            <ActivityIndicator size="small" color="#121110" />
          ) : (
            <Ionicons
              name={status.isPlaying ? 'pause' : 'play'}
              size={18}
              color={status.isPlaying ? colors.accent : '#121110'}
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
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
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
    paddingHorizontal: 5,
    paddingVertical: 1,
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
});