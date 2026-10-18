import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
  useWindowDimensions,
  Alert,
  I18nManager,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getCardShadow, getPillShadow } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { ThemeColors, ThemeMode } from '../lib/constants';
import { getTokens } from '../theme/tokens';
import { AnimatedBrandBadge, OnboardingThemeToggle } from '../components/AnimatedBrandIcons';
import {
  AppLanguage,
  resolveDeviceAppLanguage,
  prepareNativeLayoutDirection,
  isRtlLanguage,
  t,
} from '../lib/i18n';
import * as Localization from 'expo-localization';
import {
  QURAN_LANGUAGE_EDITIONS,
  getLanguageFlag,
  getEditionForLanguage,
} from '../lib/quranLanguages';
import {
  NON_ARABIC_AUDIO_EDITIONS,
  LANGUAGE_AUDIO_EDITIONS,
  DEFAULT_AUDIO_TRANSLATION_EDITION_ID,
  setAudioTranslationEdition,
  getAudioTranslationLangName,
  getAudioTranslationBootstrapError,
} from '../lib/quranAudio';
import {
  setQuranTranslationLanguage,
  getQuranLanguageBootstrapError,
} from '../lib/quranLanguageState';
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

let appReloader = () => Updates.reloadAsync();

export function _setAppReloaderForTesting(custom: (() => Promise<void>) | null) {
  appReloader = custom || (() => Updates.reloadAsync());
}

export function _resetAppReloaderForTesting() {
  appReloader = () => Updates.reloadAsync();
}

export interface OnboardingTransactionDeps {
  getQuranLanguageBootstrapError: () => Error | null;
  getAudioTranslationBootstrapError: () => Error | null;
  setLanguage: (lang: AppLanguage) => Promise<void> | void;
  setQuranTranslationLanguage: (lang: string) => Promise<void>;
  setAudioTranslationEdition: (id: string) => Promise<void>;
  setOnboardingDone: (done: boolean) => Promise<void>;
  prepareNativeLayoutDirection: (lang: AppLanguage) => void;
  appReloader: () => Promise<void>;
  isRtlLanguage: (lang: string) => boolean;
  isRTL: boolean;
  platform: typeof Platform.OS;
  scheduleReload: (action: () => void, delayMs: number) => any;
  showAlert: (title: string, message: string) => void;
}

export interface OnboardingTransactionParams {
  selectedAppLang: AppLanguage;
  selectedQuranLang: string;
  selectedAudioId: string;
  currentSettingsLanguage: string;
  onComplete: () => void;
  setIsSubmitting?: (submitting: boolean) => void;
  deps?: Partial<OnboardingTransactionDeps>;
}

