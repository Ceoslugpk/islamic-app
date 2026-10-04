import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  RefreshControl,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useHaptics } from '../lib/haptics';
import {
  getWidgetBundle,
  WidgetBundle,
} from '../lib/widgets';
import { Hairline } from '../components/Hairline';

export interface WidgetPreviewScreenProps {
  onClose: () => void;
  onOpenQuranReader?: (surah: number, ayah: number) => void;
}

type PlatformPreview = 'ios' | 'android';

export default function WidgetPreviewScreen({ onClose, onOpenQuranReader }: WidgetPreviewScreenProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { haptic } = useHaptics();

  const [bundle, setBundle] = useState<WidgetBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platformPreview, setPlatformPreview] = useState<PlatformPreview>(
    Platform.OS === 'android' ? 'android' : 'ios'
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const appStateRef = useRef(AppState.currentState);

  const loadData = useCallback(async () => {
    try {
      const loc = settings.locationMode === 'auto' && settings.autoLocation
        ? settings.autoLocation
        : settings.manualLocation;

      const data = await getWidgetBundle({
        now: new Date(),
        location: loc,
        method: settings.methodId,
        timeFormat: settings.timeFormat,
      });

      setBundle(data);
      setLastRefreshedAt(new Date());
    } catch {
      // Keep existing bundle on failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [settings]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const loc = settings.locationMode === 'auto' && settings.autoLocation
          ? settings.autoLocation
          : settings.manualLocation;

        const data = await getWidgetBundle({
          now: new Date(),
          location: loc,
          method: settings.methodId,
          timeFormat: settings.timeFormat,
        });

        if (isMounted) {
          setBundle(data);
          setLastRefreshedAt(new Date());
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [settings]);

  // Live countdown ticker (recomputes every 30s while preview is open)
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Refresh snapshots on focus / AppState active transition
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        loadData();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadData]);

  const handleManualRefresh = () => {
    haptic('light');
    setRefreshing(true);
    loadData();
  };

  const handleDeepLinkPress = (url: string) => {
    haptic('selection');
    if (url.startsWith('salah://quran/') && onOpenQuranReader && bundle?.continueReading) {
      onClose();
      onOpenQuranReader(bundle.continueReading.surahNumber, bundle.continueReading.ayahNumber);
      return;
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          'Deep Link Target',
          `In a live native widget, tapping this triggers: ${url}\n\nThis opens the destination directly in the app.`,
          [{ text: 'OK' }]
        );
      }
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          onPress={() => {
            haptic('light');
            onClose();
          }}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close widgets preview"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>Done</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Home Screen Widgets</Text>

        <TouchableOpacity
          onPress={handleManualRefresh}
          style={styles.refreshBtn}
          accessibilityRole="button"
          accessibilityLabel="Refresh widget data"
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={refreshing ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.contentWrap}>
          {/* Eyebrow & Intro */}
          <View style={styles.introHeader}>
            <View style={styles.eyebrowRow}>
              <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.eyebrowText, { color: colors.accent }]}>LIVE SNAPSHOTS</Text>
              <Text style={[styles.eyebrowSub, { color: colors.textMuted }]}>
                · Ticks every 30s
              </Text>
            </View>
            <Text style={[styles.heroHeadline, { color: colors.textPrimary }]}>
              Native Home Screen Widgets
            </Text>
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
              Preview how widgets appear on iOS and Android. Backed by a pure, read-only
              storage snapshot layer designed for native WidgetKit and AppWidgetProvider.
            </Text>
          </View>

          {/* Platform Aesthetic Selector */}
          <View style={[styles.platformSelector, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
            <TouchableOpacity
              style={[
                styles.platformOption,
                platformPreview === 'ios' && [styles.platformOptionActive, { backgroundColor: colors.accentDim, borderColor: colors.accent }],
              ]}
              onPress={() => {
                haptic('selection');
                setPlatformPreview('ios');
              }}
              accessibilityRole="button"
              accessibilityLabel="Show iOS WidgetKit styling"
            >
              <Ionicons
                name="logo-apple"
                size={16}
                color={platformPreview === 'ios' ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.platformOptionText,
                  { color: platformPreview === 'ios' ? colors.accent : colors.textSecondary },
                ]}
              >
                Apple iOS (WidgetKit)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.platformOption,
                platformPreview === 'android' && [styles.platformOptionActive, { backgroundColor: colors.accentDim, borderColor: colors.accent }],
              ]}
              onPress={() => {
                haptic('selection');
                setPlatformPreview('android');
              }}
              accessibilityRole="button"
              accessibilityLabel="Show Android Material You styling"
            >
              <Ionicons
                name="logo-android"
                size={16}
                color={platformPreview === 'android' ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.platformOptionText,
                  { color: platformPreview === 'android' ? colors.accent : colors.textSecondary },
                ]}
              >
                Android (Material You)
              </Text>
            </TouchableOpacity>
          </View>

          {loading && !bundle ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Generating widget snapshots...
              </Text>
            </View>
          ) : bundle ? (
            <View style={styles.widgetsGrid}>
              {/* ---------------------------------------------------------------- */}
              {/* 1. NEXT PRAYER WIDGET                                            */}
              {/* ---------------------------------------------------------------- */}
              <View style={styles.widgetSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.widgetBadgeRow}>
                    <Text style={[styles.widgetBadge, { backgroundColor: colors.accentDim, color: colors.accent }]}>
                      WIDGET 1 · MEDIUM (4×2)
                    </Text>
                  </View>
                  <Text style={[styles.widgetSubnote, { color: colors.textMuted }]}>
                    Next Prayer & Countdown
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => handleDeepLinkPress('salah://home')}
                  style={[
                    styles.widgetContainer,
                    platformPreview === 'ios' ? styles.iosWidgetCard : styles.androidWidgetCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Next prayer widget. Tap to open home."
                >
                  {/* Top Bar of Widget */}
                  <View style={styles.widgetHeader}>
                    <View style={styles.widgetHeaderLeft}>
                      <View style={[styles.widgetIconWrap, { backgroundColor: colors.accentDim }]}>
                        <Ionicons name="time-outline" size={13} color={colors.accent} />
                      </View>
                      <Text style={[styles.widgetNameLabel, { color: colors.textMuted }]}>
                        {bundle.nextPrayer.isTomorrow ? 'NEXT PRAYER · TOMORROW' : 'NEXT PRAYER'}
                      </Text>
                    </View>
                    <Text style={[styles.locationTag, { color: colors.textSecondary }]}>
                      {bundle.nextPrayer.locationLabel}
                    </Text>
                  </View>

                  {/* Main Prayer Row */}
                  <View style={styles.prayerHeroContent}>
                    <View style={styles.prayerNameTimeGroup}>
                      <Text style={[styles.prayerNameUpper, { color: colors.accent }]}>
                        {bundle.nextPrayer.hasData ? bundle.nextPrayer.name : 'PRAYER'}
                      </Text>
                      <Text style={[styles.bigSerifTime, { color: colors.textPrimary }]}>
                        {bundle.nextPrayer.hasData ? bundle.nextPrayer.time : '--:--'}
                      </Text>
                    </View>

                    {/* Countdown Badge */}
                    <View style={[styles.countdownPill, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                      <Ionicons name="timer-outline" size={13} color={colors.accent} />
                      <Text style={[styles.countdownPillText, { color: colors.accent }]}>
                        {bundle.nextPrayer.countdownText}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Line */}
                  {bundle.nextPrayer.hasData ? (
                    <View style={styles.widgetProgressWrapper}>
                      <View style={[styles.widgetProgressTrack, { backgroundColor: colors.borderSubtle }]}>
                        <View
                          style={[
                            styles.widgetProgressFill,
                            {
                              backgroundColor: colors.accent,
                              width: `${Math.round(bundle.nextPrayer.progressFraction * 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.widgetProgressMeta}>
                        <Text style={[styles.progressMetaText, { color: colors.textMuted }]}>
                          {Math.round(bundle.nextPrayer.progressFraction * 100)}% elapsed
                        </Text>
                        <Text style={[styles.progressMetaText, { color: colors.textMuted }]}>
                          Tap to open prayer times
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.fallbackNotice}>
                      <Text style={[styles.fallbackNoticeText, { color: colors.textMuted }]}>
                        {bundle.nextPrayer.fallbackText}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* ---------------------------------------------------------------- */}
              {/* 2. PRAYER PROGRESS WIDGET                                        */}
              {/* ---------------------------------------------------------------- */}
              <View style={styles.widgetSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.widgetBadgeRow}>
                    <Text style={[styles.widgetBadge, { backgroundColor: colors.accentDim, color: colors.accent }]}>
                      WIDGET 2 · MEDIUM (4×2)
                    </Text>
                  </View>
                  <Text style={[styles.widgetSubnote, { color: colors.textMuted }]}>
                    Daily Salah Checklist
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => handleDeepLinkPress('salah://tracker')}
                  style={[
                    styles.widgetContainer,
                    platformPreview === 'ios' ? styles.iosWidgetCard : styles.androidWidgetCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Prayer progress widget. Tap to open tracker."
                >
                  {/* Top Bar */}
                  <View style={styles.widgetHeader}>
                    <View style={styles.widgetHeaderLeft}>
                      <View style={[styles.widgetIconWrap, { backgroundColor: colors.accentDim }]}>
                        <Ionicons name="checkbox-outline" size={13} color={colors.accent} />
                      </View>
                      <Text style={[styles.widgetNameLabel, { color: colors.textMuted }]}>
                        {bundle.prayerProgress.label}
                      </Text>
                    </View>
                    {bundle.prayerProgress.streak > 0 && (
                      <View style={[styles.streakPill, { backgroundColor: colors.accentDim }]}>
                        <Text style={[styles.streakPillText, { color: colors.accent }]}>
                          🔥 {bundle.prayerProgress.streak}d streak
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Stat Header & Rows */}
                  <View style={styles.progressHeroRow}>
                    <View style={styles.statLargeGroup}>
                      <Text style={[styles.statLargeNumber, { color: colors.textPrimary }]}>
                        {bundle.prayerProgress.completedCount}
                        <Text style={[styles.statLargeTotal, { color: colors.textMuted }]}>/5</Text>
                      </Text>
                      <Text style={[styles.statSubLabel, { color: colors.textSecondary }]}>
                        Prayers Completed
                      </Text>
                    </View>

                    {/* 5 Prayer Rows Checklist */}
                    <View style={styles.fivePrayerChecklist}>
                      {bundle.prayerProgress.prayers.map((item) => (
                        <View key={item.name} style={styles.prayerCheckItem}>
                          <View
                            style={[
                              styles.symbolCircle,
                              {
                                borderColor: item.completed ? colors.accent : colors.borderStrong,
                                backgroundColor: item.completed ? colors.accent : 'transparent',
                              },
                            ]}
                          >
                            {item.completed ? (
                              <Text style={styles.symbolCheckMark}>✓</Text>
                            ) : (
                              <Text style={[styles.symbolCircleMark, { color: colors.borderStrong }]}>○</Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.prayerCheckName,
                              {
                                color: item.completed ? colors.textPrimary : colors.textSecondary,
                                fontFamily: item.completed ? 'Manrope_600SemiBold' : 'Manrope_400Regular',
                              },
                            ]}
                          >
                            {item.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* ---------------------------------------------------------------- */}
              {/* 3 & 4 SIDE-BY-SIDE OR STACKED (Quran & Hijri)                    */}
              {/* ---------------------------------------------------------------- */}
              <View style={styles.splitWidgetsRow}>
                {/* 3. QURAN CONTINUE READING */}
                <View style={styles.splitHalfCol}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.widgetBadge, { backgroundColor: colors.accentDim, color: colors.accent }]}>
                      WIDGET 3 · SMALL (2×2)
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleDeepLinkPress(bundle.continueReading.deepLink)}
                    style={[
                      styles.widgetContainer,
                      styles.squareWidgetCard,
                      platformPreview === 'ios' ? styles.iosWidgetCard : styles.androidWidgetCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Quran continue reading widget. Tap to read."
                  >
                    <View style={styles.widgetHeader}>
                      <View style={styles.widgetHeaderLeft}>
                        <View style={[styles.widgetIconWrap, { backgroundColor: colors.accentDim }]}>
                          <Ionicons name="book-outline" size={13} color={colors.accent} />
                        </View>
                        <Text style={[styles.widgetNameLabel, { color: colors.textMuted }]}>
                          HOLY QURAN
                        </Text>
                      </View>
                    </View>

                    <View style={styles.quranWidgetBody}>
                      <Text style={[styles.quranEyebrow, { color: colors.accent }]}>
                        {bundle.continueReading.hasPosition ? 'CONTINUE READING' : 'START READING'}
                      </Text>
                      <Text
                        style={[styles.quranRefTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {bundle.continueReading.reference}
                      </Text>
                      {bundle.continueReading.surahArabicName ? (
                        <Text
                          style={[styles.quranArabicSub, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {bundle.continueReading.surahArabicName}
                        </Text>
                      ) : null}
                    </View>

                    <View style={[styles.actionPillBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                      <Text style={[styles.actionPillText, { color: colors.accent }]}>
                        {bundle.continueReading.actionText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 4. HIJRI CALENDAR */}
                <View style={styles.splitHalfCol}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.widgetBadge, { backgroundColor: colors.accentDim, color: colors.accent }]}>
                      WIDGET 4 · SMALL (2×2)
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleDeepLinkPress('salah://calendar')}
                    style={[
                      styles.widgetContainer,
                      styles.squareWidgetCard,
                      platformPreview === 'ios' ? styles.iosWidgetCard : styles.androidWidgetCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Hijri calendar widget. Tap to open calendar."
                  >
                    <View style={styles.widgetHeader}>
                      <View style={styles.widgetHeaderLeft}>
                        <View style={[styles.widgetIconWrap, { backgroundColor: colors.accentDim }]}>
                          <Ionicons name="moon-outline" size={13} color={colors.accent} />
                        </View>
                        <Text style={[styles.widgetNameLabel, { color: colors.textMuted }]}>
                          HIJRI DATE
                        </Text>
                      </View>
                    </View>

                    <View style={styles.hijriWidgetBody}>
                      <Text style={[styles.bigSerifHijriDay, { color: colors.accent }]}>
                        {bundle.hijri.day}
                      </Text>
                      <Text style={[styles.hijriMonthText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {bundle.hijri.month}
                      </Text>
                      <Text style={[styles.hijriYearText, { color: colors.textSecondary }]}>
                        {bundle.hijri.year}
                      </Text>
                    </View>

                    <View style={styles.hijriFooter}>
                      <Text style={[styles.hijriGregorianSub, { color: colors.textMuted }]} numberOfLines={1}>
                        {bundle.hijri.weekday} · {bundle.hijri.gregorianDate}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ---------------------------------------------------------------- */}
              {/* Native Wiring / Documentation Card                               */}
              {/* ---------------------------------------------------------------- */}
              <View style={[styles.docsCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
                <View style={styles.docsCardHeader}>
                  <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
                  <View style={styles.docsTitleWrap}>
                    <Text style={[styles.docsTitle, { color: colors.textPrimary }]}>
                      Native Extension Integration Guide
                    </Text>
                    <Text style={[styles.docsSub, { color: colors.textMuted }]}>
                      Data Layer: ACTIVE & READY · No extra npm deps
                    </Text>
                  </View>
                </View>

                <Hairline />

                <View style={styles.docsBody}>
                  <Text style={[styles.docsParagraph, { color: colors.textSecondary }]}>
                    Home-screen widgets execute in their own standalone operating system processes
                    (iOS <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>WidgetKit</Text> and
                    Android <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>AppWidgetProvider</Text>).
                  </Text>
                  <Text style={[styles.docsParagraph, { color: colors.textSecondary }]}>
                    The app exports <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>getWidgetBundle()</Text> from{' '}
                    <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.accent }}>src/lib/widgets.ts</Text>.
                    When backgrounding, this bundle serializes to shared storage:
                  </Text>

                  <View style={styles.bulletList}>
                    <View style={styles.bulletItem}>
                      <Text style={[styles.bulletPoint, { color: colors.accent }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>iOS:</Text> Shared App Group (
                        <Text style={{ fontStyle: 'italic' }}>group.com.islamic.app</Text>) with SwiftUI TimelineProvider.
                      </Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <Text style={[styles.bulletPoint, { color: colors.accent }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>Android:</Text> Multi-process SharedPreferences
                        read by AppWidgetProvider & RemoteViews.
                      </Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <Text style={[styles.bulletPoint, { color: colors.accent }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>Deep Linking:</Text> Supported via{' '}
                        <Text style={{ fontStyle: 'italic' }}>salah://home</Text>, <Text style={{ fontStyle: 'italic' }}>salah://quran/... </Text>, and <Text style={{ fontStyle: 'italic' }}>salah://tracker</Text>.
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.refFooter, { borderTopColor: colors.borderSubtle }]}>
                    <Text style={[styles.refFooterText, { color: colors.textMuted }]}>
                      Complete Swift, Kotlin, and EAS Config Plugin blueprints are documented in{' '}
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.accent }}>docs/widgets.md</Text>.
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.syncFootnote, { color: colors.textMuted }]}>
                Snapshot updated: {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
  },
  closeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  headerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
  },
  refreshBtn: {
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingBottom: 48,
  },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  introHeader: {
    marginBottom: 20,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  eyebrowText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  eyebrowSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  heroHeadline: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 8,
  },
  heroDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
  },
  platformSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  platformOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  platformOptionActive: {
    borderWidth: 1,
  },
  platformOptionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  widgetsGrid: {
    gap: 22,
  },
  widgetSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  widgetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetBadge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  widgetSubnote: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
  },
  widgetContainer: {
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  iosWidgetCard: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  androidWidgetCard: {
    borderRadius: 20,
    elevation: 2,
  },
  squareWidgetCard: {
    minHeight: 180,
    justifyContent: 'space-between',
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  widgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  widgetIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetNameLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    letterSpacing: 1.1,
  },
  locationTag: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  prayerHeroContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 12,
  },
  prayerNameTimeGroup: {
    gap: 2,
  },
  prayerNameUpper: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  bigSerifTime: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 44,
    lineHeight: 48,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  countdownPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  widgetProgressWrapper: {
    marginTop: 4,
    gap: 6,
  },
  widgetProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  widgetProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  widgetProgressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressMetaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
  },
  fallbackNotice: {
    paddingVertical: 6,
  },
  fallbackNoticeText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  streakPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  streakPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  progressHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 12,
  },
  statLargeGroup: {
    gap: 2,
  },
  statLargeNumber: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 44,
    lineHeight: 48,
  },
  statLargeTotal: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 20,
  },
  statSubLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
  },
  fivePrayerChecklist: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: 260,
  },
  prayerCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  symbolCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolCheckMark: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  symbolCircleMark: {
    fontSize: 11,
    lineHeight: 12,
  },
  prayerCheckName: {
    fontSize: 12,
  },
  splitWidgetsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  splitHalfCol: {
    flex: 1,
    gap: 8,
  },
  quranWidgetBody: {
    marginVertical: 10,
    gap: 3,
  },
  quranEyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  quranRefTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 26,
  },
  quranArabicSub: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 14,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 'auto',
  },
  actionPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  hijriWidgetBody: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  bigSerifHijriDay: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 52,
    lineHeight: 56,
  },
  hijriMonthText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  hijriYearText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  hijriFooter: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  hijriGregorianSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    textAlign: 'center',
  },
  docsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    gap: 12,
  },
  docsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docsTitleWrap: {
    flex: 1,
  },
  docsTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14.5,
  },
  docsSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  docsBody: {
    gap: 10,
  },
  docsParagraph: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  bulletList: {
    gap: 6,
    paddingLeft: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 17,
  },
  bulletText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  refFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  refFooterText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
  },
  syncFootnote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
