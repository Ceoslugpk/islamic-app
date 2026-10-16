import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '../theme/tokens';
import { useSettings } from '../lib/settings';
import { CITIES, City, getLocalizedCityName, getLocalizedCountryName } from '../lib/cities';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { SearchField, PremiumCard } from '../components/ui';
import { t } from '../lib/i18n';

export default function CitiesScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { tokens, mode } = useThemeTokens();
  const { settings, setManualLocation, setLocationMode } = useSettings();
  const language = settings.language;
  const [query, setQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCity, setSuccessCity] = useState<{ name: string; country: string } | null>(null);
  const [successAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (showSuccess) {
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [showSuccess, successAnim]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        getLocalizedCityName(c.name, language).toLowerCase().includes(q) ||
        getLocalizedCountryName(c.country, language).toLowerCase().includes(q)
    );
  }, [query, language]);

  function handleSelectCity(city: City) {
    const localizedName = getLocalizedCityName(city.name, language);
    const localizedCountry = getLocalizedCountryName(city.country, language);
    const label = `${localizedName}, ${localizedCountry}`;
    setManualLocation({
      latitude: city.latitude,
      longitude: city.longitude,
      label,
    });
    setLocationMode('manual');
    setSuccessCity({ name: localizedName, country: localizedCountry });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSuccessCity(null);
      onBack?.();
    }, 1200);
  }

  const isCitySelected = (item: City) => {
    const ml = settings.manualLocation;
    if (!ml) return false;
    return (
      ml.label?.startsWith(item.name) ||
      (Math.abs(ml.latitude - item.latitude) < 0.01 &&
        Math.abs(ml.longitude - item.longitude) < 0.01)
    );
  };

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isWide = width >= 600;
  const paddingH = isCompact ? 16 : 20;

  const renderItem = ({ item }: { item: City; index: number }) => {
    const isSelected = isCitySelected(item);

    return (
      <View style={[styles.itemWrapper, isWide && styles.itemCell]}>
        <PremiumCard
          padded={false}
          onPress={() => handleSelectCity(item)}
          style={[
            styles.cityCard,
            isSelected && { borderColor: tokens.goldBorder },
          ]}
          contentStyle={[
            styles.cityCardContent,
            isSelected && { backgroundColor: tokens.ringFill },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.cityIconBox,
                  {
                    borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                    backgroundColor: isSelected ? undefined : tokens.ringFill,
                  },
                ]}
              >
                {isSelected && (
                  <LinearGradient
                    colors={tokens.goldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Ionicons
                  name={isSelected ? 'checkmark' : 'business'}
                  size={16}
                  color={isSelected ? tokens.onGold : tokens.muted}
                />
              </View>
              <View style={styles.textWrap}>
                <Text style={[styles.cityName, { color: tokens.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {getLocalizedCityName(item.name, language)}
                </Text>
                <Text style={[styles.countryName, { color: tokens.muted }]} numberOfLines={1} ellipsizeMode="tail">
                  {getLocalizedCountryName(item.country, language)}
                </Text>
              </View>
            </View>

            <View style={styles.rowRight}>
              <Text style={[styles.coordsText, { color: tokens.muted }]}>
                {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
              </Text>
              {isSelected && (
                <View
                  style={[
                    styles.activeBadge,
                    { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder },
                  ]}
                >
                  <Text style={[styles.activeBadgeText, { color: tokens.goldText }]}>
                    {t('Active')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </PremiumCard>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={styles.detailScreen}
        header={
          <SubHeader
            eyebrow={t('Directory')}
            title={t('Cities')}
            subtitle={t('Pick a city to set your location')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
      {showSuccess && successCity && (
        <Animated.View
          style={[
            styles.successBanner,
            {
              backgroundColor: tokens.ringFill,
              borderColor: tokens.cardBorder,
              opacity: successAnim,
              transform: [
                {
                  translateY: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.successBannerContent}>
            <Ionicons name="checkmark-circle" size={18} color={tokens.success} />
            <Text style={[styles.successBannerText, { color: tokens.text }]}>
              {t('Location set to')} {successCity.name}, {successCity.country}
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={[styles.searchArea, { paddingHorizontal: paddingH }]}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('Search city or country…')}
        />
      </View>

      {/* Cities FlatList */}
      <DetailScreen.FlatList
        key={isWide ? 'cities-grid' : 'cities-list'}
        numColumns={isWide ? 2 : 1}
        data={filtered}
        keyExtractor={(item) => `${item.name}-${item.country}`}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: paddingH },
          isWide && styles.listGrid,
        ]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: tokens.muted }]}>
              {t('No matches for')} &ldquo;{query}&rdquo;
            </Text>
          </View>
        }
      />
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchArea: {
    paddingTop: 8,
    paddingBottom: 6,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  listContent: {
    paddingTop: 4,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  listGrid: {
    gap: 10,
  },
  itemWrapper: {
    marginBottom: 8,
  },
  itemCell: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  cityCard: {
    width: '100%',
  },
  cityCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textWrap: {
    flex: 1,
  },
  cityName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  countryName: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  coordsText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  activeBadge: {
    borderWidth: 0.75,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },
  successBanner: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  successBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successBannerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});