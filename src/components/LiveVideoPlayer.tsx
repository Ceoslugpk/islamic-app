import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../lib/theme';
import { Card } from './Card';
import { LiveStreamId, setActiveLiveStream } from '../lib/liveStream';

/**
 * In-app live video player for Makkah / Madinah / Hajj live screens.
 *
 * Playback strategy (honest + robust):
 * - HLS (.m3u8): played natively via expo-video (VideoView) — Android + iOS + web.
 * - YouTube on Web: rendered via official YouTube iframe embed.
 * - YouTube on Native: rendered in-app via WebView embed (youtube-nocookie with playsinline).
 *   Falls back to clean "Watch Live on YouTube" card if WebView encounters an error.
 * - Collapses into a floating mini player bar above TabBar when navigating away.
 */
export function LiveVideoPlayer({
  id,
  hlsUrl,
  embedUrl,
  watchUrl,
  title,
  subtitle,
}: {
  id?: LiveStreamId;
  hlsUrl?: string;
  embedUrl?: string;
  watchUrl?: string;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [webViewFailed, setWebViewFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Register active stream for mini-player tracking
  useEffect(() => {
    if (id) {
      setActiveLiveStream({
        id,
        title,
        subtitle,
        embedUrl,
        watchUrl,
        hlsUrl,
        isPlaying: true,
      });
    }
  }, [id, title, subtitle, embedUrl, watchUrl, hlsUrl]);

  const player = useVideoPlayer(hlsUrl ?? '', (p: any) => {
    if (hlsUrl) {
      p.loop = true;
      p.play();
    }
  });

  const openYouTube = () => {
    if (watchUrl) Linking.openURL(watchUrl).catch(() => {});
  };

  const webViewHtml = useMemo(() => {
    if (!embedUrl) return '';
    const safeUrl = embedUrl.includes('?')
      ? `${embedUrl}&playsinline=1&enablejsapi=1`
      : `${embedUrl}?playsinline=1&enablejsapi=1`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="${safeUrl}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</body>
</html>`;
  }, [embedUrl]);

  // 1. Native HLS available (.m3u8) → native VideoView
  if (hlsUrl && Platform.OS !== 'web') {
    return (
      <View
        style={[styles.playerContainer, { backgroundColor: '#000', borderColor: colors.borderSubtle }]}
      >
        <VideoView player={player} style={styles.videoView} contentFit="cover" nativeControls />
      </View>
    );
  }

  // 2. Web → YouTube iframe embed
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

  // 3. Native YouTube via WebView (in-app playback)
  if (embedUrl && !webViewFailed) {
    return (
      <View style={styles.wrapper}>
        <View
          key={`webview-${reloadKey}`}
          style={[styles.playerContainer, { backgroundColor: '#000', borderColor: colors.borderSubtle }]}
        >
          <WebView
            source={{ html: webViewHtml, baseUrl: 'https://www.youtube-nocookie.com' }}
            style={styles.webView}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadEnd={() => setLoading(false)}
            onError={() => setWebViewFailed(true)}
            onHttpError={() => setWebViewFailed(true)}
          />
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator color={colors.accent} size="small" />
            </View>
          )}
        </View>

        {/* Quick controls underneath native player */}
        <View style={styles.quickControls}>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
            onPress={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Reload live stream"
          >
            <Ionicons name="refresh" size={14} color={colors.accent} />
            <Text style={[styles.quickBtnText, { color: colors.textSecondary }]}>Reload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
            onPress={openYouTube}
            accessibilityRole="button"
            accessibilityLabel="Open in YouTube app"
          >
            <Ionicons name="open-outline" size={14} color={colors.accent} />
            <Text style={[styles.quickBtnText, { color: colors.textSecondary }]}>YouTube App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. Fallback card (when WebView is unavailable or failed)
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
  wrapper: {
    marginBottom: 18,
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
