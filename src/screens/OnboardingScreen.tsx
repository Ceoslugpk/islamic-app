import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  useWindowDimensions,
  DevSettings,
  Alert,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { ThemeColors, ThemeMode } from '../lib/constants';
import { AnimatedBrandBadge, OnboardingThemeToggle } from '../components/AnimatedBrandIcons';
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
  const { setLanguage, settings, setThemeMode } = useSettings();

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
        }, 1800);
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

  // Row display values
  const card1Title = isDemoActive ? demoStrings.nativeName : activeAppLangObj.nativeName;
  const card1Sub = isDemoRtl ? 'القوائم والأزرار' : 'Menus & buttons';

  const card2Title = isDemoActive
    ? (demoStrings.quranTranslationValue.split('·')[0]?.trim() || demoStrings.quranTranslationValue)
    : activeQuranEdition.language;
  const card2Sub = isDemoActive
    ? (demoStrings.quranTranslationValue.includes('·')
        ? demoStrings.quranTranslationValue.split('·')[1]?.trim()
        : 'Saheeh International')
    : activeQuranEdition.name;

  const card3Title = isDemoActive ? demoStrings.quranAudioValue : (getAudioTranslationLangName(activeAudioEdition.language) || 'English');
  const card3Sub = isDemoRtl ? 'أكثر من 10 لغات متاحة' : '10+ languages available';

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

  // Theme crossfade transition state
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [prevMode, setPrevMode] = useState<ThemeMode | null>(null);
  const [prevColors, setPrevColors] = useState<ThemeColors | null>(null);
  const themeCrossfadeAnim = useRef(new Animated.Value(0)).current;

  // Cleanup theme transition on unmount
  useEffect(() => {
    return () => {
      themeCrossfadeAnim.stopAnimation();
    };
  }, [themeCrossfadeAnim]);

  const handleToggleTheme = useCallback(() => {
    stopDemo();
    const nextMode: ThemeMode = mode === 'paper' ? 'ink' : 'paper';

    const prefersReduced =
      Platform.OS === 'web'
        ? typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
        : false;

    if (prefersReduced) {
      setThemeMode(nextMode);
      return;
    }

    setPrevMode(mode);
    setPrevColors(colors);
    setIsThemeTransitioning(true);
    themeCrossfadeAnim.setValue(1);

    setThemeMode(nextMode);

    Animated.timing(themeCrossfadeAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) {
        setIsThemeTransitioning(false);
        setPrevMode(null);
        setPrevColors(null);
      }
    });
  }, [mode, colors, setThemeMode, stopDemo, themeCrossfadeAnim]);

  const renderOnboardingContent = (
    activeColors: ThemeColors,
    activeMode: ThemeMode,
    interactive: boolean
  ) => (
    <View
      pointerEvents={interactive ? 'auto' : 'none'}
      style={[styles.root, { backgroundColor: activeColors.bgBase }]}
    >
      {/* Decorative Architectural Arch in background matching reference */}
      <View
        pointerEvents="none"
        style={[
          styles.decorativeArchWrap,
          isDemoRtl ? styles.decorativeArchWrapRTL : styles.decorativeArchWrapLTR,
        ]}
      >
        <Svg width={220} height={340} viewBox="0 0 220 340" fill="none">
          <Path
            d="M 220 0 L 80 0 C 80 0 0 30 0 140 L 0 340 L 220 340 Z"
            fill={activeMode === 'paper' ? '#E7EBE4' : '#192420'}
            opacity={activeMode === 'paper' ? 0.6 : 0.4}
          />
          <Path
            d="M 220 0 L 130 0 C 130 0 60 25 60 120 L 60 340 L 220 340 Z"
            fill={activeMode === 'paper' ? '#EFF3ED' : '#202E29'}
            opacity={activeMode === 'paper' ? 0.7 : 0.4}
          />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 104,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onTouchStart={interactive ? stopDemo : undefined}
      >
        {/* Header: Logo squircle with Islamic arch mark + ISLAMIC wordmark + Theme Toggle */}
        <View style={[styles.headerRow, isDemoRtl && styles.rowReverse]}>
          <View style={[styles.brandWrap, isDemoRtl && styles.rowReverse]}>
            <AnimatedBrandBadge
              size={34}
              color={activeColors.forestGreen || '#105A4B'}
              archColor="#FFFFFF"
              paused={!interactive}
            />
            <Text style={[styles.headerWordmark, { color: activeColors.textPrimary }]}>
              {isDemoRtl ? 'اسلامک' : 'I S L A M I C'}
            </Text>
          </View>

          {interactive ? (
            <OnboardingThemeToggle
              onToggle={handleToggleTheme}
              isDark={activeMode === 'ink'}
            />
          ) : (
            <View style={styles.themeTogglePlaceholder} />
          )}
        </View>

        {/* Hero Eyebrow, Title, Subtitle wrapped in Animated crossfade */}
        <Animated.View
          style={[
            styles.heroWrap,
            interactive && { opacity: demoFadeAnim },
            isDemoRtl && { alignItems: 'flex-end' },
          ]}
        >
          <Text
            style={[
              styles.eyebrow,
              { color: activeColors.forestGreen || '#105A4B' },
              isDemoRtl && { textAlign: 'right', fontFamily: 'Amiri_700Bold' },
            ]}
          >
            {isDemoRtl ? currentStrings.welcome : 'Assalam o Alaikum'}
          </Text>
          <Text
            style={[
              styles.headline,
              { color: activeColors.textPrimary },
              isDemoRtl && { textAlign: 'right', fontFamily: 'Amiri_700Bold', fontSize: 32, lineHeight: 40 },
            ]}
          >
            {isDemoRtl ? (
              `${currentStrings.titleLine1} ${currentStrings.titleLine2}`
            ) : (
              'Set up your\nlanguages'
            )}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: activeColors.textSecondary },
              isDemoRtl && { textAlign: 'right', fontFamily: 'Amiri_400Regular' },
            ]}
          >
            {isDemoRtl ? currentStrings.subtitle : 'Choose how you read and listen.'}
          </Text>
        </Animated.View>

        {/* The Reference White Panel: ONE rounded card with 3 interactive rows */}
        <View
          style={[
            styles.settingsPanel,
            {
              backgroundColor: activeColors.cardElevated || activeColors.bgSurface,
              borderColor: activeColors.borderSubtle,
            },
          ]}
        >
          {/* Row 1: App Language */}
          <TouchableOpacity
            style={[styles.panelRow, isDemoRtl && styles.rowReverse]}
            onPress={
              interactive
                ? () => {
                    stopDemo();
                    setModalType('app');
                  }
                : undefined
            }
            accessibilityRole="button"
            accessibilityLabel={`${currentStrings.appLanguageLabel}: ${card1Title}`}
            activeOpacity={0.7}
            disabled={!interactive}
          >
            <View style={[styles.iconCircle, { backgroundColor: activeColors.iconCircleBg || '#E0EAE5' }]}>
              <Ionicons name="globe-outline" size={20} color={activeColors.forestGreen || activeColors.accent} />
            </View>

            <View style={[styles.rowTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.rowOverline, { color: activeColors.textMuted }]}>
                {currentStrings.appLanguageLabel}
              </Text>
              <Animated.View
                style={[
                  styles.valueInlineRow,
                  interactive && { opacity: demoFadeAnim },
                  isDemoRtl && styles.rowReverse,
                ]}
              >
                <Text style={[styles.rowValueBold, { color: activeColors.textPrimary }]}>
                  {card1Title}
                </Text>
                <Text style={[styles.rowValueMuted, { color: activeColors.textMuted }]}>
                  {` · ${card1Sub}`}
                </Text>
              </Animated.View>
            </View>

            <View style={[styles.chevronCircle, { backgroundColor: activeColors.iconCircleBg || '#E0EAE5' }]}>
              <Ionicons name="chevron-down" size={15} color={activeColors.forestGreen || activeColors.accent} />
            </View>
          </TouchableOpacity>

          {/* Thin Divider */}
          <View style={[styles.panelDivider, { backgroundColor: activeColors.borderSubtle }]} />

          {/* Row 2: Quran Translation */}
          <TouchableOpacity
            style={[styles.panelRow, isDemoRtl && styles.rowReverse]}
            onPress={
              interactive
                ? () => {
                    stopDemo();
                    setModalType('quran');
                  }
                : undefined
            }
            accessibilityRole="button"
            accessibilityLabel={`${currentStrings.quranTranslationLabel}: ${card2Title} - ${card2Sub}`}
            activeOpacity={0.7}
            disabled={!interactive}
          >
            <View style={[styles.iconCircle, { backgroundColor: activeColors.iconCircleBg || '#E0EAE5' }]}>
              <Ionicons name="book-outline" size={20} color={activeColors.forestGreen || activeColors.accent} />
            </View>

            <View style={[styles.rowTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.rowOverline, { color: activeColors.textMuted }]}>
                {currentStrings.quranTranslationLabel}
              </Text>
              <Animated.View
                style={[
                  styles.valueInlineRow,
                  interactive && { opacity: demoFadeAnim },
                  isDemoRtl && styles.rowReverse,
                ]}
              >
                <Text style={[styles.rowValueBold, { color: activeColors.textPrimary }]}>
                  {card2Title}
                </Text>
                <Text style={[styles.rowValueMuted, { color: activeColors.textMuted }]} numberOfLines={1}>
                  {` · ${card2Sub}`}
                </Text>
              </Animated.View>
            </View>

            <View style={[styles.chevronCircle, { backgroundColor: activeColors.iconCircleBg || '#E0EAE5' }]}>
              <Ionicons name="chevron-down" size={15} color={activeColors.forestGreen || activeColors.accent} />
            </View>
          </TouchableOpacity>

          {/* Thin Divider */}
          <View style={[styles.panelDivider, { backgroundColor: activeColors.borderSubtle }]} />

          {/* Row 3: Quran Audio */}
          <TouchableOpacity
            style={[styles.panelRow, isDemoRtl && styles.rowReverse]}
            onPress={
              interactive
                ? () => {
                    stopDemo();
                    setModalType('audio');
                  }
                : undefined
            }
            accessibilityRole="button"
            accessibilityLabel={`${currentStrings.quranAudioLabel}: ${card3Title}`}
            activeOpacity={0.7}
            disabled={!interactive}
          >
            <View style={[styles.iconCircle, { backgroundColor: activeColors.iconCircleBg || '#E0EAE5' }]}>
              <Ionicons name="headset-outline" size={20} color={activeColors.forestGreen || activeColors.accent} />
            </View>

            <View style={[styles.rowTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
              <Text style={[styles.rowOverline, { color: activeColors.textMuted }]}>
                {currentStrings.quranAudioLabel}
              </Text>
              <Animated.View
                style={[
                  styles.valueInlineRow,
                  interactive && { opacity: demoFadeAnim },
                  isDemoRtl && styles.rowReverse,
                ]}
              >
                <Text style={[styles.rowValueBold, { color: activeColors.textPrimary }]}>
                  {card3Title}
                </Text>
                <Text style={[styles.rowValueMuted, { color: activeColors.textMuted }]} numberOfLines={1}>
                  {` · ${card3Sub}`}
                </Text>
              </Animated.View>
            </View>

            <View style={[styles.chevronCircle, { backgroundColor: activeColors.iconCircleBg || '#E0EAE5' }]}>
              <Ionicons name="chevron-down" size={15} color={activeColors.forestGreen || activeColors.accent} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Capability Pill */}
        <View
          style={[
            styles.capabilityPill,
            {
              backgroundColor: activeColors.sagePill || '#DBE7E1',
            },
          ]}
        >
          <Text style={[styles.capabilityPillText, { color: activeColors.forestDark || '#105A4B' }]}>
            {isDemoRtl
              ? 'أكثر من 40 لغة ترجمة · أكثر من 10 لغات صوتية'
              : '40+ translation languages · 10+ audio languages'}
          </Text>
        </View>
      </ScrollView>

      {/* Pinned Bottom CTA Container */}
      <View
        style={[
          styles.bottomContainer,
          {
            backgroundColor: activeColors.bgBase,
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.getStartedButton,
            { backgroundColor: activeColors.forestGreen || '#105A4B' },
          ]}
          onPress={interactive ? handleGetStarted : undefined}
          disabled={!interactive || isSubmitting}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={currentStrings.getStarted}
        >
          <View style={[styles.btnContentRow, isDemoRtl && styles.rowReverse]}>
            <Text style={[styles.getStartedBtnText, { color: activeColors.onAccent || '#FFFFFF' }]}>
              {currentStrings.getStarted}
            </Text>
            <View style={[styles.btnArrowCircle, { backgroundColor: activeColors.onAccent || '#FFFFFF' }]}>
              <Ionicons
                name={isDemoRtl ? 'arrow-back' : 'arrow-forward'}
                size={18}
                color={activeColors.forestGreen || '#105A4B'}
              />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={[styles.footerHelperText, { color: activeColors.textMuted }]}>
          {currentStrings.footerNote}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Current theme active view */}
      {renderOnboardingContent(colors, mode, true)}

      {/* Crossfade overlay layer during smooth theme transition */}
      {isThemeTransitioning && prevColors && prevMode && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: themeCrossfadeAnim,
              backgroundColor: prevColors.bgBase,
            },
          ]}
        >
          {renderOnboardingContent(prevColors, prevMode, false)}
        </Animated.View>
      )}

      {/* Modals for selecting languages */}
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
  container: {
    flex: 1,
  },
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  decorativeArchWrap: {
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  decorativeArchWrapLTR: {
    right: 0,
  },
  decorativeArchWrapRTL: {
    left: 0,
    transform: [{ scaleX: -1 }],
  },
  scrollContent: {
    paddingHorizontal: 24,
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeTogglePlaceholder: {
    width: 44,
    height: 44,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerWordmark: {
    fontFamily: 'SourceSans3_500Medium',
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '600',
  },
  heroWrap: {
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  headline: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14.5,
    lineHeight: 21,
  },
  settingsPanel: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 3,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 48,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowOverline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  valueInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  rowValueBold: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  rowValueMuted: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    flexShrink: 1,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelDivider: {
    height: 1,
    width: '100%',
    opacity: 0.6,
  },
  capabilityPill: {
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
  },
  capabilityPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  getStartedButton: {
    width: '100%',
    maxWidth: 580,
    height: 56,
    borderRadius: 28,
    paddingStart: 24,
    paddingEnd: 12,
    justifyContent: 'center',
    shadowColor: '#105A4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  getStartedBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  btnArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHelperText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
