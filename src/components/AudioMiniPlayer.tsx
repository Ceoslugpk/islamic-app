import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, PanResponder, Animated } from 'react-native';
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
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {playback.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {playback.reciterName}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.progressSection}>
        <View
          {...panResponder.panHandlers}
          style={[
            styles.progressTrack,
            { backgroundColor: colors.borderSubtle },
            { height: 4, borderRadius: 2 },
          ]}
          onLayout={(e) => {
            progressWidth.current = e.nativeEvent.layout.width;
          }}
        >
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.accent, borderRadius: 2, height: '100%' },
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={[styles.progressTime, { color: colors.textMuted }]}>
          {formatProgress(status.positionMillis / 1000, status.durationMillis / 1000)}
        </Text>
      </View>

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

import { ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 12,
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
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  progressSection: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 56,
    gap: 4,
  },
  progressTrack: {
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  progressTime: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    textAlign: 'right',
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