import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { Location as Loc } from '../lib/prayerTimes';
import { distanceKm } from '../lib/qibla';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
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
    request: requestLocation,
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
    if (hookGpsLocation && !gpsTimestamp) {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setGpsTimestamp(`${h}:${m}`);
    }
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
    if (!areaNotFound) {
      fetchMosquesForCenter(effectiveCenter.latitude, effectiveCenter.longitude, radiusKm).catch(
        () => {
          // Non-fatal: fetchMosquesForCenter sets its own error state on failure.
        }
      );
    }
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
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        eyebrow={t('Tools')}
        title={t('Mosque Finder')}
        onBack={onBack}
        backLabel={t('Tools')}
      />
      <View style={{ maxWidth: maxW, alignSelf: 'center', width: '100%', paddingHorizontal: paddingH, paddingTop: 4 }}>
        <View style={styles.headerWrap}>
          {/* Area Search Input Bar */}
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={17}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t("Search area or city, e.g. 'Dubai Marina' or 'Lahore'...")}
              placeholderTextColor={colors.textMuted}
              value={areaInput}
              onChangeText={setAreaInput}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => handleSearchArea(areaInput)}
            />
            {areaInput.length > 0 && (
              <TouchableOpacity
                onPress={() => setAreaInput('')}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Clear search input')}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.searchSubmitBtn,
                { backgroundColor: colors.accent },
                (!areaInput.trim() || searchingArea) && styles.searchSubmitBtnDisabled,
              ]}
              onPress={() => handleSearchArea(areaInput)}
              disabled={searchingArea || !areaInput.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('Search area')}
            >
              {searchingArea ? (
                <ActivityIndicator size="small" color={colors.bgBase} />
              ) : (
                <>
                  <Ionicons name="search" size={14} color={colors.bgBase} style={{ marginRight: 4 }} />
                  <Text style={[styles.searchSubmitText, { color: colors.bgBase }]}>
                    {t('Find')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Recent Area Searches */}
          {areaHistory.length > 0 && !areaSearchCenter && (
            <View style={styles.recentWrap}>
              <View style={styles.recentHeader}>
                <Text style={[styles.recentLabel, { color: colors.textMuted }]}>{t('Recent searches')}</Text>
                <TouchableOpacity
                  onPress={clearAreaHistory}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('Clear area search history')}
                >
                  <Text style={[styles.recentClearText, { color: colors.textMuted }]}>{t('Clear')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.recentChipsScroll, hScrollRTLStyle()]}
              >
                {areaHistory.map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.recentChip,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setAreaInput(item);
                        handleSearchArea(item);
                      }}
                      style={styles.recentChipBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Search for mosques near')} ${item}`}
                    >
                      <Ionicons name="time-outline" size={13} color={colors.accent} />
                      <Text style={[styles.recentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item}
                      </Text>
                    </TouchableOpacity>
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

      <FlatList
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
              ).catch(() => {
                // Non-fatal: fetchMosquesForCenter sets its own error state.
              });
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Location & Radius Control Card */}
            <Card style={styles.controlCard} padded>
              <View style={styles.locationHeaderRow}>
                <View
                  style={[
                    styles.locationIconBox,
                    {
                      backgroundColor: colors.accentDim,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Ionicons
                    name={areaSearchCenter ? 'map-outline' : 'navigate'}
                    size={16}
                    color={colors.accent}
                  />
                </View>

                <View style={styles.locationInfo}>
                  <Text style={[styles.locationLabel, { color: colors.textMuted }]}>
                    {t('SEARCH CENTER')} · {centerTypeBadge}
                  </Text>
                  <Text
                    style={[styles.locationValue, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {effectiveCenter.label ||
                      `${effectiveCenter.latitude.toFixed(2)}°, ${effectiveCenter.longitude.toFixed(2)}°`}
                  </Text>

                  {isUsingGps && (
                    <View style={styles.gpsConfidenceRow}>
                      <View style={[styles.gpsDot, { backgroundColor: colors.accent }]} />
                      <Text
                        style={[styles.gpsConfidenceText, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {t('Using GPS location')} ({effectiveCenter.latitude.toFixed(2)}°,{' '}
                        {effectiveCenter.longitude.toFixed(2)}°) ·{' '}
                        {gpsTimestamp ? `${t('last updated')} ${gpsTimestamp}` : t('active')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Prominent USE MY LOCATION Button */}
              <TouchableOpacity
                style={[
                  styles.useLocationBtn,
                  {
                    backgroundColor: colors.accentDim,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                onPress={handleUseMyLocation}
                disabled={isLocating}
                accessibilityRole="button"
                accessibilityLabel={t('Use my GPS location')}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="locate" size={15} color={colors.accent} />
                )}
                <Text style={[styles.useLocationBtnText, { color: colors.accent }]}>
                  {isLocating ? t('Acquiring GPS...') : t('USE MY LOCATION')}
                </Text>
              </TouchableOpacity>

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
                      <Text style={[styles.areaBannerTitle, { color: colors.accent }]}>
                        {t('Showing mosques near')} '{areaSearchCenter.query}'
                      </Text>
                      <Text
                        style={[styles.areaBannerSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {areaSearchCenter.label}
                      </Text>
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
                    <Text style={[styles.areaBannerCloseText, { color: colors.accent }]}>
                      {t('My Location')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Hairline style={styles.controlDivider} />

              <View style={styles.radiusRow}>
                <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>
                  {t('Search Radius:')}
                </Text>
                <View style={styles.radiusPills}>
                  {RADIUS_OPTIONS.map((r) => {
                    const isSelected = radiusKm === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.radiusPill,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => setRadiusKm(r)}
                        accessibilityRole="button"
                        accessibilityLabel={`${r} ${t('kilometers radius')}`}
                      >
                        <Text
                          style={[
                            styles.radiusPillText,
                            {
                              color: isSelected ? colors.bgBase : colors.textPrimary,
                            },
                          ]}
                        >
                          {r} km
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </Card>

            {/* Results status banner */}
            {!loading && !error && !areaNotFound && (
              <View style={styles.resultsBanner}>
                <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
                  {mosques.length === 0
                    ? `${t('No mosques found within')} ${radiusKm} km`
                    : `${t('Found')} ${mosques.length} ${t('mosques within')} ${radiusKm} km`}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={[styles.itemWrap, isWide && styles.itemCell]}>
            {index > 0 && !isWide && <Hairline style={styles.itemHairline} />}
            <Card style={styles.mosqueCard} padded>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text
                    style={[styles.mosqueName, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.distanceBadge,
                    {
                      backgroundColor: colors.accentDim,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Ionicons name="location-outline" size={13} color={colors.accent} />
                  <Text style={[styles.distanceText, { color: colors.accent }]}>
                    {formatDistance(item.distanceKm)}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.mosqueAddress, { color: colors.textMuted }]}
                numberOfLines={2}
              >
                {item.address}
              </Text>

              <TouchableOpacity
                style={[
                  styles.mapButton,
                  { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
                ]}
                onPress={() => openInMaps(item)}
                accessibilityRole="button"
                accessibilityLabel={`${t('Open in Maps')} - ${item.name}`}
              >
                <Ionicons name="map-outline" size={14} color={colors.accent} />
                <Text style={[styles.mapButtonText, { color: colors.textPrimary }]}>
                  {t('Open in Maps')}
                </Text>
                <Ionicons name="open-outline" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.content}>
              {[1, 2, 3, 4, 5].map((i) => (
                <MosqueCardSkeleton key={i} compact={isCompact} />
              ))}
            </View>
          ) : areaNotFound ? (
            <Card style={styles.emptyCard} padded>
              <Ionicons name="search-outline" size={36} color={colors.accent} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('Area Not Found')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('No geographic location found for')} "{searchedQuery}". {t('Try another city, district, or landmark name (e.g. "Dubai Marina", "Lahore", or "Istanbul").')}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={handleClearAreaSearch}
                accessibilityRole="button"
                accessibilityLabel={t('Return to my location')}
              >
                <Text style={[styles.retryText, { color: colors.bgBase }]}>
                  {t('Return to My Location')}
                </Text>
              </TouchableOpacity>
            </Card>
          ) : error ? (
            <Card style={styles.errorCard} padded>
              <Ionicons name="alert-circle-outline" size={32} color={colors.accent} />
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                {t('Unable to load mosques')}
              </Text>
              <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={() =>
                  fetchMosquesForCenter(
                    effectiveCenter.latitude,
                    effectiveCenter.longitude,
                    radiusKm
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={t('Retry search')}
              >
                <Text style={[styles.retryText, { color: colors.bgBase }]}>
                  {t('Retry Search')}
                </Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card style={styles.emptyCard} padded>
              <Ionicons name="compass-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t('No Mosques Found')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {t('No places of worship found within')} {radiusKm} km {t('of')}{' '}
                {effectiveCenter.label || t('this location')}. {t('Try expanding the search radius above or searching another area.')}
              </Text>
              {areaSearchCenter && (
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.accent }]}
                  onPress={handleClearAreaSearch}
                  accessibilityRole="button"
                  accessibilityLabel={t('Return to my location')}
                >
                  <Text style={[styles.retryText, { color: colors.bgBase }]}>
                    {t('Return to My Location')}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          )
        }
        ListFooterComponent={
          mosques.length > 0 ? (
            <View style={styles.footerNote}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                {t('Place of worship data provided by OpenStreetMap contributors. Keyless Nominatim search.')}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 6,
    height: 48,
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchIcon: {
    marginLeft: 6,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  searchSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  searchSubmitBtnDisabled: {
    opacity: 0.5,
  },
  searchSubmitText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
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
  },
  recentClearText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  recentChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 8,
    paddingRight: 4,
    height: 28,
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
  },
  recentChipRemove: {
    padding: 4,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCard: {
    marginBottom: 8,
    borderRadius: 10,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
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
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  useLocationBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 0.5,
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  statusNoticeTextWrap: {
    flex: 1,
  },
  statusNoticeTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
  },
  areaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  areaBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  areaBannerTextWrap: {
    flex: 1,
  },
  areaBannerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
    borderRadius: 6,
    borderWidth: 1,
  },
  areaBannerCloseText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
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
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
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
  mosqueCard: {
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  mosqueName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  distanceText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  mosqueAddress: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  mapButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  emptySubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
