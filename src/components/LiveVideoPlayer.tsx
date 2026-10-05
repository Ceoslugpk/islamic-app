import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { Card } from './Card';

/**
 * Mini live video player for Makkah / Madinah / Hajj live screens.
 *
 * Playback strategy (honest + robust):
 * - HLS (.m3u8): played natively via expo-video (VideoView) — Android + iOS + web.
 * - YouTube: cannot be embedded natively (YouTube restricts third-party
 *   playback + ToS). On web we render the official YouTube iframe embed;
 *   on native we show a clean "Watch Live on YouTube" action that opens
 *   the official stream in the YouTube app/browser.
 *
 * Props:
 * - hlsUrl?: string      — native HLS stream (if available)
 * - embedUrl?: string    — YouTube embed URL (web)
 * - watchUrl?: string    — YouTube watch URL (native fallback action)
 * - title / subtitle     — card copy
 */
export function LiveVideoPlayer({
  hlsUrl,
  embedUrl,
  watchUrl,
  title,
  subtitle,
}: {
  hlsUrl?: string;
  embedUrl?: string;
  watchUrl?: string;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const useVideoPlayer = require('expo-video').useVideoPlayer;
  // Hooks must be unconditional: create the player for the HLS URL (no-op when absent).
  const player = useVideoPlayer(hlsUrl ?? '', (p: any) => {
    if (hlsUrl) {
      p.loop = true;
      p.play();
    }
  });

  const openYouTube = () => {
    if (watchUrl) Linking.openURL(watchUrl).catch(() => {});
  };

  // 1. HLS available (native) → real in-app mini player
  if (hlsUrl && Platform.OS !== 'web') {
    const VideoView = require('expo-video').VideoView;
    return (
      <View
        style={[styles.playerContainer, { backgroundColor: '#000', borderColor: colors.borderSubtle }]}
      >
        <VideoView player={player} style={styles.videoView} contentFit="cover" nativeControls />
      </View>
    );
  }

  // 2. Web → official YouTube iframe embed
  if (Platform.OS === 'web' && embedUrl) {
    return (
      <View
        style={[styles.playerContainer, { backgroundColor: '#000000', borderColor: colors.borderSubtle }]}
      >
        {React.createElement('iframe', {
          src: embedUrl,
          title,
          style: { width: '100%', height: '100%', border: 0 },
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          allowFullScreen: true,
        })}
      </View>
    );
  }

  // 3. Native without HLS (or no stream) → clean YouTube fallback card
  return (
    <Card style={{ marginBottom: 18, padding: 18 }}>
      <View style={styles.nativeCardHeader}>
        <View style={[styles.tvIconWrap, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="tv-outline" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nativeTitle, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.nativeSub, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.nativeBody, { color: colors.textSecondary }]}>
        Launch the official uninterrupted live stream in the YouTube app or your browser.
      </Text>

      <View style={styles.nativeActions}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
          onPress={openYouTube}
          accessibilityRole="button"
          accessibilityLabel={`Watch ${title} on YouTube`}
        >
          <Ionicons name="play" size={16} color="#FFFFFF" />
          <Text style={[styles.primaryActionText, isCompact && { fontSize: 12.5 }]}>
            Watch Live on YouTube
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 18,
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  nativeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tvIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  nativeSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  nativeBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  nativeActions: {
    marginTop: 14,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
  },
  primaryActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
