import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ActiveLiveStream, toggleLiveStreamPlayPause } from '../lib/liveStream';
import { t } from '../lib/i18n';

interface LiveMiniPlayerProps {
  stream: ActiveLiveStream;
  onClose: () => void;
  onExpand: () => void;
}

export function LiveMiniPlayer({ stream, onClose, onExpand }: LiveMiniPlayerProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 24, 680);

  return (
    <View
      style={[
        styles.wrapper,
        {
          maxWidth: maxW,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
        onPress={onExpand}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Expand ${stream.title} live stream`}
      >
        {/* Left: Live status badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('LIVE')}</Text>
        </View>

        {/* Center: Title & subtitle */}
        <View style={styles.infoCol}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {stream.title}
          </Text>
          {stream.subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {stream.subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right: Controls */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={toggleLiveStreamPlayPause}
            accessibilityRole="button"
            accessibilityLabel={stream.isPlaying ? 'Pause stream' : 'Play stream'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={stream.isPlaying ? 'pause' : 'play'}
              size={18}
              color={colors.accent}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('Close live stream')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    gap: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF444420',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#EF4444',
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  infoCol: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
