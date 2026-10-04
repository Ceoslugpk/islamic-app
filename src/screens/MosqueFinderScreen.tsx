import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
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
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import { MosqueCardSkeleton } from '../components/Skeleton';
import { loadMosqueCache, saveMosqueCache } from '../lib/db';

export interface MosqueItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

const RADIUS_OPTIONS = [5, 10, 20]; // in km

export default function MosqueFinderScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const {
    location: hookGpsLocation,
    status: locStatus,
    loading: locLoading,
    request: requestLocation,
    refresh: refreshLocation,
  } = useLocation(true);
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

  // Radius & Results
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Determine user's local location (GPS or manual fallback)
  const myLocation = useMemo<Loc>(() => {
    if (freshGps) return freshGps;
    if (settings.locationMode === 'auto' && hookGpsLocation) return hookGpsLocation;
    return settings.manualLocation;
  }, [freshGps, settings.locationMode, hookGpsLocation, settings.manualLocation]);

  const isUsingGps = useMemo(() => {
    if (areaSearchCenter) return false;
    return Boolean(freshGps) || (settings.locationMode === 'auto' && Boolean(hookGpsLocation));
  }, [areaSearchCenter, freshGps, settings.locationMode, hookGpsLocation]);

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
        // Calculate bounding box based on radius
        // 1 degree latitude ~ 111 km
        const dLat = radius / 111;
        const cosLat = Math.cos((lat * Math.PI) / 180);
        const dLon = radius / (111 * (Math.abs(cosLat) > 0.05 ? Math.abs(cosLat) : 1));

        const minLon = lon - dLon;
        const maxLon = lon + dLon;
        const minLat = lat - dLat;
        const maxLat = lat + dLat;

        // Nominatim viewbox format: <left>,<top>,<right>,<bottom>
        // where left=minLon, top=maxLat, right=maxLon, bottom=minLat
        const viewbox = `${minLon.toFixed(4)},${maxLat.toFixed(4)},${maxLon.toFixed(4)},${minLat.toFixed(4)}`;

        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=mosque&limit=30&bounded=1&viewbox=${viewbox}`;

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'IslamicAppMobile/1.0 (https://islamic.app)',
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error('Invalid response structure');
        }

        const items: MosqueItem[] = [];
        const seen = new Set<string>();

        for (const place of data) {
          const mLat = parseFloat(place.lat);
          const mLon = parseFloat(place.lon);
          if (isNaN(mLat) || isNaN(mLon)) continue;

          // Unique key by coordinates or ID
          const coordKey = `${mLat.toFixed(4)},${mLon.toFixed(4)}`;
          if (seen.has(coordKey)) continue;
          seen.add(coordKey);

          let name = place.name;
          if (!name && place.address) {
            name = place.address.amenity || place.address.building || place.address.place_of_worship;
          }
          if (!name) {
            name = 'Mosque';
          }

          // Clean up address
          let address = place.display_name || '';
          if (place.address) {
            const parts = [
              place.address.road || place.address.street,
              place.address.quarter || place.address.suburb || place.address.neighbourhood,
              place.address.city || place.address.town || place.address.village,
              place.address.state || place.address.country,
            ].filter(Boolean);
            if (parts.length > 0) {
              address = parts.join(', ');
            }
          }

          const dist = distanceKm(lat, lon, mLat, mLon);

          items.push({
            id: String(place.place_id || place.osm_id || coordKey),
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
      fetchMosquesForCenter(effectiveCenter.latitude, effectiveCenter.longitude, radiusKm);
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
        setFreshGps(fresh);
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        setGpsTimestamp(`${h}:${m}`);
        await fetchMosquesForCenter(fresh.latitude, fresh.longitude, radiusKm);
      } else if (hookGpsLocation) {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        setGpsTimestamp(`${h}:${m}`);
        await fetchMosquesForCenter(hookGpsLocation.latitude, hookGpsLocation.longitude, radiusKm);
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

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'IslamicAppMobile/1.0 (https://islamic.app)',
          Accept: 'application/json',
        },
      });

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
    ? 'AREA SEARCH'
    : isUsingGps
    ? 'GPS AUTO'
    : `MANUAL (${settings.manualLocation.label || 'Makkah, Saudi Arabia'})`;

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <FlatList
        data={mosques}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          { maxWidth: maxW, alignSelf: 'center', width: '100%', paddingHorizontal: paddingH },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              fetchMosquesForCenter(
                effectiveCenter.latitude,
                effectiveCenter.longitude,
                radiusKm,
                true
              )
            }
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {onBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back to Tools"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Tools</Text>
              </TouchableOpacity>
            )}

            <SectionHeader
              compact
              eyebrow="Tools"
              title="Mosque Finder"
            />

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
                placeholder="Search area or city, e.g. 'Dubai Marina' or 'Lahore'..."
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
                  accessibilityLabel="Clear search input"
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
                accessibilityLabel="Search area"
              >
                {searchingArea ? (
                  <ActivityIndicator size="small" color={colors.bgBase} />
                ) : (
                  <Text style={[styles.searchSubmitText, { color: colors.bgBase }]}>
                    Search
                  </Text>
                )}
              </TouchableOpacity>
            </View>

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
                    SEARCH CENTER · {centerTypeBadge}
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
                        Using GPS location ({effectiveCenter.latitude.toFixed(2)}°,{' '}
                        {effectiveCenter.longitude.toFixed(2)}°) ·{' '}
                        {gpsTimestamp ? `last updated ${gpsTimestamp}` : 'active'}
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
                accessibilityLabel="Use my GPS location"
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="locate" size={15} color={colors.accent} />
                )}
                <Text style={[styles.useLocationBtnText, { color: colors.accent }]}>
                  {isLocating ? 'Acquiring GPS...' : 'USE MY LOCATION'}
                </Text>
              </TouchableOpacity>

              {/* Location Permission / Status Notice */}
              {!areaSearchCenter && (locStatus === 'denied' || locStatus === 'unavailable') && (
                <LocationPermissionNote
                  status={locStatus}
                  onEnable={handleUseMyLocation}
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
                        Showing mosques near '{areaSearchCenter.query}'
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
                    accessibilityLabel="Return to my location"
                  >
                    <Ionicons name="close" size={14} color={colors.accent} />
                    <Text style={[styles.areaBannerCloseText, { color: colors.accent }]}>
                      My Location
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Hairline style={styles.controlDivider} />

              <View style={styles.radiusRow}>
                <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>
                  Search Radius:
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
                        accessibilityLabel={`${r} kilometers radius`}
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
                    ? `No mosques found within ${radiusKm} km`
                    : `Found ${mosques.length} mosque${
                        mosques.length === 1 ? '' : 's'
                      } within ${radiusKm} km`}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.itemWrap}>
            {index > 0 && <Hairline style={styles.itemHairline} />}
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
                accessibilityLabel={`Open ${item.name} in maps`}
              >
                <Ionicons name="map-outline" size={14} color={colors.accent} />
                <Text style={[styles.mapButtonText, { color: colors.textPrimary }]}>
                  Open in Maps
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
                Area Not Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No geographic location found for "{searchedQuery}". Try another city,
                district, or landmark name (e.g. "Dubai Marina", "Lahore", or
                "Istanbul").
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={handleClearAreaSearch}
                accessibilityRole="button"
                accessibilityLabel="Return to my location"
              >
                <Text style={[styles.retryText, { color: colors.bgBase }]}>
                  Return to My Location
                </Text>
              </TouchableOpacity>
            </Card>
          ) : error ? (
            <Card style={styles.errorCard} padded>
              <Ionicons name="alert-circle-outline" size={32} color={colors.accent} />
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                Unable to load mosques
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
                accessibilityLabel="Retry search"
              >
                <Text style={[styles.retryText, { color: colors.bgBase }]}>
                  Retry Search
                </Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card style={styles.emptyCard} padded>
              <Ionicons name="compass-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Mosques Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No places of worship found within {radiusKm} km of{' '}
                {effectiveCenter.label || 'this location'}. Try expanding the search radius
                above or searching another area.
              </Text>
              {areaSearchCenter && (
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.accent }]}
                  onPress={handleClearAreaSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Return to my location"
                >
                  <Text style={[styles.retryText, { color: colors.bgBase }]}>
                    Return to My Location
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
                Place of worship data provided by OpenStreetMap contributors. Keyless Nominatim search.
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
  headerWrap: {
    marginBottom: 6,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 2,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
    marginRight: 6,
  },
  searchSubmitBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSubmitBtnDisabled: {
    opacity: 0.5,
  },
  searchSubmitText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
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
