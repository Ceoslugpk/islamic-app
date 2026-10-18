import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { getFloatingCardShadow } from '../lib/homeThemeTokens';
import { useHaptics } from '../lib/haptics';
import { Card } from './Card';
import { ArabicText } from './ArabicText';
import { GeometricPattern } from './GeometricPattern';
import { AyahOfDay } from '../lib/useAyahOfDay';
import { Hadith } from '../lib/hadith';
import { isRTL, t } from '../lib/i18n';
import { hScrollRTLStyle } from '../lib/rtl';
import { HOME_THEME_TOKENS } from '../lib/constants';

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
  const { mode } = useTheme();
  const homeTokens = HOME_THEME_TOKENS[mode];
  const { haptic } = useHaptics();
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);

  // Dimensions
  const gap = 12;
  const effectiveWidth = measuredWidth || Math.max(260, windowWidth - 48);
  const cardWidth = Math.min(effectiveWidth, 620);
  const snapInterval = cardWidth + gap;

  const [scrollX] = useState(() => new Animated.Value(0));
  const [activeIndex, setActiveIndex] = useState(0);

  // Entrance animation
  const [entranceAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(14));

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
          <AppText
            variant="eyebrow"
            style={[
              styles.eyebrow,
              {
                textAlign: isRTL() ? 'right' : 'left',
              },
            ]}
          >
            {t('TODAY')}
          </AppText>
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
                    backgroundColor: isActive ? homeTokens.gold : homeTokens.ringBorder,
                    opacity: isActive ? 1 : 0.45,
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
                  ...getFloatingCardShadow(mode),
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.card,
                  {
                    borderColor: mode === 'ink' ? 'rgba(142,116,64,0.38)' : 'rgba(234,226,210,0.58)',
                    backgroundColor: homeTokens.cardTop,
                  },
                ])}
                padded={false}
              >
                <LinearGradient
                  colors={[homeTokens.cardTop, homeTokens.cardBottom]}
                  style={StyleSheet.absoluteFill}
                />
                <GeometricPattern
                  variant="tessellation"
                  tileSize={40}
                  color={homeTokens.accent}
                  opacity={mode === 'ink' ? 0.045 : 0.025}
                />

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
                        <View
                          style={[
                            styles.iconBadge,
                            {
                              backgroundColor: homeTokens.ringFill,
                              borderColor: homeTokens.ringBorder,
                            },
                          ]}
                        >
                          <Ionicons name="book-outline" size={14} color={homeTokens.accent} />
                        </View>
                        <AppText variant="eyebrow" style={styles.cardTag}>
                          {t('AYAH OF THE DAY')}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.headerAccessory,
                          {
                            backgroundColor: homeTokens.ringFill,
                            borderColor: homeTokens.ringBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                          size={12}
                          color={homeTokens.gold}
                        />
                      </View>
                    </View>

                    {ayah ? (
                      <>
                        <ArabicText
                          size={19}
                          align="right"
                          lineHeight={36}
                          numberOfLines={3}
                          style={[styles.arabicText, { color: homeTokens.text }]}
                        >
                          {ayah.arabic || ayah.text}
                        </ArabicText>
                        <AppText
                          variant="body"
                          style={[
                            styles.translationText,
                            {
                              textAlign: isRTL() ? 'right' : 'left',
                              writingDirection: isRTL() ? 'rtl' : 'ltr',
                            },
                          ]}
                          numberOfLines={3}
                        >
                          {ayah.translation}
                        </AppText>
                        {ayah.reflection ? (
                          <View style={styles.reflectionRow}>
                            <Ionicons name="sparkles-outline" size={12} color={homeTokens.gold} />
                            <AppText
                              variant="subtitle"
                              style={[
                                styles.reflectionText,
                                {
                                  textAlign: isRTL() ? 'right' : 'left',
                                  writingDirection: isRTL() ? 'rtl' : 'ltr',
                                },
                              ]}
                            >
                              {ayah.reflection}
                            </AppText>
                          </View>
                        ) : null}
                        <View style={styles.footerRow}>
                          <AppText
                            variant="caption"
                            style={[
                              styles.referenceText,
                              {
                                textAlign: isRTL() ? 'right' : 'left',
                              },
                            ]}
                          >
                            {ayah.reference}
                          </AppText>
                        </View>
                      </>
                    ) : (
                      <AppText variant="caption" style={styles.placeholderText}>
                        {t('Loading daily verse...')}
                      </AppText>
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
                        <View
                          style={[
                            styles.iconBadge,
                            {
                              backgroundColor: homeTokens.ringFill,
                              borderColor: homeTokens.ringBorder,
                            },
                          ]}
                        >
                          <Ionicons name="library-outline" size={14} color={homeTokens.accent} />
                        </View>
                        <AppText variant="eyebrow" style={styles.cardTag}>
                          {t('HADITH OF THE DAY')}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.headerAccessory,
                          {
                            backgroundColor: homeTokens.ringFill,
                            borderColor: homeTokens.ringBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                          size={12}
                          color={homeTokens.gold}
                        />
                      </View>
                    </View>

                    {hadith ? (
                      <>
                        {hadith.arabic ? (
                          <ArabicText
                            size={18}
                            align="right"
                            numberOfLines={2}
                            style={[styles.arabicText, { color: homeTokens.text, marginBottom: 6 }]}
                          >
                            {hadith.arabic}
                          </ArabicText>
                        ) : null}
                        <AppText
                          variant="body"
                          style={[
                            styles.translationText,
                            {
                              textAlign: isRTL() ? 'right' : 'left',
                              writingDirection: isRTL() ? 'rtl' : 'ltr',
                            },
                          ]}
                          numberOfLines={4}
                        >
                          {`"${hadith.translation}"`}
                        </AppText>
                        <View style={styles.footerRow}>
                          <AppText
                            variant="caption"
                            style={[
                              styles.referenceText,
                              {
                                textAlign: isRTL() ? 'right' : 'left',
                              },
                            ]}
                          >
                            {hadith.reference || hadith.source}
                          </AppText>
                        </View>
                      </>
                    ) : (
                      <AppText variant="caption" style={styles.placeholderText}>
                        {t('Loading daily hadith...')}
                      </AppText>
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
                        <View
                          style={[
                            styles.iconBadge,
                            {
                              backgroundColor: homeTokens.ringFill,
                              borderColor: homeTokens.ringBorder,
                            },
                          ]}
                        >
                          <Ionicons name="sparkles-outline" size={14} color={homeTokens.accent} />
                        </View>
                        <AppText variant="eyebrow" style={styles.cardTag}>
                          {t('NAME OF THE DAY')} · #{nameOfDay.number}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.headerAccessory,
                          {
                            backgroundColor: homeTokens.ringFill,
                            borderColor: homeTokens.ringBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isRTL() ? 'chevron-back' : 'chevron-forward'}
                          size={12}
                          color={homeTokens.gold}
                        />
                      </View>
                    </View>

                    <View style={styles.nameRow}>
                      <ArabicText
                        size={30}
                        bold
                        align={isRTL() ? 'right' : 'left'}
                        numberOfLines={1}
                        style={[styles.nameArabic, { color: homeTokens.text }]}
                      >
                        {nameOfDay.arabic || nameOfDay.name || ''}
                      </ArabicText>

                      <View style={styles.nameInfoCol}>
                        <AppText
                          variant="title"
                          style={[
                            styles.nameTranslit,
                            {
                              textAlign: isRTL() ? 'right' : 'left',
                              fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {nameOfDay.transliteration}
                        </AppText>
                        <AppText
                          variant="subtitle"
                          style={[
                            styles.nameMeaning,
                            {
                              textAlign: isRTL() ? 'right' : 'left',
                              writingDirection: isRTL() ? 'rtl' : 'ltr',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {nameOfDay.meaning}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.footerRow}>
                      <AppText
                        variant="caption"
                        style={[
                          styles.referenceText,
                          {
                            textAlign: isRTL() ? 'right' : 'left',
                          },
                        ]}
                      >
                        {t('Asma ul-Husna · The Divine Attributes')}
                      </AppText>
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
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    paddingVertical: 2,
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  cardSlideWrap: {
    borderRadius: 14,
    overflow: 'visible',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 194,
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  cardContent: {
    position: 'relative',
    padding: 18,
    minHeight: 194,
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
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTag: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingVertical: 2,
    flexShrink: 1,
  },
  headerAccessory: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  arabicText: {
    marginBottom: 8,
  },
  translationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 8,
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
    paddingVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  referenceText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
    paddingVertical: 2,
    flexShrink: 1,
  },
  nameRow: {
    marginVertical: 4,
    gap: 4,
    minWidth: 0,
  },
  nameInfoCol: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  nameTranslit: {
    fontSize: 22,
    lineHeight: 28,
    paddingVertical: 2,
  },
  nameMeaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 1,
  },
  nameArabic: {
    lineHeight: 38,
  },
  placeholderText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
