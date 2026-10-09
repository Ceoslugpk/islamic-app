import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { Card } from './Card';
import { ArabicText } from './ArabicText';
import { AnimatedPattern } from './AnimatedPattern';
import { AyahOfDay } from '../lib/useAyahOfDay';
import { Hadith } from '../lib/hadith';
import { isRTL, t } from '../lib/i18n';
import { hScrollRTLStyle } from '../lib/rtl';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface DailyNameItem {
  number: number;
  arabic?: string;
  name?: string;
  transliteration: string;
  meaning: string;
}

export interface DailyContentRailProps {
  ayah: AyahOfDay | null;
  hadith: Hadith | null;
  nameOfDay: DailyNameItem;
  onRefreshAyah?: () => void;
  onRefreshHadith?: () => void;
  onOpenAyah?: (surah: number, ayah: number) => void;
  onOpenHadith?: () => void;
  onOpenNames?: () => void;
  style?: any;
}

export function DailyContentRail({
  ayah,
  hadith,
  nameOfDay,
  onRefreshAyah,
  onRefreshHadith,
  onOpenAyah,
  onOpenHadith,
  onOpenNames,
  style,
}: DailyContentRailProps) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);

  // Dimensions
  const gap = 12;
  const effectiveWidth = measuredWidth || Math.max(260, windowWidth - 48);
  const cardWidth = Math.min(effectiveWidth, 620);
  const snapInterval = cardWidth + gap;

  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  // Entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [entranceAnim, slideAnim]);

  const cards = [
    { key: 'ayah', type: 'ayah' },
    { key: 'hadith', type: 'hadith' },
    { key: 'name', type: 'name' },
  ];

  const handleCardPress = (type: string) => {
    haptic('light');
    if (type === 'ayah' && ayah) {
      onOpenAyah?.(ayah.surahNumber, ayah.ayahNumber);
    } else if (type === 'hadith') {
      onOpenHadith?.();
    } else if (type === 'name') {
      onOpenNames?.();
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: USE_NATIVE_DRIVER,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / snapInterval);
        if (index !== activeIndex && index >= 0 && index < cards.length) {
          setActiveIndex(index);
        }
      },
    }
  );

  return (
    <Animated.View
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && Math.abs(w - measuredWidth) > 1) {
          setMeasuredWidth(w);
        }
      }}
      style={[
        styles.root,
        {
          opacity: entranceAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {/* Header Row: TODAY Eyebrow + Paging Dots */}
      <View style={styles.headerRow}>
        <View style={styles.eyebrowWrap}>
          <Text style={[styles.eyebrow, { color: colors.accent, textAlign: isRTL() ? 'right' : 'left' }]}>{t('TODAY')}</Text>
        </View>

        {/* Paging Indicators */}
        <View style={styles.dotsWrap}>
          {cards.map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? colors.accent : colors.borderSubtle,
                    width: isActive ? 16 : 6,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Horizontal discovery rail */}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        accessibilityLabel={t('Daily inspiration cards. Swipe left or right for Ayah, Hadith, and Names of God.')}
        contentContainerStyle={[
          {
            paddingHorizontal: 0,
            gap,
          },
          hScrollRTLStyle(),
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {cards.map((cardItem, index) => {
          const inputRange = [
            (index - 1) * snapInterval,
            index * snapInterval,
            (index + 1) * snapInterval,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.96, 1, 0.96],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.75, 1, 0.75],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={cardItem.key}
              style={[
                styles.cardSlideWrap,
                {
                  width: cardWidth,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <Card style={styles.card} padded={false}>
                {/* 1. AYAH OF THE DAY */}
                {cardItem.type === 'ayah' && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleCardPress('ayah')}
                    style={styles.cardContent}
                    accessibilityRole="button"
                    accessibilityLabel={t('Ayah of the Day. Tap to read.')}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.tagBadge}>
                        <Ionicons name="book-outline" size={12} color={colors.accent} />
                        <Text style={[styles.cardTag, { color: colors.accent }]}>
                          {t('AYAH OF THE DAY')}
                        </Text>
                      </View>
                    </View>

                    {ayah ? (
                      <>
                        <ArabicText
                          size={19}
                          align="right"
                          numberOfLines={3}
                          style={styles.arabicText}
                        >
                          {ayah.arabic || ayah.text}
                        </ArabicText>
                        <Text
                          style={[
                            styles.translationText,
                            {
                              color: colors.textSecondary,
                              textAlign: isRTL() ? 'right' : 'left',
                              writingDirection: isRTL() ? 'rtl' : 'ltr',
                            },
                          ]}
                          numberOfLines={3}
                        >
                          {ayah.translation}
                        </Text>
                        {ayah.reflection ? (
                          <View style={styles.reflectionRow}>
                            <Ionicons name="sparkles-outline" size={12} color={colors.accent} />
                            <Text
                              style={[
                                styles.reflectionText,
                                {
                                  color: colors.textMuted,
                                  textAlign: isRTL() ? 'right' : 'left',
                                  writingDirection: isRTL() ? 'rtl' : 'ltr',
                                },
                              ]}
                            >
                              {ayah.reflection}
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.footerRow}>
                          <Text style={[styles.referenceText, { color: colors.textSecondary, textAlign: isRTL() ? 'right' : 'left' }]}>
                            {ayah.reference}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                        {t('Loading daily verse...')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* 2. HADITH OF THE DAY */}
                {cardItem.type === 'hadith' && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleCardPress('hadith')}
                    style={styles.cardContent}
                    accessibilityRole="button"
                    accessibilityLabel={t('Hadith of the Day. Tap to open Hadith Library.')}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.tagBadge}>
                        <Ionicons name="library-outline" size={12} color={colors.accent} />
                        <Text style={[styles.cardTag, { color: colors.accent }]}>
                          {t('HADITH OF THE DAY')}
                        </Text>
                      </View>
                    </View>

                    {hadith ? (
                      <>
                        {hadith.arabic ? (
                          <ArabicText
                            size={18}
                            align="right"
                            numberOfLines={2}
                            style={[styles.arabicText, { marginBottom: 6 }]}
                          >
                            {hadith.arabic}
                          </ArabicText>
                        ) : null}
                        <Text
                          style={[
                            styles.translationText,
                            {
                              color: colors.textSecondary,
                              textAlign: isRTL() ? 'right' : 'left',
                              writingDirection: isRTL() ? 'rtl' : 'ltr',
                            },
                          ]}
                          numberOfLines={4}
                        >
                          "{hadith.translation}"
                        </Text>
                        <View style={styles.footerRow}>
                          <Text style={[styles.referenceText, { color: colors.textSecondary, textAlign: isRTL() ? 'right' : 'left' }]}>
                            {hadith.reference || hadith.source}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                        {t('Loading daily hadith...')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* 3. 99 NAMES: NAME OF THE DAY */}
                {cardItem.type === 'name' && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleCardPress('name')}
                    style={styles.cardContent}
                    accessibilityRole="button"
                    accessibilityLabel={t('Name of the Day. Tap to view 99 Names.')}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.tagBadge}>
                        <Ionicons name="sparkles-outline" size={12} color={colors.accent} />
                        <Text style={[styles.cardTag, { color: colors.accent }]}>
                          {t('NAME OF THE DAY')} · #{nameOfDay.number}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.nameRow}>
                      <ArabicText
                        size={28}
                        bold
                        align={isRTL() ? 'right' : 'left'}
                        numberOfLines={1}
                        style={styles.nameArabic}
                      >
                        {nameOfDay.arabic || nameOfDay.name || ''}
                      </ArabicText>

                      <View style={styles.nameInfoCol}>
                        <Text
                          style={[
                            styles.nameTranslit,
                            {
                              color: colors.textPrimary,
                              textAlign: isRTL() ? 'right' : 'left',
                              fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {nameOfDay.transliteration}
                        </Text>
                        <Text
                          style={[
                            styles.nameMeaning,
                            {
                              color: colors.textSecondary,
                              textAlign: isRTL() ? 'right' : 'left',
                              writingDirection: isRTL() ? 'rtl' : 'ltr',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {nameOfDay.meaning}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.footerRow}>
                      <Text style={[styles.referenceText, { color: colors.textSecondary, textAlign: isRTL() ? 'right' : 'left' }]}>
                        {t('Asma ul-Husna · The Divine Attributes')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </Card>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  cardSlideWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 180,
    flex: 1,
  },
  cardContent: {
    position: 'relative',
    padding: 18,
    minHeight: 180,
    justifyContent: 'space-between',
    zIndex: 1,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  arabicText: {
    lineHeight: 32,
    marginBottom: 8,
  },
  translationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  reflectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  reflectionText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  referenceText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  nameRow: {
    marginVertical: 6,
    gap: 6,
  },
  nameInfoCol: {
    gap: 2,
  },
  nameTranslit: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 28,
  },
  nameMeaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  nameArabic: {
    lineHeight: 36,
  },
  placeholderText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 20,
    textAlign: 'center',
  },
});
