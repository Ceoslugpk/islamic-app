import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { Card } from './Card';
import { LiveStreamId, setActiveLiveStream } from '../lib/liveStream';
import { t } from '../lib/i18n';

export const LIVE_VIDEO_ORIGIN_WHITELIST = [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
];

type LiveVideoNavigationRequest = {
  url?: unknown;
  nativeEvent?: { url?: unknown };
};

function getNavigationUrl(request: LiveVideoNavigationRequest): string | null {
  const directUrl = request && typeof request.url === 'string' ? request.url : null;
  if (directUrl) return directUrl;
  return request?.nativeEvent && typeof request.nativeEvent.url === 'string'
    ? request.nativeEvent.url
    : null;
}

function isAllowedLiveVideoOrigin(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && LIVE_VIDEO_ORIGIN_WHITELIST.includes(parsed.origin);
  } catch {
    return false;
  }
}

export function sanitizeYouTubeEmbedUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048 || !isAllowedLiveVideoOrigin(value)) return null;
  try {
    const parsed = new URL(value);
    if (!parsed.pathname.startsWith('/embed/') || parsed.pathname === '/embed/') return null;
    parsed.searchParams.set('playsinline', '1');
    parsed.searchParams.set('enablejsapi', '1');
    return parsed.toString();
  } catch {
    return null;
  }
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;');
}

