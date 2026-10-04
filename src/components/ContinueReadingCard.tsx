import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { getReadingPosition, ReadingPosition } from '../lib/continuing';
import { SURAHS_114, SurahSummary } from '../lib/surahs114';
import { Card } from './Card';
import { ArabicText } from './ArabicText';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface ContinueReadingCardProps {
  onOpenReader?: (surah: number, ayah?: number) => void;
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
  const [loading, setLoading] = useState(true);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const loadPosition = useCallback(async () => {
    try {
      const pos = await getReadingPosition();
      setPosition(pos);
    } catch {
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosition();
  }, [loadPosition]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 200,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 200,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handlePress = () => {
    haptic('light');
    if (position && position.surah > 0) {
      onOpenReader?.(position.surah, position.ayah);
    } else if (onOpenQuranTab) {
      onOpenQuranTab();
    } else {
      onOpenReader?.(1, 1);
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

  const eyebrowText = isResuming ? 'CONTINUE READING' : 'START READING';
  const surahTitle = surahMeta?.englishName || (isResuming ? `Surah ${surahNum}` : 'Al-Fatihah');
  const ayahSubtext = isResuming ? `Ayah ${surahNum}:${ayahNum}` : 'Ayah 1:1 · Begin recitation';

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
              <View style={[styles.eyebrowDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.eyebrow, { color: colors.accent }]}>
                {eyebrowText}
              </Text>
            </View>
            {surahMeta?.name && (
              <ArabicText size={20} style={[styles.arabicName, { color: colors.textSecondary }]}>
                {surahMeta.name}
              </ArabicText>
            )}
          </View>

          {/* Main Title Row: Surah Name + Arrow Chevron */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text
                style={[styles.surahName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {surahTitle}
              </Text>
              <Text style={[styles.ayahLabel, { color: colors.textMuted }]}>
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
                  backgroundColor: colors.accentDim,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            </View>
          </View>

          {/* Thin Progress Bar */}
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.borderSubtle },
            ]}
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
    borderRadius: 16,
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
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
