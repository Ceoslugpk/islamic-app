import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeTokens } from '../theme/tokens';
import { t } from '../lib/i18n';
import { iconSizes } from '../lib/iconMap';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, PrimaryButton, OutlineButton, ScreenTabs, SearchField } from '../components/ui';
import { NAV_BOTTOM, NAV_HEIGHT } from '../components/layout/layout.constants';
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
import { useDiagnosticTarget, isDiagnosticModeEnabled } from '../lib/diagnostic';
import {
  useQuranPreload,
  verifyQuranPreloadCache,
  repairQuranPreloadCache,
  QuranPreloadVerification,
} from '../lib/quranPreloader';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { getLocalizedTranslatorName } from '../lib/quranLanguages';
import { useSettings } from '../lib/settings';

interface DownloadsScreenProps {
  onBack: () => void;
  onOpenSurah?: (surah: number) => void;
  backLabel?: string;
}

function DownloadsScreen({
  onBack,
  onOpenSurah,
  backLabel = 'Library',
}: DownloadsScreenProps) {
  const { tokens } = useThemeTokens();
  const isDiag = isDiagnosticModeEnabled();
  const emptyTitleStyle = isDiag ? StyleSheet.flatten(styles.emptyTitle) : undefined;
  const diag = useDiagnosticTarget('downloads-empty-cta-card', isDiag ? {
    actualStyle: emptyTitleStyle,
    targetTestId: 'downloads-empty-cta-text',
    parentTestId: 'downloads-empty-cta-card',
  } : undefined);
  const insets = useSafeAreaInsets();
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
  const [activeTab, setActiveTab] = useState<'all' | 'audio' | 'text'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { saveUndoState } = useUndoToast();

  const bottomClearance = playback
    ? NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 68 + 16
    : undefined;

  const filteredSurahs = useMemo(() => {
    if (activeTab === 'text') return [];
    let list = downloadedSurahs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const summary = SURAHS_114[item.surah - 1];
        const eng = (item.surahEnglishName || summary?.englishName || '').toLowerCase();
        const ar = (item.surahName || summary?.name || '').toLowerCase();
        const num = String(item.surah);
        const reciter = resolveReciterName(item.edition).toLowerCase();
        return eng.includes(q) || ar.includes(q) || num.includes(q) || reciter.includes(q);
      });
    }
    return list;
  }, [downloadedSurahs, activeTab, searchQuery]);

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

  const headerComponent = (
    <View style={{ marginBottom: 12 }}>
      {/* Category Tabs */}
      <ScreenTabs
        scrollable
        tabs={[
          { id: 'all', label: t('All Downloads') },
          { id: 'audio', label: t('Audio Surahs'), badge: downloadedSurahs.length },
          { id: 'text', label: t('Quran Text'), badge: `${preloadProgress.cached}/114` },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        style={{ marginBottom: 12 }}
      />

      {/* Search Field */}
      <View style={{ marginBottom: 12 }}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('Search downloads…')}
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* Quran Text Preload — offline reading data (NOT audio) */}
      {activeTab !== 'audio' && (
        <PremiumCard style={styles.textCard}>
        <View style={styles.textCardHeader}>
          <View
            style={[
              styles.textIconWrap,
              {
                backgroundColor: tokens.ringFill,
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
              size={18}
              color={tokens.accent}
            />
          </View>
          <View style={styles.textHeaderMain}>
            <AppText variant="rowTitle" style={styles.textTitle}>
              {t('Quran Text & Translation')}
            </AppText>
            <AppText variant="subtitle" style={styles.textSubtitle} numberOfLines={3}>
              {t('For offline reading (not audio)')} · {flag} {getLocalizedTranslatorName(edition.editionIdentifier, edition.name)}
            </AppText>
          </View>
          <OutlineButton
            title={
              preloadProgress.isRunning
                ? t('Pause')
                : preloadProgress.cached > 0
                ? t('Resume')
                : t('Preload')
            }
            onPress={handleQuranTextAction}
            style={styles.textActionBtn}
            accessibilityLabel={
              preloadProgress.isRunning
                ? t('Pause')
                : preloadProgress.cached > 0
                ? t('Resume')
                : t('Preload')
            }
          />
        </View>

        <View style={styles.textStatusRow}>
          <AppText variant="caption" style={styles.textStatus}>
            {preloadProgress.isRunning
              ? `${t('Downloading text…')} ${preloadProgress.cached}/114` +
                (preloadProgress.currentSurah
                  ? ` · ${t('Surah')} ${preloadProgress.currentSurah}`
                  : '')
              : preloadProgress.isComplete
              ? t('All 114 surahs available offline')
              : `${preloadProgress.cached}/114 ${t('surahs cached')}`}
          </AppText>
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
              <AppText variant="link" style={styles.textVerifyBtn}>
                {verifyingText ? t('Checking…') : t('Verify')}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {preloadProgress.isRunning && (
          <View style={[styles.textTrack, { backgroundColor: tokens.bgTop }]}>
            <View
              style={[
                styles.textFill,
                {
                  width: `${Math.max(2, Math.round((preloadProgress.cached / 114) * 100))}%`,
                  overflow: 'hidden',
                },
              ]}
            >
              <LinearGradient
                colors={tokens.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </View>
        )}

        {textVerification && !textVerification.ok && (
          <View style={[styles.verifyNote, { borderColor: tokens.cardBorder }]}>
            <AppText variant="caption" style={styles.verifyNoteText}>
              {textVerification.valid + textVerification.invalidSurahs.length}/114 {t('verified')} ·{' '}
              {textVerification.missingSurahs.length} {t('missing')} ·{' '}
              {textVerification.invalidSurahs.length} {t('incomplete')}
            </AppText>
            <OutlineButton
              title={t('Repair')}
              onPress={handleRepairText}
              style={styles.repairBtn}
              accessibilityLabel={t('Re-download incomplete surahs')}
            />
          </View>
        )}
        {textVerification && textVerification.ok && (
          <AppText variant="caption" highlight style={styles.verifyOkText}>
            {t('Verified offline')} · {textVerification.valid}/114 {t('surahs valid')}
          </AppText>
        )}
      </PremiumCard>
      )}

      {/* Storage Summary Card */}
      {activeTab !== 'text' && (
      <PremiumCard style={styles.storageCard} contentStyle={styles.storageCardContent}>
        <View style={styles.storageInfo}>
          <View style={styles.storageHeaderRow}>
            <Ionicons name="cloud-done-outline" size={16} color={tokens.accent} />
            <AppText variant="rowTitle" style={styles.storageTitle}>
              {t('Storage Used')}: {formatBytes(totalStorageUsed)}
            </AppText>
          </View>
          <AppText variant="subtitle" style={styles.storageSub}>
            {downloadedSurahs.length} {t('surahs saved for offline playback')}
          </AppText>
        </View>
        {downloadedSurahs.length > 0 && (
          <OutlineButton
            title={t('Clear All')}
            onPress={handleClearAll}
            style={styles.clearAllBtn}
            accessibilityLabel={t('Clear all downloads')}
          />
        )}
      </PremiumCard>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={styles.detailScreen}
        customPadBottom={bottomClearance}
        header={
          <SubHeader
            eyebrow={t('Offline')}
            title={t('Downloads')}
            subtitle={t('Manage offline audio surahs and cached Quran text')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
        <DetailScreen.FlatList
        style={styles.contentWrap}
        data={filteredSurahs}
          keyExtractor={(item) => `${item.edition}:${item.surah}:${item.bitrate}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: paddingH },
          ]}
          ListHeaderComponent={headerComponent}
          ItemSeparatorComponent={() => null}
          ListEmptyComponent={
            <PremiumCard
              testID={isDiag ? "downloads-empty-cta-card" : undefined}
              style={styles.emptyCard}
              padded
              onLayout={isDiag ? diag.parentProps.onLayout : undefined}
            >
              <View
                testID={isDiag ? "downloads-empty-cta-wrap" : undefined}
                style={styles.emptyWrap}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder },
                  ]}
                >
                  <Ionicons name="cloud-download-outline" size={iconSizes.emptyState} color={tokens.accent} />
                </View>
                <AppText
                  testID={isDiag ? "downloads-empty-cta-text" : undefined}
                  onLayout={isDiag ? diag.targetProps.onLayout : undefined}
                  variant="title"
                  style={styles.emptyTitle}
                >
                  {t('No Downloads Yet')}
                </AppText>
                <AppText variant="subtitle" style={styles.emptySubtitle}>
                  {t('You can download full surahs from the Quran screen to listen offline without internet.')}
                </AppText>
                {onOpenSurah && (
                  <PrimaryButton
                    testID={isDiag ? "downloads-empty-cta-btn" : undefined}
                    title={t('Browse Surahs')}
                    onPress={() => onOpenSurah(1)}
                    accessibilityLabel={t('Browse Quran Surahs')}
                    style={{ alignSelf: 'center', minWidth: 160, maxWidth: '100%', marginTop: 14 }}
                  />
                )}
              </View>
            </PremiumCard>
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
              <PremiumCard style={styles.surahCard} padded>
                <View
                  style={[
                    styles.row,
                    { gap: isCompact ? 10 : 12 },
                  ]}
                >
                  {/* Number Badge */}
                  <View
                    style={[
                      styles.numberBadge,
                      {
                        borderColor: tokens.ringBorder,
                        backgroundColor: tokens.ringFill,
                        width: isCompact ? 32 : 36,
                        height: isCompact ? 32 : 36,
                        borderRadius: isCompact ? 16 : 18,
                      },
                    ]}
                  >
                    <AppText
                      variant="numeral"
                      highlight
                      style={[
                        styles.number,
                        { fontSize: isCompact ? 12 : 13 },
                      ]}
                    >
                      {item.surah}
                    </AppText>
                  </View>

                  {/* Details */}
                  <TouchableOpacity
                    style={styles.rowMain}
                    onPress={() => onOpenSurah?.(item.surah)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.nameRow, isCompact && styles.nameColumn]}>
                      <AppText
                        variant="rowTitle"
                        style={[
                          styles.englishName,
                          { fontSize: isCompact ? 14 : 15 },
                        ]}
                        numberOfLines={1}
                      >
                        {englishName}
                      </AppText>
                      {arabicName ? (
                        <ArabicText size={isCompact ? 15 : 16} style={[styles.arabicName, { color: tokens.arabicName }]}>
                          {arabicName}
                        </ArabicText>
                      ) : null}
                    </View>
                    <AppText
                      variant="caption"
                      style={[
                        styles.metadataText,
                        { fontSize: isCompact ? 11 : 12 },
                      ]}
                      numberOfLines={2}
                    >
                      {reciterLabel} · {item.bitrate} kbps · {formatBytes(item.size)}
                    </AppText>
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.playBtn,
                        {
                          backgroundColor: isPlaying ? undefined : tokens.ringFill,
                          borderColor: isPlaying ? tokens.goldBorder : tokens.ringBorder,
                        },
                      ]}
                      onPress={() => handleTogglePlay(item)}
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? t('Pause audio') : t('Play audio')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isPlaying && (
                        <LinearGradient
                          colors={tokens.goldGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={14}
                        color={isPlaying ? tokens.onGold : tokens.goldText}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.removeBtn,
                        { borderColor: tokens.cardBorder, backgroundColor: 'transparent' },
                      ]}
                      onPress={() => handleRemoveItem(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Remove')} ${englishName}`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={iconSizes.small} color={tokens.muted} />
                    </TouchableOpacity>
                  </View>
                </View>
              </PremiumCard>
            );
          }}
        />
      </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
  },
  surahCard: {
    marginBottom: 10,
  },
  textCard: {
    marginBottom: 12,
  },
  textCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 14,
  },
  textSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  textActionBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    flexShrink: 0,
  },
  textStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  textStatus: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  textVerifyBtn: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    paddingVertical: 2,
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
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  repairBtn: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  verifyOkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginTop: 8,
  },
  storageCard: {
    marginBottom: 12,
  },
  storageInfo: {
    flex: 1,
    minWidth: 0,
  },
  storageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  storageTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  storageSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  clearAllBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  listContent: {},
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
    minHeight: 44,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  nameColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 0,
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
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  playBtn: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  removeBtn: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginTop: 8,
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
    marginBottom: 20,
    maxWidth: 320,
  },

  storageCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});

export default withUndoToast(DownloadsScreen);
