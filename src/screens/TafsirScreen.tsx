import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { fetchSurah, fetchSurahList, fetchSurahTafsir, SurahDetail, SurahMeta } from '../lib/quran';

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
  const [currentSurah, setCurrentSurah] = useState<number>(surahNumber);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [tafsirList, setTafsirList] = useState<Array<{ ayahNumber: number; text: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Surah selector modal state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchSurahList().then(setSurahs).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, tafsirs] = await Promise.all([
        fetchSurah(currentSurah, false),
        fetchSurahTafsir(currentSurah),
      ]);
      setSurahDetail(detail);
      setTafsirList(tafsirs);
    } catch {
      setError('Could not load Tafsir. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [currentSurah]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSurahs = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.number.toString().includes(searchQuery)
  );

  const selectedSurahMeta = surahs.find((s) => s.number === currentSurah);

  const renderAyahItem = ({ item, index }: { item: { ayahNumber: number; text: string }; index: number }) => {
    const arabicAyah = surahDetail?.ayahs[index]?.text || '';
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
              Ayah {item.ayahNumber}
            </Text>
          </View>
          {onOpenReader && (
            <TouchableOpacity
              onPress={() => onOpenReader(currentSurah, item.ayahNumber)}
              style={styles.readerLink}
              accessibilityRole="button"
              accessibilityLabel={`Read Ayah ${item.ayahNumber} in Reader`}
            >
              <Text style={[styles.readerLinkText, { color: colors.accent }]}>
                Reader →
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
            تفسير الجلالين (TAFSIR AL-JALALAYN)
          </Text>
          <ArabicText size={18} style={styles.tafsirBody}>
            {item.text}
          </ArabicText>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to Quran"
              onPress={onBack}
              style={styles.backBtn}
            >
              <Text style={[styles.backText, { color: colors.accent }]}>
                ← Quran
              </Text>
            </TouchableOpacity>
          )}
          <SectionHeader eyebrow="Exegesis & Commentary" title="Tafsir al-Jalalayn" />

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
            accessibilityLabel="Change Surah"
          >
            <View style={styles.selectorBtnMain}>
              <Text style={[styles.selectorEyebrow, { color: colors.accent }]}>
                SURAH {currentSurah}
              </Text>
              <Text
                style={[styles.selectorTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {selectedSurahMeta ? selectedSurahMeta.englishName : `Surah ${currentSurah}`}
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
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading Tafsir al-Jalalayn...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={loadData}
              style={[styles.retryBtn, { borderColor: colors.accent }]}
            >
              <Text style={[styles.retryBtnText, { color: colors.accent }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
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
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bgBase }]}>
          <View style={styles.modalContentWrap}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Surah
              </Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrap}>
              <TextInput
                placeholder="Search Surah by name or number..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[
                  styles.modalSearchInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              />
            </View>

            <FlatList
              data={filteredSurahs}
              keyExtractor={(item) => String(item.number)}
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
                          {item.englishNameTranslation} · {item.numberOfAyahs} ayahs
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
  modalContainer: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  modalContentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
