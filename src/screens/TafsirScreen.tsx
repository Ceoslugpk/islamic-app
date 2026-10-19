import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, cardTokens, fontRoles } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCardShadow } from '../lib/homeThemeTokens';
import { TAB_PAD_BOTTOM } from '../components/layout/layout.constants';
import { isRTL, t } from '../lib/i18n';
import { getLocalizedSurahName, normalizeSearchText } from '../lib/surahNamesLocalized';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { SkeletonCard } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { fetchSurah, fetchSurahList, fetchSurahTafsir, SurahDetail, SurahMeta } from '../lib/quran';
import { useSettings } from '../lib/settings';
import { TAFSIR_SOURCES } from '../lib/tafsirSources';
import { isRtlScript } from '../lib/rtl';

interface TafsirScreenProps {
  surahNumber?: number;
  onBack?: () => void;
  onOpenReader?: (surah: number, ayah: number) => void;
}

export default function TafsirScreen({
  surahNumber = 1,
  onBack,
  onOpenReader,
}: TafsirScreenProps) {
  const { tokens, mode } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { settings, setTafsirSourceId } = useSettings();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [currentSurah, setCurrentSurah] = useState<number>(surahNumber);
  const [prevSurahProp, setPrevSurahProp] = useState<number>(surahNumber);
  if (surahNumber !== prevSurahProp) {
    setPrevSurahProp(surahNumber);
    setCurrentSurah(surahNumber);
  }
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [tafsirList, setTafsirList] = useState<{ ayahNumber: number; text: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Surah selector modal state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Tafsir source selector modal state
  const [tafsirSourcePickerOpen, setTafsirSourcePickerOpen] = useState<boolean>(false);

  // Android hardware back: close open picker modals
  useEffect(() => {
    if (!pickerOpen && !tafsirSourcePickerOpen) return;
    const onBackPress = () => {
      if (pickerOpen) {
        setPickerOpen(false);
        return true;
      }
      if (tafsirSourcePickerOpen) {
        setTafsirSourcePickerOpen(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pickerOpen, tafsirSourcePickerOpen]);

  const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
  const tafsirIdentifier = currentTafsirSource.identifier;

  useEffect(() => {
    fetchSurahList().then(setSurahs).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSurahDetail(null);
    setTafsirList([]);
    try {
      const [detail, tafsirs] = await Promise.all([
        fetchSurah(currentSurah, false),
        fetchSurahTafsir(currentSurah, tafsirIdentifier),
      ]);
      setSurahDetail(detail);
      setTafsirList(tafsirs);
    } catch {
      setError(t('Could not load Tafsir. Check your connection.'));
    } finally {
      setLoading(false);
    }
  }, [currentSurah, tafsirIdentifier]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        loadData();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const rawQuery = searchQuery.trim();
  const normQuery = normalizeSearchText(rawQuery);
  const lowerQuery = rawQuery.toLowerCase();
  const filteredSurahs = surahs.filter((s) => {
    if (!normQuery) return true;
    const englishNameMatch = s.englishName.toLowerCase().includes(lowerQuery) ||
      normalizeSearchText(s.englishName).includes(normQuery);
    const urduName = getLocalizedSurahName(s.number, s.englishName);
    const urduMatch = normalizeSearchText(urduName).includes(normQuery) || (normQuery === 'یس' && s.number === 36);
    const arabicMatch = normalizeSearchText(s.name).includes(normQuery);
    const numberMatch = s.number.toString().includes(lowerQuery);
    return englishNameMatch || urduMatch || arabicMatch || numberMatch;
  });

  const selectedSurahMeta = surahs.find((s) => s.number === currentSurah);

  const handleTafsirSourceChange = (sourceId: string) => {
    setTafsirSourceId(sourceId as any);
    setTafsirSourcePickerOpen(false);
  };

  const renderAyahItem = ({ item, index }: { item: { ayahNumber: number; text: string }; index: number }) => {
    const arabicAyah = surahDetail?.ayahs[index]?.text || '';
    const isArabic = currentTafsirSource.languageCode === 'ar';
    return (
      <View
        style={[
          styles.card,
          getCardShadow(mode),
          {
            backgroundColor: tokens.cardTop,
            borderColor: tokens.cardBorder,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.ayahBadge,
              {
                backgroundColor: tokens.ringFill,
                borderColor: tokens.ringBorder,
              },
            ]}
          >
            <AppText variant="caption" highlight style={styles.ayahBadgeText}>
              {t('Ayah')} {item.ayahNumber}
            </AppText>
          </View>
          {onOpenReader && (
            <TouchableOpacity
              onPress={() => onOpenReader(currentSurah, item.ayahNumber)}
              style={styles.readerLink}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${t('Ayah')} ${item.ayahNumber} · ${t('Reader')}`}
            >
              <AppText variant="link" style={styles.readerLinkText}>
                {isRTL() ? `← ${t('Reader')}` : `${t('Reader')} →`}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {arabicAyah ? (
          <ArabicText size={22} style={styles.arabicVerse}>
            {arabicAyah}
          </ArabicText>
        ) : null}

        <Hairline style={styles.cardHairline} />

        <View style={styles.tafsirWrap}>
          <AppText variant="eyebrow" tone="faint" style={styles.tafsirLabel}>
            {currentTafsirSource.name} ({currentTafsirSource.language})
          </AppText>
          {isArabic ? (
            <ArabicText size={18} style={styles.tafsirBody}>
              {item.text}
            </ArabicText>
          ) : (
            <AppText style={[
              styles.tafsirBody,
              currentTafsirSource.languageCode === 'ar' || isRtlScript(currentTafsirSource.languageCode) ? { textAlign: 'right', writingDirection: 'rtl' } : { textAlign: 'left', writingDirection: 'ltr' }
            ]}>
              {item.text}
            </AppText>
          )}
        </View>
      </View>
    );
  };

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Exegesis & Commentary')}
          title={currentTafsirSource.name}
          subtitle={t('Verse-by-verse scholarly exegesis')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
        />
      }
    >
      <View style={styles.contentWrap}>
        <View style={{ paddingHorizontal: paddingH }}>
          {/* Surah Selector Trigger */}
          <TouchableOpacity
            style={[
              styles.selectorBtn,
              getCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Change Surah')}
          >
            <View style={styles.selectorBtnMain}>
              <AppText variant="eyebrow" style={styles.selectorEyebrow}>
                {t('SURAH')} {currentSurah}
              </AppText>
              <AppText
                variant="sectionTitle"
                style={styles.selectorTitle}
                numberOfLines={1}
              >
                {selectedSurahMeta ? getLocalizedSurahName(selectedSurahMeta.number, selectedSurahMeta.englishName) : `${t('Surah')} ${currentSurah}`}
                {selectedSurahMeta ? ` · ${selectedSurahMeta.englishNameTranslation}` : ''}
              </AppText>
            </View>
            <View style={styles.selectorBtnRight}>
              <AppText variant="title" style={[styles.selectorSurahArabic, { color: tokens.arabicName }]}>
                {selectedSurahMeta?.name}
              </AppText>
              <Ionicons name="chevron-down" size={18} color={tokens.muted} />
            </View>
          </TouchableOpacity>

          {/* Tafsir Source Selector */}
          <TouchableOpacity
            style={[
              styles.selectorBtn,
              getCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
            onPress={() => setTafsirSourcePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Change Tafsir Source')}
          >
            <View style={styles.selectorBtnMain}>
              <AppText variant="eyebrow" style={styles.selectorEyebrow}>
                {t('TAFSIR SOURCE')}
              </AppText>
              <AppText
                variant="sectionTitle"
                style={styles.selectorTitle}
                numberOfLines={1}
              >
                {currentTafsirSource.name}
              </AppText>
            </View>
            <View style={styles.selectorBtnRight}>
              <Ionicons name="book-outline" size={20} color={tokens.goldText} />
              <Ionicons name="chevron-down" size={18} color={tokens.muted} />
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <FlatList
            data={Array.from({ length: 5 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderItem={() => <SkeletonCard lines={4} lineHeight={16} style={styles.skeletonCard} />}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingHorizontal: paddingH,
                paddingBottom: TAB_PAD_BOTTOM(insets.bottom),
              },
            ]}
          />
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t("Couldn't load Tafsir")}
            subtitle={error}
            actionLabel={t('Retry')}
            onAction={loadData}
          />
        ) : (
          <FlatList
            data={tafsirList}
            keyExtractor={(item) => String(item.ayahNumber)}
            renderItem={renderAyahItem}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingHorizontal: paddingH,
                paddingBottom: TAB_PAD_BOTTOM(insets.bottom),
              },
            ]}
          />
        )}
      </View>

      {/* Surah Chooser Modal */}
      <Modal
        visible={pickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerOpen(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { backgroundColor: tokens.overlay }]}>
          <TouchableWithoutFeedback onPress={() => setPickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
            <View style={[styles.dragPill, { backgroundColor: tokens.cardBorder }]} />
            <View style={[styles.modalHeader, { borderBottomColor: tokens.cardBorder }]}>
              <AppText variant="sectionTitle" style={styles.modalTitle}>
                {t('Select Surah')}
              </AppText>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={24} color={tokens.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrap}>
              <TextInput
                placeholder={t('Search Surah by name or number...')}
                placeholderTextColor={tokens.muted}
                accessibilityLabel={t('Search Surah by name or number...')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[
                  styles.modalSearchInput,
                  {
                    color: tokens.text,
                    backgroundColor: tokens.inset,
                    borderColor: tokens.cardBorder,
                    fontFamily: isRTL() ? fontRoles.arabicNoto : 'Manrope_400Regular',
                    textAlign: isRTL() ? 'right' : 'left',
                    writingDirection: isRTL() ? 'rtl' : 'ltr',
                    fontSize: isRTL() ? 15 : 14,
                  },
                ]}
              />
            </View>

            <FlatList
              data={filteredSurahs}
              keyExtractor={(item) => String(item.number)}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[
                styles.modalListContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 24 },
              ]}
              renderItem={({ item }) => {
                const isSelected = item.number === currentSurah;
                return (
                  <TouchableOpacity
                    style={[
                      styles.surahOptionRow,
                      {
                        borderBottomColor: tokens.cardBorder,
                        backgroundColor: isSelected ? tokens.ringFill : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setCurrentSurah(item.number);
                      setPickerOpen(false);
                    }}
                  >
                    <View style={styles.surahOptionLeft}>
                      <View
                        style={[
                          styles.surahOptionNum,
                          {
                            backgroundColor: isSelected ? tokens.gold : tokens.ringFill,
                            borderColor: isSelected ? tokens.goldBorder : tokens.ringBorder,
                          },
                        ]}
                      >
                        <AppText
                          variant="numeral"
                          tone={isSelected ? 'onGold' : undefined}
                          highlight={!isSelected}
                          style={styles.surahOptionNumText}
                        >
                          {item.number}
                        </AppText>
                      </View>
                      <View style={styles.surahOptionTextCol}>
                        <AppText
                          variant="rowTitle"
                          style={styles.surahOptionName}
                          numberOfLines={1}
                        >
                          {getLocalizedSurahName(item.number, item.englishName)}
                        </AppText>
                        <AppText
                          variant="caption"
                          tone="faint"
                          style={styles.surahOptionTrans}
                          numberOfLines={1}
                        >
                          {item.englishNameTranslation} · {item.numberOfAyahs} {t('ayahs')}
                        </AppText>
                      </View>
                    </View>
                    <ArabicText size={20} style={styles.surahOptionArabic}>
                      {item.name}
                    </ArabicText>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Tafsir Source Chooser Modal */}
      <Modal
        visible={tafsirSourcePickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setTafsirSourcePickerOpen(false)}
        statusBarTranslucent
      >
        <View style={[styles.modalOverlay, { backgroundColor: tokens.overlay }]}>
          <TouchableWithoutFeedback onPress={() => setTafsirSourcePickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
            <View style={[styles.dragPill, { backgroundColor: tokens.cardBorder }]} />
            <View style={[styles.modalHeader, { borderBottomColor: tokens.cardBorder }]}>
              <AppText variant="sectionTitle" style={styles.modalTitle}>
                {t('Select Tafsir Source')}
              </AppText>
              <TouchableOpacity
                onPress={() => setTafsirSourcePickerOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={24} color={tokens.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={TAFSIR_SOURCES}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              renderItem={({ item }) => {
                const isSelected = item.id === settings.tafsirSourceId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.surahOptionRow,
                      {
                        borderBottomColor: tokens.cardBorder,
                        backgroundColor: isSelected ? tokens.ringFill : 'transparent',
                      },
                    ]}
                    onPress={() => handleTafsirSourceChange(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={isSelected ? `${item.name}, ${t('selected')}` : item.name}
                  >
                    <View style={styles.surahOptionLeft}>
                      <View
                        style={[
                          styles.surahOptionNum,
                          {
                            backgroundColor: isSelected ? tokens.gold : tokens.ringFill,
                            borderColor: isSelected ? tokens.goldBorder : tokens.ringBorder,
                          },
                        ]}
                      >
                        <AppText
                          variant="numeral"
                          tone={isSelected ? 'onGold' : undefined}
                          highlight={!isSelected}
                          style={styles.surahOptionNumText}
                        >
                          {TAFSIR_SOURCES.indexOf(item) + 1}
                        </AppText>
                      </View>
                      <View style={styles.surahOptionTextCol}>
                        <AppText
                          variant="rowTitle"
                          style={styles.surahOptionName}
                          numberOfLines={1}
                        >
                          {item.name}
                        </AppText>
                        <AppText
                          variant="caption"
                          tone="faint"
                          style={styles.surahOptionTrans}
                          numberOfLines={1}
                        >
                          {item.language} · {item.author}
                        </AppText>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={tokens.goldText} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
    marginTop: 6,
    minHeight: 52,
    gap: 10,
  },
  selectorBtnMain: {
    flex: 1,
    marginEnd: 8,
    minWidth: 0,
  },
  selectorEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  selectorTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginTop: 2,
  },
  selectorBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  selectorSurahArabic: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 20,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    gap: 14,
    paddingBottom: 40,
  },
  skeletonCard: {
    borderWidth: cardTokens.borderWidth,
    borderRadius: 16,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ayahBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: cardTokens.borderWidth,
    flexShrink: 0,
  },
  ayahBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  readerLink: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexShrink: 0,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerLinkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  arabicVerse: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 38,
    marginBottom: 12,
  },
  cardHairline: {
    marginBottom: 12,
  },
  tafsirWrap: {
    gap: 6,
  },
  tafsirLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tafsirBody: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 0,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: cardTokens.borderWidth,
    overflow: 'hidden',
    elevation: 16,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: cardTokens.borderWidth,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchWrap: {
    padding: 16,
    paddingBottom: 8,
  },
  modalListContent: {
    paddingBottom: 40,
  },
  modalSearchInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: cardTokens.borderWidth,
    paddingHorizontal: 14,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },
  surahOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: cardTokens.borderWidth,
    gap: 10,
    minHeight: 44,
  },
  surahOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginEnd: 8,
    minWidth: 0,
  },
  surahOptionNum: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: cardTokens.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  surahOptionNumText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  surahOptionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  surahOptionName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    flexShrink: 1,
  },
  surahOptionTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
    flexShrink: 1,
  },
  surahOptionArabic: {
    lineHeight: 26,
    flexShrink: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});