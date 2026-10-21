/**
 * Zakat calculator definitions, currency conversion rates, and asset breakdown logic.
 */

import { getCurrentLanguage, isAppLanguage, t } from './i18n';

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  ratePerUSD: number; // 1 USD = rate
  goldPricePerGram: number; // approximate benchmark (~$78/g)
  silverPricePerGram: number; // approximate benchmark (~$0.95/g)
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'AED', get name() { return t('UAE Dirham'); }, symbol: 'AED', ratePerUSD: 3.6725, goldPricePerGram: 286.5, silverPricePerGram: 3.5, decimals: 2 },
  { code: 'USD', get name() { return t('US Dollar'); }, symbol: '$', ratePerUSD: 1.0, goldPricePerGram: 78.0, silverPricePerGram: 0.95, decimals: 2 },
  { code: 'SAR', get name() { return t('Saudi Riyal'); }, symbol: 'SAR', ratePerUSD: 3.75, goldPricePerGram: 292.5, silverPricePerGram: 3.6, decimals: 2 },
  { code: 'EUR', get name() { return t('Euro'); }, symbol: '€', ratePerUSD: 0.92, goldPricePerGram: 71.8, silverPricePerGram: 0.88, decimals: 2 },
  { code: 'GBP', get name() { return t('British Pound'); }, symbol: '£', ratePerUSD: 0.79, goldPricePerGram: 61.6, silverPricePerGram: 0.75, decimals: 2 },
  { code: 'PKR', get name() { return t('Pakistani Rupee'); }, symbol: '₨', ratePerUSD: 278.5, goldPricePerGram: 21720, silverPricePerGram: 265, decimals: 0 },
  { code: 'INR', get name() { return t('Indian Rupee'); }, symbol: '₹', ratePerUSD: 83.5, goldPricePerGram: 6510, silverPricePerGram: 79.5, decimals: 0 },
  { code: 'CAD', get name() { return t('Canadian Dollar'); }, symbol: 'CA$', ratePerUSD: 1.36, goldPricePerGram: 106.0, silverPricePerGram: 1.3, decimals: 2 },
  { code: 'AUD', get name() { return t('Australian Dollar'); }, symbol: 'AU$', ratePerUSD: 1.52, goldPricePerGram: 118.5, silverPricePerGram: 1.45, decimals: 2 },
  { code: 'KWD', get name() { return t('Kuwaiti Dinar'); }, symbol: 'KWD', ratePerUSD: 0.308, goldPricePerGram: 24.0, silverPricePerGram: 0.29, decimals: 3 },
  { code: 'QAR', get name() { return t('Qatari Riyal'); }, symbol: 'QAR', ratePerUSD: 3.64, goldPricePerGram: 284.0, silverPricePerGram: 3.45, decimals: 2 },
  { code: 'MYR', get name() { return t('Malaysian Ringgit'); }, symbol: 'RM', ratePerUSD: 4.7, goldPricePerGram: 366.5, silverPricePerGram: 4.45, decimals: 2 },
  { code: 'IDR', get name() { return t('Indonesian Rupiah'); }, symbol: 'Rp', ratePerUSD: 15800, goldPricePerGram: 1232000, silverPricePerGram: 15000, decimals: 0 },
  { code: 'EGP', get name() { return t('Egyptian Pound'); }, symbol: 'EGP', ratePerUSD: 48.0, goldPricePerGram: 3744, silverPricePerGram: 45.6, decimals: 2 },
  { code: 'BDT', get name() { return t('Bangladeshi Taka'); }, symbol: '৳', ratePerUSD: 117.0, goldPricePerGram: 9126, silverPricePerGram: 111.0, decimals: 0 },
  { code: 'TRY', get name() { return t('Turkish Lira'); }, symbol: '₺', ratePerUSD: 34.2, goldPricePerGram: 2668, silverPricePerGram: 32.5, decimals: 2 },
];

export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;
export const ZAKAT_PERCENTAGE = 0.025; // 2.5%

export interface ZakatInputs {
  currencyCode: string;
  cash: number;
  goldGrams: number;
  silverGrams: number;
  investments: number;
  otherAssets: number;
  liabilities: number;
  goldPricePerGram: number;
  silverPricePerGram: number;
  nisabStandard: 'gold' | 'silver';
}

