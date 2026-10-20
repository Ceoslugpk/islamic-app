import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { Location as Loc } from '../lib/prayerTimes';
import { fetchNearbyMosques, geocodeAreaNominatim, type MosqueItem } from '../lib/mosqueFinderApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { DETAIL_PAD_BOTTOM } from '../components/layout/layout.constants';
import { useAudioMiniPlayer } from '../lib/useAudioMiniPlayer';
import { cardTokens } from '../theme/tokens';
import {
  PremiumCard,
  PrimaryButton,
  OutlineButton,
  SearchField,
  Chip,
} from '../components/ui';
import { Hairline } from '../components/Hairline';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import { MosqueCardSkeleton } from '../components/Skeleton';
import { loadMosqueCache, saveMosqueCache } from '../lib/db';
import { useSearchHistory } from '../lib/searchHistory';
import { t } from '../lib/i18n';
import { hScrollRTLStyle } from '../lib/rtl';
import { isDiagnosticModeEnabled, useDiagnosticTarget } from '../lib/diagnostic';

const RADIUS_OPTIONS = [5, 10, 20]; // in km

export default function MosqueFinderScreen({
  onBack,
  onOpenCities,
}: {
  onBack?: () => void;
  onOpenCities?: () => void;
}) {
  const { colors } = useTheme();
  const { settings, setAutoLocation } = useSettings();
  const {
    location: hookGpsLocation,
    status: locStatus,
    loading: locLoading,
    refresh: refreshLocation,
  } = useLocation(false);
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  // Fresh GPS state on explicit "USE MY LOCATION" tap
  const [freshGps, setFreshGps] = useState<Loc | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Area search state
  const [areaInput, setAreaInput] = useState<string>('');
  const [searchingArea, setSearchingArea] = useState<boolean>(false);
  const [areaSearchCenter, setAreaSearchCenter] = useState<{
    latitude: number;
    longitude: number;
    label: string;
    query: string;
  } | null>(null);
  const [areaNotFound, setAreaNotFound] = useState<boolean>(false);
  const [searchedQuery, setSearchedQuery] = useState<string>('');

  const {
    history: areaHistory,
    addQuery: addAreaQuery,
    removeQuery: removeAreaQuery,
    clearHistory: clearAreaHistory,
  } = useSearchHistory('mosque-areas');

  const isDiag = isDiagnosticModeEnabled();
  const diag = useDiagnosticTarget('mosque-finder-search-controls', {
    targetTestId: 'mosque-finder-search-controls',
    parentTestId: 'mosque-finder-search-card',
  });

  // Radius & Results
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mosqueRequestIdRef = useRef(0);
  const activeMosqueRequestRef = useRef<AbortController | null>(null);
  const areaSearchIdRef = useRef(0);
  const activeAreaSearchRef = useRef<AbortController | null>(null);

  // Determine user's local location (GPS or manual fallback)
  const myLocation = useMemo<Loc>(() => {
    if (freshGps) return freshGps;
    if (settings.locationMode === 'auto') {
      return hookGpsLocation || settings.autoLocation || settings.manualLocation;
    }
    return settings.manualLocation;
  }, [freshGps, settings.locationMode, hookGpsLocation, settings.autoLocation, settings.manualLocation]);

  const isUsingGps = useMemo(() => {
    if (areaSearchCenter) return false;
    return Boolean(freshGps) || (settings.locationMode === 'auto' && Boolean(hookGpsLocation || settings.autoLocation));
  }, [areaSearchCenter, freshGps, settings.locationMode, hookGpsLocation, settings.autoLocation]);

  // Set initial GPS timestamp when hook gives location
  useEffect(() => {
    let cancelled = false;
    if (hookGpsLocation && !gpsTimestamp) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          const now = new Date();
          const h = now.getHours().toString().padStart(2, '0');
          const m = now.getMinutes().toString().padStart(2, '0');
          setGpsTimestamp(`${h}:${m}`);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [hookGpsLocation, gpsTimestamp]);

  // Active search center: area center if searching area, otherwise user's location
  const effectiveCenter = useMemo(() => {
    if (areaSearchCenter) {
      return {
        latitude: areaSearchCenter.latitude,
        longitude: areaSearchCenter.longitude,
        label: areaSearchCenter.label,
      };
    }
    return myLocation;
  }, [areaSearchCenter, myLocation]);

  const fetchMosquesForCenter = useCallback(
    async (lat: number, lon: number, radius: number, isManualRefresh = false) => {
      activeMosqueRequestRef.current?.abort();
      const controller = new AbortController();
      activeMosqueRequestRef.current = controller;
      const requestId = ++mosqueRequestIdRef.current;

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setMosques([]);
      }
      setError(null);

      // Try cache first (unless manual refresh)
      if (!isManualRefresh) {
        const cached = loadMosqueCache(lat, lon, radius);
        if (cached && cached.length > 0 && requestId === mosqueRequestIdRef.current) {
          setMosques(cached);
          setLoading(false);
          setRefreshing(false);
          activeMosqueRequestRef.current = null;
          return;
        }
      }

      try {
        const items = await fetchNearbyMosques(lat, lon, radius, { signal: controller.signal });
        if (requestId !== mosqueRequestIdRef.current || controller.signal.aborted) return;
        setMosques(items);
        saveMosqueCache(lat, lon, radius, items);
      } catch (err) {
        if (requestId === mosqueRequestIdRef.current && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch mosques. Please check your network connection.');
        }
      } finally {
        if (requestId === mosqueRequestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          activeMosqueRequestRef.current = null;
        }
      }
    },
    []
  );

  useEffect(() => () => {
    mosqueRequestIdRef.current += 1;
    areaSearchIdRef.current += 1;
    activeMosqueRequestRef.current?.abort();
    activeAreaSearchRef.current?.abort();
  }, []);

  // Trigger search whenever search center or radius changes (unless area not found)
  useEffect(() => {
    let cancelled = false;
    if (!areaNotFound) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          fetchMosquesForCenter(effectiveCenter.latitude, effectiveCenter.longitude, radiusKm).catch(
            () => {
              // Non-fatal: fetchMosquesForCenter sets its own error state on failure.
            }
          );
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [fetchMosquesForCenter, effectiveCenter.latitude, effectiveCenter.longitude, radiusKm, areaNotFound]);

  // Explicit USE MY LOCATION handler
  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setError(null);
    setAreaSearchCenter(null);
    setAreaInput('');
    setAreaNotFound(false);
    setSearchedQuery('');

    try {
      const fresh = await refreshLocation();
      if (fresh) {
        if (settings.locationMode === 'auto') {
          setAutoLocation(fresh, Date.now());
        }
        setFreshGps(fresh);
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        setGpsTimestamp(`${h}:${m}`);
        await fetchMosquesForCenter(fresh.latitude, fresh.longitude, radiusKm);
      } else if (hookGpsLocation || settings.autoLocation) {
        const activeGps = hookGpsLocation || settings.autoLocation!;
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        setGpsTimestamp(`${h}:${m}`);
        await fetchMosquesForCenter(activeGps.latitude, activeGps.longitude, radiusKm);
      } else {
        await fetchMosquesForCenter(settings.manualLocation.latitude, settings.manualLocation.longitude, radiusKm);
      }
    } catch {
      await fetchMosquesForCenter(settings.manualLocation.latitude, settings.manualLocation.longitude, radiusKm);
    } finally {
      setIsLocating(false);
    }
  };

  // Area search submission
  const handleSearchArea = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    activeAreaSearchRef.current?.abort();
    const controller = new AbortController();
    activeAreaSearchRef.current = controller;
    const requestId = ++areaSearchIdRef.current;
    let waitingForMosqueSearch = false;
    let timedOut = false;

    setSearchingArea(true);
    setLoading(true);
    setError(null);
    setSearchedQuery(q);
    setMosques([]);

    try {
      const areaResult = await geocodeAreaNominatim(q, {
        signal: controller.signal,
        timeoutMs: 8000,
      });

      if (requestId !== areaSearchIdRef.current || controller.signal.aborted) return;
      if (!areaResult) {
        setAreaNotFound(true);
        setAreaSearchCenter(null);
        setLoading(false);
        return;
      }

      const newCenter = {
        latitude: areaResult.latitude,
        longitude: areaResult.longitude,
        label: areaResult.label,
        query: q,
      };

      addAreaQuery(q);
      setAreaNotFound(false);
      setAreaSearchCenter(newCenter);
      waitingForMosqueSearch = true;
    } catch (err) {
      if (requestId === areaSearchIdRef.current && (!controller.signal.aborted || timedOut)) {
        const isTimeOut = err instanceof Error && err.message.includes('timed out');
        setError(isTimeOut ? 'Failed to search area. Please try again.' : err instanceof Error ? err.message : 'Failed to search area. Please try again.');
      }
    } finally {
      if (requestId === areaSearchIdRef.current) {
        setSearchingArea(false);
        if (!waitingForMosqueSearch) setLoading(false);
        activeAreaSearchRef.current = null;
      }
    }
  };

  const handleClearAreaSearch = () => {
    areaSearchIdRef.current += 1;
    activeAreaSearchRef.current?.abort();
    activeAreaSearchRef.current = null;
    setSearchingArea(false);
    setAreaSearchCenter(null);
    setAreaInput('');
    setAreaNotFound(false);
    setSearchedQuery('');
  };

  const openInMaps = (mosque: MosqueItem) => {
    const query = `${mosque.latitude},${mosque.longitude}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;
    const fallbackUrl = `https://www.openstreetmap.org/?mlat=${mosque.latitude}&mlon=${mosque.longitude}#map=17/${mosque.latitude}/${mosque.longitude}`;
    Linking.openURL(mapsUrl).catch(() => Linking.openURL(fallbackUrl).catch(() => {}));
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Label for current center
  const centerTypeBadge = areaSearchCenter
    ? t('AREA SEARCH')
    : isUsingGps
    ? t('GPS AUTO')
    : `${t('MANUAL')} (${settings.manualLocation.label || 'Makkah, Saudi Arabia'})`;

  const insets = useSafeAreaInsets();
  const { playback } = useAudioMiniPlayer();
  const isCompact = width < 440;
  const isWide = width >= 600;
  const paddingH = isCompact ? 16 : 20;

  // Diagnostic layout tracking refs for hierarchy and coordinate frame resolution
  const searchCardLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const searchFieldLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const findBtnLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const findBtnGradLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const listViewportLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const radiusRowLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const radiusPillsLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const lastSearchFieldEventRef = useRef<any>(null);
  const lastTextInputEventRef = useRef<any>(null);
  const lastFindBtnEventRef = useRef<any>(null);
  const lastFindGradEventRef = useRef<any>(null);
  const lastFindLabelEventRef = useRef<any>(null);
  const lastRadiusSelEventRef = useRef<any>(null);
  const lastRadiusUnselEventRef = useRef<any>(null);
  const lastResultRowEventRef = useRef<any>(null);

  // Invalidate on unmount
  useEffect(() => {
    if (!isDiag) return;
    return () => {
      diag.markTargetStale('MosqueFinderScreen unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiag]);

  useEffect(() => {
    if (isDiag && mosques.length === 0) {
      diag.recordNamedUnavailable('resultRow', 'No search results present to measure representative row', {
        testID: 'mosque-finder-result-row-0',
        parentIdentity: 'mosque-finder-list-viewport',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiag, mosques.length]);

  return (
    <DetailScreen
      style={{ backgroundColor: colors.bgBase }}
      customPadBottom={DETAIL_PAD_BOTTOM(insets.bottom, Boolean(playback))}
      header={
        <SubHeader
          eyebrow={t('Tools')}
          title={t('Mosque Finder')}
          subtitle={t('Find nearby places of worship')}
          onBack={onBack}
          backLabel={t('Tools')}
          borderBottom
          showFade
        />
      }
    >
      <View style={{ maxWidth: maxW, alignSelf: 'center', width: '100%', paddingHorizontal: paddingH }}>
        <View
          testID={isDiag ? "mosque-finder-search-card" : undefined}
          onLayout={isDiag ? (e: LayoutChangeEvent) => {
            searchCardLayoutRef.current = e?.nativeEvent?.layout ?? null;
            diag.recordNamed('card', e, {
              testID: 'mosque-finder-search-card',
              parentIdentity: 'detail-screen-root',
              frameWidth: width,
              frameHeight: undefined,
              cardWidth: width,
              ancestorCard: 'mosque-finder-search-card',
            });
            if (lastSearchFieldEventRef.current) {
              diag.recordNamed('searchField', lastSearchFieldEventRef.current, {
                testID: 'mosque-finder-search-field',
                parentIdentity: 'mosque-finder-search-card',
                frameWidth: searchCardLayoutRef.current?.width,
                frameHeight: searchCardLayoutRef.current?.height,
                cardWidth: searchCardLayoutRef.current?.width,
                cardHeight: searchCardLayoutRef.current?.height,
                ancestorCard: 'mosque-finder-search-card',
              });
            }
            if (lastFindBtnEventRef.current) {
              diag.recordNamed('button', lastFindBtnEventRef.current, {
                testID: 'mosque-finder-find-btn',
                parentIdentity: 'mosque-finder-search-card',
                frameWidth: searchCardLayoutRef.current?.width,
                frameHeight: searchCardLayoutRef.current?.height,
                cardWidth: searchCardLayoutRef.current?.width,
                cardHeight: searchCardLayoutRef.current?.height,
                ancestorCard: 'mosque-finder-search-card',
              });
            }
          } : undefined}
          style={styles.headerWrap}
        >
          {/* Area Search Input Bar */}
          <View
            testID={isDiag ? "mosque-finder-search-controls" : undefined}
            onLayout={isDiag ? diag.targetProps.onLayout : undefined}
            style={[styles.searchRow, isCompact && styles.searchRowCompact]}
          >
            <View style={[styles.searchFieldWrap, isCompact && styles.searchFieldWrapCompact]}>
              <SearchField
                testID={isDiag ? "mosque-finder-search-field" : "search"}
                onLayout={isDiag ? (e: LayoutChangeEvent) => {
                  lastSearchFieldEventRef.current = e;
                  searchFieldLayoutRef.current = e?.nativeEvent?.layout ?? null;
                  diag.recordNamed('searchField', e, {
                    testID: 'mosque-finder-search-field',
                    parentIdentity: 'mosque-finder-search-controls',
                    frameWidth: searchCardLayoutRef.current?.width,
                    frameHeight: searchCardLayoutRef.current?.height,
                    cardWidth: searchCardLayoutRef.current?.width,
                    cardHeight: searchCardLayoutRef.current?.height,
                    ancestorCard: 'mosque-finder-search-card',
                  });
                  if (lastTextInputEventRef.current) {
                    diag.recordNamed('textInput', lastTextInputEventRef.current, {
                      testID: 'mosque-finder-search-input',
                      parentIdentity: 'mosque-finder-search-field',
                      frameWidth: searchFieldLayoutRef.current?.width,
                      frameHeight: searchFieldLayoutRef.current?.height,
                      cardWidth: searchCardLayoutRef.current?.width,
                      cardHeight: searchCardLayoutRef.current?.height,
                      ancestorCard: 'mosque-finder-search-card',
                    });
                  }
                } : undefined}
                inputTestID={isDiag ? "mosque-finder-search-input" : undefined}
                inputOnLayout={isDiag ? (e) => {
                  lastTextInputEventRef.current = e;
                  diag.recordNamed('textInput', e, {
                    testID: 'mosque-finder-search-input',
                    parentIdentity: 'mosque-finder-search-field',
                    frameWidth: searchFieldLayoutRef.current?.width,
                    frameHeight: searchFieldLayoutRef.current?.height,
                    cardWidth: searchCardLayoutRef.current?.width,
                    cardHeight: searchCardLayoutRef.current?.height,
                    ancestorCard: 'mosque-finder-search-card',
                  });
                } : undefined}
                value={areaInput}
                onChangeText={setAreaInput}
                placeholder={isCompact ? t('Search city or area...') : t("Search area or city, e.g. 'Dubai Marina' or 'Lahore'...")}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchArea(areaInput)}
                onClear={() => setAreaInput('')}
              />
            </View>
            <PrimaryButton
              testID={isDiag ? "mosque-finder-find-btn" : undefined}
              onLayout={isDiag ? (e: LayoutChangeEvent) => {
                lastFindBtnEventRef.current = e;
                findBtnLayoutRef.current = e?.nativeEvent?.layout ?? null;
                diag.recordNamed('button', e, {
                  testID: 'mosque-finder-find-btn',
                  parentIdentity: 'mosque-finder-search-controls',
                  frameWidth: searchCardLayoutRef.current?.width,
                  frameHeight: searchCardLayoutRef.current?.height,
                  cardWidth: searchCardLayoutRef.current?.width,
                  cardHeight: searchCardLayoutRef.current?.height,
                  ancestorCard: 'mosque-finder-search-card',
                });
                if (lastFindGradEventRef.current) {
                  diag.recordNamed('buttonGradient', lastFindGradEventRef.current, {
                    testID: 'mosque-finder-find-btn-gradient',
                    parentIdentity: 'mosque-finder-find-btn',
                    frameWidth: findBtnLayoutRef.current?.width,
                    frameHeight: findBtnLayoutRef.current?.height,
                    cardWidth: searchCardLayoutRef.current?.width,
                    cardHeight: searchCardLayoutRef.current?.height,
                    ancestorCard: 'mosque-finder-search-card',
                  });
                }
              } : undefined}
              onGradientLayout={isDiag ? (e) => {
                lastFindGradEventRef.current = e;
                findBtnGradLayoutRef.current = e?.nativeEvent?.layout ?? null;
                diag.recordNamed('buttonGradient', e, {
                  testID: 'mosque-finder-find-btn-gradient',
                  parentIdentity: 'mosque-finder-find-btn',
                  frameWidth: findBtnLayoutRef.current?.width,
                  frameHeight: findBtnLayoutRef.current?.height,
                  cardWidth: searchCardLayoutRef.current?.width,
                  cardHeight: searchCardLayoutRef.current?.height,
                  ancestorCard: 'mosque-finder-search-card',
                });
                if (lastFindLabelEventRef.current) {
                  diag.recordNamed('buttonLabel', lastFindLabelEventRef.current, {
                    testID: 'mosque-finder-find-btn-label',
                    parentIdentity: 'mosque-finder-find-btn-gradient',
                    frameWidth: findBtnGradLayoutRef.current?.width,
                    frameHeight: findBtnGradLayoutRef.current?.height,
                    cardWidth: searchCardLayoutRef.current?.width,
                    cardHeight: searchCardLayoutRef.current?.height,
                    ancestorCard: 'mosque-finder-search-card',
                  });
                }
              } : undefined}
              gradientTestID={isDiag ? "mosque-finder-find-btn-gradient" : undefined}
              onLabelLayout={isDiag ? (e) => {
                lastFindLabelEventRef.current = e;
                diag.recordNamed('buttonLabel', e, {
                  testID: 'mosque-finder-find-btn-label',
                  parentIdentity: 'mosque-finder-find-btn-gradient',
                  frameWidth: findBtnGradLayoutRef.current?.width,
                  frameHeight: findBtnGradLayoutRef.current?.height,
                  cardWidth: searchCardLayoutRef.current?.width,
                  cardHeight: searchCardLayoutRef.current?.height,
                  ancestorCard: 'mosque-finder-search-card',
                });
              } : undefined}
              labelTestID={isDiag ? "mosque-finder-find-btn-label" : undefined}
              title={searchingArea ? '' : t('Find')}
              icon={searchingArea ? undefined : 'search'}
              loading={searchingArea}
              disabled={searchingArea || !areaInput.trim()}
              onPress={() => handleSearchArea(areaInput)}
              accessibilityLabel={t('Search area')}
              style={[styles.searchButton, isCompact && styles.searchButtonCompact]}
            />
          </View>

          {/* Recent Area Searches */}
          {areaHistory.length > 0 && !areaSearchCenter && (
            <View style={styles.recentWrap}>
              <View style={styles.recentHeader}>
                <AppText variant="eyebrow" tone="faint" style={styles.recentLabel}>{t('Recent searches')}</AppText>
                <TouchableOpacity
                  onPress={clearAreaHistory}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('Clear area search history')}
                >
                  <AppText variant="caption" tone="faint" style={styles.recentClearText}>{t('Clear')}</AppText>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.recentChipsScroll, hScrollRTLStyle()]}
              >
                {areaHistory.map((item) => (
                  <View key={item} style={styles.recentChipWrap}>
                    <Chip
                      label={item}
                      icon="time-outline"
                      onPress={() => {
                        setAreaInput(item);
                        handleSearchArea(item);
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => removeAreaQuery(item)}
                      style={styles.recentChipRemove}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Remove from search history')}: ${item}`}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                    >
                      <Ionicons name="close" size={12} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <DetailScreen.FlatList
        style={{ flex: 1 }}
        testID={isDiag ? "mosque-finder-list-viewport" : undefined}
        onLayout={isDiag ? (e: LayoutChangeEvent) => {
          listViewportLayoutRef.current = e?.nativeEvent?.layout ?? null;
          diag.recordNamed('listViewport', e, {
            testID: 'mosque-finder-list-viewport',
            parentIdentity: 'detail-screen-root',
            frameWidth: width,
            frameHeight: undefined,
          });
          if (lastResultRowEventRef.current) {
            diag.recordNamed('resultRow', lastResultRowEventRef.current, {
              testID: 'mosque-finder-result-row-0',
              parentIdentity: 'mosque-finder-list-viewport',
              frameWidth: Math.max(0, (listViewportLayoutRef.current?.width ?? 0) - paddingH * 2),
              frameHeight: listViewportLayoutRef.current?.height,
            });
          }
        } : undefined}
        key={isWide ? 'mosques-grid' : 'mosques-list'}
        numColumns={isWide ? 2 : 1}
        data={mosques}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          { maxWidth: maxW, alignSelf: 'center', width: '100%', paddingHorizontal: paddingH },
          isWide && styles.listGrid,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchMosquesForCenter(
                effectiveCenter.latitude,
                effectiveCenter.longitude,
                radiusKm,
                true
              ).catch(() => {});
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Location & Radius Control Card */}
            <PremiumCard
              style={styles.controlCard}
              borderRadius={cardTokens.borderRadius}
              padded
            >
              <View style={styles.locationHeaderRow}>
                <View
                  style={[
                    styles.locationIconBox,
                    {
                      backgroundColor: colors.iconCircleBg,
                      borderColor: 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={areaSearchCenter ? 'map-outline' : 'navigate'}
                    size={16}
                    color={colors.iconCircleFg || colors.forestGreen || colors.accent}
                  />
                </View>

                <View style={styles.locationInfo}>
                  <AppText variant="eyebrow" tone="faint" style={styles.locationLabel}>
                    {t('SEARCH CENTER')} · {centerTypeBadge}
                  </AppText>
                  <AppText
                    variant="title"
                    style={styles.locationValue}
                    numberOfLines={2}
                  >
                    {effectiveCenter.label ||
                      `${effectiveCenter.latitude.toFixed(2)}°, ${effectiveCenter.longitude.toFixed(2)}°`}
                  </AppText>

                  {isUsingGps && (
                    <View style={styles.gpsConfidenceRow}>
                      <View style={[styles.gpsDot, { backgroundColor: colors.accent }]} />
                      <AppText
                        variant="caption"
                        tone="faint"
                        style={styles.gpsConfidenceText}
                        numberOfLines={2}
                      >
                        {t('Using GPS location')} ({effectiveCenter.latitude.toFixed(2)}°,{' '}
                        {effectiveCenter.longitude.toFixed(2)}°) ·{' '}
                        {gpsTimestamp ? `${t('last updated')} ${gpsTimestamp}` : t('active')}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {/* Prominent USE MY LOCATION Button */}
              <OutlineButton
                title={isLocating ? t('Acquiring GPS...') : t('USE MY LOCATION')}
                icon={isLocating ? undefined : 'locate'}
                loading={isLocating}
                disabled={isLocating}
                onPress={handleUseMyLocation}
                accessibilityLabel={t('Use my GPS location')}
                style={{ marginTop: 10, width: '100%' }}
              />

              {/* Location Permission / Status Notice */}
              {!areaSearchCenter && (locStatus === 'denied' || locStatus === 'unavailable') && (
                <LocationPermissionNote
                  status={locStatus}
                  onEnable={handleUseMyLocation}
                  onChooseCity={onOpenCities}
                  loading={isLocating || locLoading}
                  fallbackCity={settings.manualLocation.label || 'Makkah, Saudi Arabia'}
                  style={{ marginTop: 12 }}
                />
              )}

              {/* Area Search Active Banner */}
              {areaSearchCenter && (
                <View
                  style={[
                    styles.areaBanner,
                    {
                      backgroundColor: colors.accentDim,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.areaBannerLeft}>
                    <Ionicons name="location" size={16} color={colors.accent} />
                    <View style={styles.areaBannerTextWrap}>
                      <AppText variant="caption" highlight style={styles.areaBannerTitle}>
                        {t('Showing mosques near')} &apos;{areaSearchCenter.query}&apos;
                      </AppText>
                      <AppText
                        variant="caption"
                        tone="faint"
                        style={styles.areaBannerSubtitle}
                        numberOfLines={2}
                      >
                        {areaSearchCenter.label}
                      </AppText>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.areaBannerCloseBtn,
                      {
                        borderColor: colors.borderSubtle,
                        backgroundColor: colors.bgBase,
                      },
                    ]}
                    onPress={handleClearAreaSearch}
                    accessibilityRole="button"
                    accessibilityLabel={t('Return to my location')}
                  >
                    <Ionicons name="close" size={14} color={colors.accent} />
                    <AppText variant="caption" highlight style={styles.areaBannerCloseText}>
                      {t('My Location')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}

              <Hairline style={styles.controlDivider} />

              <View
                style={styles.radiusRow}
                onLayout={isDiag ? (e: LayoutChangeEvent) => {
                  radiusRowLayoutRef.current = e?.nativeEvent?.layout ?? null;
                  if (lastRadiusSelEventRef.current) {
                    diag.recordNamed('radiusSelected', lastRadiusSelEventRef.current, {
                      testID: 'mosque-finder-radius-chip-selected',
                      parentIdentity: 'mosque-finder-radius-pills',
                      frameWidth: radiusPillsLayoutRef.current?.width,
                      frameHeight: radiusPillsLayoutRef.current?.height,
                      cardWidth: searchCardLayoutRef.current?.width,
                      cardHeight: searchCardLayoutRef.current?.height,
                      ancestorCard: 'mosque-finder-search-card',
                    });
                  }
                  if (lastRadiusUnselEventRef.current) {
                    diag.recordNamed('radiusUnselected', lastRadiusUnselEventRef.current, {
                      testID: 'mosque-finder-radius-chip-unselected',
                      parentIdentity: 'mosque-finder-radius-pills',
                      frameWidth: radiusPillsLayoutRef.current?.width,
                      frameHeight: radiusPillsLayoutRef.current?.height,
                      cardWidth: searchCardLayoutRef.current?.width,
                      cardHeight: searchCardLayoutRef.current?.height,
                      ancestorCard: 'mosque-finder-search-card',
                    });
                  }
                } : undefined}
              >
                <AppText variant="caption" tone="faint" style={styles.radiusLabel}>
                  {t('Search Radius:')}
                </AppText>
                <View
                  testID={isDiag ? "mosque-finder-radius-pills" : undefined}
                  style={styles.radiusPills}
                  onLayout={isDiag ? (e: LayoutChangeEvent) => {
                    radiusPillsLayoutRef.current = e?.nativeEvent?.layout ?? null;
                    if (lastRadiusSelEventRef.current) {
                      diag.recordNamed('radiusSelected', lastRadiusSelEventRef.current, {
                        testID: 'mosque-finder-radius-chip-selected',
                        parentIdentity: 'mosque-finder-radius-pills',
                        frameWidth: radiusPillsLayoutRef.current?.width,
                        frameHeight: radiusPillsLayoutRef.current?.height,
                        cardWidth: searchCardLayoutRef.current?.width,
                        cardHeight: searchCardLayoutRef.current?.height,
                        ancestorCard: 'mosque-finder-search-card',
                      });
                    }
                    if (lastRadiusUnselEventRef.current) {
                      diag.recordNamed('radiusUnselected', lastRadiusUnselEventRef.current, {
                        testID: 'mosque-finder-radius-chip-unselected',
                        parentIdentity: 'mosque-finder-radius-pills',
                        frameWidth: radiusPillsLayoutRef.current?.width,
                        frameHeight: radiusPillsLayoutRef.current?.height,
                        cardWidth: searchCardLayoutRef.current?.width,
                        cardHeight: searchCardLayoutRef.current?.height,
                        ancestorCard: 'mosque-finder-search-card',
                      });
                    }
                  } : undefined}
                >
                  {RADIUS_OPTIONS.map((r) => {
                    const isSelected = radiusKm === r;
                    const isRepresentativeUnselected = !isSelected && r === (radiusKm === 5 ? 10 : 5);
                    return (
                      <Chip
                        key={r}
                        testID={isDiag ? (isSelected ? 'mosque-finder-radius-chip-selected' : isRepresentativeUnselected ? 'mosque-finder-radius-chip-unselected' : `mosque-finder-radius-chip-${r}`) : undefined}
                        onLayout={isDiag ? (e: LayoutChangeEvent) => {
                          if (isSelected) {
                            lastRadiusSelEventRef.current = e;
                            diag.recordNamed('radiusSelected', e, {
                              testID: 'mosque-finder-radius-chip-selected',
                              parentIdentity: 'mosque-finder-radius-pills',
                              frameWidth: radiusPillsLayoutRef.current?.width,
                              frameHeight: radiusPillsLayoutRef.current?.height,
                              cardWidth: searchCardLayoutRef.current?.width,
                              cardHeight: searchCardLayoutRef.current?.height,
                              ancestorCard: 'mosque-finder-search-card',
                            });
                          } else if (isRepresentativeUnselected) {
                            lastRadiusUnselEventRef.current = e;
                            diag.recordNamed('radiusUnselected', e, {
                              testID: 'mosque-finder-radius-chip-unselected',
                              parentIdentity: 'mosque-finder-radius-pills',
                              frameWidth: radiusPillsLayoutRef.current?.width,
                              frameHeight: radiusPillsLayoutRef.current?.height,
                              cardWidth: searchCardLayoutRef.current?.width,
                              cardHeight: searchCardLayoutRef.current?.height,
                              ancestorCard: 'mosque-finder-search-card',
                            });
                          }
                        } : undefined}
                        label={`${r} km`}
                        selected={isSelected}
                        onPress={() => setRadiusKm(r)}
                        accessibilityLabel={`${r} ${t('kilometers radius')}`}
                      />
                    );
                  })}
                </View>
              </View>
            </PremiumCard>

            {/* Results status banner */}
            {!loading && !error && !areaNotFound && (
              <View style={styles.resultsBanner}>
                <AppText variant="caption" tone="faint" style={styles.resultsCount}>
                  {mosques.length === 0
                    ? `${t('No mosques found within')} ${radiusKm} km`
                    : `${t('Found')} ${mosques.length} ${t('mosques within')} ${radiusKm} km`}
                </AppText>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[styles.itemWrap, isWide && styles.itemCell]}
            testID={isDiag && index === 0 ? "mosque-finder-result-row-0" : undefined}
            onLayout={isDiag && index === 0 ? (e) => {
              lastResultRowEventRef.current = e;
              diag.recordNamed('resultRow', e, {
                testID: 'mosque-finder-result-row-0',
                parentIdentity: 'mosque-finder-list-viewport',
                frameWidth: listViewportLayoutRef.current?.width,
                frameHeight: listViewportLayoutRef.current?.height,
              });
            } : undefined}
          >
            <PremiumCard
              style={styles.mosqueCard}
              borderRadius={cardTokens.borderRadius}
              padded
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <AppText
                    variant="rowTitle"
                    style={styles.mosqueName}
                    numberOfLines={2}
                  >
                    {item.name}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.distanceBadge,
                    {
                      backgroundColor: colors.sagePill,
                      borderColor: 'transparent',
                    },
                  ]}
                >
                  <Ionicons name="location-outline" size={13} color={colors.forestDark || colors.forestGreen || colors.accent} />
                  <AppText variant="caption" highlight style={styles.distanceText}>
                    {formatDistance(item.distanceKm)}
                  </AppText>
                </View>
              </View>

              <AppText
                variant="caption"
                tone="faint"
                style={styles.mosqueAddress}
                numberOfLines={3}
              >
                {item.address}
              </AppText>

              <OutlineButton
                title={t('Open in Maps')}
                icon="map-outline"
                onPress={() => openInMaps(item)}
                accessibilityLabel={`${t('Open in Maps')} - ${item.name}`}
                style={styles.mapButton}
              />
            </PremiumCard>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={[styles.content, { gap: 12 }]}>
              {[1, 2, 3, 4, 5].map((i) => (
                <PremiumCard
                  key={i}
                  style={styles.mosqueCard}
                  borderRadius={cardTokens.borderRadius}
                  padded
                >
                  <MosqueCardSkeleton compact={isCompact} />
                </PremiumCard>
              ))}
            </View>
          ) : areaNotFound ? (
            <PremiumCard
              style={styles.emptyCard}
              borderRadius={cardTokens.borderRadius}
              contentStyle={styles.emptyCardContent}
              padded
            >
              <Ionicons name="search-outline" size={36} color={colors.accent} />
              <AppText variant="title" style={styles.emptyTitle}>
                {t('Area Not Found')}
              </AppText>
              <AppText variant="body" tone="faint" style={styles.emptySubtitle}>
                {t('No geographic location found for')} &quot;{searchedQuery}&quot;. {t('Try another city, district, or landmark name (e.g. "Dubai Marina", "Lahore", or "Istanbul").')}
              </AppText>
              <PrimaryButton
                title={t('Return to My Location')}
                onPress={handleClearAreaSearch}
                accessibilityLabel={t('Return to my location')}
                style={{ marginTop: 14 }}
              />
            </PremiumCard>
          ) : error ? (
            <PremiumCard
              style={styles.errorCard}
              borderRadius={cardTokens.borderRadius}
              contentStyle={styles.errorCardContent}
              padded
            >
              <Ionicons name="alert-circle-outline" size={32} color={colors.accent} />
              <AppText variant="title" style={styles.errorTitle}>
                {t('Unable to load mosques')}
              </AppText>
              <AppText variant="body" tone="faint" style={styles.errorSubtitle}>{error}</AppText>
              <PrimaryButton
                title={t('Retry Search')}
                onPress={() =>
                  fetchMosquesForCenter(
                    effectiveCenter.latitude,
                    effectiveCenter.longitude,
                    radiusKm
                  )
                }
                accessibilityLabel={t('Retry search')}
                style={{ marginTop: 14 }}
              />
            </PremiumCard>
          ) : (
            <PremiumCard
              style={styles.emptyCard}
              borderRadius={cardTokens.borderRadius}
              contentStyle={styles.emptyCardContent}
              padded
            >
              <Ionicons name="compass-outline" size={36} color={colors.textMuted} />
              <AppText variant="title" style={styles.emptyTitle}>
                {t('No Mosques Found')}
              </AppText>
              <AppText variant="body" tone="faint" style={styles.emptySubtitle}>
                {t('No places of worship found within')} {radiusKm} km {t('of')}{' '}
                {effectiveCenter.label || t('this location')}. {t('Try expanding the search radius above or searching another area.')}
              </AppText>
              {areaSearchCenter && (
                <PrimaryButton
                  title={t('Return to My Location')}
                  onPress={handleClearAreaSearch}
                  accessibilityLabel={t('Return to my location')}
                  style={{ marginTop: 14 }}
                />
              )}
            </PremiumCard>
          )
        }
        ListFooterComponent={
          mosques.length > 0 ? (
            <View style={styles.footerNote}>
              <AppText variant="caption" tone="faint" style={styles.footerText}>
                {t('Place of worship data provided by OpenStreetMap contributors. Keyless Nominatim search.')}
              </AppText>
            </View>
          ) : null
        }
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    paddingHorizontal: 20,
  },
  listGrid: {
    gap: 12,
  },
  itemCell: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
  },
  headerWrap: {
    marginBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 0,
    marginBottom: 10,
  },
  searchRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchFieldWrap: {
    flex: 1,
    minWidth: 0,
  },
  searchFieldWrapCompact: {
    flex: 1,
    minWidth: 0,
  },
  searchButton: {
    minHeight: 44,
    minWidth: 84,
    paddingHorizontal: 16,
  },
  searchButtonCompact: {
    minWidth: 84,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  recentChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 6,
    minHeight: 48,
    marginTop: 4,
    marginBottom: 10,
  },
  searchIcon: {
    marginStart: 6,
    marginEnd: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 40,
    minWidth: 0,
  },
  clearBtn: {
    padding: 6,
    marginEnd: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
    minHeight: 44,
  },
  searchSubmitBtnDisabled: {
    opacity: 0.5,
  },
  searchSubmitText: {
    fontSize: 13,
    letterSpacing: 0.2,
    paddingVertical: 2,
  },
  recentWrap: {
    marginBottom: 8,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
    paddingVertical: 2,
  },
  recentClearText: {
    fontSize: 12,
    paddingVertical: 2,
  },
  recentChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingEnd: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingStart: 8,
    paddingEnd: 4,
    minHeight: 28,
    paddingVertical: 2,
  },
  recentChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  recentChipText: {
    fontSize: 12,
    maxWidth: 140,
    paddingVertical: 2,
  },
  recentChipRemove: {
    padding: 6,
    marginStart: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  controlCard: {
    marginBottom: 8,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  locationInfo: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    paddingVertical: 2,
  },
  locationValue: {
    fontSize: 14,
    marginTop: 2,
  },
  gpsConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsConfidenceText: {
    fontSize: 12,
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  useLocationBtnText: {
    fontSize: 12,
    letterSpacing: 0.5,
    paddingVertical: 2,
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  statusNoticeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  statusNoticeTitle: {
    fontSize: 12,
    paddingVertical: 2,
  },
  statusNoticeDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  statusNoticeLink: {
    marginTop: 5,
  },
  statusNoticeLinkText: {
    fontSize: 11,
    paddingVertical: 2,
  },
  areaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  areaBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  areaBannerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  areaBannerTitle: {
    fontSize: 12,
    paddingVertical: 2,
  },
  areaBannerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  areaBannerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  areaBannerCloseText: {
    fontSize: 12,
    paddingVertical: 2,
  },
  controlDivider: {
    marginVertical: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusLabel: {
    fontSize: 12.5,
    flexShrink: 1,
    minWidth: 0,
  },
  radiusPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  radiusPill: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusPillText: {
    fontSize: 11.5,
    paddingVertical: 2,
  },
  resultsBanner: {
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  resultsCount: {
    fontSize: 12,
  },
  itemWrap: {
    marginVertical: 4,
  },
  itemHairline: {
    marginVertical: 4,
    opacity: 0.5,
  },
  mosqueCard: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  mosqueName: {
    fontSize: 15,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
  },
  distanceText: {
    fontSize: 12,
    paddingVertical: 2,
  },
  mosqueAddress: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  mapButtonText: {
    fontSize: 12,
    paddingVertical: 2,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    fontSize: 13,
  },
  errorCard: {},
  errorTitle: {
    fontSize: 15,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
  },
  emptyCard: {},
  emptyTitle: {
    fontSize: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerNote: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },

  errorCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },

  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
});