export async function executeOnboardingSubmitTransaction(params: OnboardingTransactionParams): Promise<void> {
  const {
    selectedAppLang,
    selectedQuranLang,
    selectedAudioId,
    currentSettingsLanguage,
    onComplete,
    setIsSubmitting,
    deps = {},
  } = params;

  const getQuranBootErr = deps.getQuranLanguageBootstrapError || getQuranLanguageBootstrapError;
  const getAudioBootErr = deps.getAudioTranslationBootstrapError || getAudioTranslationBootstrapError;
  const setLanguage = deps.setLanguage;
  if (!setLanguage) {
    throw new Error('setLanguage dependency is required for onboarding transaction');
  }
  const setQuranTranslationLanguageFn = deps.setQuranTranslationLanguage || setQuranTranslationLanguage;
  const setAudioTranslationEditionFn = deps.setAudioTranslationEdition || setAudioTranslationEdition;
  const setOnboardingDoneFn = deps.setOnboardingDone || setOnboardingDone;
  const prepareNativeLayoutDirectionFn = deps.prepareNativeLayoutDirection || prepareNativeLayoutDirection;
  const checkIsRtl = deps.isRtlLanguage || isRtlLanguage;
  const currentIsRTL = deps.isRTL !== undefined ? deps.isRTL : I18nManager.isRTL;
  const currentPlatform = deps.platform || Platform.OS;
  const reloadApp = deps.appReloader || appReloader;
  const scheduleReload = deps.scheduleReload || ((action: () => void, delayMs: number) => setTimeout(action, delayMs));
  const showAlert = deps.showAlert || ((title: string, msg: string) => Alert.alert(title, msg));

  try {
    // 0. Ensure storage bootstrap succeeded; storage unavailability read errors abort the transaction
    const quranBootErr = getQuranBootErr(); // getQuranLanguageBootstrapError()
    if (quranBootErr) {
      throw new Error(`Storage unavailable: Quran translation language read failed: ${quranBootErr.message}`);
    }
    const audioBootErr = getAudioBootErr(); // getAudioTranslationBootstrapError()
    if (audioBootErr) {
      throw new Error(`Storage unavailable: Quran audio translation read failed: ${audioBootErr.message}`);
    }

    // 1. Persist app language through production settings writer with queue & readback verification.
    // If this throws/fails: zero reload/RTL change occurs, rollback only the failed field,
    // and subsequent writes are aborted.
    await Promise.resolve(setLanguage(selectedAppLang));

    // 2. Persist selected Quran translation language (honoring explicit choice or default linking)
    await setQuranTranslationLanguageFn(selectedQuranLang); // setQuranTranslationLanguage(selectedQuranLang)

    // 3. Persist selected Audio translation edition (honoring explicit choice or default linking)
    await setAudioTranslationEditionFn(selectedAudioId); // setAudioTranslationEdition(selectedAudioId)

    // 4. Persist onboardingDone once all durable writes succeed
    await setOnboardingDoneFn(true); // setOnboardingDone(true)

    // 5. Layout direction & reload handling immediately after successful durable writes
    // CONTRACT:
    // - Native Direction Change (e.g. LTR -> RTL or RTL -> LTR):
    //   React Native native view hierarchy requires an app reload (Updates.reloadAsync) for
    //   I18nManager layout changes to take physical effect across native views.
    //   Calls prepareNativeLayoutDirection(selectedAppLang) and schedules exactly ONE native reload
    //   via appReloader() (zero fallback reload invocations; DevSettings.reload fallback removed).
    //   onComplete() is not called so the app reloads directly into the home screen with onboarding done.
    // - Native Same Direction (e.g. LTR -> LTR such as en -> hi/ml/si, or RTL -> RTL):
    //   Native view hierarchy direction is already correct. No reload is needed.
    //   Transitions cleanly to the main app by calling onComplete() directly.
    // - Web:
    //   prepareNativeLayoutDirection immediately sets document.documentElement.dir synchronously.
    //   Transitions cleanly to the main app by calling onComplete() directly without a reload.
    // - Failure:
    //   Zero prepareNativeLayoutDirection, zero reload, zero onComplete().
    const isSwitchingRTL =
      checkIsRtl(selectedAppLang) !== currentIsRTL ||
      checkIsRtl(selectedAppLang) !== checkIsRtl(currentSettingsLanguage);

    if (currentPlatform !== 'web' && isSwitchingRTL) {
      prepareNativeLayoutDirectionFn(selectedAppLang); // prepareNativeLayoutDirection(selectedAppLang)
      scheduleReload(() => {
        reloadApp().catch(() => {}); // appReloader().catch
      }, 300);
    } else {
      if (currentPlatform === 'web') {
        prepareNativeLayoutDirectionFn(selectedAppLang); // prepareNativeLayoutDirection(selectedAppLang)
      }
      onComplete();
    }
  } catch (err) {
    if (setIsSubmitting) {
      setIsSubmitting(false);
    }
    showAlert(t('Error'), t('Failed to save settings. Please try again.'));
    throw err;
  }
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = width <= 360 || height <= 640;
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
  const [isQuranExplicit, setIsQuranExplicit] = useState(false);
  const [isAudioExplicit, setIsAudioExplicit] = useState(false);

  // Selection handlers preserving explicit vs default linking
  const handleSelectAppLang = useCallback((item: LanguageItem) => {
    const nextLang = item.code as AppLanguage;
    setSelectedAppLang(nextLang);
    if (!isQuranExplicit) {
      const matchQuran = QURAN_LANGUAGE_EDITIONS.find((e) => e.languageCode === nextLang);
      setSelectedQuranLang(matchQuran ? nextLang : 'en');
    }
    if (!isAudioExplicit) {
      const matchAudio = LANGUAGE_AUDIO_EDITIONS[nextLang];
      setSelectedAudioId(matchAudio ? matchAudio.identifier : DEFAULT_AUDIO_TRANSLATION_EDITION_ID);
    }
  }, [isQuranExplicit, isAudioExplicit]);

  const handleSelectQuranLang = useCallback((item: LanguageItem) => {
    setIsQuranExplicit(true);
    setSelectedQuranLang(item.code);
  }, []);

  const handleSelectAudioEdition = useCallback((item: LanguageItem) => {
    setIsAudioExplicit(true);
    setSelectedAudioId(item.id);
  }, []);

  // Modals
  const [modalType, setModalType] = useState<'app' | 'quran' | 'audio' | null>(null);

  // Submitting state and reload timer refs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup pending reload timer on unmount
  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, []);

  // Demo auto-cycling state
  const [isDemoActive, setIsDemoActive] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    ) {
      return false;
    }
    return true;
  });
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoFadeAnim] = useState(() => new Animated.Value(1));
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
    const prefersReducedWeb =
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (prefersReducedWeb) {
      return;
    }

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
  const card1Sub = isDemoActive
    ? (isDemoRtl ? 'القوائم والأزرار' : 'Menus & buttons')
    : currentStrings.appLanguageDesc;

  const card2Title = isDemoActive
    ? (demoStrings.quranTranslationValue.split('·')[0]?.trim() || demoStrings.quranTranslationValue)
    : activeQuranEdition.language;
  const card2Sub = isDemoActive
    ? (demoStrings.quranTranslationValue.includes('·')
        ? demoStrings.quranTranslationValue.split('·')[1]?.trim()
        : 'Saheeh International')
    : activeQuranEdition.name;

  const card3Title = isDemoActive ? demoStrings.quranAudioValue : (getAudioTranslationLangName(activeAudioEdition.language) || 'English');
  const card3Sub = isDemoActive
    ? (isDemoRtl ? 'أكثر من 10 لغات متاحة' : '10+ languages available')
    : currentStrings.quranAudioDesc;

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
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    stopDemo();

    try {
      await executeOnboardingSubmitTransaction({
        selectedAppLang,
        selectedQuranLang,
        selectedAudioId,
        currentSettingsLanguage: settings.language,
        onComplete,
        setIsSubmitting: (submitting) => {
          isSubmittingRef.current = submitting;
          setIsSubmitting(submitting);
        },
        deps: {
          setLanguage,
          scheduleReload: (action, delayMs) => {
            if (reloadTimerRef.current) {
              clearTimeout(reloadTimerRef.current);
            }
            reloadTimerRef.current = setTimeout(() => {
              reloadTimerRef.current = null;
              action();
            }, delayMs);
          },
        },
      });
    } catch {
      // Error state reset and alert alert handled inside executeOnboardingSubmitTransaction
    }
  };

  // Theme crossfade transition state
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [prevMode, setPrevMode] = useState<ThemeMode | null>(null);
  const [prevColors, setPrevColors] = useState<ThemeColors | null>(null);
  const [themeCrossfadeAnim] = useState(() => new Animated.Value(0));

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
  ) => {
    const tokens = getTokens(activeMode);

    return (
      <View
        pointerEvents={interactive ? 'auto' : 'none'}
        style={[styles.root, { backgroundColor: tokens.bgTop }]}
      >
        {/* Full screen gradient matching Home */}
        <LinearGradient
          colors={[tokens.bgTop, tokens.bgBottom]}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative Architectural Arch in background */}
        <View
          pointerEvents="none"
          style={[
            styles.decorativeArchWrap,
            isDemoRtl ? styles.decorativeArchWrapRTL : styles.decorativeArchWrapLTR,
          ]}
        >
          <Svg width={240} height={360} viewBox="0 0 240 360" fill="none">
            <Path
              d="M 240 0 L 90 0 C 90 0 0 35 0 150 L 0 360 L 240 360 Z"
              fill={tokens.bgBottom}
              opacity={activeMode === 'paper' ? 0.35 : 0.25}
            />
            <Path
              d="M 240 0 L 145 0 C 145 0 65 30 65 130 L 65 360 L 240 360 Z"
              fill={tokens.bgTop}
              opacity={activeMode === 'paper' ? 0.45 : 0.3}
            />
          </Svg>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (isCompact ? 10 : 16),
              paddingBottom: insets.bottom + 120,
            },
          ]}
          showsVerticalScrollIndicator={false}
          onTouchStart={interactive ? stopDemo : undefined}
        >
          {/* Header: Logo squircle with Islamic arch mark + ISLAMIC wordmark + Theme Toggle */}
          <View style={[styles.headerRow, isCompact && styles.headerRowCompact, isDemoRtl && styles.rowReverse]}>
            <View style={[styles.brandWrap, isDemoRtl && styles.rowReverse]}>
              <AnimatedBrandBadge
                size={36}
                color={tokens.brandGreen || '#105A4B'}
                archColor={activeMode === 'ink' ? tokens.gold : tokens.cardTop}
                paused={!interactive}
                mode={activeMode}
              />
              <AppText
                variant="caption"
                style={[
                  styles.headerWordmark,
                  isDemoRtl && { fontFamily: 'Amiri_700Bold', fontSize: 16, letterSpacing: 1 },
                ]}
              >
                {isDemoRtl ? 'اسلامک' : 'I S L A M I C'}
              </AppText>
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
              isCompact && styles.heroWrapCompact,
              interactive && { opacity: demoFadeAnim },
              isDemoRtl && { alignItems: 'flex-end' },
            ]}
          >
            {/* Small uppercase letter-spaced eyebrow line matching Home date header */}
            <AppText
              variant="eyebrow"
              highlight
              style={[
                styles.eyebrow,
                isDemoRtl && { textAlign: 'right', fontFamily: 'Amiri_700Bold', fontSize: 14 },
              ]}
            >
              {isDemoRtl ? currentStrings.welcome : 'ASSALAM O ALAIKUM'}
            </AppText>

            {/* Editorial Serif headline matching Home greeting */}
            <AppText
              variant="screenTitle"
              style={[
                styles.headline,
                isCompact && styles.headlineCompact,
                isDemoRtl && {
                  textAlign: 'right',
                  fontFamily: 'Amiri_700Bold',
                  fontSize: isCompact ? 28 : 34,
                  lineHeight: isCompact ? 36 : 44,
                },
              ]}
            >
              {isDemoRtl ? (
                `${currentStrings.titleLine1} ${currentStrings.titleLine2}`
              ) : (
                'Set up your\nlanguages'
              )}
            </AppText>

            <AppText
              variant="subtitle"
              tone="faint"
              style={[
                styles.subtitle,
                isCompact && styles.subtitleCompact,
                isDemoRtl && { textAlign: 'right', fontFamily: 'Amiri_400Regular', fontSize: isCompact ? 13 : 15 },
              ]}
            >
              {isDemoRtl ? currentStrings.subtitle : 'Choose how you read and listen.'}
            </AppText>
          </Animated.View>

          {/* Settings Panel: Home-compatible card with vertical gradient & gold/olive border */}
          <View
            style={[
              styles.settingsPanel,
              {
                borderColor: tokens.cardBorder,
                backgroundColor: tokens.cardTop,
                ...getCardShadow(activeMode),
              },
            ]}
          >
            <LinearGradient
              colors={[tokens.cardTop, tokens.cardBottom]}
              style={StyleSheet.absoluteFill}
            />

            {/* Row 1: App Language */}
            <TouchableOpacity
              testID="onboarding-row-app-lang"
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
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="globe-outline" size={20} color={tokens.accent} />
              </View>

              <View style={[styles.rowTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
                <AppText variant="eyebrow" highlight style={styles.rowOverline}>
                  {currentStrings.appLanguageLabel}
                </AppText>
                <Animated.View
                  style={[
                    styles.valueInlineRow,
                    interactive && { opacity: demoFadeAnim },
                    isDemoRtl && styles.rowReverse,
                  ]}
                >
                  <AppText variant="rowTitle" style={styles.rowValueBold} numberOfLines={1}>
                    {card1Title}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.rowValueMuted} numberOfLines={2}>
                    {` · ${card1Sub}`}
                  </AppText>
                </Animated.View>
              </View>

              <View
                style={[
                  styles.chevronCircle,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="chevron-down" size={15} color={tokens.accent} />
              </View>
            </TouchableOpacity>

            {/* Thin Divider */}
            <View style={[styles.panelDivider, { backgroundColor: tokens.cardBorder }]} />

            {/* Row 2: Quran Translation */}
            <TouchableOpacity
              testID="onboarding-row-quran-trans"
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
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="book-outline" size={20} color={tokens.accent} />
              </View>

              <View style={[styles.rowTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
                <AppText variant="eyebrow" highlight style={styles.rowOverline}>
                  {currentStrings.quranTranslationLabel}
                </AppText>
                <Animated.View
                  style={[
                    styles.valueInlineRow,
                    interactive && { opacity: demoFadeAnim },
                    isDemoRtl && styles.rowReverse,
                  ]}
                >
                  <AppText variant="rowTitle" style={styles.rowValueBold} numberOfLines={1}>
                    {card2Title}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.rowValueMuted} numberOfLines={2}>
                    {` · ${card2Sub}`}
                  </AppText>
                </Animated.View>
              </View>

              <View
                style={[
                  styles.chevronCircle,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="chevron-down" size={15} color={tokens.accent} />
              </View>
            </TouchableOpacity>

            {/* Thin Divider */}
            <View style={[styles.panelDivider, { backgroundColor: tokens.cardBorder }]} />

            {/* Row 3: Quran Audio */}
            <TouchableOpacity
              testID="onboarding-row-audio-trans"
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
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="headset-outline" size={20} color={tokens.accent} />
              </View>

              <View style={[styles.rowTextCol, isDemoRtl && { alignItems: 'flex-end' }]}>
                <AppText variant="eyebrow" highlight style={styles.rowOverline}>
                  {currentStrings.quranAudioLabel}
                </AppText>
                <Animated.View
                  style={[
                    styles.valueInlineRow,
                    interactive && { opacity: demoFadeAnim },
                    isDemoRtl && styles.rowReverse,
                  ]}
                >
                  <AppText variant="rowTitle" style={styles.rowValueBold} numberOfLines={1}>
                    {card3Title}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.rowValueMuted} numberOfLines={2}>
                    {` · ${card3Sub}`}
                  </AppText>
                </Animated.View>
              </View>

              <View
                style={[
                  styles.chevronCircle,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="chevron-down" size={15} color={tokens.accent} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Capability Pill */}
          <View
            style={[
              styles.capabilityPill,
              isCompact && styles.capabilityPillCompact,
              {
                backgroundColor: tokens.ringFill,
                borderColor: tokens.cardBorder,
                ...getPillShadow(activeMode),
              },
            ]}
          >
            <AppText
              variant="caption"
              highlight
              style={[
                styles.capabilityPillText,
                isCompact && styles.capabilityPillTextCompact,
              ]}
            >
              {selectedAppLang === 'ur'
                ? '40+ ترجمے کی زبانیں · 10+ آڈیو زبانیں'
                : (isDemoRtl
                  ? 'أكثر من 40 لغة ترجمة · أكثر من 10 لغات صوتية'
                  : '40+ translation languages · 10+ audio languages')}
            </AppText>
          </View>
        </ScrollView>

        {/* Pinned Bottom CTA Container */}
        <View
          style={[
            styles.bottomContainer,
            {
              backgroundColor: tokens.bgBottom,
              borderTopColor: tokens.cardBorder,
              paddingTop: isCompact ? 8 : 12,
              paddingBottom: Math.max(insets.bottom, isCompact ? 10 : 18),
            },
          ]}
        >
          <TouchableOpacity
            testID="onboarding-get-started"
            style={[
              styles.getStartedButton,
              isCompact && styles.getStartedButtonCompact,
              getCardShadow(activeMode),
            ]}
            onPress={interactive ? handleGetStarted : undefined}
            disabled={!interactive || isSubmitting}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={currentStrings.getStarted}
          >
            <LinearGradient
              colors={tokens.goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.btnContentRow, isDemoRtl && styles.rowReverse]}>
              <AppText variant="title" tone="onGold" style={styles.getStartedBtnText}>
                {currentStrings.getStarted}
              </AppText>
              <View style={[styles.btnArrowCircle, { backgroundColor: tokens.onGold }]}>
                <Ionicons
                  name={isDemoRtl ? 'arrow-back' : 'arrow-forward'}
                  size={18}
                  color={tokens.gold}
                />
              </View>
            </View>
          </TouchableOpacity>

          <AppText
            variant="caption"
            tone="faint"
            style={[
              styles.footerHelperText,
              isCompact && styles.footerHelperTextCompact,
            ]}
          >
            {currentStrings.footerNote}
          </AppText>
        </View>
      </View>
    );
  };

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
        onSelect={handleSelectAppLang}
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
        onSelect={handleSelectQuranLang}
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
        onSelect={handleSelectAudioEdition}
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
    paddingHorizontal: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    marginBottom: 24,
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
  headerWordmark: {
    fontFamily: 'SourceSans3_500Medium',
    fontSize: 13.5,
    letterSpacing: 3.5,
    fontWeight: '600',
    paddingVertical: 2,
  },
  heroWrap: {
    marginBottom: 22,
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingVertical: 2,
  },
  headline: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  settingsPanel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
  },
  rowOverline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
    paddingVertical: 2,
  },
  valueInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
    minWidth: 0,
  },
  rowValueBold: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    flexShrink: 1,
  },
  rowValueMuted: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    flexShrink: 1,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelDivider: {
    height: 1,
    width: '100%',
    opacity: 0.5,
  },
  capabilityPill: {
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 18,
    minHeight: 36,
  },
  capabilityPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    letterSpacing: 0.4,
    paddingVertical: 2,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  getStartedButton: {
    width: '100%',
    maxWidth: 600,
    minHeight: 54, /* height: 54 */
    borderRadius: 27,
    overflow: 'hidden',
    position: 'relative',
    paddingStart: 24,
    paddingEnd: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexShrink: 1,
    minWidth: 0,
  },
  getStartedBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15.5,
    letterSpacing: 0.4,
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  btnArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHelperText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingVertical: 2,
  },
  headerRowCompact: {
    marginBottom: 12,
  },
  heroWrapCompact: {
    marginBottom: 10,
  },
  headlineCompact: {
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 4,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  capabilityPillCompact: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    minHeight: 30,
  },
  capabilityPillTextCompact: {
    fontSize: 10.5,
    letterSpacing: 0.2,
    textAlign: 'center',
    paddingVertical: 2,
  },
  getStartedButtonCompact: {
    minHeight: 48,
    borderRadius: 24,
    paddingVertical: 6,
  },
  footerHelperTextCompact: {
    marginTop: 4,
    fontSize: 11,
    paddingVertical: 2,
  },
});
