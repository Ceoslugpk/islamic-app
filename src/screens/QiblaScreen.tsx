import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
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
} from '../lib/qibla';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';
import { GeometricPattern } from '../components/GeometricPattern';
import { QiblaCompass } from '../components/QiblaCompass';
import { useLocation } from '../lib/useLocation';
import { useSettings } from '../lib/settings';
import { LocationPermissionNote } from '../components/LocationPermissionNote';

const KAABA_LABEL = 'Holy Kaaba, Makkah';

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

export default function QiblaScreen({ onBack }: { onBack?: () => void } = {}) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
  const { settings } = useSettings();
  const {
    location: gpsLocation,
    status: locStatus,
    loading: locLoading,
    request: requestLocation,
    refresh: refreshLocation,
  } = useLocation(true);

  // Heading & Bearing state
  const [heading, setHeading] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [declination, setDeclination] = useState<number>(0);
  const [locLabel, setLocLabel] = useState<string>('Detecting location…');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Status & Provider states
  const [source, setSource] = useState<CompassSource>('static');
  const [accuracy, setAccuracy] = useState<CompassAccuracy>('unknown');
  const [calibrating, setCalibrating] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState<boolean>(false);

  // Refs for subscriptions & smoothing
  const smoothHeadingRef = useRef<number>(0);
  const lastEmittedHeadingRef = useRef<number | null>(null);
  const lastUpdateTimestampRef = useRef<number>(0);
  const isFirstHeadingRef = useRef<boolean>(true);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const magSubRef = useRef<{ remove: () => void } | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasAlignedRef = useRef<boolean>(false);
  const latRef = useRef<number | null>(null);
  const lngRef = useRef<number | null>(null);

  // Needle rotation: bearing - heading
  // When heading=0 (phone points true north), needle points at bearing
  // When heading=bearing (phone points at qibla), rotation=0 (needle points straight up)
  const rotation =
    heading !== null && bearing !== null ? (bearing - heading + 360) % 360 : 0;
  const isAligned = heading !== null && bearing !== null && isFacingQibla(rotation, 4);

  // Effective location: GPS if available, otherwise manual location
  const effectiveLocation = useMemo(() => {
    if (gpsLocation) return gpsLocation;
    return settings.manualLocation;
  }, [gpsLocation, settings.manualLocation]);

  // Compute bearing and distance whenever effective location changes
  useEffect(() => {
    const lat = effectiveLocation.latitude;
    const lng = effectiveLocation.longitude;
    latRef.current = lat;
    lngRef.current = lng;
    setCoords({ lat, lng });

    const qBearing = qiblaBearing(lat, lng);
    const qDistance = distanceToKaabaKm(lat, lng);
    const qDecl = magneticDeclination(lat, lng);
    setBearing(qBearing);
    setDistance(qDistance);
    setDeclination(qDecl);

    if (gpsLocation) {
      setLocLabel(gpsLocation.label);
    } else {
      setLocLabel(`Using manual location (${settings.manualLocation.label || 'Makkah, Saudi Arabia'})`);
    }
  }, [effectiveLocation, gpsLocation, settings.manualLocation.label]);

  // Trigger haptic vibration when user turns and faces Qibla
  useEffect(() => {
    if (isAligned && !wasAlignedRef.current) {
      wasAlignedRef.current = true;
      haptic('selection');
    } else if (!isAligned && wasAlignedRef.current) {
      wasAlignedRef.current = false;
    }
  }, [isAligned, haptic]);

  const cleanupSubscriptions = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
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
    startCompass();
    return cleanupSubscriptions;
  }, [startCompass, cleanupSubscriptions]);

  useEffect(() => {
    if (locStatus === 'granted') {
      startCompass();
    }
  }, [locStatus, startCompass]);

  // Haptic when calibration completes (transition from calibrating -> ready)
  const wasCalibratingRef = useRef(true);
  useEffect(() => {
    if (wasCalibratingRef.current && !calibrating) {
      haptic('success');
    }
    wasCalibratingRef.current = calibrating;
  }, [calibrating, haptic]);

  const handleRecalibrate = async () => {
    haptic('light');
    setRecalibrating(true);
    smoothHeadingRef.current = 0;
    isFirstHeadingRef.current = true;
    lastEmittedHeadingRef.current = null;
    await refreshLocation();
    await startCompass();
    setRecalibrating(false);
  };

  const isStaticMode = Platform.OS === 'web' || source === 'static';
  const showFigure8Prompt = !isStaticMode && (accuracy === 'uncalibrated' || accuracy === 'low');

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgBase }]}>
      <GeometricPattern size={320} opacity={0.04} style={styles.pattern} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back navigation */}
        {onBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Tools"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={colors.accent} />
            <Text style={[styles.backText, { color: colors.accent }]}>Tools</Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          eyebrow="Direct Line of Prayer"
          title="Qibla Compass"
          subtitle="True bearing towards the Kaaba calculated using great-circle geodetic geodesic formulas."
        />

        {/* Error / Compass Notice Banner */}
        {error && (
          <Card style={styles.errorCard} padded>
            <View style={styles.errorHeader}>
              <Ionicons name="warning-outline" size={20} color={colors.accent} />
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                Compass Notice
              </Text>
            </View>
            <Text style={[styles.errorDescription, { color: colors.textSecondary }]}>
              {error}
            </Text>
          </Card>
        )}

        {/* Location Permission Note */}
        {(locStatus === 'denied' || locStatus === 'unavailable') && (
          <LocationPermissionNote
            status={locStatus}
            onEnable={async () => {
              await requestLocation(true);
            }}
            loading={locLoading}
            fallbackCity={settings.manualLocation.label || 'Makkah, Saudi Arabia'}
          />
        )}

        {/* Status Pill */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: colors.bgSurface,
                borderColor: isAligned
                  ? colors.accent
                  : colors.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: calibrating && heading === null
                    ? colors.textMuted
                    : isAligned
                    ? colors.accent
                    : heading !== null
                    ? '#10B981' // green for active tracking
                    : colors.textSecondary,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {calibrating && heading === null
                ? 'Calibrating compass…'
                : isAligned
                ? 'Aligned with Qibla'
                : heading === null
                ? 'Rotate device to calibrate'
                : source === 'expo-location'
                ? `Live Compass (${accuracy})`
                : source === 'magnetometer'
                ? 'Live Compass (Magnetometer)'
                : 'Static Direction Mode'}
            </Text>
          </View>

          {/* Recalibrate button */}
          {!isStaticMode && !calibrating && (
            <TouchableOpacity
              style={[
                styles.recalibrateBtn,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
              onPress={handleRecalibrate}
              activeOpacity={0.7}
              disabled={recalibrating}
            >
              {recalibrating ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <>
                  <Ionicons name="refresh" size={13} color={colors.accent} />
                  <Text style={[styles.recalibrateText, { color: colors.accent }]}>
                    Recalibrate
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Uncalibrated / Figure-8 Banner */}
        {showFigure8Prompt && (
          <View
            style={[
              styles.figure8Banner,
              { backgroundColor: colors.bgRaised, borderColor: colors.borderLine },
            ]}
          >
            <Ionicons name="infinite" size={18} color={colors.accent} />
            <Text style={[styles.figure8Text, { color: colors.textSecondary }]}>
              Compass accuracy is low. Wave phone slowly in a figure-8 motion to calibrate.
            </Text>
          </View>
        )}

        {/* Static mode explanation */}
        {isStaticMode && !error && (
          <View
            style={[
              styles.figure8Banner,
              { backgroundColor: colors.bgRaised, borderColor: colors.borderLine },
            ]}
          >
            <Ionicons name="compass-outline" size={18} color={colors.accent} />
            <Text style={[styles.figure8Text, { color: colors.textSecondary }]}>
              Hardware compass is not available on this platform. Align the top of your device toward{' '}
              <Text style={{ fontFamily: 'Manrope_700Bold', color: colors.textPrimary }}>
                {bearing !== null ? `${Math.round(bearing)}°` : '--'}
              </Text>{' '}
              relative to true north.
            </Text>
          </View>
        )}

        {/* Compass Dial Area */}
        <View style={styles.compassWrapper}>
          {calibrating && heading === null && bearing === null ? (
            <View style={styles.loadingCompass}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Calibrating directional sensors…
              </Text>
            </View>
          ) : (
            <QiblaCompass
              rotation={rotation}
              bearing={bearing}
              heading={heading}
              isAligned={isAligned}
              isStaticMode={isStaticMode}
              size={280}
            />
          )}
        </View>

        {/* Prominent Instrument Serif Bearing Readout */}
        <View style={styles.bearingHero}>
          <Text style={[styles.bearingValue, { color: colors.textPrimary }]}>
            {bearing !== null ? `${Math.round(bearing)}°` : '--'}
          </Text>
          <Text style={[styles.bearingSubtitle, { color: colors.accent }]}>
            Qibla Bearing
          </Text>
          {distance !== null && (
            <Text style={[styles.distanceHero, { color: colors.textSecondary }]}>
              {`${Math.round(distance).toLocaleString()} km to ${KAABA_LABEL}`}
            </Text>
          )}
        </View>

        {/* Information & Telemetry Card */}
        <Card style={styles.telemetryCard} padded>
          {/* Location row */}
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryLabelWrap}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>
                Location
              </Text>
            </View>
            <Text style={[styles.telemetryValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {locLabel}
            </Text>
          </View>

          <Hairline style={styles.cardDivider} />

          {/* Live Heading row */}
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryLabelWrap}>
              <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>
                Current Heading
              </Text>
            </View>
            <Text style={[styles.telemetryValue, { color: colors.textPrimary }]}>
              {heading !== null
                ? `${Math.round(heading)}° (${getCardinalDirection(heading)})`
                : 'Unavailable (rotate device)'}
            </Text>
          </View>

          <Hairline style={styles.cardDivider} />

          {/* Coordinates & Declination row */}
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryLabelWrap}>
              <Ionicons name="globe-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>
                Coordinates
              </Text>
            </View>
            <Text style={[styles.telemetryValueSub, { color: colors.textSecondary }]}>
              {coords
                ? `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`
                : '--'}
            </Text>
          </View>

          {declination !== 0 && (
            <>
              <Hairline style={styles.cardDivider} />
              <View style={styles.telemetryRow}>
                <View style={styles.telemetryLabelWrap}>
                  <Ionicons name="magnet-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>
                    Magnetic Declination
                  </Text>
                </View>
                <Text style={[styles.telemetryValueSub, { color: colors.textSecondary }]}>
                  {`${declination >= 0 ? '+' : ''}${declination.toFixed(1)}°`}
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Guidance Footer */}
        <View style={styles.footerNoteWrap}>
          <Text style={[styles.footerNote, { color: colors.textMuted }]}>
            Hold phone level with the ground. Turn your body until the amber needle points straight forward into the top notch marker.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  pattern: {
    top: -20,
    right: -80,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 14,
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statusPill: {
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
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  recalibrateText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
  },
  errorCard: {
    marginBottom: 20,
    gap: 10,
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
    fontSize: 13,
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
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
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
    marginTop: 18,
    marginBottom: 22,
  },
  bearingValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -1,
  },
  bearingSubtitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  telemetryLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  telemetryLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  telemetryValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    maxWidth: '55%',
    textAlign: 'right',
  },
  telemetryValueSub: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    maxWidth: '55%',
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
});
