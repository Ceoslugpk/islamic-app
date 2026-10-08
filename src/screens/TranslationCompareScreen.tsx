import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { iconSizes } from '../lib/iconMap';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { fetchAyahEditions, fetchSurahList, SurahMeta } from '../lib/quran';
import {
  getEditionForLanguage,
  getLanguageFlag,
  QURAN_LANGUAGE_EDITIONS,
} from '../lib/quranLanguages';
import { QuranLanguageModal } from '../components/QuranLanguageModal';

interface TranslationCompareScreenProps {
  initialSurah?: number;
  initialAyah?: number;
  onBack?: () => void;
  onOpenReader?: (surah: number, ayah: number) => void;
}

const QUICK_LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ur', label: 'Urdu', flag: '🇵🇰' },
  { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
];

export default function TranslationCompareScreen({
  initialSurah = 1,
  initialAyah = 1,
  onBack,
  onOpenReader,
}: TranslationCompareScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [currentSurah, setCurrentSurah] = useState<number>(initialSurah);
  const [currentAyah, setCurrentAyah] = useState<number>(initialAyah);

  // Selected languages for comparison (defaulting to English and Urdu)
  const [langA, setLangA] = useState<string>('en');
  const [langB, setLangB] = useState<string>('ur');
  const [showThird, setShowThird] = useState<boolean>(false);
  const [langC, setLangC] = useState<string>('id');

  const [pickerSlot, setPickerSlot] = useState<'A' | 'B' | 'C' | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [arabicText, setArabicText] = useState<string>('');
  const [trans1Text, setTrans1Text] = useState<string>('');
  const [trans2Text, setTrans2Text] = useState<string>('');
  const [trans3Text, setTrans3Text] = useState<string>('');

  useEffect(() => {
    if (initialSurah) {
      setCurrentSurah((prev) => (prev !== initialSurah ? initialSurah : prev));
    }
  }, [initialSurah]);

  useEffect(() => {
    if (initialAyah) {
      setCurrentAyah((prev) => (prev !== initialAyah ? initialAyah : prev));
    }
  }, [initialAyah]);

  useEffect(() => {
    fetchSurahList().then(setSurahs).catch(() => {});
  }, []);

  const selectedSurahMeta = surahs.find((s) => s.number === currentSurah);
  const maxAyahs = selectedSurahMeta?.numberOfAyahs || 7;

  const edA = getEditionForLanguage(langA) || QURAN_LANGUAGE_EDITIONS[1];
  const edB = getEditionForLanguage(langB) || QURAN_LANGUAGE_EDITIONS[2];
  const edC = getEditionForLanguage(langC) || QURAN_LANGUAGE_EDITIONS[3];

  const flagA = getLanguageFlag(langA);
  const flagB = getLanguageFlag(langB);
  const flagC = getLanguageFlag(langC);

  const loadAyah = useCallback(async () => {
    setLoading(true);
    setError(null);
    setArabicText('');
    setTrans1Text('');
    setTrans2Text('');
    setTrans3Text('');
    try {
      const editions = [
        'quran-uthmani',
        edA.editionIdentifier,
        edB.editionIdentifier,
        ...(showThird ? [edC.editionIdentifier] : []),
      ];
      const result = await fetchAyahEditions(currentSurah, currentAyah, editions);
      setArabicText(result['quran-uthmani'] || '');
      setTrans1Text(result[edA.editionIdentifier] || t('Translation not available'));
      setTrans2Text(result[edB.editionIdentifier] || t('Translation not available'));
      if (showThird) {
        setTrans3Text(result[edC.editionIdentifier] || t('Translation not available'));
      }
    } catch {
      setError(t('Could not load translations. Check your connection.'));
    } finally {
      setLoading(false);
    }
  }, [currentSurah, currentAyah, edA.editionIdentifier, edB.editionIdentifier, edC.editionIdentifier, showThird]);

  useEffect(() => {
    loadAyah();
  }, [loadAyah]);

  const handlePrevAyah = () => {
    if (currentAyah > 1) {
      setCurrentAyah((a) => a - 1);
    } else if (currentSurah > 1) {
      const prevSurahMeta = surahs.find((s) => s.number === currentSurah - 1);
      setCurrentSurah((s) => s - 1);
      setCurrentAyah(prevSurahMeta?.numberOfAyahs || 1);
    }
  };

  const handleNextAyah = () => {
    if (currentAyah < maxAyahs) {
      setCurrentAyah((a) => a + 1);
    } else if (currentSurah < 114) {
      setCurrentSurah((s) => s + 1);
      setCurrentAyah(1);
    }
  };

  const handleSelectLanguageFromModal = (code: string) => {
    if (pickerSlot === 'A') setLangA(code);
    else if (pickerSlot === 'B') setLangB(code);
    else if (pickerSlot === 'C') setLangC(code);
  };

  const activePickerLang =
    pickerSlot === 'A' ? langA : pickerSlot === 'B' ? langB : langC;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        eyebrow={t('Comparative Study')}
        title={t('Translation Compare')}
        onBack={onBack}
        backLabel={t('Quran')}
      />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Navigation & Surah Picker Row */}
          <View
            style={[
              styles.selectorCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.selectorHeader}>
              <TouchableOpacity
                onPress={handlePrevAyah}
                disabled={currentSurah === 1 && currentAyah === 1}
                style={[
                  styles.navArrow,
                  { opacity: currentSurah === 1 && currentAyah === 1 ? 0.3 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('Previous Ayah')}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
              </TouchableOpacity>

              <View style={styles.positionInfo}>
                <Text style={[styles.surahName, { color: colors.textPrimary }]}>
                  {selectedSurahMeta ? selectedSurahMeta.englishName : `${t('Surah')} ${currentSurah}`}
                </Text>
                <Text style={[styles.ayahNumber, { color: colors.accent }]}>
                  {t('Ayah')} {currentAyah} {t('of')} {maxAyahs}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleNextAyah}
                disabled={currentSurah === 114 && currentAyah === maxAyahs}
                style={[
                  styles.navArrow,
                  { opacity: currentSurah === 114 && currentAyah === maxAyahs ? 0.3 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('Next Ayah')}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Translation Selection Pickers */}
          <View style={styles.editionSelectors}>
            {/* Slot A */}
            <View style={styles.editionCol}>
              <View style={styles.slotHeaderRow}>
                <Text style={[styles.editionLabel, { color: colors.accent }]}>
                  {t('TRANSLATION')} A · {flagA} {edA.language.toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={[styles.chooseBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                  onPress={() => setPickerSlot('A')}
                  accessibilityRole="button"
                  accessibilityLabel={t('Choose Translation A Language')}
                >
                  <Text style={[styles.chooseBtnText, { color: colors.accent }]}>
                    {t('All Languages...')}
                  </Text>
                  <Ionicons name="chevron-forward" size={iconSizes.badge} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Quick pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillScroll}
              >
                {QUICK_LANGS.map((ql) => {
                  const isSelected = langA === ql.code;
                  return (
                    <TouchableOpacity
                      key={`ed1-quick-${ql.code}`}
                      onPress={() => setLangA(ql.code)}
                      style={[
                        styles.choicePill,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                          borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.choicePillText,
                          { color: isSelected ? colors.onAccent : colors.textSecondary },
                        ]}
                      >
                        {ql.flag} {t(ql.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Slot B */}
            <View style={styles.editionCol}>
              <View style={styles.slotHeaderRow}>
                <Text style={[styles.editionLabel, { color: colors.accent }]}>
                  {t('TRANSLATION')} B · {flagB} {edB.language.toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={[styles.chooseBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                  onPress={() => setPickerSlot('B')}
                  accessibilityRole="button"
                  accessibilityLabel={t('Choose Translation B Language')}
                >
                  <Text style={[styles.chooseBtnText, { color: colors.accent }]}>
                    {t('All Languages...')}
                  </Text>
                  <Ionicons name="chevron-forward" size={iconSizes.badge} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Quick pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillScroll}
              >
                {QUICK_LANGS.map((ql) => {
                  const isSelected = langB === ql.code;
                  return (
                    <TouchableOpacity
                      key={`ed2-quick-${ql.code}`}
                      onPress={() => setLangB(ql.code)}
                      style={[
                        styles.choicePill,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                          borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.choicePillText,
                          { color: isSelected ? colors.onAccent : colors.textSecondary },
                        ]}
                      >
                        {ql.flag} {t(ql.label)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Slot C (Optional) */}
            {showThird && (
              <View style={styles.editionCol}>
                <View style={styles.slotHeaderRow}>
                  <Text style={[styles.editionLabel, { color: colors.accent }]}>
                    {t('TRANSLATION')} C · {flagC} {edC.language.toUpperCase()}
                  </Text>
                  <TouchableOpacity
                    style={[styles.chooseBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                    onPress={() => setPickerSlot('C')}
                    accessibilityRole="button"
                    accessibilityLabel={t('Choose Translation C Language')}
                  >
                    <Text style={[styles.chooseBtnText, { color: colors.accent }]}>
                      {t('All Languages...')}
                    </Text>
                    <Ionicons name="chevron-forward" size={iconSizes.badge} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                {/* Quick pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillScroll}
                >
                  {QUICK_LANGS.map((ql) => {
                    const isSelected = langC === ql.code;
                    return (
                      <TouchableOpacity
                        key={`ed3-quick-${ql.code}`}
                        onPress={() => setLangC(ql.code)}
                        style={[
                          styles.choicePill,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choicePillText,
                            { color: isSelected ? colors.onAccent : colors.textSecondary },
                          ]}
                        >
                          {ql.flag} {t(ql.label)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Toggle 3rd Column button */}
            <TouchableOpacity
              style={[
                styles.toggleThirdBtn,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              onPress={() => setShowThird((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showThird ? t('Hide 3rd Translation') : t('Add 3rd Translation for 3-way compare')}
            >
              <Ionicons
                name={showThird ? 'remove-circle-outline' : 'add-circle-outline'}
                size={16}
                color={colors.accent}
              />
              <Text style={[styles.toggleThirdText, { color: colors.accent }]}>
                {showThird ? t('Compare 2 Translations') : t('+ Compare 3 Translations')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Box */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={loadAyah}
                style={[styles.retryBtn, { borderColor: colors.accent }]}
              >
                <Text style={[styles.retryBtnText, { color: colors.accent }]}>
                  {t('Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultsWrap}>
              {/* Arabic Card */}
              <View
                style={[
                  styles.arabicCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.cardEyebrowRow}>
                  <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
                    {t('ORIGINAL ARABIC')}
                  </Text>
                  <Text style={[styles.ayahBadge, { color: colors.textMuted }]}>
                    {currentSurah}:{currentAyah}
                  </Text>
                </View>
                <ArabicText size={26} style={styles.arabicContent}>
                  {arabicText}
                </ArabicText>
              </View>

              {/* Translation A Card */}
              <View
                style={[
                  styles.transCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.cardEyebrowRow}>
                  <View style={styles.authorRow}>
                    <Text style={styles.flagEmoji}>{flagA}</Text>
                    <View>
                      <Text style={[styles.transAuthor, { color: colors.accent }]}>
                        {edA.language} · {edA.name}
                      </Text>
                      <Text style={[styles.editionCode, { color: colors.textMuted }]}>
                        {edA.editionIdentifier}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tag, { backgroundColor: colors.accentDim }]}>
                    <Text style={[styles.tagText, { color: colors.accent }]}>A</Text>
                  </View>
                </View>
                <Text style={[styles.transBody, { color: colors.textPrimary }]}>
                  {trans1Text}
                </Text>
              </View>

              {/* Translation B Card */}
              <View
                style={[
                  styles.transCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={styles.cardEyebrowRow}>
                  <View style={styles.authorRow}>
                    <Text style={styles.flagEmoji}>{flagB}</Text>
                    <View>
                      <Text style={[styles.transAuthor, { color: colors.accent }]}>
                        {edB.language} · {edB.name}
                      </Text>
                      <Text style={[styles.editionCode, { color: colors.textMuted }]}>
                        {edB.editionIdentifier}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tag, { backgroundColor: colors.accentDim }]}>
                    <Text style={[styles.tagText, { color: colors.accent }]}>B</Text>
                  </View>
                </View>
                <Text style={[styles.transBody, { color: colors.textPrimary }]}>
                  {trans2Text}
                </Text>
              </View>

              {/* Translation C Card (if enabled) */}
              {showThird && (
                <View
                  style={[
                    styles.transCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.cardEyebrowRow}>
                    <View style={styles.authorRow}>
                      <Text style={styles.flagEmoji}>{flagC}</Text>
                      <View>
                        <Text style={[styles.transAuthor, { color: colors.accent }]}>
                          {edC.language} · {edC.name}
                        </Text>
                        <Text style={[styles.editionCode, { color: colors.textMuted }]}>
                          {edC.editionIdentifier}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tag, { backgroundColor: colors.accentDim }]}>
                      <Text style={[styles.tagText, { color: colors.accent }]}>C</Text>
                    </View>
                  </View>
                  <Text style={[styles.transBody, { color: colors.textPrimary }]}>
                    {trans3Text}
                  </Text>
                </View>
              )}

              {/* Action Bar */}
              {onOpenReader && (
                <TouchableOpacity
                  onPress={() => onOpenReader(currentSurah, currentAyah)}
                  style={[
                    styles.openReaderBtn,
                    {
                      backgroundColor: colors.accentDim,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text style={[styles.openReaderBtnText, { color: colors.accent }]}>
                    {t('Open in Surah Reader →')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

      {/* Language Picker Modal for slot A, B, or C */}
      <QuranLanguageModal
        visible={pickerSlot !== null}
        selectedLanguage={activePickerLang}
        onSelectLanguage={handleSelectLanguageFromModal}
        onClose={() => setPickerSlot(null)}
        title={`${t('Select Translation')} ${pickerSlot || ''}`}
        subtitle={t('Choose any language & edition to compare')}
      />
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
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  selectorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navArrow: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  positionInfo: {
    alignItems: 'center',
    flex: 1,
  },
  surahName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  ayahNumber: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  editionSelectors: {
    gap: 14,
    marginBottom: 16,
  },
  editionCol: {
    gap: 6,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chooseBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  pillScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  choicePillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  toggleThirdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  toggleThirdText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
  resultsWrap: {
    gap: 12,
  },
  arabicCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  ayahBadge: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    flexShrink: 0,
  },
  arabicContent: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 42,
  },
  transCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  flagEmoji: {
    fontSize: 20,
  },
  transAuthor: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  editionCode: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
  },
  tag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  transBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  openReaderBtn: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 6,
  },
  openReaderBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
