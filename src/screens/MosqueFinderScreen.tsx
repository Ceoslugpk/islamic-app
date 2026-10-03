import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { distanceKm } from '../lib/qibla';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';

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
  const { location: gpsLocation, request: requestLocation } = useLocation(true);
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto' && gpsLocation) return gpsLocation;
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.manualLocation]);

  const fetchMosques = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const userLat = effectiveLocation.latitude;
        const userLon = effectiveLocation.longitude;

        // Calculate bounding box based on radius
        // 1 degree latitude ~ 111 km
        const dLat = radiusKm / 111;
        const cosLat = Math.cos((userLat * Math.PI) / 180);
        const dLon = radiusKm / (111 * (Math.abs(cosLat) > 0.05 ? Math.abs(cosLat) : 1));

        const minLon = userLon - dLon;
        const maxLon = userLon + dLon;
        const minLat = userLat - dLat;
        const maxLat = userLat + dLat;

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
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);
          if (isNaN(lat) || isNaN(lon)) continue;

          // Unique key by coordinates or ID
          const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
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

          const dist = distanceKm(userLat, userLon, lat, lon);

          items.push({
            id: String(place.place_id || place.osm_id || coordKey),
            name,
            address,
            latitude: lat,
            longitude: lon,
            distanceKm: dist,
          });
        }

        // Sort ascending by distance from user
        items.sort((a, b) => a.distanceKm - b.distanceKm);

        setMosques(items);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch mosques. Please check your network connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveLocation.latitude, effectiveLocation.longitude, radiusKm]
  );

  useEffect(() => {
    fetchMosques();
  }, [fetchMosques]);

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

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgBase }]}>
      <FlatList
        data={mosques}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { maxWidth: maxW, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMosques(true)}
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
              >
                <Text style={[styles.backText, { color: colors.accent }]}>← Tools</Text>
              </TouchableOpacity>
            )}

            <SectionHeader
              eyebrow="Tools"
              title="Mosque Finder"
              subtitle="Find nearby mosques and prayer spaces with directions"
            />

            {/* Location & Radius Control Card */}
            <Card style={styles.controlCard} padded>
              <View style={styles.locationRow}>
                <View
                  style={[
                    styles.locationIconBox,
                    { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Ionicons name="navigate" size={16} color={colors.accent} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationLabel, { color: colors.textMuted }]}>
                    SEARCH CENTER (
                    {settings.locationMode === 'auto' ? 'GPS AUTO' : 'MANUAL'}
                    )
                  </Text>
                  <Text
                    style={[styles.locationValue, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {effectiveLocation.label ||
                      `${effectiveLocation.latitude.toFixed(2)}°, ${effectiveLocation.longitude.toFixed(2)}°`}
                  </Text>
                </View>
              </View>

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
            {!loading && !error && (
              <View style={styles.resultsBanner}>
                <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
                  {mosques.length === 0
                    ? 'No mosques found'
                    : `Found ${mosques.length} mosque${mosques.length === 1 ? '' : 's'} within ${radiusKm} km`}
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
                  <Text style={[styles.mosqueName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.distanceBadge,
                    { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Ionicons name="location-outline" size={13} color={colors.accent} />
                  <Text style={[styles.distanceText, { color: colors.accent }]}>
                    {formatDistance(item.distanceKm)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.mosqueAddress, { color: colors.textMuted }]} numberOfLines={2}>
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
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={[styles.stateText, { color: colors.textMuted }]}>
                Searching for nearby mosques...
              </Text>
            </View>
          ) : error ? (
            <Card style={styles.errorCard} padded>
              <Ionicons name="alert-circle-outline" size={32} color={colors.accent} />
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                Unable to load mosques
              </Text>
              <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={() => fetchMosques()}
              >
                <Text style={[styles.retryText, { color: colors.bgBase }]}>Retry Search</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <Card style={styles.emptyCard} padded>
              <Ionicons name="compass-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Mosques Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No places of worship found within {radiusKm} km. Try expanding the search radius
                above or checking your location settings.
              </Text>
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
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerWrap: {
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  controlCard: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  locationValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginTop: 2,
  },
  controlDivider: {
    marginVertical: 12,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radiusLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  radiusPills: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  radiusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  resultsBanner: {
    marginVertical: 6,
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
