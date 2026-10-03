import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { CITIES, City } from '../lib/cities';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';

export default function CitiesScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { settings, setManualLocation, setLocationMode } = useSettings();
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
        c.country.toLowerCase().includes(q)
    );
  }, [query]);

  function handleSelectCity(city: City) {
    const label = `${city.name}, ${city.country}`;
    setManualLocation({
      latitude: city.latitude,
      longitude: city.longitude,
      label,
    });
    setLocationMode('manual');
    setSuccessCity({ name: city.name, country: city.country });
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

  const renderItem = ({ item, index }: { item: City; index: number }) => {
    const isSelected = isCitySelected(item);

    return (
      <View>
        {index > 0 && <Hairline />}
        <TouchableOpacity
          style={[
            styles.row,
            isSelected && { backgroundColor: colors.accentDim },
          ]}
          onPress={() => handleSelectCity(item)}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.name}, ${item.country}`}
          accessibilityState={{ selected: isSelected }}
        >
          <View style={styles.rowLeft}>
            <View
              style={[
                styles.cityIconBox,
                {
                  borderColor: isSelected ? colors.accent : colors.borderSubtle,
                  backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                },
              ]}
            >
              <Ionicons
                name={isSelected ? 'checkmark' : 'business'}
                size={16}
                color={isSelected ? colors.onAccent : colors.accent}
              />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.cityName, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.countryName, { color: colors.textSecondary }]}>
                {item.country}
              </Text>
            </View>
          </View>

          <View style={styles.rowRight}>
            <Text style={[styles.coordsText, { color: colors.textMuted }]}>
              {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
            </Text>
            {isSelected && (
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
              >
                <Text style={[styles.activeBadgeText, { color: colors.accent }]}>
                  Active
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {showSuccess && successCity && (
        <Animated.View
          style={[
            styles.successBanner,
            {
              backgroundColor: colors.accentDim,
              borderColor: colors.accent,
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
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <Text style={[styles.successBannerText, { color: colors.accent }]}>
              Location set to {successCity.name}, {successCity.country}
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={[styles.headerArea, { paddingHorizontal: paddingH }]}>
        {onBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Tools"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Tools</Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          eyebrow="Directory"
          title="Cities"
          subtitle="Choose from 68 world cities to set your manual location"
        />

        {/* Search Bar */}
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, fontSize: isCompact ? 13 : 14 }]}
            placeholder="Search by city or country..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cities FlatList */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.name}-${item.country}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: paddingH }]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No cities found matching &ldquo;{query}&rdquo;
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
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
    borderRadius: 0,
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