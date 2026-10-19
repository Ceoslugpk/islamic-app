import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '../theme/tokens';
import { useSettings, LocationMode } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, PrimaryButton, InputField, ScreenTabs, Chip, OutlineButton } from '../components/ui';
import { AppText } from '../components/ui/AppText';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import { latitudeInvalid, longitudeInvalid, locationSaved } from '../lib/strings';
import { getLocalizedCityName, getLocalizedCountryName } from '../lib/cities';
import { t } from '../lib/i18n';

export default function LocationScreen({
  onBack,
  onOpenCities,
  onOpenLocationSetup,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  onOpenCities?: () => void;
  onOpenLocationSetup?: () => void;
  backLabel?: string;
}) {
  const { tokens } = useThemeTokens();
  const { settings, setLocationMode, setManualLocation, setAutoLocation } = useSettings();
  const {
    location: gpsLocation,
    status: locStatus,
    loading: locLoading,
    request: requestGps,
  } = useLocation(false);

  const [latInput, setLatInput] = useState(String(settings.manualLocation.latitude));
  const [lngInput, setLngInput] = useState(String(settings.manualLocation.longitude));
  const [labelInput, setLabelInput] = useState(settings.manualLocation.label || '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAuto = settings.locationMode === 'auto';

  async function handleModeChange(mode: LocationMode) {
    setLocationMode(mode);
    if (mode === 'auto') {
      if (locStatus !== 'granted') {
        const loc = await requestGps(true);
        if (loc) {
          setAutoLocation(loc, Date.now());
        }
      } else if (!settings.autoLocation) {
        const loc = await requestGps(false);
        if (loc) {
          setAutoLocation(loc, Date.now());
        }
      }
    }
  }

  function handleSaveManual() {
    setErrorMessage(null);
    setSaveMessage(null);

    const lat = parseFloat(latInput.trim());
    const lng = parseFloat(lngInput.trim());

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMessage(latitudeInvalid);
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMessage(longitudeInvalid);
      return;
    }

    const label = labelInput.trim() || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    setManualLocation({
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      label,
    });
    setLocationMode('manual');
    setSaveMessage(locationSaved);
    setTimeout(() => setSaveMessage(null), 3500);
  }

  // Active display info
  const hasUsableGps = isAuto && locStatus === 'granted' && Boolean(gpsLocation || settings.autoLocation);
  const activeLoc = hasUsableGps
    ? (gpsLocation || settings.autoLocation)
    : settings.manualLocation;

  const fallbackLabel = settings.manualLocation.label || 'Makkah, Saudi Arabia';
  const activeLabel = isAuto
    ? (hasUsableGps
        ? (activeLoc?.label || t('Using GPS location'))
        : `${t('Using manual location')} (${fallbackLabel})`)
    : (settings.manualLocation.label || t('Manual coordinates'));

  const activeLat = hasUsableGps ? (activeLoc?.latitude ?? settings.manualLocation.latitude) : settings.manualLocation.latitude;
  const activeLng = hasUsableGps ? (activeLoc?.longitude ?? settings.manualLocation.longitude) : settings.manualLocation.longitude;

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

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
        keyboardAvoiding
        header={
          <SubHeader
            eyebrow={t('Preferences')}
            title={t('Location')}
            subtitle={t('Use GPS automatically or enter a city or coordinates')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
        <DetailScreen.ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrap}>
            {/* Mode selection tabs */}
            <ScreenTabs
              tabs={[
                { id: 'auto', label: t('Auto-detect (GPS)') },
                { id: 'manual', label: t('Manual Coordinates') },
              ]}
              activeTab={isAuto ? 'auto' : 'manual'}
              onChange={(id) => handleModeChange(id as LocationMode)}
              style={{ marginBottom: 12 }}
            />

            {/* Current Active Location Card */}
            <PremiumCard style={[styles.activeCard, { marginBottom: 12 }]} padded>
              <View style={styles.badgeRow}>
                <Chip
                  label={isAuto ? t('GPS Auto') : t('Manual')}
                  selected={isAuto}
                  style={{ minHeight: 26, paddingHorizontal: 8 }}
                />
                {isAuto && locStatus === 'denied' && (
                  <AppText variant="caption" tone="danger" style={styles.statusWarn}>{t('Permission denied')}</AppText>
                )}
                {isAuto && locStatus === 'unavailable' && (
                  <AppText variant="caption" tone="danger" style={styles.statusWarn}>{t('GPS unavailable')}</AppText>
                )}
              </View>

              <AppText variant="headerTitle" style={styles.activeCity}>
                {activeLabel}
              </AppText>

              <AppText variant="caption" tone="faint" style={styles.activeCoords}>
                {activeLat.toFixed(4)}°, {activeLng.toFixed(4)}°
              </AppText>
            </PremiumCard>

            {/* Quick city selection chips */}
            <View style={{ marginBottom: 12 }}>
              <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>{t('Quick City Select')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { name: 'Makkah', lat: 21.4225, lng: 39.8262, country: 'Saudi Arabia' },
                  { name: 'Madinah', lat: 24.4672, lng: 39.6111, country: 'Saudi Arabia' },
                  { name: 'Jerusalem', lat: 31.7767, lng: 35.2345, country: 'Palestine' },
                  { name: 'Cairo', lat: 30.0444, lng: 31.2357, country: 'Egypt' },
                  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, country: 'Turkey' },
                ].map((qc) => {
                  const localizedCity = getLocalizedCityName(qc.name, settings.language);
                  const localizedCountry = getLocalizedCountryName(qc.country, settings.language);
                  const isQcSelected = !isAuto && Boolean(
                    settings.manualLocation?.label?.startsWith(localizedCity) ||
                    settings.manualLocation?.label?.startsWith(qc.name)
                  );
                  return (
                    <Chip
                      key={qc.name}
                      label={localizedCity}
                      selected={isQcSelected}
                      onPress={() => {
                        const fullLabel = `${localizedCity}, ${localizedCountry}`;
                        setManualLocation({
                          latitude: qc.lat,
                          longitude: qc.lng,
                          label: fullLabel,
                        });
                        setLocationMode('manual');
                        setLatInput(String(qc.lat));
                        setLngInput(String(qc.lng));
                        setLabelInput(fullLabel);
                      }}
                    />
                  );
                })}
              </View>
            </View>

            {/* Location Mode Selector */}
            <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>{t('Location detection')}</AppText>
            <PremiumCard padded={false} style={styles.group}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleModeChange(isAuto ? 'manual' : 'auto')}
                accessibilityRole="switch"
                accessibilityState={{ checked: isAuto }}
              >
                <View style={styles.rowFlex}>
                  <AppText variant="rowTitle" style={styles.rowTitle}>{t('Auto-detect (GPS)')}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.rowDesc}>
                    {isAuto
                      ? t('Prayer times follow your device location')
                      : t('Off — using your chosen city')}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.toggle,
                    { borderColor: isAuto ? tokens.gold : tokens.cardBorder },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      {
                        backgroundColor: isAuto ? tokens.gold : tokens.muted,
                        alignSelf: isAuto ? 'flex-end' : 'flex-start',
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </PremiumCard>

            {/* Location Permission Note when auto mode is selected and permission denied/unavailable */}
            {isAuto && (locStatus === 'denied' || locStatus === 'unavailable') && (
              <LocationPermissionNote
                status={locStatus}
                onEnable={async () => {
                  const loc = await requestGps(true);
                  if (loc) {
                    setAutoLocation(loc, Date.now());
                  }
                }}
                onChooseCity={onOpenCities}
                loading={locLoading}
                fallbackCity={settings.manualLocation.label || 'Makkah, Saudi Arabia'}
              />
            )}

            {/* City picker shortcut */}
            {onOpenCities && (
              <OutlineButton
                title={t('Pick from 68 world cities')}
                icon="business-outline"
                onPress={onOpenCities}
                accessibilityLabel={t('Pick from 68 world cities')}
                style={styles.cityShortcut}
              />
            )}

            {/* Reopen location setup dialog */}
            {onOpenLocationSetup && (
              <OutlineButton
                title={t('Location for prayer times')}
                icon="navigate-circle-outline"
                onPress={onOpenLocationSetup}
                accessibilityLabel={t('Location for prayer times')}
                style={styles.cityShortcut}
              />
            )}

            {/* Manual Coordinates Override */}
            <AppText variant="eyebrow" tone="faint" style={styles.groupLabel}>{t('Manual coordinates')}</AppText>
            <PremiumCard style={styles.formCard} padded>
              <InputField
                label={t('City / place name')}
                value={labelInput}
                onChangeText={setLabelInput}
                placeholder={t('e.g. Cairo, Egypt')}
              />

              <View style={[styles.coordsRow, isCompact && styles.coordsRowCompact]}>
                <View style={[styles.coordsField, isCompact && styles.coordsFieldCompact]}>
                  <InputField
                    label={t('Latitude (−90 to 90)')}
                    value={latInput}
                    onChangeText={setLatInput}
                    keyboardType="numeric"
                    placeholder="25.2048"
                  />
                </View>
                <View style={[styles.coordsField, isCompact && styles.coordsFieldCompact]}>
                  <InputField
                    label={t('Longitude (−180 to 180)')}
                    value={lngInput}
                    onChangeText={setLngInput}
                    keyboardType="numeric"
                    placeholder="55.2708"
                  />
                </View>
              </View>

              {errorMessage && (
                <AppText variant="body" tone="danger" style={styles.errorText}>{t(errorMessage)}</AppText>
              )}

              {saveMessage && (
                <AppText variant="body" style={[styles.successText, { color: tokens.success }]}>{t(saveMessage)}</AppText>
              )}

              <PrimaryButton
                title={t('Save location')}
                onPress={handleSaveManual}
                accessibilityLabel={t('Save location')}
                testID="btn-primary"
                style={{ marginTop: 8 }}
              />
            </PremiumCard>
          </View>
        </DetailScreen.ScrollView>
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
  content: {},
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 2,
  },
  group: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowFlex: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  rowDesc: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: { width: 22, height: 22, borderRadius: 11 },
  activeCard: {
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 22,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    paddingVertical: 2,
  },
  statusWarn: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    paddingVertical: 2,
  },
  activeCity: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
  },
  activeCoords: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 4,
    paddingVertical: 2,
  },
  cityShortcut: {
    marginTop: 14,
  },
  shortcutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  shortcutText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    flexShrink: 1,
  },
  shortcutArrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
  },
  formCard: {
    marginTop: 4,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordsRowCompact: {
    flexDirection: 'column',
    gap: 4,
  },
  coordsField: {
    flex: 1,
    minWidth: 0,
  },
  coordsFieldCompact: {
    flex: 0,
    width: '100%',
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: 10,
    paddingVertical: 2,
  },
  successText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: 10,
    paddingVertical: 2,
  },
});
