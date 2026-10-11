import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  useWindowDimensions,
  DevSettings,
  Alert,
} from 'react-native';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import {
  AppLanguage,
  resolveDeviceAppLanguage,
  setAppLanguage,
  prepareNativeLayoutDirection,
  isRtlLanguage,
  t,
} from '../lib/i18n';
import * as Localization from 'expo-localization';
import {
  QURAN_LANGUAGE_EDITIONS,
  getLanguageFlag,
  getEditionForLanguage,
  getLocalizedTranslatorName,
} from '../lib/quranLanguages';
import { getLocalizedLanguageName } from '../lib/surahNamesLocalized';
import {
  NON_ARABIC_AUDIO_EDITIONS,
  LANGUAGE_AUDIO_EDITIONS,
  DEFAULT_AUDIO_TRANSLATION_EDITION_ID,
  setAudioTranslationEdition,
  getAudioTranslationLangName,
} from '../lib/quranAudio';
import { setQuranTranslationLanguage } from '../lib/quranLanguageState';
import { setOnboardingDone } from '../lib/onboardingState';
import {
  ONBOARDING_DEMO_LOCALES,
  ONBOARDING_LOCALES,
  DEMO_CYCLE_ORDER,
  OnboardingDemoStrings,
} from '../lib/onboardingDemoData';
import { LanguagePickerModal, LanguageItem } from '../components/LanguagePickerModal';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const APP_LANGUAGES_LIST: { code: AppLanguage; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰' },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setLanguage, settings } = useSettings();

  // 1. Initial defaults from device locale
  const deviceLocales = Localization.getLocales();
  const deviceCode = deviceLocales && deviceLocales.length > 0 ? deviceLocales[0].languageCode : 'en';

  const defaultAppLang = useMemo(() => resolveDeviceAppLanguage(deviceCode), [deviceCode]);

  const defaultQuranLang = useMemo(() => {
    if (deviceCode && QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === deviceCode.toLowerCase())) {
      return deviceCode.toLowerCase();
    }
    return defaultAppLang;
  }, [deviceCode, defaultAppLang]);

  const defaultAudioEditionId = useMemo(() => {
    if (deviceCode) {
      const match = LANGUAGE_AUDIO_EDITIONS[deviceCode.toLowerCase()];
      if (match) return match.identifier;
    }
    const matchApp = LANGUAGE_AUDIO_EDITIONS[defaultAppLang];
    if (matchApp) return matchApp.identifier;
    return DEFAULT_AUDIO_TRANSLATION_EDITION_ID;
  }, [deviceCode, defaultAppLang]);

  // Selections
  const [selectedAppLang, setSelectedAppLang] = useState<AppLanguage>(defaultAppLang);
  const [selectedQuranLang, setSelectedQuranLang] = useState<string>(defaultQuranLang);
  const [selectedAudioId, setSelectedAudioId] = useState<string>(defaultAudioEditionId);

  // Modals
  const [modalType, setModalType] = useState<'app' | 'quran' | 'audio' | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Demo auto-cycling state
  const [isDemoActive, setIsDemoActive] = useState(true);
  const [demoIndex, setDemoIndex] = useState(0);
  const demoFadeAnim = useRef(new Animated.Value(1)).current;
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop demo on any user touch
  const stopDemo = useCallback(() => {
    if (!isDemoActive) return;
    setIsDemoActive(false);
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    demoFadeAnim.stopAnimation();
    demoFadeAnim.setValue(1);
  }, [isDemoActive, demoFadeAnim]);

  // Demo auto-cycle effect
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;
      if (reduceMotion) {
        setIsDemoActive(false);
        return;
      }

      function scheduleNext() {
        cycleTimerRef.current = setTimeout(() => {
          if (!mounted || !isDemoActive) return;
          // Crossfade: fade out 0.35s ease-in-out -> advance -> fade in 0.35s
          Animated.timing(demoFadeAnim, {
            toValue: 0.15,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!mounted || !finished || !isDemoActive) return;
            setDemoIndex((prev) => (prev + 1) % DEMO_CYCLE_ORDER.length);
            Animated.timing(demoFadeAnim, {
              toValue: 1,
              duration: 350,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }).start(({ finished: finishIn }) => {
              if (mounted && finishIn && isDemoActive) scheduleNext();
            });
          });
        }, 1600);
      }

      scheduleNext();
    });

    return () => {
      mounted = false;
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
      }
      demoFadeAnim.stopAnimation();
    };
  }, [isDemoActive, demoFadeAnim]);

  // Active strings for rendering
  const currentDemoLocaleKey = DEMO_CYCLE_ORDER[demoIndex];
  const demoStrings: OnboardingDemoStrings = ONBOARDING_DEMO_LOCALES[currentDemoLocaleKey] || ONBOARDING_DEMO_LOCALES.en;

  const selectedStrings: OnboardingDemoStrings = ONBOARDING_LOCALES[selectedAppLang] || ONBOARDING_LOCALES.en;
  const currentStrings = isDemoActive ? demoStrings : selectedStrings;
  const isDemoRtl = isDemoActive ? demoStrings.isRtl : selectedStrings.isRtl;

  // Real selected names
  const activeAppLangObj = useMemo(
    () => APP_LANGUAGES_LIST.find((l) => l.code === selectedAppLang) || APP_LANGUAGES_LIST[0],
    [selectedAppLang]
  );
  const activeQuranEdition = useMemo(
    () => getEditionForLanguage(selectedQuranLang) || getEditionForLanguage('en') || QURAN_LANGUAGE_EDITIONS[1],
    [selectedQuranLang]
  );
  const activeAudioEdition = useMemo(
    () => NON_ARABIC_AUDIO_EDITIONS.find((a) => a.identifier === selectedAudioId) || NON_ARABIC_AUDIO_EDITIONS[0],
    [selectedAudioId]
  );

  // Card display values
  const card1Value = isDemoActive ? demoStrings.nativeName : activeAppLangObj.nativeName;
  const card2Value = isDemoActive
    ? demoStrings.quranTranslationValue
    : `${activeQuranEdition.language} · ${activeQuranEdition.name}`;
  const card3Value = isDemoActive
    ? demoStrings.quranAudioValue
    : `${activeAudioEdition.englishName || activeAudioEdition.name}`;

  // Chips data for Card 1 (App Language)
  const appChips = useMemo(() => {
    const list = APP_LANGUAGES_LIST;
    const currentIdx = list.findIndex((l) => l.code === selectedAppLang);
    const selected = list[currentIdx >= 0 ? currentIdx : 0];
    const others = list.filter((l) => l.code !== selected.code);
    return [selected, ...others.slice(0, 3)];
  }, [selectedAppLang]);

  // Chips data for Card 2 (Quran Translation)
  const quranChips = useMemo(() => {
    const current = activeQuranEdition;
    const popularCodes = ['en', 'ar', 'ur', 'id', 'tr', 'fr', 'hi', 'ml', 'si'];
    const candidates = popularCodes
      .map((c) => getEditionForLanguage(c))
      .filter((e): e is NonNullable<typeof e> => e !== undefined && e.languageCode !== current.languageCode);
    return [current, ...candidates.slice(0, 3)];
  }, [activeQuranEdition]);

  // Chips data for Card 3 (Quran Audio)
  const audioChips = useMemo(() => {
    const current = activeAudioEdition;
    const candidates = NON_ARABIC_AUDIO_EDITIONS.filter((a) => a.identifier !== current.identifier);
    return [current, ...candidates.slice(0, 3)];
  }, [activeAudioEdition]);

  // Items for Modals
  const appModalItems: LanguageItem[] = useMemo(
    () =>
      APP_LANGUAGES_LIST.map((l) => ({
        id: l.code,
        code: l.code,
        name: l.nativeName,
        subName: l.name,
        flag: l.flag,
      })),
    []
  );

  const quranModalItems: LanguageItem[] = useMemo(
    () =>
      QURAN_LANGUAGE_EDITIONS.map((e) => ({
        id: e.languageCode,
        code: e.languageCode,
        name: e.language,
        subName: e.name,
        flag: e.flag,
      })),
    []
  );

  const audioModalItems: LanguageItem[] = useMemo(
    () =>
      NON_ARABIC_AUDIO_EDITIONS.map((a) => ({
        id: a.identifier,
        code: a.language,
        name: getAudioTranslationLangName(a.language),
        subName: a.englishName || a.name,
        flag: getLanguageFlag(a.language),
      })),
    []
  );

  // Handle "Get Started"
  const handleGetStarted = async () => {
    if (isSubmitting) return;
    stopDemo();
    setIsSubmitting(true);

    try {
      // 1. Persist Quran translation language
      await setQuranTranslationLanguage(selectedQuranLang);

      // 2. Persist Audio translation edition
      await setAudioTranslationEdition(selectedAudioId);

      // 3. Persist onboardingDone
      await setOnboardingDone(true);

      // 4. Persist app language through settings writer
      const isSwitchingRTL = isRtlLanguage(selectedAppLang) !== isRtlLanguage(settings.language);
      await Promise.resolve(setLanguage(selectedAppLang));

      // 5. Replace route / notify parent
      onComplete();

      // If RTL layout direction changes on native, trigger reload
      if (Platform.OS !== 'web' && isSwitchingRTL) {
        prepareNativeLayoutDirection(selectedAppLang);
        setTimeout(() => {
          Updates.reloadAsync().catch(() => DevSettings.reload());
        }, 300);
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert(t('Error'), t('Failed to save settings. Please try again.'));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 88,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onTouchStart={stopDemo}
      >
        {/* Header: Logo in green rounded square + ISLAMIC wordmark */}
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Image
              source={
                mode === 'paper'
                  ? require('../../assets/logo-master-black.png')
                  : require('../../assets/logo-master-ivory.png')
              }
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.headerWordmark, { color: colors.textPrimary }]}>ISLAMIC</Text>
        </View>

        {/* Hero Eyebrow, Title, Subtitle wrapped in Animated crossfade */}
        <Animated.View
          style={[
            styles.heroWrap,
            { opacity: demoFadeAnim },
            isDemoRtl && { alignItems: 'flex-end' },
          ]}
        >
          <Text
            style={[
              styles.eyebrow,
              { color: colors.accent },
              isDemoRtl && { textAlign: 'right' },
            ]}
          >
            {currentStrings.welcome}
          </Text>
          <Text
            style={[
              styles.headline,
              { color: colors.textPrimary },
              isDemoRtl && { textAlign: 'right', fontFamily: 'Amiri_700Bold' },
            ]}
          >
            {currentStrings.titleLine1}
            {'\n'}
            {currentStrings.titleLine2}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.textMuted },
              isDemoRtl && { textAlign: 'right' },
            ]}
          >
            {currentStrings.subtitle}
          </Text>
        </Animated.View>

        {/* Three Stacked Cards */}
        <View style={styles.cardsStack}>
          {/* Card 1: App Language */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.cardHeaderPress, isDemoRtl && styles.rowReverse]}
              onPress={() => {
                stopDemo();
                setModalType('app');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${currentStrings.appLanguageLabel}: ${card1Value}`}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.bgRaised }]}>
                <Ionicons name="globe-outline" size={18} color={colors.accent} />
              </View>
              <View style={[styles.cardTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
                  {currentStrings.appLanguageLabel}
                </Text>
                <Animated.Text
                  style={[
                    styles.cardValue,
                    { color: colors.textPrimary, opacity: demoFadeAnim },
                    isDemoRtl && { textAlign: 'right' },
                  ]}
                  numberOfLines={1}
                >
                  {card1Value}
                </Animated.Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  {currentStrings.appLanguageDesc}
                </Text>
              </View>
              <Ionicons
                name={isDemoRtl ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Chips row */}
            <View style={[styles.chipsRow, isDemoRtl && styles.rowReverse]}>
              {appChips.map((item) => {
                const isSelected = item.code === selectedAppLang;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.accentDim : colors.bgRaised,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    onPress={() => {
                      stopDemo();
                      setSelectedAppLang(item.code);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={item.nativeName}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {item.nativeName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle }]}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={() => {
                  stopDemo();
                  setModalType('app');
                }}
                accessibilityRole="button"
                accessibilityLabel="Show all app languages"
              >
                <Text style={[styles.chipText, { color: colors.textMuted }]}>
                  {isDemoActive ? demoStrings.moreSuffix : '+ more'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 2: Quran Translation */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.cardHeaderPress, isDemoRtl && styles.rowReverse]}
              onPress={() => {
                stopDemo();
                setModalType('quran');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${currentStrings.quranTranslationLabel}: ${card2Value}`}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.bgRaised }]}>
                <Ionicons name="book-outline" size={18} color={colors.accent} />
              </View>
              <View style={[styles.cardTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
                  {currentStrings.quranTranslationLabel}
                </Text>
                <Animated.Text
                  style={[
                    styles.cardValue,
                    { color: colors.textPrimary, opacity: demoFadeAnim },
                    isDemoRtl && { textAlign: 'right' },
                  ]}
                  numberOfLines={1}
                >
                  {card2Value}
                </Animated.Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  {currentStrings.quranTranslationDesc}
                </Text>
              </View>
              <Ionicons
                name={isDemoRtl ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Chips row */}
            <View style={[styles.chipsRow, isDemoRtl && styles.rowReverse]}>
              {quranChips.map((item) => {
                const isSelected = item.languageCode === selectedQuranLang;
                return (
                  <TouchableOpacity
                    key={item.languageCode}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.accentDim : colors.bgRaised,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    onPress={() => {
                      stopDemo();
                      setSelectedQuranLang(item.languageCode);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={item.language}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {item.language}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle }]}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={() => {
                  stopDemo();
                  setModalType('quran');
                }}
                accessibilityRole="button"
                accessibilityLabel="Show all 40+ Quran translation languages"
              >
                <Text style={[styles.chipText, { color: colors.textMuted }]}>
                  + 40 more
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 3: Quran Audio */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.cardHeaderPress, isDemoRtl && styles.rowReverse]}
              onPress={() => {
                stopDemo();
                setModalType('audio');
              }}
              accessibilityRole="button"
              accessibilityLabel={`${currentStrings.quranAudioLabel}: ${card3Value}`}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.bgRaised }]}>
                <Ionicons name="headset-outline" size={18} color={colors.accent} />
              </View>
              <View style={[styles.cardTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
                  {currentStrings.quranAudioLabel}
                </Text>
                <Animated.Text
                  style={[
                    styles.cardValue,
                    { color: colors.textPrimary, opacity: demoFadeAnim },
                    isDemoRtl && { textAlign: 'right' },
                  ]}
                  numberOfLines={1}
                >
                  {card3Value}
                </Animated.Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  {currentStrings.quranAudioDesc}
                </Text>
              </View>
              <Ionicons
                name={isDemoRtl ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Chips row */}
            <View style={[styles.chipsRow, isDemoRtl && styles.rowReverse]}>
              {audioChips.map((item) => {
                const isSelected = item.identifier === selectedAudioId;
                const langName = getAudioTranslationLangName(item.language);
                return (
                  <TouchableOpacity
                    key={item.identifier}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.accentDim : colors.bgRaised,
                        borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    onPress={() => {
                      stopDemo();
                      setSelectedAudioId(item.identifier);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={langName}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {langName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle }]}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={() => {
                  stopDemo();
                  setModalType('audio');
                }}
                accessibilityRole="button"
                accessibilityLabel="Show all Quran translation audio editions"
              >
                <Text style={[styles.chipText, { color: colors.textMuted }]}>
                  + 10 more
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Container inside safe area */}
      <View
        style={[
          styles.bottomContainer,
          {
            backgroundColor: colors.bgBase,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          onPress={handleGetStarted}
          disabled={isSubmitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={currentStrings.getStarted}
        >
          <View style={[styles.btnInnerRow, isDemoRtl && styles.rowReverse]}>
            <Text style={[styles.btnText, { color: colors.onAccent }]}>
              {currentStrings.getStarted}
            </Text>
            <Ionicons
              name={isDemoRtl ? 'arrow-back' : 'arrow-forward'}
              size={18}
              color={colors.onAccent}
            />
          </View>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {currentStrings.footerNote}
        </Text>
      </View>

      {/* Modals */}
      <LanguagePickerModal
        visible={modalType === 'app'}
        onClose={() => setModalType(null)}
        title="App Language"
        subtitle="Choose your preferred UI language"
        eyebrow="APP LANGUAGE"
        items={appModalItems}
        selectedId={selectedAppLang}
        onSelect={(item) => setSelectedAppLang(item.code as AppLanguage)}
        searchPlaceholder="Search language..."
      />

      <LanguagePickerModal
        visible={modalType === 'quran'}
        onClose={() => setModalType(null)}
        title="Quran Translation"
        subtitle="Choose translation edition & language"
        eyebrow="TRANSLATION"
        items={quranModalItems}
        selectedId={selectedQuranLang}
        onSelect={(item) => setSelectedQuranLang(item.code)}
        searchPlaceholder="Search language or translator..."
      />

      <LanguagePickerModal
        visible={modalType === 'audio'}
        onClose={() => setModalType(null)}
        title="Quran Audio"
        subtitle="Choose translation recitation language"
        eyebrow="AUDIO TRANSLATION"
        items={audioModalItems}
        selectedId={selectedAudioId}
        onSelect={(item) => setSelectedAudioId(item.id)}
        searchPlaceholder="Search audio translation..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  logoBox: {
    width: 25,
    height: 25,
    borderRadius: 6,
    backgroundColor: '#105A4B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 17,
    height: 17,
  },
  headerWordmark: {
    fontFamily: 'SourceSans3_500Medium',
    fontSize: 13,
    letterSpacing: 4,
  },
  heroWrap: {
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 36,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  cardsStack: {
    gap: 10,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 48,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  iconBox: {
    width: 35,
    height: 35,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  cardDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  footerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    textAlign: 'center',
  },
});
