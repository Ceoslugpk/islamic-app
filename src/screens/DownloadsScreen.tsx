import React from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { ArabicText } from '../components/ArabicText';
import {
  clearAllDownloads,
  formatBytes,
  removeSurahDownload,
  useSurahDownloads,
  DownloadedSurahMeta,
} from '../lib/surahDownloads';
import {
  playSurah,
  pause,
  resume,
  resolveReciterName,
} from '../lib/quranAudio';
import { useAudioMiniPlayer } from '../lib/useAudioMiniPlayer';
import { SURAHS_114 } from '../lib/surahs114';


interface DownloadsScreenProps {
  onBack: () => void;
  onOpenSurah?: (surah: number) => void;
}

export default function DownloadsScreen({ onBack, onOpenSurah }: DownloadsScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const paddingH = isCompact ? 12 : isNarrow ? 16 : 20;

  const { downloadedSurahs, totalStorageUsed } = useSurahDownloads();
  const { playback, status } = useAudioMiniPlayer();

  const handleClearAll = () => {
    if (downloadedSurahs.length === 0) return;
    Alert.alert(
      'Clear All Downloads',
      `Are you sure you want to remove all ${downloadedSurahs.length} downloaded surah audio files? This will free up ${formatBytes(totalStorageUsed)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAllDownloads().catch(() => {});
          },
        },
      ]
    );
  };

  const handleRemoveItem = (item: DownloadedSurahMeta) => {
    const summary = SURAHS_114[item.surah - 1];
    const name = item.surahEnglishName || summary?.englishName || `Surah ${item.surah}`;
    Alert.alert(
      'Remove Download',
      `Remove offline audio for ${name} (${formatBytes(item.size)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeSurahDownload(item.edition, item.surah, item.bitrate).catch(() => {});
          },
        },
      ]
    );
  };

  const handleTogglePlay = async (item: DownloadedSurahMeta) => {
    const isThisPlaying =
      playback?.type === 'surah' &&
      playback?.surah === item.surah &&
      playback?.identifier === item.edition;

    if (isThisPlaying) {
      if (status.isPlaying) {
        await pause().catch(() => {});
      } else {
        await resume().catch(() => {});
      }
    } else {
      const summary = SURAHS_114[item.surah - 1];
      const name = item.surahEnglishName || summary?.englishName || `Surah ${item.surah}`;
      await playSurah(item.edition, undefined, name, resolveReciterName(item.edition), item.surah).catch(() => {});
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: paddingH }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Library"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isNarrow ? 13 : 14 }]}>
              ← Library
            </Text>
          </TouchableOpacity>
          <SectionHeader
            compact
            eyebrow="Offline Audio"
            title="Downloads"
            style={styles.sectionHeader}
          />
        </View>

        {/* Storage Summary Card */}
        <View
          style={[
            styles.storageCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              marginHorizontal: paddingH,
            },
          ]}
        >
          <View style={styles.storageInfo}>
            <View style={styles.storageHeaderRow}>
              <Ionicons name="cloud-done-outline" size={16} color={colors.accent} />
              <Text style={[styles.storageTitle, { color: colors.textPrimary }]}>
                Storage Used: {formatBytes(totalStorageUsed)}
              </Text>
            </View>
            <Text style={[styles.storageSub, { color: colors.textMuted }]}>
              {downloadedSurahs.length} {downloadedSurahs.length === 1 ? 'surah' : 'surahs'} saved
              for offline playback
            </Text>
          </View>
          {downloadedSurahs.length > 0 && (
            <TouchableOpacity
              style={[
                styles.clearAllBtn,
                { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
              ]}
              onPress={handleClearAll}
              accessibilityRole="button"
              accessibilityLabel="Clear all downloads"
            >
              <Text style={[styles.clearAllText, { color: colors.textSecondary }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={downloadedSurahs}
          keyExtractor={(item) => `${item.edition}:${item.surah}:${item.bitrate}`}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: paddingH }]}
          ItemSeparatorComponent={() => <Hairline />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                ]}
              >
                <Ionicons name="cloud-download-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Downloads Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                You can download full surahs from the Quran screen to listen offline without internet.
              </Text>
              {onOpenSurah && (
                <TouchableOpacity
                  style={[
                    styles.exploreBtn,
                    { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => onOpenSurah(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Browse Quran Surahs"
                >
                  <Text style={[styles.exploreBtnText, { color: colors.onAccent }]}>
                    Browse Surahs
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const summary = SURAHS_114[item.surah - 1];
            const englishName =
              item.surahEnglishName || summary?.englishName || `Surah ${item.surah}`;
            const arabicName =
              item.surahName || summary?.name || '';
            const reciterLabel = resolveReciterName(item.edition);

            const isPlaying =
              playback?.type === 'surah' &&
              playback?.surah === item.surah &&
              playback?.identifier === item.edition &&
              status.isPlaying;

            return (
              <View
                style={[
                  styles.row,
                  { paddingVertical: isCompact ? 12 : 14, gap: isCompact ? 10 : 12 },
                ]}
              >
                {/* Number Badge */}
                <View
                  style={[
                    styles.numberBadge,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.bgSurface,
                      width: isCompact ? 32 : 36,
                      height: isCompact ? 32 : 36,
                      borderRadius: isCompact ? 16 : 18,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.number,
                      { color: colors.accent, fontSize: isCompact ? 12 : 13 },
                    ]}
                  >
                    {item.surah}
                  </Text>
                </View>

                {/* Details */}
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => onOpenSurah?.(item.surah)}
                  activeOpacity={0.7}
                >
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.englishName,
                        { color: colors.textPrimary, fontSize: isCompact ? 14 : 15 },
                      ]}
                      numberOfLines={1}
                    >
                      {englishName}
                    </Text>
                    {arabicName ? (
                      <ArabicText size={isCompact ? 15 : 16} style={styles.arabicName}>
                        {arabicName}
                      </ArabicText>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.metadataText,
                      { color: colors.textMuted, fontSize: isCompact ? 11 : 12 },
                    ]}
                    numberOfLines={1}
                  >
                    {reciterLabel} · {item.bitrate} kbps · {formatBytes(item.size)}
                  </Text>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.playBtn,
                      {
                        backgroundColor: isPlaying ? colors.accent : colors.bgSurface,
                        borderColor: isPlaying ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => handleTogglePlay(item)}
                    accessibilityRole="button"
                    accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={15}
                      color={isPlaying ? colors.onAccent : colors.accent}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.removeBtn,
                      { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
                    ]}
                    onPress={() => handleRemoveItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove Surah ${englishName} download`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 12,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  storageInfo: {
    flex: 1,
  },
  storageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  storageTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  storageSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  clearAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearAllText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  numberBadge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  number: {
    fontFamily: 'Manrope_700Bold',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
    flexShrink: 1,
  },
  arabicName: {
    textAlign: 'right',
  },
  metadataText: {
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 320,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  exploreBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
