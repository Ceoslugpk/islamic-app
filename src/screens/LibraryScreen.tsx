import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  AccessibilityRole,
} from 'react-native';
import { TabScrollView } from '../components/layout/TabScreen';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';


import { useTheme } from '../lib/theme';
import { HOME_THEME_TOKENS, getCardShadow, getHeroCardShadow } from '../lib/homeThemeTokens';
import { themeTokens, GOLD_GRADIENT } from '../theme/tokens';
import { useSettings } from '../lib/settings';
import { isRTL, t } from '../lib/i18n';
import { getForwardIcon } from '../lib/iconMap';
import { GeometricPattern } from '../components/GeometricPattern';
import { useSurahDownloads } from '../lib/surahDownloads';
import { AppText } from '../components/ui/AppText';

/* ─── Route Union ────────────────────────────────────────────────────────── */

export type LibraryItemKey =
  | 'hadith'
  | 'duas'
  | 'tasbih'
  | 'names'
  | 'names-prophet'
  | 'ramadan-guide'
  | 'prayer-guide'
  | 'shahada'
  | 'downloads'
  | 'vocab'
  | 'summary'
  | 'tajweed'
  | 'umrah-guide'
  | 'hajj-journey'
  | 'women-purity'
  | 'women-guidance';

export interface LibraryScreenProps {
  onOpen: (key: LibraryItemKey) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  isActive?: boolean;
}

/* ─── Shared Theme Tokens ────────────────────────────────────────────────── */

const GOLD_SOLID = themeTokens.paper.gold;
const HERO_OUTER_BORDER = HOME_THEME_TOKENS.hero.outerBorder;
const HERO_INNER_BORDER = HOME_THEME_TOKENS.hero.innerBorder;
const HERO_IVORY = HOME_THEME_TOKENS.hero.ivory;

function getTokens(isDark: boolean) {
  return isDark ? themeTokens.ink : themeTokens.paper;
}

/* ─── Local Micro-Components ─────────────────────────────────────────────── */

