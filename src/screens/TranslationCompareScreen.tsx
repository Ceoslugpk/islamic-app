import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { getBackIcon, getForwardIcon, iconSizes } from '../lib/iconMap';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { ArabicText } from '../components/ArabicText';
import { fetchAyahEditions, fetchSurahList, SurahMeta } from '../lib/quran';
import {
  getEditionForLanguage,
  getLanguageFlag,
  getLocalizedTranslatorName,
  QURAN_LANGUAGE_EDITIONS,
} from '../lib/quranLanguages';
import { getLocalizedLanguageName } from '../lib/surahNamesLocalized';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { hScrollRTLStyle, isRtlScript } from '../lib/rtl';

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
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [currentSurah, setCurrentSurah] = useState<number>(initialSurah);
  const [currentAyah, setCurrentAyah] = useState<number>(initialAyah);

  // Selected languages for comparison (defaulting to English and Urdu)
  const [langA, setLangA] = useState<string>('en');
  const [langB, setLangB] = useState<string>('ur');
  const [showThird, setShowThird] = useState<boolean>(false);
  const [langC, setLangC] = useState<string>('id');

  const [pickerSlot, setPickerSlot] = useState<'A' | 'B' | 'C' | null>(null);

  // Android hardware back: close open language picker modal
  useEffect(() => {
    if (pickerSlot === null) return;
    const onBackPress = () => {
      setPickerSlot(null);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pickerSlot]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [arabicText, setArabicText] = useState<string>('');
  const [trans1Text, setTrans1Text] = useState<string>('');
  const [trans2Text, setTrans2Text] = useState<string>('');
  const [trans3Text, setTrans3Text] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    if (initialSurah) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setCurrentSurah((prev) => (prev !== initialSurah ? initialSurah : prev));
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [initialSurah]);

  useEffect(() => {
    let cancelled = false;
    if (initialAyah) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setCurrentAyah((prev) => (prev !== initialAyah ? initialAyah : prev));
        }
      });
    }
    return () => {
      cancelled = true;
    };
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
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        loadAyah();
      }
    });
    return () => {
      cancelled = true;
    };
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
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Comparative Study')}
          title={t('Translation Compare')}
          subtitle={t('Side-by-side comparative study of translations')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
        />
      }
    >
      <DetailScreen.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: paddingH,
          },
        ]}
      >
          {/* Navigation & Surah Picker Row */}
          <View
            style={[
              styles.selectorCard,
              getCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <View style={styles.selectorHeader}>
              <TouchableOpacity
                onPress={handlePrevAyah}
                disabled={currentSurah === 1 && currentAyah === 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.navArrow,
                  { opacity: currentSurah === 1 && currentAyah === 1 ? 0.3 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('Previous Ayah')}
              >
                <Ionicons name={getBackIcon()} size={20} color={tokens.goldText} />
              </TouchableOpacity>

              <View style={styles.positionInfo}>
                <AppText variant="sectionTitle" style={styles.surahName}>
                  {selectedSurahMeta ? selectedSurahMeta.englishName : `${t('Surah')} ${currentSurah}`}
                </AppText>
                <AppText variant="caption" highlight style={styles.ayahNumber}>
                  {t('Ayah')} {currentAyah} {t('of')} {maxAyahs}
                </AppText>
              </View>

              <TouchableOpacity
                onPress={handleNextAyah}
                disabled={currentSurah === 114 && currentAyah === maxAyahs}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.navArrow,
                  { opacity: currentSurah === 114 && currentAyah === maxAyahs ? 0.3 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('Next Ayah')}
              >
                <Ionicons name={getForwardIcon()} size={20} color={tokens.goldText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Translation Selection Pickers */}
          <View style={styles.editionSelectors}>
            {/* Slot A */}
            <View style={styles.editionCol}>
              <View style={styles.slotHeaderRow}>
                <AppText variant="eyebrow" style={styles.editionLabel}>
                  {t('TRANSLATION')} A · {flagA} {getLocalizedLanguageName(edA.language).toUpperCase()}
                </AppText>
                <TouchableOpacity
                  style={[styles.chooseBtn, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder }]}
                  onPress={() => setPickerSlot('A')}
                  accessibilityRole="button"
                  accessibilityLabel={t('Choose Translation A Language')}
                >
                  <AppText variant="link" style={styles.chooseBtnText}>
                    {t('All Languages...')}
                  </AppText>
                  <Ionicons name={getForwardIcon()} size={iconSizes.badge} color={tokens.goldText} />
                </TouchableOpacity>
              </View>

              {/* Quick pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.pillScroll, hScrollRTLStyle()]}
              >
                {QUICK_LANGS.map((ql) => {
                  const isSelected = langA === ql.code;
                  return (
                    <TouchableOpacity
                      key={`ed1-quick-${ql.code}`}
                      onPress={() => setLangA(ql.code)}
                      style={[
                        styles.choicePill,
                        getPillShadow(mode),
                        {
                          backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                          borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        tone={isSelected ? 'onGold' : 'faint'}
                        style={styles.choicePillText}
                      >
                        {ql.flag} {t(ql.label)}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Slot B */}
            <View style={styles.editionCol}>
              <View style={styles.slotHeaderRow}>
                <AppText variant="eyebrow" style={styles.editionLabel}>
                  {t('TRANSLATION')} B · {flagB} {getLocalizedLanguageName(edB.language).toUpperCase()}
                </AppText>
                <TouchableOpacity
                  style={[styles.chooseBtn, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder }]}
                  onPress={() => setPickerSlot('B')}
                  accessibilityRole="button"
                  accessibilityLabel={t('Choose Translation B Language')}
                >
                  <AppText variant="link" style={styles.chooseBtnText}>
                    {t('All Languages...')}
                  </AppText>
                  <Ionicons name={getForwardIcon()} size={iconSizes.badge} color={tokens.goldText} />
                </TouchableOpacity>
              </View>

              {/* Quick pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.pillScroll, hScrollRTLStyle()]}
              >
                {QUICK_LANGS.map((ql) => {
                  const isSelected = langB === ql.code;
                  return (
                    <TouchableOpacity
                      key={`ed2-quick-${ql.code}`}
                      onPress={() => setLangB(ql.code)}
                      style={[
                        styles.choicePill,
                        getPillShadow(mode),
                        {
                          backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                          borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        tone={isSelected ? 'onGold' : 'faint'}
                        style={styles.choicePillText}
                      >
                        {ql.flag} {t(ql.label)}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Slot C (Optional) */}
            {showThird && (
              <View style={styles.editionCol}>
                <View style={styles.slotHeaderRow}>
                  <AppText variant="eyebrow" style={styles.editionLabel}>
                    {t('TRANSLATION')} C · {flagC} {getLocalizedLanguageName(edC.language).toUpperCase()}
                  </AppText>
                  <TouchableOpacity
                    style={[styles.chooseBtn, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder }]}
                    onPress={() => setPickerSlot('C')}
                    accessibilityRole="button"
                    accessibilityLabel={t('Choose Translation C Language')}
                  >
                    <AppText variant="link" style={styles.chooseBtnText}>
                      {t('All Languages...')}
                    </AppText>
                    <Ionicons name={getForwardIcon()} size={iconSizes.badge} color={tokens.goldText} />
                  </TouchableOpacity>
                </View>

                {/* Quick pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.pillScroll, hScrollRTLStyle()]}
                >
                  {QUICK_LANGS.map((ql) => {
                    const isSelected = langC === ql.code;
                    return (
                      <TouchableOpacity
                        key={`ed3-quick-${ql.code}`}
                        onPress={() => setLangC(ql.code)}
                        style={[
                          styles.choicePill,
                          getPillShadow(mode),
                          {
                            backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                            borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          tone={isSelected ? 'onGold' : 'faint'}
                          style={styles.choicePillText}
                        >
                          {ql.flag} {t(ql.label)}
                        </AppText>
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
                getCardShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
              onPress={() => setShowThird((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showThird ? t('Hide 3rd Translation') : t('Add 3rd Translation for 3-way compare')}
            >
              <Ionicons
                name={showThird ? 'remove-circle-outline' : 'add-circle-outline'}
                size={16}
                color={tokens.goldText}
              />
              <AppText variant="link" style={styles.toggleThirdText}>
                {showThird ? t('Compare 2 Translations') : t('+ Compare 3 Translations')}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Content Box */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={tokens.goldText} />
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <AppText variant="body" tone="danger" style={styles.errorText}>
                {error}
              </AppText>
              <TouchableOpacity
                onPress={loadAyah}
                style={[styles.retryBtn, { borderColor: tokens.goldBorder, backgroundColor: tokens.ringFill }]}
              >
                <AppText variant="link" style={styles.retryBtnText}>
                  {t('Retry')}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultsWrap}>
              {/* Arabic Card */}
              <View
                style={[
                  styles.arabicCard,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <View style={styles.cardEyebrowRow}>
                  <AppText variant="eyebrow" style={styles.cardEyebrow}>
                    {t('ORIGINAL ARABIC')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.ayahBadge}>
                    {currentSurah}:{currentAyah}
                  </AppText>
                </View>
                <ArabicText size={26} style={styles.arabicContent}>
                  {arabicText}
                </ArabicText>
              </View>

              {/* Translation A Card */}
              <View
                style={[
                  styles.transCard,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <View style={styles.cardEyebrowRow}>
                  <View style={styles.authorRow}>
                    <AppText style={styles.flagEmoji}>{flagA}</AppText>
                    <View>
                      <AppText variant="rowTitle" highlight style={styles.transAuthor}>
                        {getLocalizedLanguageName(edA.language)} · {getLocalizedTranslatorName(edA.editionIdentifier, edA.name)}
                      </AppText>
                      <AppText variant="caption" tone="faint" style={styles.editionCode}>
                        {edA.editionIdentifier}
                      </AppText>
                    </View>
                  </View>
                  <View style={[styles.tag, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder, borderWidth: cardTokens.borderWidth }]}>
                    <AppText variant="caption" highlight style={styles.tagText}>A</AppText>
                  </View>
                </View>
                <AppText variant="body" style={[styles.transBody, isRtlScript(langA) ? { textAlign: 'right', writingDirection: 'rtl' } : null]}>
                  {trans1Text}
                </AppText>
              </View>

              {/* Translation B Card */}
              <View
                style={[
                  styles.transCard,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <View style={styles.cardEyebrowRow}>
                  <View style={styles.authorRow}>
                    <AppText style={styles.flagEmoji}>{flagB}</AppText>
                    <View>
                      <AppText variant="rowTitle" highlight style={styles.transAuthor}>
                        {getLocalizedLanguageName(edB.language)} · {getLocalizedTranslatorName(edB.editionIdentifier, edB.name)}
                      </AppText>
                      <AppText variant="caption" tone="faint" style={styles.editionCode}>
                        {edB.editionIdentifier}
                      </AppText>
                    </View>
                  </View>
                  <View style={[styles.tag, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder, borderWidth: cardTokens.borderWidth }]}>
                    <AppText variant="caption" highlight style={styles.tagText}>B</AppText>
                  </View>
                </View>
                <AppText variant="body" style={[styles.transBody, isRtlScript(langB) ? { textAlign: 'right', writingDirection: 'rtl' } : null]}>
                  {trans2Text}
                </AppText>
              </View>

              {/* Translation C Card (if enabled) */}
              {showThird && (
                <View
                  style={[
                    styles.transCard,
                    getCardShadow(mode),
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.cardEyebrowRow}>
                    <View style={styles.authorRow}>
                      <AppText style={styles.flagEmoji}>{flagC}</AppText>
                      <View>
                        <AppText variant="rowTitle" highlight style={styles.transAuthor}>
                          {getLocalizedLanguageName(edC.language)} · {getLocalizedTranslatorName(edC.editionIdentifier, edC.name)}
                        </AppText>
                        <AppText variant="caption" tone="faint" style={styles.editionCode}>
                          {edC.editionIdentifier}
                        </AppText>
                      </View>
                    </View>
                    <View style={[styles.tag, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder, borderWidth: cardTokens.borderWidth }]}>
                      <AppText variant="caption" highlight style={styles.tagText}>C</AppText>
                    </View>
                  </View>
                  <AppText variant="body" style={[styles.transBody, isRtlScript(langC) ? { textAlign: 'right', writingDirection: 'rtl' } : null]}>
                    {trans3Text}
                  </AppText>
                </View>
              )}

              {/* Action Bar */}
              {onOpenReader && (
                <TouchableOpacity
                  onPress={() => onOpenReader(currentSurah, currentAyah)}
                  style={[
                    styles.openReaderBtn,
                    getCardShadow(mode),
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <AppText variant="link" style={styles.openReaderBtnText}>
                    {t('Open in Surah Reader →')}
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </DetailScreen.ScrollView>

      {/* Language Picker Modal for slot A, B, or C */}
      <QuranLanguageModal
        visible={pickerSlot !== null}
        selectedLanguage={activePickerLang}
        onSelectLanguage={handleSelectLanguageFromModal}
        onClose={() => setPickerSlot(null)}
        title={`${t('Select Translation')} ${pickerSlot || ''}`}
        subtitle={t('Choose any language & edition to compare')}
      />
    </DetailScreen>
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
    paddingHorizontal: 20,
  },
  selectorCard: {
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
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
    minWidth: 44,
    minHeight: 44,
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
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: cardTokens.borderWidth,
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
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 20,
    borderWidth: cardTokens.borderWidth,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: cardTokens.borderWidth,
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
    borderWidth: cardTokens.borderWidth,
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
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
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
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
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
    minHeight: 48,
    borderRadius: 14,
    borderWidth: cardTokens.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  openReaderBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
