import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../components/ui/AppText';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { useHaptics } from '../lib/haptics';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { Card } from '../components/Card';
import { LinearGradient } from 'expo-linear-gradient';
import { Hairline } from '../components/Hairline';
import { ArabicText } from '../components/ArabicText';
import { saveTasbihCount, loadTasbihCounts, saveTasbihDayTotal, loadTasbihDayTotal } from '../lib/db';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { getCurrentLanguage, t } from '../lib/i18n';
import { hScrollRTLStyle } from '../lib/rtl';

export interface DhikrItem {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
}

export const DHIKR_PRESETS: DhikrItem[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    meaning: 'Glory be to Allah',
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    meaning: 'Praise be to Allah',
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    meaning: 'Allah is the Greatest',
  },
  {
    id: 'lailahaillallah',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    transliteration: 'La ilaha illallah',
    meaning: 'There is no god but Allah',
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    meaning: 'I seek forgiveness from Allah',
  },
];

const DHIKR_LOCALIZED: Record<'ur' | 'ar' | 'hi' | 'ml' | 'si', Record<string, Pick<DhikrItem, 'transliteration' | 'meaning'>>> = {
  ur: {
    subhanallah: { transliteration: 'سبحان اللہ', meaning: 'اللہ پاک ہے' },
    alhamdulillah: { transliteration: 'الحمد للہ', meaning: 'تمام تعریفیں اللہ کے لیے ہیں' },
    allahuakbar: { transliteration: 'اللہ اکبر', meaning: 'اللہ سب سے بڑا ہے' },
    lailahaillallah: { transliteration: 'لا الٰہ الا اللہ', meaning: 'اللہ کے سوا کوئی معبود نہیں' },
    astaghfirullah: { transliteration: 'استغفر اللہ', meaning: 'میں اللہ سے بخشش مانگتا ہوں' },
  },
  ar: {
    subhanallah: { transliteration: 'سُبْحَانَ اللَّهِ', meaning: 'تنزيه الله عن كل نقص' },
    alhamdulillah: { transliteration: 'الْحَمْدُ لِلَّهِ', meaning: 'الثناء كله لله' },
    allahuakbar: { transliteration: 'اللَّهُ أَكْبَرُ', meaning: 'الله أعظم من كل شيء' },
    lailahaillallah: { transliteration: 'لَا إِلَٰهَ إِلَّا اللَّهُ', meaning: 'لا معبود بحق إلا الله' },
    astaghfirullah: { transliteration: 'أَسْتَغْفِرُ اللَّهَ', meaning: 'أطلب المغفرة من الله' },
  },
  hi: {
    subhanallah: { transliteration: 'सुब्हानअल्लाह', meaning: 'अल्लाह हर ऐब से पाक है' },
    alhamdulillah: { transliteration: 'अलहम्दुलिल्लाह', meaning: 'सब तारीफ़ें अल्लाह के लिए हैं' },
    allahuakbar: { transliteration: 'अल्लाहु अकबर', meaning: 'अल्लाह सबसे बड़ा है' },
    lailahaillallah: { transliteration: 'ला इलाहा इल्लल्लाह', meaning: 'अल्लाह के सिवा कोई माबूद नहीं' },
    astaghfirullah: { transliteration: 'अस्तग़फ़िरुल्लाह', meaning: 'मैं अल्लाह से माफ़ी मांगता हूँ' },
  },
  ml: {
    subhanallah: { transliteration: 'സുബ്ഹാനല്ലാഹ്', meaning: 'അല്ലാഹു സർവ്വ ന്യൂനതകളിൽ നിന്നും പരിശുദ്ധനാണ്' },
    alhamdulillah: { transliteration: 'അൽഹംദുലില്ലാഹ്', meaning: 'സർവ്വ സ്തുതിയും അല്ലാഹുവിനാണ്' },
    allahuakbar: { transliteration: 'അല്ലാഹു അക്ബർ', meaning: 'അല്ലാഹു ഏറ്റവും മഹാനാണ്' },
    lailahaillallah: { transliteration: 'ലാ ഇലാഹ ഇല്ലല്ലാഹ്', meaning: 'അല്ലാഹുവല്ലാതെ യഥാർത്ഥ ആരാധനക്കർഹനില്ല' },
    astaghfirullah: { transliteration: 'അസ്തഗ്ഫിറുല്ലാഹ്', meaning: 'ഞാൻ അല്ലാഹുവോട് പാപമോചനം തേടുന്നു' },
  },
  si: {
    subhanallah: { transliteration: 'සුබ්හානල්ලාහ්', meaning: 'අල්ලාහ් සියලු අඩුපාඩුවලින් පිවිතුරුය' },
    alhamdulillah: { transliteration: 'අල්හම්දුලිල්ලාහ්', meaning: 'සියලු ප්‍රශංසා අල්ලාහ්ටමය' },
    allahuakbar: { transliteration: 'අල්ලාහු අක්බර්', meaning: 'අල්ලාහ් අතිශ්‍රේෂ්ඨය' },
    lailahaillallah: { transliteration: 'ලා ඉලාහ ඉල්ලල්ලාහ්', meaning: 'නැමදුමට සුදුසු කිසිදු දෙවියෙක් නැත, අල්ලාහ් හැර' },
    astaghfirullah: { transliteration: 'අස්තග්ෆිරුල්ලාහ්', meaning: 'මම අල්ලාහ්ගෙන් සමාව අයදිමි' },
  },
};

