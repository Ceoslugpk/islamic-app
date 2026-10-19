import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SUPPORTED_CURRENCIES,
  getCurrencyConfig,
  calculateZakat,
  formatCurrencyAmount,
} from '../lib/zakat';
import {
  ZakatCalculation,
  saveZakatCalculation,
  loadZakatCalculations,
  deleteZakatCalculation,
} from '../lib/db';

type ZakatSubTab = 'calculator' | 'history' | 'guide';

function ZakatScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxW = Math.min(width, 680);
  const { saveUndoState } = useUndoToast();

  const [activeTab, setActiveTab] = useState<ZakatSubTab>('calculator');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('AED');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [nisabStandard, setNisabStandard] = useState<'gold' | 'silver'>('gold');

  // Input fields (strings for smooth typing)
  const [cashInput, setCashInput] = useState('');
  const [goldGramsInput, setGoldGramsInput] = useState('');
  const [silverGramsInput, setSilverGramsInput] = useState('');
  const [investmentsInput, setInvestmentsInput] = useState('');
  const [otherAssetsInput, setOtherAssetsInput] = useState('');
  const [liabilitiesInput, setLiabilitiesInput] = useState('');

  // Custom rates overrides
  const currencyConfig = useMemo(
    () => getCurrencyConfig(selectedCurrencyCode),
    [selectedCurrencyCode]
  );
  const [goldPriceInput, setGoldPriceInput] = useState(String(currencyConfig.goldPricePerGram));
  const [silverPriceInput, setSilverPriceInput] = useState(String(currencyConfig.silverPricePerGram));

  // History state
  const [history, setHistory] = useState<ZakatCalculation[]>(() => loadZakatCalculations());

  // Parse input helper
  const parseNum = (val: string): number => {
    const clean = val.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  // Live evaluation
  const evaluation = useMemo(() => {
    return calculateZakat({
      currencyCode: selectedCurrencyCode,
      cash: parseNum(cashInput),
      goldGrams: parseNum(goldGramsInput),
      silverGrams: parseNum(silverGramsInput),
      investments: parseNum(investmentsInput),
      otherAssets: parseNum(otherAssetsInput),
      liabilities: parseNum(liabilitiesInput),
      goldPricePerGram: parseNum(goldPriceInput),
      silverPricePerGram: parseNum(silverPriceInput),
      nisabStandard,
    });
  }, [
    selectedCurrencyCode,
    cashInput,
    goldGramsInput,
    silverGramsInput,
    investmentsInput,
    otherAssetsInput,
    liabilitiesInput,
    goldPriceInput,
    silverPriceInput,
    nisabStandard,
  ]);

  // Reset inputs
  const handleReset = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { /* ignore */ }
    setCashInput('');
    setGoldGramsInput('');
    setSilverGramsInput('');
    setInvestmentsInput('');
    setOtherAssetsInput('');
    setLiabilitiesInput('');
  }, []);

  // Save calculation to history
  const [justSaved, setJustSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleSaveCalculation = useCallback(() => {
    if (evaluation.totalGrossAssets <= 0) {
      Alert.alert(t('No Assets Entered'), t('Please enter your assets to calculate and save Zakat.'));
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* ignore */ }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const newCalc: ZakatCalculation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: dateStr,
      currency: selectedCurrencyCode,
      totalWealth: evaluation.netZakatableWealth,
      zakatDue: evaluation.zakatDue,
      nisabStandard,
      breakdown: {
        cash: evaluation.cashValue,
        gold: evaluation.goldValue,
        silver: evaluation.silverValue,
        investments: evaluation.investmentsValue,
        other: evaluation.otherAssetsValue,
        liabilities: evaluation.totalLiabilities,
      },
      createdAt: Date.now(),
    };

    saveZakatCalculation(newCalc);
    setHistory(loadZakatCalculations());
    setJustSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setJustSaved(false), 1800);
  }, [evaluation, selectedCurrencyCode, nisabStandard, t]);

  // Delete history item
  const [justDeleted, setJustDeleted] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleDeleteHistory = useCallback((id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch { /* ignore */ }
    const target = history.find((h) => h.id === id);
    deleteZakatCalculation(id);
    setHistory(loadZakatCalculations());
    setJustDeleted(id);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => {
      setJustDeleted(null);
    }, 1200);
    if (target) {
      saveUndoState({
        id,
        action: t('Record deleted'),
        revert: () => {
          saveZakatCalculation(target);
          setHistory(loadZakatCalculations());
        },
      });
    }
  }, [history, saveUndoState, t]);

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={[styles.screenContainer, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Worship & Charity')}
          title={t('Zakat')}
          subtitle={t('Wealth assessment, nisab thresholds & calculation')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: paddingH }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { maxWidth: maxW }]}>
          {/* Tab Navigation */}
          <View style={[styles.tabBar, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
            {(['calculator', 'history', 'guide'] as ZakatSubTab[]).map((tab) => {
              const isSelected = activeTab === tab;
              const labels: Record<ZakatSubTab, string> = {
                calculator: t('Calculator'),
                history: t('History'),
                guide: t('Nisab Guide'),
              };
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabBtn,
                    isSelected && [
                      getPillShadow(mode),
                      { borderColor: tokens.goldBorder },
                    ],
                  ]}
                  onPress={() => setActiveTab(tab)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                >
                  {isSelected && <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />}
                  <AppText
                    variant="rowTitle"
                    tone={isSelected ? 'onGold' : 'faint'}
                    style={styles.tabBtnText}
                  >
                    {labels[tab]}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ─── TAB 1: CALCULATOR ──────────────────────────────────── */}
          {activeTab === 'calculator' && (
            <View style={styles.tabContent}>
              {/* Currency Selector Bar */}
              <Card style={[styles.currencyCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.currencyCardContent}>
                <View style={styles.currencyRow}>
                  <View style={{ flex: 1, minWidth: 0, marginEnd: 8 }}>
                    <AppText variant="eyebrow" tone="faint" style={styles.controlLabel}>
                      {t('Active Currency')}
                    </AppText>
                    <AppText variant="rowTitle" style={styles.currencyName}>
                      {currencyConfig.code} — {currencyConfig.name} ({currencyConfig.symbol})
                    </AppText>
                  </View>

                  <TouchableOpacity
                    style={[styles.currencyChangeBtn, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.goldBorder, flexShrink: 0 }]}
                    onPress={() => setShowCurrencyModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('Change currency')}
                  >
                    <Ionicons name="swap-horizontal" size={14} color={tokens.goldText} />
                    <AppText variant="link" style={styles.currencyChangeText}>
                      {t('Change')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </Card>

              {/* Nisab Standard Selector */}
              <Card style={[styles.nisabCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.nisabCardContent}>
                <View style={styles.nisabHeader}>
                  <AppText variant="eyebrow" tone="faint" style={[styles.controlLabel, { flex: 1, minWidth: 0 }]}>
                    {t('Nisab Standard')}
                  </AppText>
                  <AppText variant="numeral" highlight style={[styles.nisabThresholdValue, { flexShrink: 0 }]}>
                    {t('Threshold:')} {currencyConfig.symbol} {formatCurrencyAmount(evaluation.nisabThreshold, selectedCurrencyCode)}
                  </AppText>
                </View>

                <View style={styles.nisabToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.nisabOption,
                      getPillShadow(mode),
                      {
                        backgroundColor: nisabStandard === 'gold' ? 'transparent' : tokens.ringFill,
                        borderColor: nisabStandard === 'gold' ? tokens.goldBorder : tokens.cardBorder,
                      },
                    ]}
                    onPress={() => setNisabStandard('gold')}
                  >
                    {nisabStandard === 'gold' && <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
                    <AppText
                      variant="rowTitle"
                      tone={nisabStandard === 'gold' ? 'onGold' : undefined}
                      style={styles.nisabOptionTitle}
                    >
                      {t('Gold (85g)')}
                    </AppText>
                    <AppText
                      variant="caption"
                      tone={nisabStandard === 'gold' ? 'onGold' : 'faint'}
                      style={styles.nisabOptionSub}
                    >
                      {t('Recommended standard')}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.nisabOption,
                      getPillShadow(mode),
                      {
                        backgroundColor: nisabStandard === 'silver' ? 'transparent' : tokens.ringFill,
                        borderColor: nisabStandard === 'silver' ? tokens.goldBorder : tokens.cardBorder,
                      },
                    ]}
                    onPress={() => setNisabStandard('silver')}
                  >
                    {nisabStandard === 'silver' && <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
                    <AppText
                      variant="rowTitle"
                      tone={nisabStandard === 'silver' ? 'onGold' : undefined}
                      style={styles.nisabOptionTitle}
                    >
                      {t('Silver (595g)')}
                    </AppText>
                    <AppText
                      variant="caption"
                      tone={nisabStandard === 'silver' ? 'onGold' : 'faint'}
                      style={styles.nisabOptionSub}
                    >
                      {t('Lower threshold')}
                    </AppText>
                  </TouchableOpacity>
                </View>

                {/* Price per gram inputs */}
                <View style={styles.ratesEditRow}>
                  <View style={styles.rateField}>
                    <AppText variant="caption" tone="faint" style={styles.rateFieldLabel}>
                      {t('Gold / g')} ({currencyConfig.symbol})
                    </AppText>
                    <TextInput
                      style={[styles.rateInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                      value={goldPriceInput}
                      onChangeText={setGoldPriceInput}
                      keyboardType="numeric"
                      accessibilityLabel={`${t('Gold / g')} (${currencyConfig.symbol})`}
                    />
                  </View>
                  <View style={styles.rateField}>
                    <AppText variant="caption" tone="faint" style={styles.rateFieldLabel}>
                      {t('Silver / g')} ({currencyConfig.symbol})
                    </AppText>
                    <TextInput
                      style={[styles.rateInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                      value={silverPriceInput}
                      onChangeText={setSilverPriceInput}
                      keyboardType="numeric"
                      accessibilityLabel={`${t('Silver / g')} (${currencyConfig.symbol})`}
                    />
                  </View>
                </View>
              </Card>

              {/* Results Banner Card */}
              <Card
                style={[
                  styles.resultsCard,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: evaluation.isEligibleForZakat ? tokens.goldBorder : tokens.cardBorder,
                  },
                ]} contentStyle={styles.resultsCardContent}
              >
                <View style={styles.resultsTopRow}>
                  <View style={{ flex: 1, minWidth: 0, marginEnd: 8 }}>
                    <AppText variant="eyebrow" tone="faint" style={styles.resultsEyebrow}>
                      {t('Zakat Due (2.5%)')}
                    </AppText>
                    <AppText variant="numeral" highlight style={styles.resultsTotalDue}>
                      {currencyConfig.symbol} {formatCurrencyAmount(evaluation.zakatDue, selectedCurrencyCode)}
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getPillShadow(mode),
                      {
                        backgroundColor: evaluation.isEligibleForZakat ? tokens.ringFill : tokens.cardTop,
                        borderColor: evaluation.isEligibleForZakat ? tokens.goldBorder : tokens.cardBorder,
                        flexShrink: 0,
                      },
                    ]}
                  >
                    <Ionicons
                      name={evaluation.isEligibleForZakat ? 'checkmark-circle' : 'information-circle-outline'}
                      size={14}
                      color={evaluation.isEligibleForZakat ? tokens.goldText : tokens.muted}
                    />
                    <AppText
                      variant="caption"
                      highlight={evaluation.isEligibleForZakat}
                      tone={evaluation.isEligibleForZakat ? undefined : 'faint'}
                      style={styles.statusBadgeText}
                    >
                      {evaluation.isEligibleForZakat ? t('Nisab Met') : t('Below Nisab')}
                    </AppText>
                  </View>
                </View>

                <Hairline style={{ marginVertical: 10 }} />

                <View style={styles.summaryStatsRow}>
                  <View style={styles.summaryCol}>
                    <AppText variant="caption" tone="faint" style={styles.summaryLabel}>{t('Gross Assets')}</AppText>
                    <AppText variant="numeral" style={styles.summaryVal}>
                      {currencyConfig.symbol} {formatCurrencyAmount(evaluation.totalGrossAssets, selectedCurrencyCode)}
                    </AppText>
                  </View>
                  <View style={styles.summaryCol}>
                    <AppText variant="caption" tone="faint" style={styles.summaryLabel}>{t('Liabilities')}</AppText>
                    <AppText variant="numeral" tone="faint" style={styles.summaryVal}>
                      - {currencyConfig.symbol} {formatCurrencyAmount(evaluation.totalLiabilities, selectedCurrencyCode)}
                    </AppText>
                  </View>
                  <View style={styles.summaryCol}>
                    <AppText variant="caption" tone="faint" style={styles.summaryLabel}>{t('Net Wealth')}</AppText>
                    <AppText variant="numeral" style={styles.summaryVal}>
                      {currencyConfig.symbol} {formatCurrencyAmount(evaluation.netZakatableWealth, selectedCurrencyCode)}
                    </AppText>
                  </View>
                </View>

                {/* Multi-currency equivalent conversion strip */}
                {evaluation.zakatDue > 0 && evaluation.convertedDue.length > 0 && (
                  <View style={[styles.conversionBox, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder }]}>
                    <AppText variant="eyebrow" tone="faint" style={styles.conversionTitle}>
                      {t('Equivalent in Major Currencies:')}
                    </AppText>
                    <View style={styles.conversionRow}>
                      {evaluation.convertedDue.map((conv) => (
                        <View key={conv.code} style={styles.convChip}>
                          <AppText variant="caption" style={styles.convChipCode}>
                            {conv.code}:
                          </AppText>
                          <AppText variant="caption" highlight style={styles.convChipVal}>
                            {conv.symbol} {formatCurrencyAmount(conv.amount, conv.code)}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.resultsActions}>
                  <TouchableOpacity
                    style={[
                      styles.saveCalcBtn,
                      getPillShadow(mode),
                      {
                        backgroundColor: justSaved ? 'transparent' : tokens.cardTop,
                        borderColor: tokens.goldBorder,
                      },
                    ]}
                    onPress={handleSaveCalculation}
                    accessibilityRole="button"
                    accessibilityLabel={justSaved ? t('Calculation saved') : t('Save calculation')}
                  >
                    {justSaved && <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
                    <Ionicons
                      name={justSaved ? 'checkmark-circle' : 'bookmark-outline'}
                      size={15}
                      color={justSaved ? tokens.onGold : tokens.goldText}
                    />
                    <AppText
                      variant="rowTitle"
                      tone={justSaved ? 'onGold' : undefined}
                      highlight={!justSaved}
                      style={styles.saveCalcBtnText}
                    >
                      {justSaved ? t('Saved ✓') : t('Save Calculation')}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.resetBtn, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
                    onPress={handleReset}
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh-outline" size={15} color={tokens.muted} />
                    <AppText variant="rowTitle" tone="faint" style={styles.resetBtnText}>
                      {t('Clear')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </Card>

              {/* Asset Inputs Form */}
              <AppText variant="eyebrow" tone="faint" style={styles.sectionHeading}>
                {t('Assets & Liabilities')}
              </AppText>

              {/* 1. Cash */}
              <Card style={[styles.inputCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.inputCardContent}>
                <View style={styles.inputCardTop}>
                  <View style={styles.inputCardLabelWrap}>
                    <Ionicons name="cash-outline" size={17} color={tokens.goldText} />
                    <AppText variant="rowTitle" style={styles.inputCardTitle}>
                      {t('Cash & Bank Balances')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.inputCardSub}>
                    {t('In hand, savings, checking accounts')}
                  </AppText>
                </View>
                <TextInput
                  style={[styles.mainInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                  value={cashInput}
                  onChangeText={setCashInput}
                  keyboardType="numeric"
                  placeholder={`0 ${currencyConfig.symbol}`}
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel={t('Cash & Bank Balances')}
                />
              </Card>

              {/* 2. Gold */}
              <Card style={[styles.inputCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.inputCardContent}>
                <View style={styles.inputCardTop}>
                  <View style={styles.inputCardLabelWrap}>
                    <Ionicons name="sparkles-outline" size={17} color={tokens.goldText} />
                    <AppText variant="rowTitle" style={styles.inputCardTitle}>
                      {t('Gold (Grams)')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.inputCardSub}>
                    {evaluation.goldValue > 0
                      ? `${t('Value:')} ${currencyConfig.symbol} ${formatCurrencyAmount(evaluation.goldValue, selectedCurrencyCode)}`
                      : t('Jewelry (beyond customary use), coins, bars')}
                  </AppText>
                </View>
                <TextInput
                  style={[styles.mainInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                  value={goldGramsInput}
                  onChangeText={setGoldGramsInput}
                  keyboardType="numeric"
                  placeholder={t('0 grams')}
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel={t('Gold (Grams)')}
                />
              </Card>

              {/* 3. Silver */}
              <Card style={[styles.inputCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.inputCardContent}>
                <View style={styles.inputCardTop}>
                  <View style={styles.inputCardLabelWrap}>
                    <Ionicons name="disc-outline" size={17} color={tokens.goldText} />
                    <AppText variant="rowTitle" style={styles.inputCardTitle}>
                      {t('Silver (Grams)')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.inputCardSub}>
                    {evaluation.silverValue > 0
                      ? `${t('Value:')} ${currencyConfig.symbol} ${formatCurrencyAmount(evaluation.silverValue, selectedCurrencyCode)}`
                      : t('Coins, utensils, decorative bullion')}
                  </AppText>
                </View>
                <TextInput
                  style={[styles.mainInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                  value={silverGramsInput}
                  onChangeText={setSilverGramsInput}
                  keyboardType="numeric"
                  placeholder={t('0 grams')}
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel={t('Silver (Grams)')}
                />
              </Card>

              {/* 4. Investments */}
              <Card style={[styles.inputCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.inputCardContent}>
                <View style={styles.inputCardTop}>
                  <View style={styles.inputCardLabelWrap}>
                    <Ionicons name="trending-up-outline" size={17} color={tokens.goldText} />
                    <AppText variant="rowTitle" style={styles.inputCardTitle}>
                      {t('Investments, Stocks & Crypto')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.inputCardSub}>
                    {t('Shares, mutual funds, merchandise for sale')}
                  </AppText>
                </View>
                <TextInput
                  style={[styles.mainInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                  value={investmentsInput}
                  onChangeText={setInvestmentsInput}
                  keyboardType="numeric"
                  placeholder={`0 ${currencyConfig.symbol}`}
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel={t('Investments, Stocks & Crypto')}
                />
              </Card>

              {/* 5. Other Assets */}
              <Card style={[styles.inputCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.inputCardContent}>
                <View style={styles.inputCardTop}>
                  <View style={styles.inputCardLabelWrap}>
                    <Ionicons name="wallet-outline" size={17} color={tokens.goldText} />
                    <AppText variant="rowTitle" style={styles.inputCardTitle}>
                      {t('Other Assets & Receivables')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.inputCardSub}>
                    {t('Money owed to you expected soon, business cash')}
                  </AppText>
                </View>
                <TextInput
                  style={[styles.mainInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                  value={otherAssetsInput}
                  onChangeText={setOtherAssetsInput}
                  keyboardType="numeric"
                  placeholder={`0 ${currencyConfig.symbol}`}
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel={t('Other Assets & Receivables')}
                />
              </Card>

              {/* 6. Liabilities */}
              <Card style={[styles.inputCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.inputCardContent}>
                <View style={styles.inputCardTop}>
                  <View style={styles.inputCardLabelWrap}>
                    <Ionicons name="remove-circle-outline" size={17} color={tokens.danger} />
                    <AppText variant="rowTitle" style={styles.inputCardTitle}>
                      {t('Deductible Liabilities & Debts')}
                    </AppText>
                  </View>
                  <AppText variant="caption" tone="faint" style={styles.inputCardSub}>
                    {t('Immediate bills, unpaid rent, short-term debt due now')}
                  </AppText>
                </View>
                <TextInput
                  style={[styles.mainInput, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, color: tokens.text }]}
                  value={liabilitiesInput}
                  onChangeText={setLiabilitiesInput}
                  keyboardType="numeric"
                  placeholder={`0 ${currencyConfig.symbol}`}
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel={t('Deductible Liabilities & Debts')}
                />
              </Card>
            </View>
          )}

          {/* ─── TAB 2: HISTORY ─────────────────────────────────────── */}
          {activeTab === 'history' && (
            <View style={styles.tabContent}>
              <AppText variant="eyebrow" tone="faint" style={styles.sectionHeading}>
                {t('Past Saved Calculations')}
              </AppText>

              {history.length === 0 ? (
                <EmptyState
                  icon="wallet-outline"
                  title={t('No saved calculations yet')}
                  subtitle={t('Calculate your Zakat and tap "Save Calculation" to record it here.')}
                  actionLabel={t('Open calculator')}
                  onAction={() => setActiveTab('calculator')}
                />
              ) : (
                <>
                  {history.map((item) => {
                    const itemCfg = getCurrencyConfig(item.currency);
                    return (
                      <Card key={item.id} style={[styles.historyCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.historyCardContent}>
                        <View style={styles.historyHeader}>
                          <View>
                            <AppText variant="caption" tone="faint" style={styles.historyDate}>
                              {item.date} • {item.nisabStandard === 'gold' ? t('Gold Nisab') : t('Silver Nisab')}
                            </AppText>
                            <AppText variant="numeral" highlight style={styles.historyDueAmount}>
                              {t('Zakat:')} {itemCfg.symbol} {formatCurrencyAmount(item.zakatDue, item.currency)}
                            </AppText>
                          </View>
                          <TouchableOpacity
                            style={[styles.deleteHistoryBtn, justDeleted === item.id && { opacity: 0.45 }]}
                            onPress={() => handleDeleteHistory(item.id)}
                            accessibilityLabel={justDeleted === item.id ? t('Record deleted') : t('Delete record')}
                          >
                            <Ionicons
                              name={justDeleted === item.id ? 'checkmark' : 'trash-outline'}
                              size={16}
                              color={justDeleted === item.id ? tokens.danger : tokens.muted}
                            />
                          </TouchableOpacity>
                        </View>

                        <Hairline style={{ marginVertical: 8 }} />

                        <View style={[styles.historyBreakdownRow, { backgroundColor: tokens.ringFill, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }]}>
                          <AppText variant="body" style={styles.historyBreakdownText}>
                            {t('Total Net Wealth:')} {itemCfg.symbol} {formatCurrencyAmount(item.totalWealth, item.currency)}
                          </AppText>
                        </View>
                      </Card>
                    );
                  })}

                  <Card style={[styles.hawlGuideCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder, marginTop: 12 }]} contentStyle={styles.hawlGuideCardContent}>
                    <View style={styles.hawlHeader}>
                      <View style={[styles.hawlIconWrap, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, borderWidth: 1 }]}>
                        <Ionicons name="calendar-outline" size={16} color={tokens.goldText} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="rowTitle" style={styles.hawlTitle}>
                          {t('Annual Hawl Tracking')}
                        </AppText>
                        <AppText variant="caption" tone="faint" style={styles.hawlSub}>
                          {t('Zakat is due once per lunar year on wealth maintained above Nisab')}
                        </AppText>
                      </View>
                    </View>
                    <Hairline style={{ marginVertical: 10 }} />
                    <AppText variant="body" style={styles.hawlBody}>
                      {t('Set a fixed annual calculation date (such as Ramadan or Muharram). Comparing your saved calculations year-over-year ensures timely discharge and helps verify whether your Hawl has completed.')}
                    </AppText>
                  </Card>
                </>
              )}
            </View>
          )}

          {/* ─── TAB 3: NISAB & FIQH GUIDE ──────────────────────────── */}
          {activeTab === 'guide' && (
            <View style={styles.tabContent}>
              <Card style={[styles.guideCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]} contentStyle={styles.guideCardContent}>
                <AppText variant="sectionTitle" style={styles.guideHeading}>
                  {t('What is Nisab?')}
                </AppText>
                <AppText variant="body" style={styles.guideBody}>
                  {t('Nisab is the minimum threshold of net wealth a Muslim must possess for one full lunar year (Hawl) before Zakat becomes obligatory.')}
                </AppText>

                <Hairline style={{ marginVertical: 12 }} />

                <AppText variant="rowTitle" style={styles.guideSubheading}>
                  {t('Gold vs Silver Standard:')}
                </AppText>
                <AppText variant="body" style={styles.guideBody}>
                  • <AppText variant="body" style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('Gold Standard (85g):')}</AppText> {t('Widely recommended by modern contemporary scholars for cash, business wealth, and equities, as the price of gold has maintained historical purchasing power.')}
                </AppText>
                <AppText variant="body" style={[styles.guideBody, { marginTop: 8 }]}>
                  • <AppText variant="body" style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('Silver Standard (595g):')}</AppText> {t('Classical Hanafi standard, resulting in a significantly lower threshold that allows more Muslims to support the needy.')}
                </AppText>

                <Hairline style={{ marginVertical: 12 }} />

                <AppText variant="rowTitle" style={styles.guideSubheading}>
                  {t('Zakat Rate:')}
                </AppText>
                <AppText variant="body" style={styles.guideBody}>
                  {t('The universal rate is')} <AppText variant="body" highlight style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('2.5% (1/40th)')}</AppText> {t('of your eligible net wealth exceeding Nisab.')}
                </AppText>
              </Card>
            </View>
          )}

          {/* Currency Selector Modal */}
          <Modal
            visible={showCurrencyModal}
            animationType="fade"
            transparent
            onRequestClose={() => setShowCurrencyModal(false)}
            statusBarTranslucent
          >
            <View style={[styles.modalOverlay, { backgroundColor: tokens.overlay }]}>
              <TouchableWithoutFeedback onPress={() => setShowCurrencyModal(false)}>
                <View style={styles.modalBackdrop} />
              </TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalSheet,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                    paddingBottom: Math.max(insets.bottom, 16) + 16,
                  },
                ]}
              >
                <View style={[styles.dragPill, { backgroundColor: tokens.cardBorder }]} />
                <View style={styles.modalHeader}>
                  <AppText variant="sectionTitle" style={styles.modalTitle}>
                    {t('Select Currency')}
                  </AppText>
                  <TouchableOpacity
                    onPress={() => setShowCurrencyModal(false)}
                    style={styles.modalCloseBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('Close currency selector')}
                  >
                    <Ionicons name="close" size={20} color={tokens.muted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {SUPPORTED_CURRENCIES.map((c) => {
                    const isChosen = c.code === selectedCurrencyCode;
                    return (
                      <TouchableOpacity
                        key={c.code}
                        style={[
                          styles.currencyItem,
                          {
                            backgroundColor: isChosen
                              ? tokens.gold
                              : tokens.ringFill,
                            borderColor: isChosen ? tokens.goldBorder : tokens.cardBorder,
                          },
                        ]}
                        onPress={() => {
                          setSelectedCurrencyCode(c.code);
                          const cfg = getCurrencyConfig(c.code);
                          setGoldPriceInput(String(cfg.goldPricePerGram));
                          setSilverPriceInput(String(cfg.silverPricePerGram));
                          setShowCurrencyModal(false);
                        }}
                      >
                        <View>
                          <AppText
                            variant="rowTitle"
                            tone={isChosen ? 'onGold' : undefined}
                            style={styles.currencyItemCode}
                          >
                            {c.code} ({c.symbol})
                          </AppText>
                          <AppText
                            variant="caption"
                            tone={isChosen ? 'onGold' : 'faint'}
                            style={styles.currencyItemName}
                          >
                            {c.name}
                          </AppText>
                        </View>
                        {isChosen && <Ionicons name="checkmark" size={18} color={tokens.onGold} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

export default withUndoToast(ZakatScreen);

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    minWidth: 0,
  },
  scroll: {},
  container: {
    width: '100%',
    alignSelf: 'center',
  },
  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
  },
  tabBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  tabContent: {
    gap: 14,
  },

  /* Currency Card */
  currencyCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currencyName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginTop: 2,
  },
  currencyChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
  },
  currencyChangeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },

  /* Nisab Card */
  nisabCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  nisabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nisabThresholdValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  nisabToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nisabOption: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 44,
    minWidth: 0,
  },
  nisabOptionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  nisabOptionSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  ratesEditRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rateField: {
    flex: 1,
    minWidth: 0,
  },
  rateFieldLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 4,
  },
  rateInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },

  /* Results Card */
  resultsCard: {
    borderRadius: 20,
    borderWidth: 1.5,
  },
  resultsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultsEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultsTotalDue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  summaryVal: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginTop: 2,
  },
  conversionBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  conversionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  conversionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  convChip: {
    flexDirection: 'row',
    gap: 4,
  },
  convChipCode: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  convChipVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  saveCalcBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 0,
  },
  saveCalcBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  resetBtn: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  resetBtnText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },

  /* Inputs Form */
  sectionHeading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  inputCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  inputCardTop: {
    gap: 2,
  },
  inputCardLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputCardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  inputCardSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  mainInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },

  /* History */
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyDate: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  historyDueAmount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginTop: 2,
  },
  deleteHistoryBtn: {
    padding: 6,
    minHeight: 44,
  },
  historyBreakdownRow: {
    marginTop: 2,
  },
  historyBreakdownText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },

  /* Guide */
  guideCard: {
    borderRadius: 20,
    borderWidth: 1,
  },
  guideHeading: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    marginBottom: 4,
  },
  guideSubheading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  guideBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 34,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
  },
  modalCloseBtn: {
    padding: 4,
    minHeight: 44,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 44,
  },
  currencyItemCode: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  currencyItemName: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  hawlGuideCard: {
    borderRadius: 20,
    marginBottom: 16,
  },
  hawlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hawlIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hawlTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  hawlSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  hawlBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 18,
  },

  guideCardContent: {
    padding: 18,
  },

  hawlGuideCardContent: {
    padding: 16,
  },

  historyCardContent: {
    padding: 16,
  },

  inputCardContent: {
    padding: 16,
    gap: 10,
  },

  resultsCardContent: {
    padding: 18,
  },

  nisabCardContent: {
    padding: 16,
    gap: 12,
  },

  currencyCardContent: {
    padding: 16,
  },
});
