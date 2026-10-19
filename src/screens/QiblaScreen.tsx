import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import {
  qiblaBearing,
  distanceToKaabaKm,
  smoothHeading,
  magneticDeclination,
  headingFromMagnetometer,
  resolveLocationHeading,
  isFacingQibla,
  shortestAngleDelta,
  formatDistanceToKaaba,
  checkMagneticInterference,
  getCalibrationGuidance,
  CalibrationGuidance,
} from '../lib/qibla';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { Card } from '../components/Card';
import { PremiumCard } from '../components/ui';
import { Hairline } from '../components/Hairline';
import { GeometricPattern } from '../components/GeometricPattern';
import { QiblaCompass } from '../components/QiblaCompass';
import { useLocation } from '../lib/useLocation';
import { useSettings } from '../lib/settings';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_BOTTOM, NAV_HEIGHT } from '../components/layout/layout.constants';
import { t } from '../lib/i18n';

type CompassSource = 'expo-location' | 'magnetometer' | 'static';
type CompassAccuracy = 'high' | 'medium' | 'low' | 'uncalibrated' | 'unknown';

function getCardinalDirection(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return directions[index];
}

function mapAccuracy(acc: number): CompassAccuracy {
  if (acc >= 3) return 'high';
  if (acc === 2) return 'medium';
  if (acc === 1) return 'low';
  if (acc === 0) return 'uncalibrated';
  return 'unknown';
}

