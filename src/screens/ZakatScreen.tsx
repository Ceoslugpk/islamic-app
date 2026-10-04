import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import {
  SUPPORTED_CURRENCIES,
  CurrencyConfig,
  getCurrencyConfig,
  calculateZakat,
  formatCurrencyAmount,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
} from '../lib/zakat';
import {
  ZakatCalculation,
  saveZakatCalculation,
  loadZakatCalculations,
  deleteZakatCalculation,
} from '../lib/db';

type ZakatSubTab = 'calculator' | 'history' | 'guide';

export default function ZakatScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

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
  const [history, setHistory] = useState<ZakatCalculation[]>([]);

  // Update gold/silver prices when currency changes
  useEffect(() => {
    const cfg = getCurrencyConfig(selectedCurrencyCode);
    setGoldPriceInput(String(cfg.goldPricePerGram));
    setSilverPriceInput(String(cfg.silverPricePerGram));
  }, [selectedCurrencyCode]);

  // Load history on mount
  useEffect(() => {
    setHistory(loadZakatCalculations());
  }, []);

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
  const handleSaveCalculation = useCallback(() => {
    if (evaluation.totalGrossAssets <= 0) {
      Alert.alert('No Assets Entered', 'Please enter your assets to calculate and save Zakat.');
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
    Alert.alert('Saved', 'Zakat calculation has been saved to your history ledger.');
  }, [evaluation, selectedCurrencyCode, nisabStandard]);

  // Delete history item
  const handleDeleteHistory = useCallback((id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch { /* ignore */ }
    deleteZakatCalculation(id);
    setHistory(loadZakatCalculations());
  }, []);

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.scroll, { paddingHorizontal: paddingH }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, { maxWidth: maxW }]}>
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
          eyebrow="Worship & Charity"
          title="Zakat"
        />

        {/* Tab Navigation */}
        <View style={[styles.tabBar, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          {(['calculator', 'history', 'guide'] as ZakatSubTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            const labels: Record<ZakatSubTab, string> = {
              calculator: 'Calculator',
              history: 'History',
              guide: 'Nisab Guide',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: isSelected ? colors.accent : colors.textMuted },
                  ]}
                >
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── TAB 1: CALCULATOR ──────────────────────────────────── */}
        {activeTab === 'calculator' && (
          <View style={styles.tabContent}>
            {/* Currency Selector Bar */}
            <Card style={styles.currencyCard}>
              <View style={styles.currencyRow}>
                <View>
                  <Text style={[styles.controlLabel, { color: colors.textMuted }]}>
                    Active Currency
                  </Text>
                  <Text style={[styles.currencyName, { color: colors.textPrimary }]}>
                    {currencyConfig.code} — {currencyConfig.name} ({currencyConfig.symbol})
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.currencyChangeBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                  onPress={() => setShowCurrencyModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Change currency"
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
                  <Text style={[styles.currencyChangeText, { color: colors.accent }]}>
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Nisab Standard Selector */}
            <Card style={styles.nisabCard}>
              <View style={styles.nisabHeader}>
                <Text style={[styles.controlLabel, { color: colors.textMuted }]}>
                  Nisab Standard
                </Text>
                <Text style={[styles.nisabThresholdValue, { color: colors.accent }]}>
                  Threshold: {currencyConfig.symbol} {formatCurrencyAmount(evaluation.nisabThreshold, selectedCurrencyCode)}
                </Text>
              </View>

              <View style={styles.nisabToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.nisabOption,
                    {
                      backgroundColor: nisabStandard === 'gold' ? colors.accent : colors.bgBase,
                      borderColor: nisabStandard === 'gold' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setNisabStandard('gold')}
                >
                  <Text
                    style={[
                      styles.nisabOptionTitle,
                      { color: nisabStandard === 'gold' ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    Gold ({NISAB_GOLD_GRAMS}g)
                  </Text>
                  <Text
                    style={[
                      styles.nisabOptionSub,
                      { color: nisabStandard === 'gold' ? '#F5F5F5' : colors.textMuted },
                    ]}
                  >
                    Recommended standard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.nisabOption,
                    {
                      backgroundColor: nisabStandard === 'silver' ? colors.accent : colors.bgBase,
                      borderColor: nisabStandard === 'silver' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setNisabStandard('silver')}
                >
                  <Text
                    style={[
                      styles.nisabOptionTitle,
                      { color: nisabStandard === 'silver' ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    Silver ({NISAB_SILVER_GRAMS}g)
                  </Text>
                  <Text
                    style={[
                      styles.nisabOptionSub,
                      { color: nisabStandard === 'silver' ? '#F5F5F5' : colors.textMuted },
                    ]}
                  >
                    Lower threshold
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price per gram inputs */}
              <View style={styles.ratesEditRow}>
                <View style={styles.rateField}>
                  <Text style={[styles.rateFieldLabel, { color: colors.textMuted }]}>
                    Gold / g ({currencyConfig.symbol})
                  </Text>
                  <TextInput
                    style={[styles.rateInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                    value={goldPriceInput}
                    onChangeText={setGoldPriceInput}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.rateField}>
                  <Text style={[styles.rateFieldLabel, { color: colors.textMuted }]}>
                    Silver / g ({currencyConfig.symbol})
                  </Text>
                  <TextInput
                    style={[styles.rateInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                    value={silverPriceInput}
                    onChangeText={setSilverPriceInput}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Card>

            {/* Results Banner Card */}
            <Card
              style={{
                ...styles.resultsCard,
                borderColor: evaluation.isEligibleForZakat ? colors.accent : colors.borderSubtle,
              }}
            >
              <View style={styles.resultsTopRow}>
                <View>
                  <Text style={[styles.resultsEyebrow, { color: colors.textMuted }]}>
                    Zakat Due (2.5%)
                  </Text>
                  <Text style={[styles.resultsTotalDue, { color: colors.accent }]}>
                    {currencyConfig.symbol} {formatCurrencyAmount(evaluation.zakatDue, selectedCurrencyCode)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: evaluation.isEligibleForZakat ? colors.accentDim : colors.bgBase,
                      borderColor: evaluation.isEligibleForZakat ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Ionicons
                    name={evaluation.isEligibleForZakat ? 'checkmark-circle' : 'information-circle-outline'}
                    size={14}
                    color={evaluation.isEligibleForZakat ? colors.accent : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: evaluation.isEligibleForZakat ? colors.accent : colors.textMuted },
                    ]}
                  >
                    {evaluation.isEligibleForZakat ? 'Nisab Met' : 'Below Nisab'}
                  </Text>
                </View>
              </View>

              <Hairline style={{ marginVertical: 10 }} />

              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Gross Assets</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {currencyConfig.symbol} {formatCurrencyAmount(evaluation.totalGrossAssets, selectedCurrencyCode)}
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Liabilities</Text>
                  <Text style={[styles.summaryVal, { color: colors.textMuted }]}>
                    - {currencyConfig.symbol} {formatCurrencyAmount(evaluation.totalLiabilities, selectedCurrencyCode)}
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Net Wealth</Text>
                  <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>
                    {currencyConfig.symbol} {formatCurrencyAmount(evaluation.netZakatableWealth, selectedCurrencyCode)}
                  </Text>
                </View>
              </View>

              {/* Multi-currency equivalent conversion strip */}
              {evaluation.zakatDue > 0 && evaluation.convertedDue.length > 0 && (
                <View style={[styles.conversionBox, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.conversionTitle, { color: colors.textMuted }]}>
                    Equivalent in Major Currencies:
                  </Text>
                  <View style={styles.conversionRow}>
                    {evaluation.convertedDue.map((conv) => (
                      <View key={conv.code} style={styles.convChip}>
                        <Text style={[styles.convChipCode, { color: colors.textSecondary }]}>
                          {conv.code}:
                        </Text>
                        <Text style={[styles.convChipVal, { color: colors.accent }]}>
                          {conv.symbol} {formatCurrencyAmount(conv.amount, conv.code)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.resultsActions}>
                <TouchableOpacity
                  style={[styles.saveCalcBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
                  onPress={handleSaveCalculation}
                  accessibilityRole="button"
                >
                  <Ionicons name="bookmark-outline" size={15} color={colors.accent} />
                  <Text style={[styles.saveCalcBtnText, { color: colors.accent }]}>
                    Save Calculation
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetBtn, { borderColor: colors.borderSubtle }]}
                  onPress={handleReset}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.textMuted} />
                  <Text style={[styles.resetBtnText, { color: colors.textMuted }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Asset Inputs Form */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              Assets & Liabilities
            </Text>

            {/* 1. Cash */}
            <Card style={styles.inputCard}>
              <View style={styles.inputCardTop}>
                <View style={styles.inputCardLabelWrap}>
                  <Ionicons name="cash-outline" size={17} color={colors.accent} />
                  <Text style={[styles.inputCardTitle, { color: colors.textPrimary }]}>
                    Cash & Bank Balances
                  </Text>
                </View>
                <Text style={[styles.inputCardSub, { color: colors.textMuted }]}>
                  In hand, savings, checking accounts
                </Text>
              </View>
              <TextInput
                style={[styles.mainInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                value={cashInput}
                onChangeText={setCashInput}
                keyboardType="numeric"
                placeholder={`0 ${currencyConfig.symbol}`}
                placeholderTextColor={colors.textMuted}
              />
            </Card>

            {/* 2. Gold */}
            <Card style={styles.inputCard}>
              <View style={styles.inputCardTop}>
                <View style={styles.inputCardLabelWrap}>
                  <Ionicons name="sparkles-outline" size={17} color={colors.accent} />
                  <Text style={[styles.inputCardTitle, { color: colors.textPrimary }]}>
                    Gold (Grams)
                  </Text>
                </View>
                <Text style={[styles.inputCardSub, { color: colors.textMuted }]}>
                  {evaluation.goldValue > 0
                    ? `Value: ${currencyConfig.symbol} ${formatCurrencyAmount(evaluation.goldValue, selectedCurrencyCode)}`
                    : 'Jewelry (beyond customary use), coins, bars'}
                </Text>
              </View>
              <TextInput
                style={[styles.mainInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                value={goldGramsInput}
                onChangeText={setGoldGramsInput}
                keyboardType="numeric"
                placeholder="0 grams"
                placeholderTextColor={colors.textMuted}
              />
            </Card>

            {/* 3. Silver */}
            <Card style={styles.inputCard}>
              <View style={styles.inputCardTop}>
                <View style={styles.inputCardLabelWrap}>
                  <Ionicons name="disc-outline" size={17} color={colors.accent} />
                  <Text style={[styles.inputCardTitle, { color: colors.textPrimary }]}>
                    Silver (Grams)
                  </Text>
                </View>
                <Text style={[styles.inputCardSub, { color: colors.textMuted }]}>
                  {evaluation.silverValue > 0
                    ? `Value: ${currencyConfig.symbol} ${formatCurrencyAmount(evaluation.silverValue, selectedCurrencyCode)}`
                    : 'Coins, utensils, decorative bullion'}
                </Text>
              </View>
              <TextInput
                style={[styles.mainInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                value={silverGramsInput}
                onChangeText={setSilverGramsInput}
                keyboardType="numeric"
                placeholder="0 grams"
                placeholderTextColor={colors.textMuted}
              />
            </Card>

            {/* 4. Investments */}
            <Card style={styles.inputCard}>
              <View style={styles.inputCardTop}>
                <View style={styles.inputCardLabelWrap}>
                  <Ionicons name="trending-up-outline" size={17} color={colors.accent} />
                  <Text style={[styles.inputCardTitle, { color: colors.textPrimary }]}>
                    Investments, Stocks & Crypto
                  </Text>
                </View>
                <Text style={[styles.inputCardSub, { color: colors.textMuted }]}>
                  Shares, mutual funds, merchandise for sale
                </Text>
              </View>
              <TextInput
                style={[styles.mainInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                value={investmentsInput}
                onChangeText={setInvestmentsInput}
                keyboardType="numeric"
                placeholder={`0 ${currencyConfig.symbol}`}
                placeholderTextColor={colors.textMuted}
              />
            </Card>

            {/* 5. Other Assets */}
            <Card style={styles.inputCard}>
              <View style={styles.inputCardTop}>
                <View style={styles.inputCardLabelWrap}>
                  <Ionicons name="wallet-outline" size={17} color={colors.accent} />
                  <Text style={[styles.inputCardTitle, { color: colors.textPrimary }]}>
                    Other Assets & Receivables
                  </Text>
                </View>
                <Text style={[styles.inputCardSub, { color: colors.textMuted }]}>
                  Money owed to you expected soon, business cash
                </Text>
              </View>
              <TextInput
                style={[styles.mainInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                value={otherAssetsInput}
                onChangeText={setOtherAssetsInput}
                keyboardType="numeric"
                placeholder={`0 ${currencyConfig.symbol}`}
                placeholderTextColor={colors.textMuted}
              />
            </Card>

            {/* 6. Liabilities */}
            <Card style={styles.inputCard}>
              <View style={styles.inputCardTop}>
                <View style={styles.inputCardLabelWrap}>
                  <Ionicons name="remove-circle-outline" size={17} color="#E53E3E" />
                  <Text style={[styles.inputCardTitle, { color: colors.textPrimary }]}>
                    Deductible Liabilities & Debts
                  </Text>
                </View>
                <Text style={[styles.inputCardSub, { color: colors.textMuted }]}>
                  Immediate bills, unpaid rent, short-term debt due now
                </Text>
              </View>
              <TextInput
                style={[styles.mainInput, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                value={liabilitiesInput}
                onChangeText={setLiabilitiesInput}
                keyboardType="numeric"
                placeholder={`0 ${currencyConfig.symbol}`}
                placeholderTextColor={colors.textMuted}
              />
            </Card>
          </View>
        )}

        {/* ─── TAB 2: HISTORY ─────────────────────────────────────── */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              Past Saved Calculations
            </Text>

            {history.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title="No saved calculations yet"
                subtitle='Calculate your Zakat and tap "Save Calculation" to record it here.'
                actionLabel="Open calculator"
                onAction={() => setActiveTab('calculator')}
              />
            ) : (
              history.map((item) => {
                const itemCfg = getCurrencyConfig(item.currency);
                return (
                  <Card key={item.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View>
                        <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                          {item.date} • {item.nisabStandard === 'gold' ? 'Gold Nisab' : 'Silver Nisab'}
                        </Text>
                        <Text style={[styles.historyDueAmount, { color: colors.accent }]}>
                          Zakat: {itemCfg.symbol} {formatCurrencyAmount(item.zakatDue, item.currency)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteHistoryBtn}
                        onPress={() => handleDeleteHistory(item.id)}
                        accessibilityLabel="Delete record"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <Hairline style={{ marginVertical: 8 }} />

                    <View style={styles.historyBreakdownRow}>
                      <Text style={[styles.historyBreakdownText, { color: colors.textSecondary }]}>
                        Total Net Wealth: {itemCfg.symbol} {formatCurrencyAmount(item.totalWealth, item.currency)}
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* ─── TAB 3: NISAB & FIQH GUIDE ──────────────────────────── */}
        {activeTab === 'guide' && (
          <View style={styles.tabContent}>
            <Card style={styles.guideCard}>
              <Text style={[styles.guideHeading, { color: colors.textPrimary }]}>
                What is Nisab?
              </Text>
              <Text style={[styles.guideBody, { color: colors.textSecondary }]}>
                Nisab is the minimum threshold of net wealth a Muslim must possess for one full lunar year (Hawl) before Zakat becomes obligatory.
              </Text>

              <Hairline style={{ marginVertical: 12 }} />

              <Text style={[styles.guideSubheading, { color: colors.textPrimary }]}>
                Gold vs Silver Standard:
              </Text>
              <Text style={[styles.guideBody, { color: colors.textSecondary }]}>
                • <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>Gold Standard (85g):</Text> Widely recommended by modern contemporary scholars for cash, business wealth, and equities, as the price of gold has maintained historical purchasing power.
              </Text>
              <Text style={[styles.guideBody, { color: colors.textSecondary, marginTop: 8 }]}>
                • <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.textPrimary }}>Silver Standard (595g):</Text> Classical Hanafi standard, resulting in a significantly lower threshold that allows more Muslims to support the needy.
              </Text>

              <Hairline style={{ marginVertical: 12 }} />

              <Text style={[styles.guideSubheading, { color: colors.textPrimary }]}>
                Zakat Rate:
              </Text>
              <Text style={[styles.guideBody, { color: colors.textSecondary }]}>
                The universal rate is <Text style={{ fontFamily: 'Manrope_600SemiBold', color: colors.accent }}>2.5% (1/40th)</Text> of your eligible net wealth exceeding Nisab.
              </Text>
            </Card>
          </View>
        )}

        {/* Currency Selector Modal */}
        <Modal
          visible={showCurrencyModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCurrencyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Select Currency
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCurrencyModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textMuted} />
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
                          backgroundColor: isChosen ? colors.accentDim : 'transparent',
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCurrencyCode(c.code);
                        setShowCurrencyModal(false);
                      }}
                    >
                      <View>
                        <Text style={[styles.currencyItemCode, { color: colors.textPrimary }]}>
                          {c.code} ({c.symbol})
                        </Text>
                        <Text style={[styles.currencyItemName, { color: colors.textMuted }]}>
                          {c.name}
                        </Text>
                      </View>
                      {isChosen && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 8,
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

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  tabContent: {
    gap: 14,
  },

  /* Currency Card */
  currencyCard: {
    padding: 14,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  currencyChangeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },

  /* Nisab Card */
  nisabCard: {
    padding: 16,
    gap: 12,
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
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  nisabOptionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  nisabOptionSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
    marginTop: 2,
  },
  ratesEditRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rateField: {
    flex: 1,
  },
  rateFieldLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginBottom: 4,
  },
  rateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },

  /* Results Card */
  resultsCard: {
    padding: 18,
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
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  summaryVal: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginTop: 2,
  },
  conversionBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
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
    fontSize: 11.5,
  },
  convChipVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
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
    borderRadius: 8,
    borderWidth: 1,
  },
  saveCalcBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  resetBtn: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
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
    padding: 14,
    gap: 10,
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
    fontSize: 11.5,
  },
  mainInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },

  /* History */
  historyCard: {
    padding: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyDate: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
  },
  historyDueAmount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginTop: 2,
  },
  deleteHistoryBtn: {
    padding: 6,
  },
  historyBreakdownRow: {
    marginTop: 2,
  },
  historyBreakdownText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },

  /* Guide */
  guideCard: {
    padding: 18,
  },
  guideHeading: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    marginBottom: 4,
  },
  guideSubheading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginBottom: 4,
  },
  guideBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
  },
  modalCloseBtn: {
    padding: 4,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  currencyItemCode: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  currencyItemName: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 1,
  },

  bottomSpacer: {
    height: 30,
  },
});