interface AccessiblePressableProps {
  onPress?: () => void;
  style?: any;
  scaleOnPress?: number;
  activeOpacity?: number;
  children: React.ReactNode;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

function AccessiblePressable({
  onPress,
  style,
  scaleOnPress = 0.98,
  activeOpacity = 0.85,
  children,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  testID,
}: AccessiblePressableProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        style,
        pressed && {
          transform: [{ scale: scaleOnPress }],
          opacity: activeOpacity,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function BookStarEmblem({ size = 16, color }: { size?: number; color?: string }) {
  const emblemColor = color || HERO_OUTER_BORDER;
  const half = size / 2;
  const innerR = size * 0.35;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect
        x={half - innerR}
        y={half - innerR}
        width={innerR * 2}
        height={innerR * 2}
        stroke={emblemColor}
        strokeWidth={1}
        fill="none"
      />
      <Rect
        x={half - innerR}
        y={half - innerR}
        width={innerR * 2}
        height={innerR * 2}
        stroke={emblemColor}
        strokeWidth={1}
        fill="none"
        transform={`rotate(45 ${half} ${half})`}
      />
    </Svg>
  );
}

function DiamondIcon({ size = 8, color }: { size?: number; color?: string }) {
  const iconColor = color || GOLD_SOLID;
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path
        d={`M ${half} 0 L ${size} ${half} L ${half} ${size} L 0 ${half} Z`}
        fill={iconColor}
      />
    </Svg>
  );
}

/* ─── Main LibraryScreen ─────────────────────────────────────────────────── */

const LibraryScreen = React.memo(function LibraryScreen({
  onOpen,
  onOpenSettings,
  onOpenNotifications,
  isActive = true,
}: LibraryScreenProps) {
  const { mode } = useTheme();
  const isDark = mode === 'ink';
  const rtl = isRTL();
  const tokens = getTokens(isDark);
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const { downloadedSurahs } = useSurahDownloads(isActive);
  const fontPoppinsRegular = 'Poppins_400Regular';
  const fontPoppinsMedium = 'Poppins_500Medium';
  const fontLoraMedium = 'Lora_500Medium';
  const fontNotoNaskhMedium = 'NotoNaskhArabic_500Medium';

  const contentMaxWidth = Math.min(width, 680);
  const horizontalMargin = 14.5;
  const gridGap = 7.3;
  const tileWidth = Math.max(0, (contentMaxWidth - 2 * horizontalMargin - gridGap) / 2);
  const tilePaddingHorizontal = contentMaxWidth <= 360 ? 6 : 11;
  const prophetTitleFontSize = contentMaxWidth <= 360 ? 11 : 12;
  const prophetTitleLineHeight = contentMaxWidth <= 360 ? 14 : 15;

  // Responsive scale for book spines: 0.85 at <=360 width, 1.0 at >=393 width (never <0.85)
  const bookScale = Math.max(
    0.85,
    Math.min(1, 0.85 + ((contentMaxWidth - 360) / (393 - 360)) * 0.15)
  );
  const heroBooksOffset = contentMaxWidth <= 360 ? 10 : 14;
  const heroTextPadding = contentMaxWidth <= 360 ? 120 : 130;

  // Guides rows list (Women items gated by settings.womenWorshipEnabled)
  const guideRows = [
    {
      key: 'prayer-guide' as LibraryItemKey,
      title: 'Prayer Guide (Fiqh)',
      subtitle: 'Wudu, Salah, Janazah, Eid, Istikhara, Taraweeh',
      icon: 'book-outline' as const,
    },
    {
      key: 'ramadan-guide' as LibraryItemKey,
      title: 'Ramadan & Eid Guide',
      subtitle: 'Fasting, Laylatul Qadr, Zakat al-Fitr, Eid Salah',
      icon: 'moon-outline' as const,
    },
    {
      key: 'umrah-guide' as LibraryItemKey,
      title: 'Umrah Guide',
      subtitle: "Step-by-step rituals · Ihram, Tawaf, Sa'i & Halq",
      icon: 'walk-outline' as const,
    },
    {
      key: 'hajj-journey' as LibraryItemKey,
      title: 'Hajj Journey',
      subtitle: 'Day-by-day timeline · Tarwiyah, Arafah to Tashreeq',
      icon: 'map-outline' as const,
    },
    ...(settings.womenWorshipEnabled
      ? [
          {
            key: 'women-purity' as LibraryItemKey,
            title: 'Purity & Ghusl',
            subtitle: 'Step-by-step ghusl guide, signs of tuhr, and postpartum (nifas) tracker.',
            icon: 'water-outline' as const,
          },
          {
            key: 'women-guidance' as LibraryItemKey,
            title: 'Worship Guidance',
            subtitle: 'Exemptions, istihadha rulings & fiqh references',
            icon: 'heart-outline' as const,
          },
        ]
      : []),
    {
      key: 'vocab' as LibraryItemKey,
      title: 'Quran Vocabulary',
      subtitle: 'Flashcards of the most frequent Quranic words',
      icon: 'language-outline' as const,
    },
    {
      key: 'tajweed' as LibraryItemKey,
      title: 'Tajweed Colors',
      subtitle: 'Color-coded reading rules for the most-recited surahs',
      icon: 'color-palette-outline' as const,
    },
  ];

  const downloadedCount = downloadedSurahs ? downloadedSurahs.length : 0;
  const downloadsSubtitle =
    downloadedCount > 0
      ? `${t('Offline Quran audio files')} · ${downloadedCount}`
      : t('Offline Quran audio files');

  return (
    <View style={styles.root}>
      <TabScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.container, { maxWidth: contentMaxWidth }]}>
          {/* ─── Title Section ─────────────────────────────────────────── */}
          <View style={styles.titleSection}>
            <AppText
              variant="eyebrow"
              style={[
                styles.titleEyebrow,
                {
                  fontFamily: fontPoppinsMedium,
                },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {t('Library')}
            </AppText>
            <AppText
              variant="screenTitle"
              style={[
                styles.titleMain,
                {
                  fontFamily: fontLoraMedium,
                },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {t('Explore')}
            </AppText>
          </View>

          {/* ─── 3. Hero: Hadith Library ──────────────────────────────────── */}
          <AccessiblePressable
            onPress={() => onOpen('hadith')}
            style={[
              styles.heroCardWrap,
              { backgroundColor: tokens.heroGradient[0] },
              getHeroCardShadow(mode),
            ]}
            scaleOnPress={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${t('Hadith Library')}, 15+ ${t('full books')}`}
            testID="library-card-hadith-hero"
          >
            <View style={[styles.heroCard, { borderColor: HERO_OUTER_BORDER }]}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 21, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={tokens.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                {/* Clipped Geometric SVG Pattern */}
                <GeometricPattern
                  variant="tessellation"
                  color={HERO_OUTER_BORDER}
                  opacity={0.12}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Inner Inset 4.5 Border */}
              <View style={styles.heroInnerBorder} pointerEvents="none" />

              {/* Left Content */}
              <View style={[styles.heroLeftContent, { paddingEnd: heroTextPadding }]}>
                {/* Diamond + KNOWLEDGE */}
                <View style={styles.heroLabelRow}>
                  <DiamondIcon size={7} color={tokens.gold} />
                  <AppText
                    variant="eyebrow"
                    onHero
                    style={[styles.heroLabelText, { fontFamily: fontPoppinsMedium }]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('Knowledge').toLocaleUpperCase()}
                  </AppText>
                </View>

                {/* Hadith Library Title */}
                <AppText
                  variant="onHeroTitle"
                  onHero
                  style={[
                    styles.heroTitle,
                    {
                      fontFamily: fontLoraMedium,
                    },
                  ]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Hadith Library')}
                </AppText>

                {/* Big Count: 15+ full books */}
                <View style={styles.heroCountRow}>
                  <AppText
                    variant="numeral"
                    onHero
                    maxFontSizeMultiplier={1.2}
                    style={[
                      styles.heroBigNumber,
                      {
                        fontFamily: fontLoraMedium,
                      },
                    ]}
                  >
                    15+
                  </AppText>
                  <AppText
                    variant="body"
                    onHero
                    style={[
                      styles.heroBooksLabel,
                      {
                        fontFamily: fontLoraMedium,
                      },
                    ]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('full books')}
                  </AppText>
                </View>

                {/* Subtitle */}
                <AppText
                  variant="onHeroSubtitle"
                  onHero
                  style={[
                    styles.heroSubtitle,
                    {
                      fontFamily: fontPoppinsRegular,
                    },
                  ]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Arabic with English translation')}
                </AppText>
              </View>

              {/* Browse Button */}
              <View style={styles.browseBtnWrap} pointerEvents="none">
                <LinearGradient
                  colors={GOLD_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.browseBtn}
                >
                  <AppText
                    variant="body"
                    tone="onGold"
                    style={[
                      styles.browseBtnText,
                      {
                        fontFamily: fontPoppinsMedium,
                      },
                    ]}
                  >
                    {t('Browse')} {rtl ? '←' : '→'}
                  </AppText>
                </LinearGradient>
              </View>

              {/* Right Decorative Upright Books */}
              <View
                style={[
                  styles.heroBooksCluster,
                  {
                    end: heroBooksOffset,
                    transform: [{ scale: bookScale }],
                    transformOrigin: rtl ? 'bottom left' : 'bottom right',
                  },
                ]}
                accessible={false}
                importantForAccessibility="no"
              >
                {/* Book 1: Sahih al-Bukhari (Ivory) */}
                <View
                  style={[
                    styles.bookSpine,
                    {
                      height: 124,
                      backgroundColor: HERO_IVORY,
                      borderColor: HERO_OUTER_BORDER,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.bookTopLine, { backgroundColor: HERO_OUTER_BORDER }]} />
                  <View style={styles.bookEmblemWrap}>
                    <BookStarEmblem size={13} color={HERO_OUTER_BORDER} />
                  </View>
                  <Text
                    style={[
                      styles.bookArabicTitle,
                      {
                        fontFamily: fontNotoNaskhMedium,
                        color: tokens.onGold,
                      },
                    ]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    البخاري
                  </Text>
                  <View style={[styles.bookBottomLine, { backgroundColor: HERO_OUTER_BORDER }]} />
                </View>

                {/* Book 2: Sahih Muslim (Gold/Tan, Taller) */}
                <View
                  style={[
                    styles.bookSpine,
                    {
                      height: 146,
                      backgroundColor: tokens.gold,
                      borderColor: HERO_INNER_BORDER,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.bookTopLine, { backgroundColor: tokens.onGold }]} />
                  <View style={styles.bookEmblemWrap}>
                    <BookStarEmblem size={13} color={tokens.onGold} />
                  </View>
                  <Text
                    style={[
                      styles.bookArabicTitle,
                      {
                        fontFamily: fontNotoNaskhMedium,
                        color: tokens.onGold,
                      },
                    ]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    مسلم
                  </Text>
                  <View style={[styles.bookBottomLine, { backgroundColor: tokens.onGold }]} />
                </View>

                {/* Book 3: Jami at-Tirmidhi (Dark Emerald) */}
                <View
                  style={[
                    styles.bookSpine,
                    {
                      height: 114,
                      backgroundColor: tokens.brandGreen,
                      borderColor: HERO_INNER_BORDER,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.bookTopLine, { backgroundColor: tokens.gold }]} />
                  <View style={styles.bookEmblemWrap}>
                    <BookStarEmblem size={13} color={tokens.gold} />
                  </View>
                  <Text
                    style={[
                      styles.bookArabicTitle,
                      {
                        fontFamily: fontNotoNaskhMedium,
                        color: tokens.gold,
                        fontSize: 11,
                      },
                    ]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    الترمذي
                  </Text>
                  <View style={[styles.bookBottomLine, { backgroundColor: tokens.gold }]} />
                </View>
              </View>
            </View>
          </AccessiblePressable>

          {/* ─── 4. KNOWLEDGE & COLLECTIONS ───────────────────────────────── */}
          <AppText
            variant="eyebrow"
            style={[
              styles.sectionLabel,
              {
                fontFamily: fontPoppinsMedium,
              },
            ]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
          >
            {t('KNOWLEDGE & COLLECTIONS')}
          </AppText>

          {/* 2x2 Knowledge Grid */}
          <View style={styles.knowledgeGrid}>
            {/* Tile 1: Duas & Adhkar */}
            <AccessiblePressable
              onPress={() => onOpen('duas')}
              style={[
                styles.knowledgeTileWrap,
                {
                  width: tileWidth,
                  backgroundColor: tokens.cardTop,
                },
                getCardShadow(mode),
              ]}
              scaleOnPress={0.98}
              accessibilityRole="button"
              accessibilityLabel={`${t('Duas & Adhkar')}, ${t('Daily supplications')}`}
              testID="library-card-duas"
            >
              <View
                style={[
                  styles.knowledgeTileInner,
                  {
                    paddingHorizontal: tilePaddingHorizontal,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <LinearGradient
                  colors={[tokens.cardTop, tokens.cardBottom]}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.tileRingIcon,
                    {
                      borderColor: tokens.ringBorder,
                      backgroundColor: tokens.ringFill,
                    },
                  ]}
                >
                  <Ionicons name="hand-left" size={14} color={tokens.accent} />
                </View>
                <View style={styles.tileTextWrap}>
                  <AppText
                    variant="title"
                    style={[
                      styles.tileTitle,
                      {
                        fontFamily: fontPoppinsMedium,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('Duas & Adhkar')}
                  </AppText>
                  <AppText
                    variant="subtitle"
                    style={[
                      styles.tileSubtitle,
                      {
                        fontFamily: fontPoppinsRegular,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('Daily supplications')}
                  </AppText>
                </View>
              </View>
            </AccessiblePressable>

            {/* Tile 2: 99 Names of Allah */}
            <AccessiblePressable
              onPress={() => onOpen('names')}
              style={[
                styles.knowledgeTileWrap,
                {
                  width: tileWidth,
                  backgroundColor: tokens.cardTop,
                },
                getCardShadow(mode),
              ]}
              scaleOnPress={0.98}
              accessibilityRole="button"
              accessibilityLabel={`${t('99 Names of Allah')}, ${t('Asma ul-Husna')}`}
              testID="library-card-names-allah"
            >
              <View
                style={[
                  styles.knowledgeTileInner,
                  {
                    paddingHorizontal: tilePaddingHorizontal,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <LinearGradient
                  colors={[tokens.cardTop, tokens.cardBottom]}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.tileRingIcon,
                    {
                      borderColor: tokens.ringBorder,
                      backgroundColor: tokens.ringFill,
                    },
                  ]}
                >
                  <Ionicons name="sparkles" size={14} color={tokens.accent} />
                </View>
                <View style={styles.tileTextWrap}>
                  <AppText
                    variant="title"
                    style={[
                      styles.tileTitle,
                      {
                        fontFamily: fontPoppinsMedium,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('99 Names of Allah')}
                  </AppText>
                  <AppText
                    variant="subtitle"
                    style={[
                      styles.tileSubtitle,
                      {
                        fontFamily: fontPoppinsRegular,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('Asma ul-Husna')}
                  </AppText>
                </View>
              </View>
            </AccessiblePressable>

            {/* Tile 3: 99 Names of the Prophet */}
            <AccessiblePressable
              onPress={() => onOpen('names-prophet')}
              style={[
                styles.knowledgeTileWrap,
                {
                  width: tileWidth,
                  backgroundColor: tokens.cardTop,
                },
                getCardShadow(mode),
              ]}
              scaleOnPress={0.98}
              accessibilityRole="button"
              accessibilityLabel={`${t('99 Names of the Prophet')}, ${t('Noble names & attributes')}`}
              testID="library-card-names-prophet"
            >
              <View
                style={[
                  styles.knowledgeTileInner,
                  {
                    paddingHorizontal: tilePaddingHorizontal,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <LinearGradient
                  colors={[tokens.cardTop, tokens.cardBottom]}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.tileRingIcon,
                    {
                      borderColor: tokens.ringBorder,
                      backgroundColor: tokens.ringFill,
                    },
                  ]}
                >
                  <Ionicons name="star" size={14} color={tokens.accent} />
                </View>
                <View style={styles.tileTextWrap}>
                  <AppText
                    variant="title"
                    style={[
                      styles.tileTitle,
                      {
                        fontFamily: fontPoppinsMedium,
                        fontSize: prophetTitleFontSize,
                        lineHeight: prophetTitleLineHeight,
                        letterSpacing: contentMaxWidth <= 360 ? -0.2 : undefined,
                      },
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('99 Names of the Prophet')}
                  </AppText>
                  <AppText
                    variant="subtitle"
                    style={[
                      styles.tileSubtitle,
                      {
                        fontFamily: fontPoppinsRegular,
                        letterSpacing: contentMaxWidth <= 360 ? -0.15 : undefined,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('Noble names & attributes')}
                  </AppText>
                </View>
              </View>
            </AccessiblePressable>

            {/* Tile 4: The Shahada */}
            <AccessiblePressable
              onPress={() => onOpen('shahada')}
              style={[
                styles.knowledgeTileWrap,
                {
                  width: tileWidth,
                  backgroundColor: tokens.cardTop,
                },
                getCardShadow(mode),
              ]}
              scaleOnPress={0.98}
              accessibilityRole="button"
              accessibilityLabel={`${t('The Shahada')}, ${t('Declaration of faith')}`}
              testID="library-card-shahada"
            >
              <View
                style={[
                  styles.knowledgeTileInner,
                  {
                    paddingHorizontal: tilePaddingHorizontal,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <LinearGradient
                  colors={[tokens.cardTop, tokens.cardBottom]}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={[
                    styles.tileRingIcon,
                    {
                      borderColor: tokens.ringBorder,
                      backgroundColor: tokens.ringFill,
                    },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={14} color={tokens.accent} />
                </View>
                <View style={styles.tileTextWrap}>
                  <AppText
                    variant="title"
                    style={[
                      styles.tileTitle,
                      {
                        fontFamily: fontPoppinsMedium,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('The Shahada')}
                  </AppText>
                  <AppText
                    variant="subtitle"
                    style={[
                      styles.tileSubtitle,
                      {
                        fontFamily: fontPoppinsRegular,
                      },
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('Declaration of faith')}
                  </AppText>
                </View>
              </View>
            </AccessiblePressable>
          </View>

          {/* Downloads Row */}
          <AccessiblePressable
            onPress={() => onOpen('downloads')}
            style={[
              styles.downloadsCardWrap,
              {
                backgroundColor: tokens.cardTop,
              },
              getCardShadow(mode),
            ]}
            scaleOnPress={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${t('Downloads')}, ${downloadsSubtitle}`}
            testID="library-card-downloads"
          >
            <View
              style={[
                styles.downloadsCardInner,
                {
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <LinearGradient
                colors={[tokens.cardTop, tokens.cardBottom]}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.downloadsRingIcon,
                  {
                    borderColor: tokens.ringBorder,
                    backgroundColor: tokens.ringFill,
                  },
                ]}
              >
                <Ionicons name="cloud-download-outline" size={14} color={tokens.accent} />
              </View>
              <View style={styles.downloadsTextWrap}>
                <AppText
                  variant="title"
                  style={[
                    styles.downloadsTitle,
                    {
                      fontFamily: fontPoppinsMedium,
                    },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Downloads')}
                </AppText>
                <AppText
                  variant="subtitle"
                  style={[
                    styles.downloadsSubtitle,
                    {
                      fontFamily: fontPoppinsRegular,
                    },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {downloadsSubtitle}
                </AppText>
              </View>
              <Ionicons
                name={getForwardIcon()}
                size={14}
                color={tokens.accent}
                style={{ opacity: 0.8 }}
              />
            </View>
          </AccessiblePressable>

          {/* ─── 5. GUIDES & EDUCATION ─────────────────────────────────────── */}
          <AppText
            variant="eyebrow"
            style={[
              styles.guidesSectionLabel,
              {
                fontFamily: fontPoppinsMedium,
              },
            ]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
          >
            {t('GUIDES & EDUCATION')}
          </AppText>

          {/* Guides Card with 8 rows */}
          <View
            style={[
              styles.guidesCardWrap,
              {
                backgroundColor: tokens.cardTop,
              },
              getCardShadow(mode),
            ]}
            testID="library-card-guides"
          >
            <View
              style={[
                styles.guidesCardInner,
                {
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <LinearGradient
                colors={[tokens.cardTop, tokens.cardBottom]}
                style={StyleSheet.absoluteFill}
              />

              {guideRows.map((row, index) => {
                const isLast = index === guideRows.length - 1;
                return (
                  <View key={row.key} style={styles.guideRowWrap}>
                    <GuideRowItem
                      row={row}
                      tokens={tokens}
                      isDark={isDark}
                      fontPoppinsMedium={fontPoppinsMedium}
                      fontPoppinsRegular={fontPoppinsRegular}
                      onPress={() => onOpen(row.key)}
                    />
                    {!isLast && (
                      <View
                        style={[
                          styles.guideSeparator,
                          {
                            backgroundColor: tokens.cardBorder,
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </TabScrollView>
    </View>
  );
});

/* ─── Guide Row Sub-Component with Pressed Tint ──────────────────────────── */

interface GuideRowItemProps {
  row: {
    key: LibraryItemKey;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
  tokens: ReturnType<typeof getTokens>;
  isDark: boolean;
  fontPoppinsMedium?: string;
  fontPoppinsRegular?: string;
  onPress: () => void;
}

function GuideRowItem({
  row,
  tokens,
  isDark,
  fontPoppinsMedium,
  fontPoppinsRegular,
  onPress,
}: GuideRowItemProps) {
  const pressedBg = isDark ? 'rgba(222, 184, 110, 0.08)' : 'rgba(16, 90, 75, 0.08)';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.guideRow,
        pressed && { backgroundColor: pressedBg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${t(row.title)}, ${t(row.subtitle)}`}
    >
      <View
        style={[
          styles.guideRingIcon,
          {
            borderColor: tokens.ringBorder,
            backgroundColor: tokens.ringFill,
          },
        ]}
      >
        <Ionicons name={row.icon} size={11.6} color={tokens.accent} />
      </View>
      <View style={styles.guideTextWrap}>
        <AppText
          variant="title"
          style={[
            styles.guideTitle,
            {
              fontFamily: fontPoppinsMedium,
            },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {t(row.title)}
        </AppText>
        <AppText
          variant="subtitle"
          style={[
            styles.guideSubtitle,
            {
              fontFamily: fontPoppinsRegular,
            },
          ]}
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
        >
          {t(row.subtitle)}
        </AppText>
      </View>
      <Ionicons
        name={getForwardIcon()}
        size={12}
        color={tokens.accent}
        style={{ opacity: 0.8 }}
      />
    </Pressable>
  );
}

/* ─── Stylesheet ─────────────────────────────────────────────────────────── */

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
  },

  /* Title Section */
  titleSection: {
    paddingStart: 26,
  },
  titleEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  titleMain: {
    fontSize: 33.5,
    lineHeight: 38,
    marginTop: 2,
  },

  /* Hero: Hadith Library */
  heroCardWrap: {
    marginHorizontal: 14.5,
    marginTop: 19.5,
    borderRadius: 22,
  },
  heroCard: {
    minHeight: 185.5,
    borderRadius: 22,
    borderWidth: 1,
    position: 'relative',
    paddingStart: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroInnerBorder: {
    position: 'absolute',
    top: 4.5,
    left: 4.5,
    right: 4.5,
    bottom: 4.5,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: HERO_INNER_BORDER,
  },
  heroLeftContent: {
    flex: 1,
    paddingEnd: 130,
    justifyContent: 'flex-start',
    paddingBottom: 44,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroLabelText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 28,
    marginTop: 4,
  },
  heroCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  heroBigNumber: {
    fontSize: 54.5,
    lineHeight: 68,
  },
  heroBooksLabel: {
    fontSize: 17,
    lineHeight: 22,
    marginStart: 7,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 15,
    marginTop: -2,
  },
  browseBtnWrap: {
    position: 'absolute',
    bottom: 14,
    start: 16,
  },
  browseBtn: {
    minWidth: 104,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseBtnText: {
    fontSize: 13,
    lineHeight: 17,
  },

  /* Decorative Books */
  heroBooksCluster: {
    position: 'absolute',
    end: 14,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bookSpine: {
    width: 40,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    overflow: 'hidden',
  },
  bookTopLine: {
    width: 24,
    height: 1.5,
    borderRadius: 1,
  },
  bookBottomLine: {
    width: 24,
    height: 1.5,
    borderRadius: 1,
  },
  bookEmblemWrap: {
    marginVertical: 4,
  },
  bookArabicTitle: {
    fontSize: 12,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: 2,
    includeFontPadding: true,
  },

  /* Section Labels */
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 22.5,
    marginStart: 26,
  },
  guidesSectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 29,
    marginStart: 26,
  },

  /* Knowledge 2x2 Grid */
  knowledgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 14.5,
    gap: 7.3,
    marginTop: 10,
  },
  knowledgeTileWrap: {
    minHeight: 88,
    borderRadius: 18,
  },
  knowledgeTileInner: {
    flexGrow: 1,
    flexShrink: 0,
    minHeight: 88,
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 9,
    justifyContent: 'space-between',
  },
  tileRingIcon: {
    width: 30.5,
    height: 30.5,
    borderRadius: 15.25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTextWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  tileTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tileSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },

  /* Downloads Row */
  downloadsCardWrap: {
    marginHorizontal: 14.5,
    marginTop: 7.3,
    minHeight: 48,
    borderRadius: 18,
  },
  downloadsCardInner: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadsRingIcon: {
    width: 30.5,
    height: 30.5,
    borderRadius: 15.25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  downloadsTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  downloadsTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  downloadsSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },

  /* Guides Card */
  guidesCardWrap: {
    marginHorizontal: 14.5,
    marginTop: 10,
    borderRadius: 18,
  },
  guidesCardInner: {
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
  },
  guideRowWrap: {
    width: '100%',
  },
  guideRow: {
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideRingIcon: {
    width: 24.7,
    height: 24.7,
    borderRadius: 12.35,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 9,
  },
  guideTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  guideTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  guideSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  guideSeparator: {
    height: StyleSheet.hairlineWidth,
    marginStart: 44.7,
    marginEnd: 11,
    opacity: 0.35,
  },
});

export default LibraryScreen;
