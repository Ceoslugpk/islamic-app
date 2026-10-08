import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, setTafsirSourceId } = useSettings();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [currentSurah, setCurrentSurah] = useState<number>(surahNumber);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [tafsirList, setTafsirList] = useState<Array<{ ayahNumber: number; text: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Surah selector modal state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Tafsir source selector modal state
  const [tafsirSourcePickerOpen, setTafsirSourcePickerOpen] = useState<boolean>(false);

  const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
  const tafsirIdentifier = currentTafsirSource.identifier;

  useEffect(() => {
    if (surahNumber) {
      setCurrentSurah((prev) => (prev !== surahNumber ? surahNumber : prev));
    }
  }, [surahNumber]);

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
    loadData();
  }, [loadData]);

  const filteredSurahs = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.number.toString().includes(searchQuery)
  );

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
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.ayahBadge, { backgroundColor: colors.accentDim }]}>
            <Text style={[styles.ayahBadgeText, { color: colors.accent }]}>
              {t('Ayah')} {item.ayahNumber}
            </Text>
          </View>
          {onOpenReader && (
            <TouchableOpacity
              onPress={() => onOpenReader(currentSurah, item.ayahNumber)}
              style={styles.readerLink}
              accessibilityRole="button"
              accessibilityLabel={`${t('Ayah')} ${item.ayahNumber} · ${t('Reader')}`}
            >
              <Text style={[styles.readerLinkText, { color: colors.accent }]}>
                {t('Reader')} →
              </Text>
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
          <Text style={[styles.tafsirLabel, { color: colors.textMuted }]}>
            {currentTafsirSource.name} ({currentTafsirSource.language})
          </Text>
          {isArabic ? (
            <ArabicText size={18} style={styles.tafsirBody}>
              {item.text}
            </ArabicText>
          ) : (
            <Text style={[
              styles.tafsirBody,
              { color: colors.textPrimary, fontFamily: 'Manrope_400Regular' },
              currentTafsirSource.languageCode === 'ar' || isRtlScript(currentTafsirSource.languageCode) ? { textAlign: 'right', writingDirection: 'rtl' } : { textAlign: 'left', writingDirection: 'ltr' }
            ]}>
              {item.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        <ScreenHeader
          eyebrow={t('Exegesis & Commentary')}
          title={currentTafsirSource.name}
          onBack={onBack}
          backLabel={t('Quran')}
        />

        <View style={{ paddingHorizontal: paddingH }}>
          {/* Surah Selector Trigger */}
          <TouchableOpacity
            style={[
              styles.selectorBtn,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Change Surah')}
          >
            <View style={styles.selectorBtnMain}>
              <Text style={[styles.selectorEyebrow, { color: colors.accent }]}>
                {t('SURAH')} {currentSurah}
              </Text>
              <Text
                style={[styles.selectorTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {selectedSurahMeta ? selectedSurahMeta.englishName : `${t('Surah')} ${currentSurah}`}
                {selectedSurahMeta ? ` · ${selectedSurahMeta.englishNameTranslation}` : ''}
              </Text>
            </View>
            <View style={styles.selectorBtnRight}>
              <Text style={[styles.selectorSurahArabic, { color: colors.accent }]}>
                {selectedSurahMeta?.name}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Tafsir Source Selector */}
          <TouchableOpacity
            style={[
              styles.selectorBtn,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
            onPress={() => setTafsirSourcePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Change Tafsir Source')}
          >
            <View style={styles.selectorBtnMain}>
              <Text style={[styles.selectorEyebrow, { color: colors.accent }]}>
                {t('TAFSIR SOURCE')}
              </Text>
              <Text
                style={[styles.selectorTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {currentTafsirSource.name}
              </Text>
            </View>
            <View style={styles.selectorBtnRight}>
              <Ionicons name="book-outline" size={20} color={colors.accent} />
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <FlatList
            data={Array.from({ length: 5 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderItem={() => <SkeletonCard lines={4} lineHeight={16} style={styles.skeletonCard} />}
            contentContainerStyle={styles.listContent}
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
            contentContainerStyle={styles.listContent}
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
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setPickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Select Surah')}
              </Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrap}>
              <TextInput
                placeholder={t('Search Surah by name or number...')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[
                  styles.modalSearchInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.bgBase,
                    borderColor: colors.borderSubtle,
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
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
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
                            backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.surahOptionNumText,
                            { color: isSelected ? colors.onAccent : colors.textSecondary },
                          ]}
                        >
                          {item.number}
                        </Text>
                      </View>
                      <View style={styles.surahOptionTextCol}>
                        <Text
                          style={[styles.surahOptionName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.englishName}
                        </Text>
                        <Text
                          style={[styles.surahOptionTrans, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {item.englishNameTranslation} · {item.numberOfAyahs} {t('ayahs')}
                        </Text>
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
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setTafsirSourcePickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Select Tafsir Source')}
              </Text>
              <TouchableOpacity
                onPress={() => setTafsirSourcePickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
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
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
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
                            backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.surahOptionNumText,
                            { color: isSelected ? colors.onAccent : colors.textSecondary },
                          ]}
                        >
                          {TAFSIR_SOURCES.indexOf(item) + 1}
                        </Text>
                      </View>
                      <View style={styles.surahOptionTextCol}>
                        <Text
                          style={[styles.surahOptionName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[styles.surahOptionTrans, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {item.language} · {item.author}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    gap: 10,
  },
  selectorBtnMain: {
    flex: 1,
    marginRight: 8,
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
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.14)',
    borderRadius: 12,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
    borderRadius: 6,
    flexShrink: 0,
  },
  ayahBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  readerLink: {
    padding: 4,
    flexShrink: 0,
    minHeight: 32,
    justifyContent: 'center',
  },
  readerLinkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
    borderTopWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  closeBtn: {
    padding: 6,
    minWidth: 40,
    minHeight: 40,
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
    borderWidth: 1,
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
    borderBottomWidth: 1,
    gap: 10,
  },
  surahOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  surahOptionNum: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
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