import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  AppState,
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, getCardShadow } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { getContinueReadingPosition, addReadingPositionListener, ReadingPosition } from '../lib/continuing';
import { getLocalizedSurahName } from '../lib/surahNamesLocalized';
import { SURAHS_114, SurahSummary } from '../lib/surahs114';
import { GeometricPattern } from './GeometricPattern';
import { LinearGradient } from 'expo-linear-gradient';
import { HOME_THEME_TOKENS } from '../lib/constants';
import { isRTL, t } from '../lib/i18n';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface ContinueReadingCardProps {
  onOpenReader?: (surah: number, ayah?: number, page?: number) => void;
  onOpenQuranTab?: () => void;
  style?: any;
}

export const ContinueReadingCard = React.memo(function ContinueReadingCard({
  onOpenReader,
  onOpenQuranTab,
  style,
}: ContinueReadingCardProps) {
  const { mode } = useTheme();
  const homeTokens = HOME_THEME_TOKENS[mode];
  const { haptic } = useHaptics();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const [position, setPosition] = useState<ReadingPosition | null>(null);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  const loadPosition = useCallback(async () => {
    try {
      const pos = await getContinueReadingPosition();
      setPosition(pos);
    } catch {
      setPosition(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pos = await getContinueReadingPosition();
        if (mounted) setPosition(pos);
      } catch {
        if (mounted) setPosition(null);
      }
    })();

    const unsub = addReadingPositionListener(() => {
      if (mounted) loadPosition();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mounted) {
        loadPosition();
      }
    });
    return () => {
      mounted = false;
      unsub();
      appSub.remove();
    };
  }, [loadPosition]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      inFlightRef.current = false;
    };
  }, []);

  const handlePress = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    haptic('light');
    try {
      const latest = await getContinueReadingPosition();
      if (latest && latest.surah > 0) {
        onOpenReader?.(latest.surah, latest.ayah, latest.page);
        return;
      }
      if (position && position.surah > 0) {
        onOpenReader?.(position.surah, position.ayah, position.page);
      } else if (onOpenQuranTab) {
        onOpenQuranTab();
      } else {
        onOpenReader?.(1, 1, 1);
      }
    } catch {
      inFlightRef.current = false;
    } finally {
      inFlightRef.current = false;
    }
  };

  // Surah meta
  const surahNum = position?.surah || 1;
  const ayahNum = position?.ayah || 1;
  const surahMeta: SurahSummary | undefined = SURAHS_114.find(
    (s) => s.number === surahNum
  );

  const isResuming = !!position && position.surah > 0;
  const totalAyahs = surahMeta?.numberOfAyahs || (surahNum === 1 ? 7 : 286);
  const progressRatio = isResuming
    ? Math.min(1, Math.max(0.04, ayahNum / totalAyahs))
    : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const eyebrowText = isResuming ? t('CONTINUE READING') : t('START READING');
  const surahTitle = surahMeta ? getLocalizedSurahName(surahMeta.number, surahMeta.englishName) : (isResuming ? `Surah ${surahNum}` : 'Al-Fatihah');
  const ayahSubtext = isResuming
    ? `${t('Surah')} ${surahNum} · ${t('Ayah')} ${ayahNum} ${t('of')} ${totalAyahs}`
    : `${t('The Opening')} · ${t('Ayah')} 1`;

  const cardGradient = mode === 'ink'
    ? [homeTokens.cardTop, homeTokens.cardBottom] as const
    : [homeTokens.cardTop, homeTokens.cardBottom] as const;

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          borderRadius: 14,
          backgroundColor: homeTokens.cardTop,
          ...getCardShadow(mode),
        },
        style,
      ]}
    >
      <View
        testID="continue-reading-card"
        style={[
          styles.card,
          {
            borderColor: homeTokens.cardBorder,
            backgroundColor: homeTokens.cardTop,
          },
        ]}
      >
        <LinearGradient
          colors={[...cardGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <GeometricPattern
          variant="tessellation"
          tileSize={36}
          color={mode === 'ink' ? '#EECA80' : '#A67E34'}
          opacity={mode === 'ink' ? 0.05 : 0.035}
          style={StyleSheet.absoluteFill}
        />

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.touchArea}
          accessibilityRole="button"
          accessibilityLabel={`${eyebrowText}, ${surahTitle}, ${ayahSubtext}`}
          focusable={true}
          {...(Platform.OS === 'web'
            ? ({
                tabIndex: 0,
                onKeyDown: (e: any) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault?.();
                    handlePress();
                  }
                },
              } as any)
            : {})}
        >
          <View style={styles.contentRow}>
            {/* Left: Circular Book Badge */}
            <View
              style={[
                styles.bookBadge,
                {
                  backgroundColor: homeTokens.ringFill,
                  borderColor: homeTokens.ringBorder,
                },
              ]}
            >
              <Ionicons name="book-outline" size={18} color={homeTokens.accent} />
            </View>

            {/* Middle: Eyebrow, Surah Title, Ayah position */}
            <View style={styles.textCol}>
              <AppText
                variant="eyebrow"
                style={[
                  styles.eyebrow,
                  { textAlign: isRTL() ? 'right' : 'left' },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {eyebrowText}
              </AppText>
              <AppText
                variant="headerTitle"
                style={[
                  styles.surahName,
                  {
                    textAlign: isRTL() ? 'right' : 'left',
                    fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                    fontSize: isCompact ? 22 : 25,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.2}
              >
                {surahTitle}
              </AppText>
              <AppText
                variant="caption"
                style={[
                  styles.ayahLabel,
                  {
                    textAlign: isRTL() ? 'right' : 'left',
                  },
                ]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
              >
                {ayahSubtext}
              </AppText>
            </View>

            {/* Right: Circular Gold Arrow Button */}
            <View style={styles.actionBtnWrap}>
              <LinearGradient
                colors={HOME_THEME_TOKENS.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCircleBtn}
              >
                <Ionicons
                  name={isRTL() ? 'arrow-back' : 'arrow-forward'}
                  size={18}
                  color="#092C25"
                />
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom Progress Bar */}
        <View
          style={[styles.progressTrack, { backgroundColor: homeTokens.trackColor }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
          accessibilityLabel={`Reading progress ${progressPercent} percent`}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: homeTokens.gold,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  touchArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  bookBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
    paddingVertical: 2,
  },
  surahName: {
    letterSpacing: 0.2,
    lineHeight: 28,
    paddingVertical: 2,
  },
  ayahLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
    paddingVertical: 2,
  },
  actionBtnWrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 2.5,
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  progressFill: {
    height: '100%',
  },
});
