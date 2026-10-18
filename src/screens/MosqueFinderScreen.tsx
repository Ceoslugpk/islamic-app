import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { Location as Loc } from '../lib/prayerTimes';
import { distanceKm } from '../lib/qibla';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
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

export interface MosqueItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

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

  // Radius & Results
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Try cache first (unless manual refresh)
      if (!isManualRefresh) {
        const cached = loadMosqueCache(lat, lon, radius);
        if (cached && cached.length > 0) {
          setMosques(cached);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      try {
        // Overpass API — query real mosques (amenity=place_of_worship + religion=muslim)
        // in the bounding box. Much more reliable than Nominatim's free-text q=mosque.
        const dLat = radius / 111;
        const cosLat = Math.cos((lat * Math.PI) / 180);
        const dLon = radius / (111 * (Math.abs(cosLat) > 0.05 ? Math.abs(cosLat) : 1));

        const south = lat - dLat, north = lat + dLat;
        const west = lon - dLon, east = lon + dLon;

        const overpassQuery = `[out:json][timeout:20];(node["amenity"="place_of_worship"]["religion"="muslim"](${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)});way["amenity"="place_of_worship"]["religion"="muslim"](${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}););out center 30;`;

        // Overpass mirrors — try in order; the main server is frequently overloaded.
        const OVERPASS_ENDPOINTS = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
        ];

        let data: any = null;
        let lastErr: Error | null = null;
        for (const endpoint of OVERPASS_ENDPOINTS) {
          // ponytail: bounded timeout — a hanging Overpass fetch would leave the
          // screen stuck in loading forever (same class as the earlier global-stall).
          // Manual AbortController + setTimeout: AbortSignal.timeout is not
          // reliably available in Expo Go's Hermes ("undefined is not a function").
          const url = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);
          try {
            const res = await fetch(url, {
              headers: { 'User-Agent': 'IslamicAppMobile/1.0' },
              signal: controller.signal,
            });
            if (!res.ok) throw new Error(`Server returned status ${res.status}`);
            const json = await res.json();
            if (json && Array.isArray(json.elements)) {
              data = json;
              break;
            }
            throw new Error('Invalid response structure');
          } catch (err: any) {
            lastErr = err;
            // try next mirror
          } finally {
            clearTimeout(timer);
          }
        }

        if (!data) {
          throw lastErr || new Error('All Overpass mirrors failed');
        }

        const items: MosqueItem[] = [];
        const seen = new Set<string>();

        for (const el of data.elements) {
          // Nodes have lat/lon; ways/relations have center.lat/center.lon
          const mLat = el.lat ?? el.center?.lat;
          const mLon = el.lon ?? el.center?.lon;
          if (typeof mLat !== 'number' || typeof mLon !== 'number' || isNaN(mLat) || isNaN(mLon)) continue;

          const tags = el.tags || {};

          // Unique key by coordinates
          const coordKey = `${mLat.toFixed(4)},${mLon.toFixed(4)}`;
          if (seen.has(coordKey)) continue;
          seen.add(coordKey);

          const name = tags.name || 'Mosque';

          // Build a readable address from available tags
          const parts = [
            tags['addr:street'],
            tags['addr:district'] || tags['addr:suburb'] || tags['addr:quarter'],
            tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
            tags['addr:state'] || tags['addr:country'],
          ].filter(Boolean);
          const address = parts.length > 0 ? parts.join(', ') : (tags['addr:full'] || '');

          const dist = distanceKm(lat, lon, mLat, mLon);

          items.push({
            id: String(el.id ?? coordKey),
            name,
            address,
            latitude: mLat,
            longitude: mLon,
            distanceKm: dist,
          });
        }

        // Sort ascending by distance from current search center
        items.sort((a, b) => a.distanceKm - b.distanceKm);

        setMosques(items);
        // Cache the results
        saveMosqueCache(lat, lon, radius, items);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch mosques. Please check your network connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

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

    setSearchingArea(true);
    setLoading(true);
    setError(null);
    setAreaNotFound(false);
    setSearchedQuery(q);
    setMosques([]);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=1`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            'User-Agent': 'IslamicAppMobile/1.0 (https://islamic.app)',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        throw new Error(`Area lookup failed (${res.status})`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setAreaNotFound(true);
        setAreaSearchCenter(null);
        setLoading(false);
        return;
      }

      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);

      if (isNaN(lat) || isNaN(lon)) {
        setAreaNotFound(true);
        setAreaSearchCenter(null);
        setLoading(false);
        return;
      }

      const rawLabel = first.display_name || q;
      const labelParts = rawLabel.split(',').map((s: string) => s.trim()).filter(Boolean);
      const shortLabel = labelParts.slice(0, 3).join(', ') || rawLabel;

      const newCenter = {
        latitude: lat,
        longitude: lon,
        label: shortLabel,
        query: q,
      };

      addAreaQuery(q);
      setAreaSearchCenter(newCenter);
      await fetchMosquesForCenter(lat, lon, radiusKm);
    } catch (err: any) {
      setError(err.message || 'Failed to search area. Please try again.');
    } finally {
      setSearchingArea(false);
      setLoading(false);
    }
  };

  const handleClearAreaSearch = () => {
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
    Linking.openURL(mapsUrl).catch(() => {
      // Fallback
    });
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

  const isCompact = width < 380;
  const isWide = width >= 600;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={{ backgroundColor: colors.bgBase }}
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
        <View style={styles.headerWrap}>
          {/* Area Search Input Bar */}
          <View style={styles.searchRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <SearchField
                value={areaInput}
                onChangeText={setAreaInput}
                placeholder={t("Search area or city, e.g. 'Dubai Marina' or 'Lahore'...")}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchArea(areaInput)}
                onClear={() => setAreaInput('')}
              />
            </View>
            <PrimaryButton
              title={searchingArea ? '' : t('Find')}
              icon={searchingArea ? undefined : 'search'}
              loading={searchingArea}
              disabled={searchingArea || !areaInput.trim()}
              onPress={() => handleSearchArea(areaInput)}
              accessibilityLabel={t('Search area')}
              style={{ minHeight: 44, paddingHorizontal: 16 }}
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
            <PremiumCard style={styles.controlCard} padded>
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

              <View style={styles.radiusRow}>
                <AppText variant="caption" tone="faint" style={styles.radiusLabel}>
                  {t('Search Radius:')}
                </AppText>
                <View style={styles.radiusPills}>
                  {RADIUS_OPTIONS.map((r) => {
                    const isSelected = radiusKm === r;
                    return (
                      <Chip
                        key={r}
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
          <View style={[styles.itemWrap, isWide && styles.itemCell]}>
            <PremiumCard style={styles.mosqueCard} padded>
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
                <PremiumCard key={i} style={styles.mosqueCard} padded>
                  <MosqueCardSkeleton compact={isCompact} />
                </PremiumCard>
              ))}
            </View>
          ) : areaNotFound ? (
            <PremiumCard style={styles.emptyCard} padded>
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
            <PremiumCard style={styles.errorCard} padded>
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
            <PremiumCard style={styles.emptyCard} padded>
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
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    minHeight: 40,
    minWidth: 0,
  },
  clearBtn: {
    padding: 6,
    marginEnd: 4,
  },
  searchSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
    minHeight: 36,
  },
  searchSubmitBtnDisabled: {
    opacity: 0.5,
  },
  searchSubmitText: {
    fontFamily: 'Manrope_600SemiBold',
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
    paddingVertical: 2,
  },
  recentClearText: {
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    maxWidth: 140,
    paddingVertical: 2,
  },
  recentChipRemove: {
    padding: 4,
    marginStart: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    paddingVertical: 2,
  },
  locationValue: {
    fontFamily: 'Manrope_600SemiBold',
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
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  useLocationBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  statusNoticeDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  statusNoticeLink: {
    marginTop: 5,
  },
  statusNoticeLinkText: {
    fontFamily: 'Manrope_600SemiBold',
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  areaBannerSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  areaBannerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    minHeight: 28,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  areaBannerCloseText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    paddingVertical: 2,
  },
  controlDivider: {
    marginVertical: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radiusLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
  },
  radiusPills: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    paddingVertical: 2,
  },
  resultsBanner: {
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  resultsCount: {
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_600SemiBold',
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    paddingVertical: 2,
  },
  mosqueAddress: {
    fontFamily: 'Manrope_400Regular',
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
    minHeight: 36,
    borderRadius: 14,
    borderWidth: 1,
  },
  mapButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  errorTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  errorSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  emptySubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerNote: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
});
