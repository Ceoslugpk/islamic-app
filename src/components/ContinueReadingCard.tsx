import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  AppState,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { getContinueReadingPosition, addReadingPositionListener, ReadingPosition } from '../lib/continuing';
import { getLocalizedSurahName } from '../lib/surahNamesLocalized';
import { SURAHS_114, SurahSummary } from '../lib/surahs114';
import { Card } from './Card';
import { ArabicText } from './ArabicText';
import { isRTL, t } from '../lib/i18n';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface ContinueReadingCardProps {
  onOpenReader?: (surah: number, ayah?: number, page?: number) => void;
  onOpenQuranTab?: () => void;
  style?: any;
}

export function ContinueReadingCard({
  onOpenReader,
  onOpenQuranTab,
  style,
}: ContinueReadingCardProps) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
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
  const totalAyahs = surahMeta?.numberOfAyahs || 1;
  const progressRatio = isResuming
    ? Math.min(1, Math.max(0.02, ayahNum / totalAyahs))
    : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const eyebrowText = isResuming ? t('CONTINUE READING') : t('START READING');
  const surahTitle = surahMeta ? getLocalizedSurahName(surahMeta.number, surahMeta.englishName) : (isResuming ? `Surah ${surahNum}` : 'Al-Fatihah');
  const ayahSubtext = isResuming ? `${t('Ayah')} ${surahNum}:${ayahNum}` : `${t('Ayah')} 1:1 · ${t('Begin recitation')}`;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Card style={styles.card} padded={false}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.touchArea}
          accessibilityRole="button"
          accessibilityLabel={`${eyebrowText}, ${surahTitle}, ${ayahSubtext}`}
        >
          {/* Top Row: Eyebrow + Arabic name */}
          <View style={styles.topRow}>
            <View style={styles.eyebrowWrap}>
              <Text style={[styles.eyebrow, { color: colors.accent, textAlign: isRTL() ? 'right' : 'left' }]}>
                {eyebrowText}
              </Text>
            </View>
            <ArabicText size={20} style={[styles.arabicName, { color: colors.textSecondary }]}>
              {surahMeta?.name || 'الفَاتِحة'}
            </ArabicText>
          </View>

          {/* Main Title Row: Surah Name + Arrow Chevron */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text
                style={[
                  styles.surahName,
                  {
                    color: colors.textPrimary,
                    textAlign: isRTL() ? 'right' : 'left',
                    fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                  },
                ]}
                numberOfLines={1}
              >
                {surahTitle}
              </Text>
              <Text style={[styles.ayahLabel, { color: colors.textMuted, textAlign: isRTL() ? 'right' : 'left' }]}>
                {ayahSubtext}
                {isResuming && (
                  <Text style={{ color: colors.textSecondary }}>
                    {' '}· {progressPercent}%
                  </Text>
                )}
              </Text>
            </View>

            <View
              style={[
                styles.arrowCircle,
                {
                  backgroundColor: colors.iconCircleBg || colors.accentDim,
                  borderColor: colors.iconCircleBg ? 'transparent' : colors.accent,
                },
              ]}
            >
              <Ionicons name={isRTL() ? 'arrow-back' : 'arrow-forward'} size={16} color={colors.iconCircleFg || colors.accent} />
            </View>
          </View>

          {/* Thin Progress Bar */}
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.borderSubtle },
            ]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
            accessibilityLabel={`Reading progress ${progressPercent} percent`}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.accent,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  touchArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  arabicName: {
    lineHeight: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  surahName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0.3,
  },
  ayahLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
