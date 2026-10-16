import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { SearchField, PremiumCard } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { TajweedText, TajweedLegend } from '../components/TajweedText';
import { fetchTajweedSurah, TajweedAyah } from '../lib/tajweed';
import { SURAHS_114 } from '../lib/surahs114';
import { getLocalizedSurahName, normalizeSearchText } from '../lib/surahNamesLocalized';
import { getForwardIcon } from '../lib/iconMap';

interface Props {
  onBack: () => void;
  backLabel?: string;
}

export function TajweedScreen({ onBack, backLabel }: Props) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;
  const [openSurah, setOpenSurah] = useState<number | null>(null);

  useEffect(() => {
    if (openSurah === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpenSurah(null);
      return true;
    });
    return () => sub.remove();
  }, [openSurah]);
  const [showLegend, setShowLegend] = useState(false);
  const [ayahs, setAyahs] = useState<TajweedAyah[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadSurah = useCallback(async (surah: number) => {
    setLoading(true);
    setError(null);
    setAyahs(null);
    try {
      const data = await fetchTajweedSurah(surah);
      setAyahs(data);
    } catch {
      setError(t('Could not load tajweed text. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Preserve the existing fetch-on-open lifecycle; this effect intentionally updates loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openSurah !== null) loadSurah(openSurah);
  }, [openSurah, loadSurah]);

  const rawQuery = query.trim();
  const normQuery = normalizeSearchText(rawQuery);
  const lowerQuery = rawQuery.toLowerCase();
  const filtered = SURAHS_114.filter((s) => {
    if (!normQuery) return true;
    const englishNameMatch = s.englishName.toLowerCase().includes(lowerQuery) ||
      normalizeSearchText(s.englishName).includes(normQuery);
    const urduName = getLocalizedSurahName(s.number, s.englishName);
    const urduMatch = normalizeSearchText(urduName).includes(normQuery) || (normQuery === 'یس' && s.number === 36);
    const arabicMatch = normalizeSearchText(s.name).includes(normQuery);
    const numberMatch = s.number.toString().includes(lowerQuery);
    return englishNameMatch || urduMatch || arabicMatch || numberMatch;
  });

  const openMeta = openSurah !== null ? SURAHS_114.find((s) => s.number === openSurah) : null;

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          title={openSurah === null ? t('Tajweed Colors') : (openMeta ? getLocalizedSurahName(openMeta.number, openMeta.englishName) : `Surah ${openSurah}`)}
          subtitle={
            openSurah === null
              ? t('Full Quran · color-coded recitation rules')
              : `${openMeta?.name || ''} · ${openMeta?.numberOfAyahs || ayahs?.length || 0} ayahs`
          }
          eyebrow={openSurah === null ? t('Learn') : `Surah ${openSurah}`}
          backLabel={openSurah === null ? (backLabel ? t(backLabel) : t('Library')) : t('Tajweed')}
          onBack={openSurah === null ? onBack : () => setOpenSurah(null)}
          borderBottom
          showFade
          rightAction={
            openSurah !== null ? (
              <TouchableOpacity
                onPress={() => setShowLegend((v) => !v)}
                style={[
                  styles.backChip,
                  getPillShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={showLegend ? t('Hide color legend') : t('Show color legend')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="color-palette-outline" size={15} color={tokens.goldText} />
                <Text style={[styles.backChipText, { color: tokens.goldText }]}>{t('Legend')}</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      }
    >
      <View style={styles.contentWrap}>
        {openSurah === null ? (
          <DetailScreen.ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: paddingH,
              },
            ]}
            style={{ flex: 1 }}
          >
            <PremiumCard
              padded={false}
              style={styles.infoCard}
              contentStyle={styles.infoCardContent}
            >
              <Ionicons name="information-circle-outline" size={18} color={tokens.goldText} />
              <Text style={[styles.infoText, { color: tokens.muted }]}>
                {t('Every surah of the Quran in standard tajweed colors — ghunnah, idgham, qalqalah, ikhfa, madd and silent letters. Data from islamic.app (uthmani tajweed edition).')}
              </Text>
            </PremiumCard>

            <View style={styles.searchBoxWrap}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={t('Search surah...')}
              />
            </View>

            <View style={styles.surahListWrap}>
              {filtered.map((s) => (
                <PremiumCard
                  key={s.number}
                  padded={false}
                  onPress={() => setOpenSurah(s.number)}
                  style={[
                    styles.rowCard,
                    {
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                  contentStyle={styles.rowContent}
                  accessibilityRole="button"
                  accessibilityLabel={`Read ${s.englishName} with tajweed colors`}
                >
                  <View
                    style={[
                      styles.numBox,
                      getPillShadow(mode),
                      {
                        backgroundColor: tokens.ringFill,
                        borderColor: tokens.ringBorder,
                        borderWidth: cardTokens.borderWidth,
                      },
                    ]}
                  >
                    <Text style={[styles.numText, { color: tokens.goldText }]}>{s.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: tokens.text }]}>{getLocalizedSurahName(s.number, s.englishName)}</Text>
                    <Text style={[styles.rowCount, { color: tokens.muted }]}>{s.numberOfAyahs} ayahs</Text>
                  </View>
                  <ArabicText size={18} style={{ color: tokens.arabicName }}>{s.name}</ArabicText>
                  <Ionicons name={getForwardIcon()} size={16} color={tokens.muted} style={{ marginStart: 8 }} />
                </PremiumCard>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setShowLegend((v) => !v)}
              style={[
                styles.legendToggle,
                getPillShadow(mode),
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                },
              ]}
              accessibilityRole="button"
            >
              <Ionicons name={showLegend ? 'chevron-up' : 'chevron-down'} size={15} color={tokens.goldText} />
              <Text style={[styles.legendToggleText, { color: tokens.goldText }]}>
                {showLegend ? t('Hide color legend') : t('Show color legend')}
              </Text>
            </TouchableOpacity>

            {showLegend && (
              <View
                style={[
                  styles.legendCard,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <TajweedLegend />
              </View>
            )}
          </DetailScreen.ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {showLegend && (
              <View style={[styles.content, { paddingBottom: 8, paddingHorizontal: paddingH }]}>
                <View
                  style={[
                    styles.legendCard,
                    getCardShadow(mode),
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <TajweedLegend compact />
                </View>
              </View>
            )}

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={tokens.gold} size="large" />
                <Text style={[styles.hint, { color: tokens.muted }]}>{t('Loading tajweed text...')}</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Ionicons name="cloud-offline-outline" size={40} color={tokens.muted} />
                <Text style={[styles.errorText, { color: tokens.muted }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, getPillShadow(mode), { backgroundColor: tokens.gold, borderColor: tokens.goldBorder }]}
                  onPress={() => loadSurah(openSurah)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.retryText, { color: tokens.onGold }]}>{t('Retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <DetailScreen.FlatList
                data={ayahs || []}
                keyExtractor={(a) => a.verseKey}
                contentContainerStyle={[
                  styles.ayahListContainer,
                  {
                    paddingHorizontal: paddingH,
                  },
                ]}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={7}
                removeClippedSubviews={Platform.OS !== 'web'}
                ListHeaderComponent={
                  <Text style={[styles.listHint, { color: tokens.muted }]}>
                    {ayahs?.length || 0} {t('ayahs · tajweed colors')}
                  </Text>
                }
                renderItem={({ item }: { item: TajweedAyah }) => (
                  <View
                    style={[
                      styles.ayahBlockCard,
                      getCardShadow(mode),
                      {
                        backgroundColor: tokens.cardTop,
                        borderColor: tokens.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.ayahNum, { color: tokens.goldText }]}>{item.verseKey}</Text>
                    <TajweedText text={item.html} size={isCompact ? 22 : 25} />
                  </View>
                )}
              />
            )}
          </View>
        )}
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  headerWrap: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  content: { paddingTop: 6 },
  infoCard: { marginBottom: 12 },
  infoCardContent: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  infoText: { fontFamily: 'Manrope_400Regular', fontSize: 12.5, lineHeight: 18, flex: 1 },
  searchBoxWrap: {
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    borderWidth: cardTokens.borderWidth,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 13, paddingVertical: 0 },
  surahListWrap: {
    gap: 10,
  },
  rowCard: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
    padding: 14,
  },
  numBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  rowName: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 18 },
  rowCount: { fontFamily: 'Manrope_400Regular', fontSize: 11, marginTop: 1 },
  legendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: cardTokens.borderWidth,
    marginTop: 14,
  },
  legendToggleText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  legendCard: { borderRadius: 16, borderWidth: cardTokens.borderWidth, padding: 16, marginTop: 12 },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: cardTokens.borderWidth,
    minHeight: 32,
  },
  backChipText: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  hint: { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 22, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  ayahListContainer: { paddingTop: 8, gap: 12 },
  listHint: { fontFamily: 'Manrope_500Medium', fontSize: 11, marginBottom: 8 },
  ayahBlockCard: {
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
    padding: 18,
  },
  ayahNum: { fontFamily: 'Manrope_500Medium', fontSize: 11, letterSpacing: 0.4, marginBottom: 6 },
});
