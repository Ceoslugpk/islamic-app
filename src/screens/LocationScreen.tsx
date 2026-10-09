import React, { useState } from 'react';
import {
  I18nManager,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings, LocationMode } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import { latitudeInvalid, longitudeInvalid, locationSaved } from '../lib/strings';
import { isRTL, t } from '../lib/i18n';

export default function LocationScreen({
  onBack,
  onOpenCities,
}: {
  onBack?: () => void;
  onOpenCities?: () => void;
}) {
  const { colors } = useTheme();
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
  const activeLoc = isAuto
    ? (gpsLocation || settings.autoLocation)
    : settings.manualLocation;

  const activeLabel = isAuto
    ? activeLoc?.label || (locStatus === 'granted' ? 'Current GPS Location' : `Using manual location (${settings.manualLocation.label || 'Makkah, Saudi Arabia'})`)
    : settings.manualLocation.label || 'Manual Coordinates';

  const activeLat = isAuto ? (activeLoc?.latitude ?? settings.manualLocation.latitude) : settings.manualLocation.latitude;
  const activeLng = isAuto ? (activeLoc?.longitude ?? settings.manualLocation.longitude) : settings.manualLocation.longitude;

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ backgroundColor: colors.bgBase }}
        contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentWrap}>
          <ScreenHeader
            eyebrow="Preferences"
            title="Location"
            subtitle="Use GPS automatically or enter a city or coordinates"
            onBack={onBack}
            backLabel="Tools"
          />

        {/* Location Mode Selector */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{t('Location detection')}</Text>
        <View style={[styles.group, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => handleModeChange(isAuto ? 'manual' : 'auto')}
            accessibilityRole="switch"
            accessibilityState={{ checked: isAuto }}
          >
            <View style={styles.rowFlex}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('Auto-detect (GPS)')}</Text>
              <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                {isAuto
                  ? t('Prayer times follow your device location')
                  : t('Off — using your chosen city')}
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                { borderColor: colors.accent },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: colors.accent,
                    alignSelf: isAuto ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Active Location Card */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{t('Active location')}</Text>
        <Card style={styles.activeCard} padded>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.modeBadge,
                {
                  backgroundColor: isAuto ? colors.accentDim : colors.borderSubtle,
                  borderColor: isAuto ? colors.accent : colors.borderStrong,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBadgeText,
                  { color: isAuto ? colors.accent : colors.textSecondary },
                ]}
              >
                {isAuto ? t('GPS Auto') : t('Manual')}
              </Text>
            </View>
            {isAuto && locStatus === 'denied' && (
              <Text style={[styles.statusWarn, { color: colors.accent }]}>{t('Permission denied')}</Text>
            )}
            {isAuto && locStatus === 'unavailable' && (
              <Text style={[styles.statusWarn, { color: colors.accent }]}>{t('GPS unavailable')}</Text>
            )}
          </View>

          <Text style={[styles.activeCity, { color: colors.textPrimary }]}>
            {activeLabel}
          </Text>

          <Text style={[styles.activeCoords, { color: colors.textMuted }]}>
            {activeLat.toFixed(4)}°, {activeLng.toFixed(4)}°
          </Text>
        </Card>

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
          <TouchableOpacity
            style={[
              styles.cityShortcut,
              { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
            ]}
            onPress={onOpenCities}
            accessibilityRole="button"
            accessibilityLabel={t('Pick from 68 world cities')}
          >
            <View style={styles.shortcutLeft}>
              <Ionicons name="business-outline" size={18} color={colors.accent} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {t('Pick from 68 world cities')}
              </Text>
            </View>
            <Text style={[styles.shortcutArrow, { color: colors.accent }]}>{isRTL() ? '‹' : '›'}</Text>
          </TouchableOpacity>
        )}

        {/* Manual Coordinates Override */}
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{t('Manual coordinates')}</Text>
        <View style={[styles.formCard, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('City / place name')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary, backgroundColor: colors.bgBase }]}
            value={labelInput}
            onChangeText={setLabelInput}
            placeholder={t('e.g. Cairo, Egypt')}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.coordsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Latitude (−90 to 90)')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary, backgroundColor: colors.bgBase }]}
                value={latInput}
                onChangeText={setLatInput}
                keyboardType="numeric"
                placeholder="25.2048"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Longitude (−180 to 180)')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary, backgroundColor: colors.bgBase }]}
                value={lngInput}
                onChangeText={setLngInput}
                keyboardType="numeric"
                placeholder="55.2708"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {errorMessage && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{t(errorMessage)}</Text>
          )}

          {saveMessage && (
            <Text style={[styles.successText, { color: colors.accent }]}>{t(saveMessage)}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            onPress={handleSaveManual}
            accessibilityRole="button"
            accessibilityLabel={t('Save coordinates')}
          >
            <Text style={[styles.saveBtnText, { color: colors.onAccent }]}>{t('Save location')}</Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 10, paddingBottom: 40 },
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
  },
  group: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  rowFlex: { flex: 1 },
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
    padding: 16,
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
    borderRadius: 4,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
  },
  statusWarn: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  activeCity: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    lineHeight: 30,
  },
  activeCoords: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  cityShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shortcutText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  shortcutArrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 14,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: 10,
  },
  successText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: 10,
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