export function getLocalizedDhikrTransliteration(item: DhikrItem): string {
  const language = getCurrentLanguage();
  return language === 'en' ? item.transliteration : DHIKR_LOCALIZED[language as 'ur' | 'ar' | 'hi' | 'ml' | 'si']?.[item.id]?.transliteration ?? item.transliteration;
}

export function getLocalizedDhikrMeaning(item: DhikrItem): string {
  const language = getCurrentLanguage();
  return language === 'en' ? item.meaning : DHIKR_LOCALIZED[language as 'ur' | 'ar' | 'hi' | 'ml' | 'si']?.[item.id]?.meaning ?? item.meaning;
}

const TARGET_OPTIONS = [33, 99, 100];

function TasbihScreen({ onBack, backLabel }: { onBack?: () => void; backLabel?: string }) {
  const { tokens, mode } = useThemeTokens();
  const { haptic } = useHaptics();
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem>(DHIKR_PRESETS[0]);
  const [target, setTarget] = useState<number>(33);
  const todayKey = new Date().toISOString().slice(0, 10);
  const [counts, setCounts] = useState<Record<string, number>>(() => loadTasbihCounts());
  const [todayTotal, setTodayTotal] = useState<number>(() => loadTasbihDayTotal(new Date().toISOString().slice(0, 10)));
  const { saveUndoState } = useUndoToast();

  const currentCount = counts[selectedDhikr.id] || 0;

  const handleTap = useCallback(() => {
    haptic('light');

    const nextCount = currentCount + 1;
    setCounts((prev) => ({
      ...prev,
      [selectedDhikr.id]: nextCount,
    }));
    saveTasbihCount(selectedDhikr.id, nextCount);

    // Increment daily total
    const nextDaily = todayTotal + 1;
    setTodayTotal(nextDaily);
    saveTasbihDayTotal(todayKey, 1);

    // Give an extra success impact if target reached
    if (nextCount > 0 && nextCount % target === 0) {
      haptic('success');
    }
  }, [currentCount, selectedDhikr.id, target, haptic, todayTotal, todayKey]);

  const handleReset = useCallback(() => {
    haptic('warning');
    const prevCount = counts[selectedDhikr.id] || 0;
    setCounts((prev) => ({
      ...prev,
      [selectedDhikr.id]: 0,
    }));
    saveTasbihCount(selectedDhikr.id, 0);
    saveUndoState({
      id: `tasbih:${selectedDhikr.id}`,
      action: t('Reset Count'),
      revert: () => {
        setCounts((prev) => ({
          ...prev,
          [selectedDhikr.id]: prevCount,
        }));
        saveTasbihCount(selectedDhikr.id, prevCount);
      },
    });
  }, [selectedDhikr.id, haptic, counts, saveUndoState]);

  const rounds = Math.floor(currentCount / target);
  const progressInRound = currentCount % target;
  const progressFraction = target > 0 ? progressInRound / target : 0;

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Dhikr & Remembrance')}
          title={t('Tasbih')}
          subtitle={t('Tap counter, round tracking, and offline remembrance')}
          onBack={onBack}
          backLabel={t('Library')}
          {...(backLabel === 'Tools' ? { backLabel: t('Tools') } : {})}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: paddingH,
          },
        ]}
      >
        <View style={styles.contentWrap}>
          {/* Dhikr Selector Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.dhikrList, hScrollRTLStyle()]}
          >
            {DHIKR_PRESETS.map((d) => {
              const isSelected = d.id === selectedDhikr.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.dhikrChip,
                    getPillShadow(mode),
                    {
                      backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                      borderColor: isSelected ? tokens.gold : tokens.cardBorder,
                    },
                  ]}
                  onPress={() => setSelectedDhikr(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <AppText
                    variant="caption"
                    tone={isSelected ? 'onGold' : undefined}
                    style={styles.dhikrChipText}
                  >
                    {getLocalizedDhikrTransliteration(d)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Target Selector & Round Meta */}
          <Card
            style={styles.metaBar}
            padded
          >
            <View style={styles.metaLeft}>
              <AppText variant="eyebrow" tone="faint" style={styles.metaLabel}>{t('TARGET')}</AppText>
              <View style={styles.targetRow}>
                {TARGET_OPTIONS.map((tOpt) => {
                  const active = target === tOpt;
                  return (
                    <TouchableOpacity
                      key={tOpt}
                      onPress={() => setTarget(tOpt)}
                      style={[
                        styles.targetBtn,
                        getPillShadow(mode),
                        {
                          backgroundColor: active ? tokens.gold : (mode === 'paper' ? tokens.cardTop : tokens.ringFill),
                          borderColor: active ? tokens.gold : tokens.cardBorder,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Target ${tOpt}`}
                    >
                      <AppText
                        variant="caption"
                        tone={active ? 'onGold' : undefined}
                        style={styles.targetBtnText}
                      >
                        {tOpt}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.metaRight}>
              <AppText variant="eyebrow" tone="faint" style={styles.metaLabel}>{t('ROUNDS')}</AppText>
              <AppText variant="numeral" highlight style={styles.metaValue}>
                {rounds} <AppText variant="caption" tone="faint" style={{ fontSize: 13 }}>({progressInRound}/{target})</AppText>
              </AppText>
            </View>
          </Card>

          {/* Today Summary */}
          <Card
            style={styles.summaryCard}
            padded
          >
            <AppText variant="eyebrow" tone="faint" style={styles.summaryLabel}>{t('Today')}</AppText>
            <AppText variant="numeral" highlight style={styles.summaryValue}>{todayTotal}</AppText>
            <AppText variant="caption" tone="faint" style={styles.summaryUnit}>{t('counts')}</AppText>
          </Card>

          {/* Current Dhikr Phrase Card */}
          <Card
            style={styles.phraseCard}
            padded
          >
            <ArabicText size={32} align="center" style={styles.arabic}>
              {selectedDhikr.arabic}
            </ArabicText>
            <AppText variant="title" style={styles.translit}>
              {getLocalizedDhikrTransliteration(selectedDhikr)}
            </AppText>
            <AppText variant="body" tone="faint" style={styles.meaning}>
              &ldquo;{getLocalizedDhikrMeaning(selectedDhikr)}&rdquo;
            </AppText>
          </Card>

          {/* Big Circular Tap Counter Zone */}
          <View style={styles.counterWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTap}
              style={[
                styles.counterCircle,
                getCardShadow(mode),
                {
                  borderColor: tokens.gold,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Dhikr counter: ${currentCount}. Tap to increment.`}
            >
              <LinearGradient
                colors={mode === 'ink' ? tokens.heroGradient : tokens.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.counterCircleGradient}
              >
                <AppText
                  variant="numeral"
                  style={[styles.counterNumber, { color: mode === 'ink' ? tokens.text : tokens.onGold }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {currentCount}
                </AppText>
                <AppText
                  variant="eyebrow"
                  style={[styles.tapLabel, { color: mode === 'ink' ? tokens.gold : tokens.onGold }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t('TAP TO COUNT')}
                </AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressWrap}>
            <View style={styles.progressMeta}>
              <AppText variant="caption" style={styles.progressText}>
                {progressInRound} / {target}
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.progressPercent}>
                {Math.round(progressFraction * 100)}%
              </AppText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: tokens.ringBorder }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: tokens.gold,
                    width: `${Math.round(progressFraction * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Bottom Action Controls */}
          <View style={styles.bottomRow}>
            <TouchableOpacity
              onPress={handleReset}
              style={[
                styles.resetBtn,
                getPillShadow(mode),
                {
                  borderColor: tokens.cardBorder,
                  backgroundColor: tokens.cardTop,
                },
              ]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('Reset count to zero')}
            >
              <Ionicons name="refresh-outline" size={16} color={tokens.muted} style={{ marginRight: 6 }} />
              <AppText variant="caption" tone="faint" style={styles.resetText}>
                {t('Reset Count')}
              </AppText>
            </TouchableOpacity>
          </View>

          <Hairline style={{ marginTop: 24, marginBottom: 16 }} />

          <AppText variant="caption" tone="faint" style={styles.footnote}>
            {t('Tap anywhere on the large dial to count. Your count for each phrase is automatically saved offline.')}
          </AppText>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

export default withUndoToast(TasbihScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  dhikrList: {
    paddingBottom: 4,
    gap: 6,
    marginBottom: 12,
  },
  dhikrChip: {
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dhikrChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  metaLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.8,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  targetBtn: {
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  metaRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  metaValue: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'Manrope_700Bold',
  },
  summaryUnit: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
  },
  phraseCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  arabic: {
    marginBottom: 6,
  },
  translit: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  meaning: {
    fontSize: 13.5,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  counterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  counterCircle: {
    width: 220,
    minHeight: 220,
    aspectRatio: 1,
    borderRadius: 110,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  counterCircleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterNumber: {
    fontSize: 58,
    fontFamily: 'Manrope_700Bold',
    paddingBottom: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  tapLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.5,
    marginTop: 4,
    paddingVertical: 2,
    textAlign: 'center',
  },
  progressWrap: {
    marginBottom: 20,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
  },
  progressPercent: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  resetBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
  },
  footnote: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