export function buildLiveVideoHtml(embedUrl: unknown, backgroundColor: string): string {
  const safeUrl = sanitizeYouTubeEmbedUrl(embedUrl);
  if (!safeUrl) return '';
  const safeBackgroundColor = escapeHtmlAttribute(backgroundColor);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: ${safeBackgroundColor}; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="${escapeHtmlAttribute(safeUrl)}"
    frameborder="0"
    sandbox="allow-scripts allow-same-origin"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</body>
</html>`;
}

export function createLiveVideoNavigationHandler(
  reportBlocked: (url: string) => void = (url) => {
    console.warn('[LiveVideoPlayer] Blocked navigation outside the YouTube allow-list:', url);
  },
): (request: LiveVideoNavigationRequest) => boolean {
  return (request) => {
    const url = getNavigationUrl(request);
    if (url && isAllowedLiveVideoOrigin(url)) return true;
    reportBlocked(url || '<missing-url>');
    return false;
  };
}

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
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [webViewFailed, setWebViewFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [webIframeFailed, setWebIframeFailed] = useState(false);
  const [prevEmbedUrl, setPrevEmbedUrl] = useState(embedUrl);
  if (prevEmbedUrl !== embedUrl) {
    setPrevEmbedUrl(embedUrl);
    setWebIframeFailed(false);
  }

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        // 1. Source validation: message MUST come from the active YouTube iframe's contentWindow
        if (!iframeRef.current || !iframeRef.current.contentWindow) return;
        if (event.source !== iframeRef.current.contentWindow) return;

        // 2. Origin validation: message origin must match YouTube embed origins or embedUrl origin
        let expectedOrigin = '';
        if (embedUrl) {
          try {
            expectedOrigin = new URL(embedUrl, window.location.origin).origin;
          } catch {
            // ignore
          }
        }
        const isAllowedOrigin =
          (expectedOrigin !== '' && event.origin === expectedOrigin) ||
          event.origin === 'https://www.youtube.com' ||
          event.origin === 'https://www.youtube-nocookie.com' ||
          event.origin === 'https://youtube.com';

        if (!isAllowedOrigin) return;

        // 3. Payload validation
        let data = event.data;
        if (typeof data === 'string') {
          if (data.startsWith('{') && data.endsWith('}')) {
            data = JSON.parse(data);
          } else {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        // 4. Guard against false failure from normal unstarted state (-1) or normal state transitions
        if (data.event === 'onStateChange') {
          return;
        }
        if (data.info && typeof data.info === 'object' && 'playerState' in data.info) {
          return;
        }

        // 5. Real YouTube production error signals:
        // YouTube IFrame Player API error codes:
        // 2: Invalid parameter (e.g. malformed video ID)
        // 5: HTML5 player error
        // 100: Video not found / removed / private
        // 101: Embedded playback not allowed by owner
        // 150: Same as 101 (embedded playback disallowed)
        const validErrorCodes = [2, 5, 100, 101, 150];
        if (data.event === 'onError') {
          const rawCode = data.info ?? data.data ?? data.errorCode;
          const code = Number(rawCode);
          if (validErrorCodes.includes(code)) {
            setWebIframeFailed(true);
          }
        } else if (data.event === 'infoDelivery' && data.info && typeof data.info === 'object') {
          const rawCode = (data.info as any).errorCode ?? (data.info as any).error;
          const code = Number(rawCode);
          if (validErrorCodes.includes(code)) {
            setWebIframeFailed(true);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [embedUrl, reloadKey]);

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
    return buildLiveVideoHtml(embedUrl, tokens.cardBottom);
  }, [embedUrl, tokens.cardBottom]);
  const safeEmbedUrl = useMemo(() => sanitizeYouTubeEmbedUrl(embedUrl), [embedUrl]);
  const handleWebViewNavigation = useMemo(() => createLiveVideoNavigationHandler(), []);

  // 1. Native HLS available (.m3u8) → native VideoView
  if (hlsUrl && Platform.OS !== 'web') {
    return (
      <View
        style={[
          styles.playerContainer,
          getCardShadow(mode),
          { backgroundColor: tokens.cardBottom, borderColor: tokens.cardBorder },
        ]}
      >
        <VideoView player={player} style={styles.videoView} contentFit="cover" nativeControls />
      </View>
    );
  }

  // 2. Web → YouTube iframe embed with failure detection
  if (Platform.OS === 'web' && safeEmbedUrl) {
    if (webIframeFailed) {
      // fall through to fallback card below
    } else {
      return (
        <View
          style={[
            styles.playerContainer,
            getCardShadow(mode),
            { backgroundColor: tokens.cardBottom, borderColor: tokens.cardBorder },
          ]}
        >
          {React.createElement('iframe', {
            ref: iframeRef,
            key: `web-iframe-${reloadKey}`,
            src: safeEmbedUrl,
            title,
            onError: () => setWebIframeFailed(true),
            style: { width: '100%', height: '100%', border: 0 },
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowFullScreen: true,
          })}
        </View>
      );
    }
  }

  // 3. Native YouTube via WebView (in-app playback)
  if (Platform.OS !== 'web' && safeEmbedUrl && !webViewFailed) {
    return (
      <View style={styles.wrapper}>
        <View
          key={`webview-${reloadKey}`}
          style={[
            styles.playerContainer,
            getCardShadow(mode),
            { backgroundColor: tokens.cardBottom, borderColor: tokens.cardBorder },
          ]}
        >
          <WebView
            source={{ html: webViewHtml, baseUrl: 'https://www.youtube-nocookie.com' }}
            originWhitelist={LIVE_VIDEO_ORIGIN_WHITELIST}
            onShouldStartLoadWithRequest={handleWebViewNavigation}
            style={[styles.webView, { backgroundColor: tokens.cardBottom }]}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadEnd={() => setLoading(false)}
            onError={() => setWebViewFailed(true)}
            onHttpError={() => setWebViewFailed(true)}
          />
          {loading && (
            <View style={[styles.loaderOverlay, { backgroundColor: tokens.overlay }]}>
              <ActivityIndicator color={tokens.goldText} size="small" />
            </View>
          )}
        </View>

        {/* Quick controls underneath native player */}
        <View style={styles.quickControls}>
          <TouchableOpacity
            style={[
              styles.quickBtn,
              getPillShadow(mode),
              { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop },
            ]}
            onPress={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('Reload live stream')}
          >
            <Ionicons name="refresh" size={14} color={tokens.goldText} />
            <AppText variant="rowTitle" style={styles.quickBtnText}>{t('Reload')}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickBtn,
              getPillShadow(mode),
              { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop },
            ]}
            onPress={openYouTube}
            accessibilityRole="button"
            accessibilityLabel={t('Open in YouTube app')}
          >
            <Ionicons name="open-outline" size={14} color={tokens.goldText} />
            <AppText variant="rowTitle" style={styles.quickBtnText}>{t('YouTube App')}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. Fallback card (when WebView is unavailable or failed, or web iframe failed)
  return (
    <Card style={{ marginBottom: 18, padding: 18 }}>
      <View style={styles.nativeCardHeader}>
        <View
          style={[
            styles.tvIconWrap,
            { backgroundColor: mode === 'ink' ? tokens.accentDim : tokens.sageDim },
          ]}
        >
          <Ionicons
            name="tv-outline"
            size={24}
            color={mode === 'ink' ? tokens.goldText : tokens.accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="sectionTitle" style={styles.nativeTitle}>{title}</AppText>
          {subtitle ? (
            <AppText variant="subtitle" style={styles.nativeSub}>{subtitle}</AppText>
          ) : null}
        </View>
      </View>

      <AppText variant="subtitle" style={styles.nativeBody}>
        {webIframeFailed && (
          <AppText variant="subtitle" style={{ marginBottom: 8, fontSize: 13, fontWeight: '600' }}>
            {t('Remote stream unavailable')}
            {'\n'}
          </AppText>
        )}
        {t('Launch the official uninterrupted live stream in the YouTube app or your browser.')}
      </AppText>

      <View style={styles.nativeActions}>
        <TouchableOpacity
          style={[
            styles.primaryActionBtn,
            getPillShadow(mode),
            { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder, borderWidth: 1 },
          ]}
          onPress={openYouTube}
          accessibilityRole="button"
          accessibilityLabel={`Watch ${title} on YouTube`}
        >
          <Ionicons name="play" size={16} color={tokens.goldText} />
          <AppText
            variant="rowTitle"
            style={[
              styles.primaryActionText,
              isCompact && { fontSize: 12.5 },
            ]}
          >
            {t('Watch Live on YouTube')}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Web iframe reload button - shown when web iframe failed */}
      {embedUrl && Platform.OS === 'web' && webIframeFailed && (
        <View style={styles.nativeActions}>
          <TouchableOpacity
            style={[
              styles.primaryActionBtn,
              getPillShadow(mode),
              { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder, borderWidth: 1 },
            ]}
            onPress={() => {
              setWebIframeFailed(false);
              setReloadKey((k) => k + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Reload ${title}`}>
            <Ionicons name="refresh" size={14} color={tokens.goldText} />
            <AppText variant="rowTitle" style={styles.primaryActionText}>{t('Reload')}</AppText>
          </TouchableOpacity>
        </View>
      )}
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
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    borderRadius: 14,
  },
  primaryActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
