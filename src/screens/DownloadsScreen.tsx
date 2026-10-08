import React, { useEffect, useRef, useState } from 'react';
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
import { t } from '../lib/i18n';
import { iconSizes } from '../lib/iconMap';
import { ScreenHeader } from '../components/ScreenHeader';
import { Hairline } from '../components/Hairline';
import { ArabicText } from '../components/ArabicText';
import {
  clearAllDownloads,
  formatBytes,
  removeSurahDownload,
  downloadSurah,
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
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { SURAHS_114 } from '../lib/surahs114';
import {
  useQuranPreload,
  verifyQuranPreloadCache,
  repairQuranPreloadCache,
  QuranPreloadVerification,
} from '../lib/quranPreloader';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { useSettings } from '../lib/settings';


interface DownloadsScreenProps {
  onBack: () => void;
  onOpenSurah?: (surah: number) => void;
}

function DownloadsScreen({ onBack, onOpenSurah }: DownloadsScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const paddingH = isCompact ? 12 : isNarrow ? 16 : 20;

  const { downloadedSurahs, totalStorageUsed } = useSurahDownloads();
  const { playback, status } = useAudioMiniPlayer();
  const { progress: preloadProgress, startPreload, pausePreload } = useQuranPreload();
  const { edition, flag } = useQuranLanguage();
  const { setQuranPreloadRequested } = useSettings();
  const [textVerification, setTextVerification] = useState<QuranPreloadVerification | null>(null);
  const [verifyingText, setVerifyingText] = useState(false);
  const { saveUndoState } = useUndoToast();

  // When everything claims to be cached, prove it by reading the local cache only.
  const autoVerifyDone = useRef(false);
  useEffect(() => {
    if (!preloadProgress.isComplete || autoVerifyDone.current) return;
    autoVerifyDone.current = true;
    let cancelled = false;
    const timer = setTimeout(() => {
      verifyQuranPreloadCache()
        .then((report) => {
          if (!cancelled) setTextVerification(report);
        })
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [preloadProgress.isComplete]);

  const handleQuranTextAction = () => {
    if (preloadProgress.isRunning) {
      pausePreload();
      setQuranPreloadRequested(false);
    } else {
      setQuranPreloadRequested(true);
      startPreload(false);
    }
  };

  const handleVerifyText = async () => {
    if (verifyingText) return;
    setVerifyingText(true);
    try {
      const report = await verifyQuranPreloadCache();
      setTextVerification(report);
    } catch {
      // verification only reads local storage; failures are non-fatal
    } finally {
      setVerifyingText(false);
    }
  };

  const handleRepairText = () => {
    if (!textVerification || textVerification.ok) return;
    setTextVerification(null);
    setQuranPreloadRequested(true);
    repairQuranPreloadCache(textVerification).catch(() => {});
  };

  const handleClearAll = () => {
    if (downloadedSurahs.length === 0) return;
    Alert.alert(
      t('Clear All Downloads'),
      t('Are you sure you want to remove all downloaded surah audio files?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Clear All'),
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
    removeSurahDownload(item.edition, item.surah, item.bitrate).catch(() => {});
    saveUndoState({
      id: `${item.edition}:${item.surah}:${item.bitrate}`,
      action: t('Download removed'),
      revert: () => {
        downloadSurah(item.edition, item.surah, item.bitrate, {
          surahName: item.surahName,
          surahEnglishName: item.surahEnglishName,
        }).catch(() => {});
      },
    });
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
        <ScreenHeader
          eyebrow={t('Offline')}
          title={t('Downloads')}
          onBack={onBack}
          backLabel={t('Library')}
        />

        {/* Quran Text Preload — offline reading data (NOT audio) */}
        <View
          style={[
            styles.textCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              marginHorizontal: paddingH,
            },
          ]}
        >
          <View style={styles.textCardHeader}>
            <View
              style={[
                styles.textIconWrap,
                {
                  backgroundColor: preloadProgress.isRunning || preloadProgress.isComplete
                    ? colors.accentDim
                    : colors.bgRaised,
                },
              ]}
            >
              <Ionicons
                name={
                  preloadProgress.isComplete
                    ? 'book'
                    : preloadProgress.isRunning
                    ? 'cloud-download'
                    : 'book-outline'
                }
                size={16}
                color={
                  preloadProgress.isComplete || preloadProgress.isRunning
                    ? colors.accent
                    : colors.textSecondary
                }
              />
            </View>
            <View style={styles.textHeaderMain}>
              <Text style={[styles.textTitle, { color: colors.textPrimary }]}>
                {t('Quran Text & Translation')}
              </Text>
              <Text style={[styles.textSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
                {t('For offline reading (not audio)')} · {flag} {edition.name}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.textActionBtn,
                {
                  backgroundColor: preloadProgress.isRunning ? colors.bgRaised : colors.accentDim,
                  borderColor: preloadProgress.isRunning ? colors.borderSubtle : colors.accent,
                },
              ]}
              onPress={handleQuranTextAction}
              accessibilityRole="button"
              accessibilityLabel={
                preloadProgress.isRunning
                  ? t('Pause')
                  : preloadProgress.cached > 0
                  ? t('Resume')
                  : t('Preload')
              }
            >
              <Text
                style={[
                  styles.textActionText,
                  { color: preloadProgress.isRunning ? colors.textSecondary : colors.accent },
                ]}
              >
                {preloadProgress.isRunning
                  ? t('Pause')
                  : preloadProgress.cached > 0
                  ? t('Resume')
                  : t('Preload')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.textStatusRow}>
            <Text style={[styles.textStatus, { color: colors.textSecondary }]}>
              {preloadProgress.isRunning
                ? `${t('Downloading text…')} ${preloadProgress.cached}/114` +
                  (preloadProgress.currentSurah
                    ? ` · ${t('Surah')} ${preloadProgress.currentSurah}`
                    : '')
                : preloadProgress.isComplete
                ? t('All 114 surahs available offline')
                : `${preloadProgress.cached}/114 ${t('surahs cached')}`}
            </Text>
            {!preloadProgress.isRunning && (
              <TouchableOpacity
                onPress={handleVerifyText}
                disabled={verifyingText}
                accessibilityRole="button"
                accessibilityLabel={t('Verify locally stored Quran text')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.75}
                style={verifyingText ? { opacity: 0.6 } : undefined}
              >
                <Text style={[styles.textVerifyBtn, { color: colors.accent }]}>
                  {verifyingText ? t('Checking…') : t('Verify')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {preloadProgress.isRunning && (
            <View style={[styles.textTrack, { backgroundColor: colors.bgBase }]}>
              <View
                style={[
                  styles.textFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.max(2, Math.round((preloadProgress.cached / 114) * 100))}%`,
                  },
                ]}
              />
            </View>
          )}

          {textVerification && !textVerification.ok && (
            <View style={[styles.verifyNote, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.verifyNoteText, { color: colors.textMuted }]}>
                {textVerification.valid + textVerification.invalidSurahs.length}/114 {t('verified')} ·{' '}
                {textVerification.missingSurahs.length} {t('missing')} ·{' '}
                {textVerification.invalidSurahs.length} {t('incomplete')}
              </Text>
              <TouchableOpacity
                style={[styles.repairBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim }]}
                onPress={handleRepairText}
                accessibilityRole="button"
                accessibilityLabel={t('Re-download incomplete surahs')}
              >
                <Text style={[styles.repairText, { color: colors.accent }]}>{t('Repair')}</Text>
              </TouchableOpacity>
            </View>
          )}
          {textVerification && textVerification.ok && (
            <Text style={[styles.verifyOkText, { color: colors.accent }]}>
              {t('Verified offline')} · {textVerification.valid}/114 {t('surahs valid')}
            </Text>
          )}
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
                {t('Storage Used')}: {formatBytes(totalStorageUsed)}
              </Text>
            </View>
            <Text style={[styles.storageSub, { color: colors.textMuted }]}>
              {downloadedSurahs.length} {t('surahs saved for offline playback')}
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
              accessibilityLabel={t('Clear all downloads')}
            >
              <Text style={[styles.clearAllText, { color: colors.textSecondary }]}>{t('Clear All')}</Text>
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
                <Ionicons name="cloud-download-outline" size={iconSizes.emptyState} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('No Downloads Yet')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('You can download full surahs from the Quran screen to listen offline without internet.')}
              </Text>
              {onOpenSurah && (
                <TouchableOpacity
                  style={[
                    styles.exploreBtn,
                    { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => onOpenSurah(1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Browse Quran Surahs')}
                >
                  <Text style={[styles.exploreBtnText, { color: colors.onAccent }]}>
                    {t('Browse Surahs')}
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
                    accessibilityLabel={isPlaying ? t('Pause audio') : t('Play audio')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={14}
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
                    accessibilityLabel={`${t('Remove')} ${englishName}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={iconSizes.small} color={colors.textMuted} />
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
  textCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  textCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  textTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  textSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  textActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  textActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  textStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  textStatus: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    flex: 1,
  },
  textVerifyBtn: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  textTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  textFill: {
    height: 4,
    borderRadius: 2,
  },
  verifyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  verifyNoteText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    flex: 1,
  },
  repairBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  repairText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  verifyOkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    marginTop: 8,
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

export default withUndoToast(DownloadsScreen);