export default function QiblaScreen({
  onBack,
  onOpenCities,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  onOpenCities?: () => void;
  backLabel?: string;
} = {}) {
  const { colors } = useTheme();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const compassSize = Math.min(280, width - 40);
  const { haptic } = useHaptics();
  const { settings, setAutoLocation } = useSettings();
  const {
    location: gpsLocation,
    status: locStatus,
    loading: locLoading,
    request: requestLocation,
    refresh: refreshLocation,
  } = useLocation(false);

  // Heading state
  const [heading, setHeading] = useState<number | null>(null);

  // Status & Provider states
  const [source, setSource] = useState<CompassSource>('static');
  const [accuracy, setAccuracy] = useState<CompassAccuracy>('unknown');
  const [calibrating, setCalibrating] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState<boolean>(false);

  // Interference detection
  const [interference, setInterference] = useState<{
    hasInterference: boolean;
    level: 'none' | 'low' | 'medium' | 'high';
    details: string;
  }>({ hasInterference: false, level: 'none', details: '' });

  // Effective location: GPS if available, otherwise saved autoLocation (if in auto mode), otherwise manual location
  const effectiveLocation = useMemo(() => {
    if (gpsLocation) return gpsLocation;
    if (settings.locationMode === 'auto' && settings.autoLocation) return settings.autoLocation;
    return settings.manualLocation;
  }, [gpsLocation, settings.locationMode, settings.autoLocation, settings.manualLocation]);

  const coords = useMemo(() => ({
    lat: effectiveLocation.latitude,
    lng: effectiveLocation.longitude,
  }), [effectiveLocation.latitude, effectiveLocation.longitude]);

  const bearing = useMemo(() => {
    return qiblaBearing(effectiveLocation.latitude, effectiveLocation.longitude);
  }, [effectiveLocation.latitude, effectiveLocation.longitude]);

  const distance = useMemo(() => {
    return distanceToKaabaKm(effectiveLocation.latitude, effectiveLocation.longitude);
  }, [effectiveLocation.latitude, effectiveLocation.longitude]);

  const declination = useMemo(() => {
    return magneticDeclination(effectiveLocation.latitude, effectiveLocation.longitude);
  }, [effectiveLocation.latitude, effectiveLocation.longitude]);

  const locLabel = useMemo(() => {
    const activeLoc = gpsLocation || (settings.locationMode === 'auto' ? settings.autoLocation : null);
    if (activeLoc) {
      return activeLoc.label;
    }
    return `${t('Using manual location')} (${settings.manualLocation.label || 'Makkah, Saudi Arabia'})`;
  }, [gpsLocation, settings.locationMode, settings.autoLocation, settings.manualLocation.label]);

  // Refs for subscriptions & smoothing
  const smoothHeadingRef = useRef<number>(0);
  const lastEmittedHeadingRef = useRef<number | null>(null);
  const lastUpdateTimestampRef = useRef<number>(0);
  const isFirstHeadingRef = useRef<boolean>(true);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const magSubRef = useRef<{ remove: () => void } | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latRef = useRef<number | null>(effectiveLocation.latitude);
  const lngRef = useRef<number | null>(effectiveLocation.longitude);
  const interferenceCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticAlignedRef = useRef<boolean>(false);

  // Sync refs when location coordinates change
  useEffect(() => {
    latRef.current = effectiveLocation.latitude;
    lngRef.current = effectiveLocation.longitude;
  }, [effectiveLocation.latitude, effectiveLocation.longitude]);

  // Needle rotation: bearing - heading
  // When heading=0 (phone points true north), needle points at bearing
  // When heading=bearing (phone points at qibla), rotation=0 (needle points straight up)
  const rotation =
    heading !== null && bearing !== null ? (bearing - heading + 360) % 360 : 0;
  const isAligned = heading !== null && bearing !== null && isFacingQibla(rotation, 4);
  const isPreciselyAligned = heading !== null && bearing !== null && isFacingQibla(rotation, 3);

  // Calibration guidance derived from compass state
  const calibrationGuidance = useMemo<CalibrationGuidance>(() => {
    const isStaticMode = Platform.OS === 'web' || source === 'static';
    return getCalibrationGuidance(
      isStaticMode,
      calibrating,
      heading,
      bearing,
      accuracy,
      isAligned
    );
  }, [calibrating, heading, bearing, accuracy, isAligned, source]);

  // Interference detection - check periodically when we have heading data
  useEffect(() => {
    let cancelled = false;
    if (heading === null || Platform.OS === 'web' || source === 'static') {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setInterference({ hasInterference: false, level: 'none', details: '' });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // Initial check
    Promise.resolve().then(() => {
      if (!cancelled) {
        const result = checkMagneticInterference(heading, accuracy);
        setInterference(result);
      }
    });

    // Periodic check every 2 seconds
    interferenceCheckTimerRef.current = setInterval(() => {
      if (heading !== null) {
        const r = checkMagneticInterference(heading, accuracy);
        setInterference(r);
      }
    }, 2000);

    return () => {
      cancelled = true;
      if (interferenceCheckTimerRef.current) {
        clearInterval(interferenceCheckTimerRef.current);
        interferenceCheckTimerRef.current = null;
      }
    };
  }, [heading, accuracy, source]);

  // Trigger haptic vibration when user turns and faces Qibla (within ~3°)
  useEffect(() => {
    if (isPreciselyAligned && !hapticAlignedRef.current) {
      hapticAlignedRef.current = true;
      haptic('selection');
    } else if (!isPreciselyAligned && hapticAlignedRef.current) {
      hapticAlignedRef.current = false;
    }
  }, [isPreciselyAligned, haptic]);

  // Trigger haptic when calibration completes (transition from calibrating -> ready)
  const wasCalibratingRef = useRef(true);
  useEffect(() => {
    if (wasCalibratingRef.current && !calibrating) {
      haptic('success');
    }
    wasCalibratingRef.current = calibrating;
  }, [calibrating, haptic]);

  const cleanupSubscriptions = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (interferenceCheckTimerRef.current) {
      clearInterval(interferenceCheckTimerRef.current);
      interferenceCheckTimerRef.current = null;
    }
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    if (magSubRef.current) {
      magSubRef.current.remove();
      magSubRef.current = null;
    }
  }, []);

  const handleHeadingSample = useCallback((
    rawTrueHeading: number,
    src: CompassSource,
    acc: CompassAccuracy
  ) => {
    if (typeof rawTrueHeading !== 'number' || isNaN(rawTrueHeading)) return;

    if (isFirstHeadingRef.current) {
      isFirstHeadingRef.current = false;
      smoothHeadingRef.current = rawTrueHeading;
      lastEmittedHeadingRef.current = rawTrueHeading;
      lastUpdateTimestampRef.current = Date.now();
      setHeading(rawTrueHeading);
      setSource(src);
      setAccuracy(acc);
      setCalibrating(false);
      return;
    }

    const smoothed = smoothHeading(rawTrueHeading, smoothHeadingRef.current, 0.25);
    smoothHeadingRef.current = smoothed;

    const now = Date.now();
    const timeDelta = now - lastUpdateTimestampRef.current;
    const angleDelta = Math.abs(shortestAngleDelta(smoothed, lastEmittedHeadingRef.current ?? 0));

    // Degree filter ~1°: update state when heading changes by >= 1°
    // Throttle: don't re-render React faster than 50ms (20fps, spring animation smoothly handles 60fps)
    // Heartbeat: after 250ms of quiet, flush final settled angle
    if (timeDelta >= 50 && (angleDelta >= 1.0 || timeDelta >= 250)) {
      lastEmittedHeadingRef.current = smoothed;
      lastUpdateTimestampRef.current = now;
      setHeading(smoothed);
      setSource(src);
      setAccuracy(acc);
      setCalibrating(false);
    }
  }, []);

  const startMagnetometerFallback = useCallback(async (): Promise<boolean> => {
    try {
      const isMagAvail = await Magnetometer.isAvailableAsync().catch(() => false);
      if (isMagAvail) {
        Magnetometer.setUpdateInterval(100);
        const magSub = Magnetometer.addListener(({ x, y }) => {
          const magHeading = headingFromMagnetometer(x, y, Platform.OS as 'ios' | 'android');
          const decl =
            latRef.current !== null && lngRef.current !== null
              ? magneticDeclination(latRef.current, lngRef.current)
              : 0;
          const trueHead = (magHeading + decl + 360) % 360;
          handleHeadingSample(trueHead, 'magnetometer', 'medium');
        });
        magSubRef.current = magSub;
        setSource('magnetometer');
        return true;
      }
    } catch {
      // Magnetometer sensor unavailable
    }
    return false;
  }, [handleHeadingSample]);

  const startPollingFallback = useCallback(async () => {
    try {
      const initial = await Location.getHeadingAsync();
      const trueHeading = resolveLocationHeading(initial, latRef.current, lngRef.current);
      handleHeadingSample(trueHeading, 'expo-location', mapAccuracy(initial.accuracy));
    } catch {
      // ignore
    }

    pollingTimerRef.current = setInterval(async () => {
      try {
        const data = await Location.getHeadingAsync();
        const trueHeading = resolveLocationHeading(data, latRef.current, lngRef.current);
        handleHeadingSample(trueHeading, 'expo-location', mapAccuracy(data.accuracy));
      } catch {
        // ignore
      }
    }, 250);
  }, [handleHeadingSample]);

  const startCompass = useCallback(async () => {
    cleanupSubscriptions();
    setError(null);
    setCalibrating(true);
    isFirstHeadingRef.current = true;

    // 1. Web Platform: graceful static mode
    if (Platform.OS === 'web') {
      setSource('static');
      setAccuracy('unknown');
      setCalibrating(false);
      return;
    }

    let receivedFirstEvent = false;

    // Check location permission on Android:
    // On Android, Location.watchHeadingAsync silently returns without listening
    // if neither fine nor coarse location permission is granted.
    let hasLocationPermission = false;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      hasLocationPermission = perm.granted;
    } catch {
      hasLocationPermission = false;
    }

    // On Android without location permissions: expo-location heading cannot start,
    // so immediately run Magnetometer fallback (which doesn't require location permissions).
    if (Platform.OS === 'android' && !hasLocationPermission) {
      const magStarted = await startMagnetometerFallback();
      if (!magStarted) {
        setSource('static');
        setAccuracy('unknown');
        setCalibrating(false);
      }
      return;
    }

    // 2. Primary Heading: Location.watchHeadingAsync (OS-level sensor fusion)
    let watchStarted = false;
    try {
      const sub = await Location.watchHeadingAsync(
        (headingData) => {
          receivedFirstEvent = true;
          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          const trueHeading = resolveLocationHeading(headingData, latRef.current, lngRef.current);
          handleHeadingSample(trueHeading, 'expo-location', mapAccuracy(headingData.accuracy));
        },
        (_err) => {
          if (!receivedFirstEvent) {
            startMagnetometerFallback();
          }
        }
      );
      locationSubRef.current = sub;
      watchStarted = true;
    } catch {
      watchStarted = false;
    }

    // If watchHeadingAsync failed to start, immediately try Magnetometer
    if (!watchStarted) {
      const magStarted = await startMagnetometerFallback();
      if (!magStarted) {
        try {
          await startPollingFallback();
        } catch {
          setSource('static');
          setAccuracy('unknown');
          setCalibrating(false);
        }
      }
      return;
    }

    // Watchdog timer: If watchHeadingAsync started but produces no events within 1200ms
    // (common on Android devices without fused heading or where SensorManager doesn't emit):
    watchdogTimerRef.current = setTimeout(async () => {
      if (!receivedFirstEvent) {
        if (locationSubRef.current) {
          locationSubRef.current.remove();
          locationSubRef.current = null;
        }
        const magStarted = await startMagnetometerFallback();
        if (!magStarted) {
          try {
            await startPollingFallback();
          } catch {
            setSource('static');
            setAccuracy('unknown');
            setCalibrating(false);
          }
        }
      }
    }, 1200);
  }, [cleanupSubscriptions, handleHeadingSample, startMagnetometerFallback, startPollingFallback]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        startCompass();
      }
    });
    return () => {
      cancelled = true;
      cleanupSubscriptions();
    };
  }, [startCompass, cleanupSubscriptions]);

  useEffect(() => {
    let cancelled = false;
    if (locStatus === 'granted') {
      Promise.resolve().then(() => {
        if (!cancelled) {
          startCompass();
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [locStatus, startCompass]);

  const handleRecalibrate = async () => {
    haptic('light');
    setRecalibrating(true);
    smoothHeadingRef.current = 0;
    isFirstHeadingRef.current = true;
    lastEmittedHeadingRef.current = null;
    const fresh = await refreshLocation();
    if (fresh && settings.locationMode === 'auto') {
      setAutoLocation(fresh, Date.now());
    }
    await startCompass();
    setRecalibrating(false);
  };

  const isStaticMode = Platform.OS === 'web' || source === 'static';
  const showFigure8Prompt = !isStaticMode && (accuracy === 'uncalibrated' || accuracy === 'low');
  const insets = useSafeAreaInsets();
  const bottomClearance = NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 32;

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.bgTop }]}>
      <GeometricPattern size={320} opacity={0.04} style={styles.pattern} />
      <DetailScreen
        style={styles.detailScreen}
        customPadBottom={bottomClearance}
        header={
          <SubHeader
            eyebrow={t('Direction of Prayer')}
            title={t('Qibla Compass')}
            subtitle={t('True bearing towards the Kaaba calculated using great-circle geodetic geodesic formulas.')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
        <DetailScreen.ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.contentWrap}>
          {/* Error / Compass Notice Banner */}
          {error && (
            <Card style={[styles.errorCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.errorCardContent} padded>
              <View style={styles.errorHeader}>
                <Ionicons name="warning-outline" size={20} color={tokens.accent} />
                <AppText variant="rowTitle" style={styles.errorTitle}>
                  {t('Compass Notice')}
                </AppText>
              </View>
              <AppText variant="body" tone="faint" style={styles.errorDescription}>
                {error}
              </AppText>
            </Card>
          )}

          {/* Location Permission Note */}
          {(locStatus === 'denied' || locStatus === 'unavailable') && (
            <LocationPermissionNote
              status={locStatus}
              style={error ? undefined : { marginTop: 0 }}
              onEnable={async () => {
                const loc = await requestLocation(true);
                if (loc && settings.locationMode === 'auto') {
                  setAutoLocation(loc, Date.now());
                }
              }}
              onChooseCity={onOpenCities}
              loading={locLoading}
              fallbackCity={settings.manualLocation.label || 'Makkah, Saudi Arabia'}
            />
          )}

          {/* Status Pill */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                getPillShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: isAligned ? tokens.gold : tokens.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: calibrating && heading === null
                      ? tokens.muted
                      : isAligned
                      ? tokens.gold
                      : heading !== null
                      ? tokens.gold // active tracking
                      : tokens.muted,
                  },
                ]}
              />
              <AppText variant="caption" tone="faint" style={styles.statusText}>
                {calibrating && heading === null
                  ? t('Calibrating compass…')
                  : isAligned
                  ? t('Aligned with Qibla')
                  : heading === null
                  ? t('Rotate device to calibrate')
                  : source === 'expo-location'
                  ? `${t('Live Compass')} (${t(accuracy)})`
                  : source === 'magnetometer'
                  ? t('Live Compass (Magnetometer)')
                  : t('Static Direction Mode')}
              </AppText>
            </View>

            {/* Recalibrate button */}
            {!isStaticMode && !calibrating && (
              <TouchableOpacity
                style={[
                  styles.recalibrateBtn,
                  getPillShadow(mode),
                  { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
                ]}
                onPress={handleRecalibrate}
                activeOpacity={0.7}
                disabled={recalibrating}
              >
                {recalibrating ? (
                  <ActivityIndicator size="small" color={tokens.goldText} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={13} color={tokens.goldText} />
                    <AppText variant="link" style={styles.recalibrateText}>
                      {t('Recalibrate')}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Uncalibrated / Figure-8 Banner */}
          {showFigure8Prompt && (
            <PremiumCard style={styles.bannerCard} padded>
              <View style={styles.bannerContent}>
                <View style={[styles.bannerIconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder }]}>
                  <Ionicons name="infinite" size={20} color={tokens.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="rowTitle" style={styles.bannerTitle}>
                    {t('Compass Calibration Required')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.bannerText}>
                    {t('Compass accuracy is low. Wave phone slowly in a figure-8 motion to calibrate.')}
                  </AppText>
                </View>
              </View>
            </PremiumCard>
          )}

          {/* Static mode explanation */}
          {isStaticMode && !error && (
            <PremiumCard style={styles.bannerCard} padded>
              <View style={styles.bannerContent}>
                <View style={[styles.bannerIconCircle, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder }]}>
                  <Ionicons name="compass-outline" size={20} color={tokens.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="rowTitle" style={styles.bannerTitle}>
                    {t('Static Direction Mode')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.bannerText}>
                    {t('Hardware compass is not available on this platform. Align the top of your device toward')}{' '}
                    <AppText variant="caption" highlight style={{ fontFamily: 'Manrope_700Bold' }}>
                      {bearing !== null ? `${Math.round(bearing)}°` : '--'}
                    </AppText>{' '}
                    {t('relative to true north.')}
                  </AppText>
                </View>
              </View>
            </PremiumCard>
          )}

          {/* Calibration Guidance Card */}
          {!isStaticMode && !error && (
            <PremiumCard style={styles.calibrationCard} padded>
              <View style={styles.calibrationHeader}>
                <View style={[styles.calibrationIconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons
                    name={calibrationGuidance.icon as any}
                    size={20}
                    color={colors.forestGreen || tokens.accent}
                  />
                </View>
                <View style={styles.calibrationTextWrap}>
                  <AppText variant="sectionTitle" style={styles.calibrationTitle}>
                    {t(calibrationGuidance.title)}
                  </AppText>
                  <AppText variant="body" tone="faint" style={styles.calibrationDescription}>
                    {t(calibrationGuidance.description)}
                  </AppText>
                </View>
              </View>
              <View style={styles.calibrationProgressWrap}>
                <View style={[styles.calibrationProgressTrack, { backgroundColor: tokens.ringBorder }]}>
                  <View
                    style={[
                      styles.calibrationProgressFill,
                      {
                        backgroundColor: tokens.gold,
                        width: `${Math.round(calibrationGuidance.progress * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <AppText variant="caption" tone="faint" style={styles.calibrationStepText}>
                  {t('Step')} {['Hold Flat', 'Rotate Slowly', 'Align', 'Ready'].indexOf(
                    calibrationGuidance.step.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  ) + 1} {t('of')} 4
                </AppText>
              </View>
            </PremiumCard>
          )}

          {/* Magnetic Interference Banner */}
          {interference.hasInterference && !isStaticMode && (
            <View
              style={[
                styles.interferenceBanner,
                {
                  backgroundColor:
                    interference.level === 'high'
                      ? tokens.accent + '20'
                      : interference.level === 'medium'
                      ? tokens.accent + '15'
                      : colors.bgRaised,
                  borderColor:
                    interference.level === 'high'
                      ? tokens.accent
                      : interference.level === 'medium'
                      ? tokens.accent + '80'
                      : tokens.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={
                  interference.level === 'high'
                    ? 'alert-circle-outline'
                    : interference.level === 'medium'
                    ? 'warning-outline'
                    : 'magnet-outline'
                }
                size={18}
                color={
                  interference.level === 'high'
                    ? tokens.accent
                    : interference.level === 'medium'
                    ? tokens.accent
                    : tokens.muted
                }
              />
              <AppText variant="caption" tone="faint" style={styles.interferenceText}>
                {interference.details}
              </AppText>
            </View>
          )}

          {/* Compass Hero Card */}
          <PremiumCard style={styles.compassHeroCard} contentStyle={styles.compassHeroCardContent} padded>
            {/* Compass Dial Area */}
            <View style={styles.compassWrapper}>
              {calibrating && heading === null && bearing === null ? (
                <View style={[styles.loadingCompass, { height: compassSize }]}>
                  <ActivityIndicator size="large" color={tokens.accent} />
                  <AppText variant="caption" tone="faint" style={styles.loadingText}>
                    {t('Calibrating directional sensors…')}
                  </AppText>
                </View>
              ) : (
                <QiblaCompass
                  rotation={rotation}
                  bearing={bearing}
                  heading={heading}
                  isAligned={isAligned}
                  isStaticMode={isStaticMode}
                  size={compassSize}
                />
              )}
            </View>

            {/* Prominent Instrument Serif Bearing Readout */}
            <View style={styles.bearingHero} testID="qibla-bearing-hero">
              <AppText variant="screenTitle" style={styles.bearingValue}>
                {bearing !== null ? `${Math.round(bearing)}°` : '--'}
              </AppText>
              <AppText variant="eyebrow" highlight style={styles.bearingSubtitle}>
                {t('Qibla Bearing')}
              </AppText>
              {distance !== null && (
                <AppText variant="caption" tone="faint" style={styles.distanceHero}>
                  {formatDistanceToKaaba(distance)}
                </AppText>
              )}
            </View>
          </PremiumCard>

          {/* Information & Telemetry Card */}
          <PremiumCard style={styles.telemetryCard} padded testID="qibla-telemetry-card">
            {/* Location row */}
            <View style={styles.telemetryRow}>
              <View style={styles.telemetryLabelWrap}>
                <Ionicons name="location-outline" size={16} color={tokens.muted} />
                <AppText variant="caption" tone="faint" style={styles.telemetryLabel}>
                  {t('Location')}
                </AppText>
              </View>
              <AppText variant="rowTitle" style={styles.telemetryValue} numberOfLines={2}>
                {locLabel}
              </AppText>
            </View>

            <Hairline style={[styles.cardDivider, { backgroundColor: tokens.cardBorder }]} />

            {/* Live Heading row */}
            <View style={styles.telemetryRow}>
              <View style={styles.telemetryLabelWrap}>
                <Ionicons name="navigate-outline" size={16} color={tokens.muted} />
                <AppText variant="caption" tone="faint" style={styles.telemetryLabel}>
                  {t('Current Heading')}
                </AppText>
              </View>
              <AppText variant="rowTitle" style={styles.telemetryValue}>
                {heading !== null
                  ? `${Math.round(heading)}° (${getCardinalDirection(heading)})`
                  : t('Unavailable (rotate device)')}
              </AppText>
            </View>

            <Hairline style={[styles.cardDivider, { backgroundColor: tokens.cardBorder }]} />

            {/* Coordinates & Declination row */}
            <View style={styles.telemetryRow}>
              <View style={styles.telemetryLabelWrap}>
                <Ionicons name="globe-outline" size={16} color={tokens.muted} />
                <AppText variant="caption" tone="faint" style={styles.telemetryLabel}>
                  {t('Coordinates')}
                </AppText>
              </View>
              <AppText variant="caption" tone="faint" style={styles.telemetryValueSub}>
                {coords
                  ? `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`
                  : '--'}
              </AppText>
            </View>

            {declination !== 0 && (
              <>
                <Hairline style={[styles.cardDivider, { backgroundColor: tokens.cardBorder }]} />
                <View style={styles.telemetryRow}>
                  <View style={styles.telemetryLabelWrap}>
                    <Ionicons name="magnet-outline" size={16} color={tokens.muted} />
                    <AppText variant="caption" tone="faint" style={styles.telemetryLabel}>
                      {t('Magnetic Declination')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.telemetryValueSub}>
                    {`${declination >= 0 ? '+' : ''}${declination.toFixed(1)}°`}
                  </AppText>
                </View>
              </>
            )}
          </PremiumCard>

          {/* Guidance Footer */}
          <View style={styles.footerNoteWrap} testID="qibla-guidance-footer">
            <AppText variant="caption" tone="faint" style={styles.footerNote}>
              {t('Hold phone level with the ground. Turn your body until the amber needle points straight forward into the top notch marker.')}
            </AppText>
          </View>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    minWidth: 0,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  pattern: {
    top: -20,
    right: -80,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statusPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  recalibrateBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
  },
  recalibrateText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  figure8Banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  figure8Text: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    minWidth: 0,
  },
  bannerCard: {
    marginBottom: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  bannerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  errorCard: {
    marginBottom: 20,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  errorDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  grantBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  compassHeroCard: {
    marginBottom: 16,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  loadingCompass: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  bearingHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  bearingValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 60,
    letterSpacing: -1,
    paddingVertical: 4,
    textAlign: 'center',
  },
  bearingSubtitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
    paddingVertical: 2,
    textAlign: 'center',
  },
  distanceHero: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    marginTop: 6,
  },
  telemetryCard: {
    marginBottom: 20,
  },
  telemetryRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 8,
  },
  telemetryLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  telemetryLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  telemetryValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    maxWidth: '65%',
    flexShrink: 1,
    textAlign: 'right',
  },
  telemetryValueSub: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    maxWidth: '65%',
    flexShrink: 1,
    textAlign: 'right',
  },
  cardDivider: {
    marginVertical: 2,
  },
  footerNoteWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  calibrationCard: {
    marginBottom: 20,
  },
  calibrationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  calibrationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calibrationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  calibrationTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  calibrationDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },
  calibrationProgressWrap: {
    gap: 6,
  },
  calibrationProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  calibrationProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  calibrationStepText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    textAlign: 'right',
  },
  interferenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  interferenceText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    minWidth: 0,
  },

  compassHeroCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },

  errorCardContent: {
    gap: 10,
  },
});