export interface ZakatEvaluation {
  currency: CurrencyConfig;
  cashValue: number;
  goldValue: number;
  silverValue: number;
  investmentsValue: number;
  otherAssetsValue: number;
  totalGrossAssets: number;
  totalLiabilities: number;
  netZakatableWealth: number;
  nisabThreshold: number;
  nisabStandard: 'gold' | 'silver';
  isEligibleForZakat: boolean;
  zakatDue: number;
  assetBreakdown: {
    cash: number;
    gold: number;
    silver: number;
    investments: number;
    other: number;
  };
  convertedDue: {
    code: string;
    symbol: string;
    amount: number;
  }[];
}

export function getCurrencyConfig(code: string): CurrencyConfig {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  if (!found) {
    throw new Error(`Unsupported currency code: ${code}`);
  }
  return found;
}

export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string
): number {
  if (fromCode === toCode) return amount;
  const from = getCurrencyConfig(fromCode);
  const to = getCurrencyConfig(toCode);
  // convert to USD first, then to target
  const inUSD = amount / from.ratePerUSD;
  return inUSD * to.ratePerUSD;
}

export function formatCurrencyAmount(
  amount: number,
  currencyCode: string
): string {
  const cfg = getCurrencyConfig(currencyCode);
  const cleanAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;
  const activeLanguage = getCurrentLanguage();
  const locale = typeof activeLanguage === 'string' && isAppLanguage(activeLanguage)
    ? activeLanguage
    : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(cleanAmount);
}

export function calculateZakat(inputs: ZakatInputs): ZakatEvaluation {
  const currency = getCurrencyConfig(inputs.currencyCode);

  const cashValue = Math.max(0, inputs.cash || 0);
  const goldPrice = Math.max(0, inputs.goldPricePerGram > 0 ? inputs.goldPricePerGram : currency.goldPricePerGram);
  const silverPrice = Math.max(0, inputs.silverPricePerGram > 0 ? inputs.silverPricePerGram : currency.silverPricePerGram);

  const goldValue = Math.max(0, (inputs.goldGrams || 0) * goldPrice);
  const silverValue = Math.max(0, (inputs.silverGrams || 0) * silverPrice);
  const investmentsValue = Math.max(0, inputs.investments || 0);
  const otherAssetsValue = Math.max(0, inputs.otherAssets || 0);
  const totalLiabilities = Math.max(0, inputs.liabilities || 0);

  const totalGrossAssets = cashValue + goldValue + silverValue + investmentsValue + otherAssetsValue;
  const netZakatableWealth = Math.max(0, totalGrossAssets - totalLiabilities);

  const nisabThreshold =
    inputs.nisabStandard === 'silver'
      ? NISAB_SILVER_GRAMS * silverPrice
      : NISAB_GOLD_GRAMS * goldPrice;

  const isEligibleForZakat = netZakatableWealth >= nisabThreshold && netZakatableWealth > 0;
  const zakatDue = isEligibleForZakat ? netZakatableWealth * ZAKAT_PERCENTAGE : 0;

  // Compute breakdown proportionately or direct 2.5% of net
  const zakatFactor = isEligibleForZakat ? ZAKAT_PERCENTAGE : 0;
  const assetBreakdown = {
    cash: cashValue * zakatFactor,
    gold: goldValue * zakatFactor,
    silver: silverValue * zakatFactor,
    investments: investmentsValue * zakatFactor,
    other: otherAssetsValue * zakatFactor,
  };

  // Convert to common currencies: AED, USD, EUR, SAR, GBP
  const comparisonCodes = ['AED', 'USD', 'SAR', 'EUR', 'GBP'].filter((c) => c !== currency.code).slice(0, 3);
  const convertedDue = comparisonCodes.map((code) => {
    const targetCfg = getCurrencyConfig(code);
    const converted = convertCurrency(zakatDue, currency.code, code);
    return {
      code,
      symbol: targetCfg.symbol,
      amount: converted,
    };
  });

  return {
    currency,
    cashValue,
    goldValue,
    silverValue,
    investmentsValue,
    otherAssetsValue,
    totalGrossAssets,
    totalLiabilities,
    netZakatableWealth,
    nisabThreshold,
    nisabStandard: inputs.nisabStandard,
    isEligibleForZakat,
    zakatDue,
    assetBreakdown,
    convertedDue,
  };
}
