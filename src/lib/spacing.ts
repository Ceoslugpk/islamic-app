/**
 * Canonical spacing tokens - "Warm Editorial Islamic"
 * Normalized spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48
 */

export const spacing = {
  /** 2px - hairline micro-gap */
  xxs: 2,
  /** 4px - tight inline gap, icon padding */
  xs: 4,
  /** 8px - standard element gap, badge padding */
  sm: 8,
  /** 12px - compact card padding, list item gap */
  md: 12,
  /** 16px - standard screen padding on mobile, card internal padding */
  lg: 16,
  /** 20px - comfortable screen horizontal padding on larger phones / tablets */
  xl: 20,
  /** 24px - section gap, major component spacing */
  xxl: 24,
  /** 32px - large section separator, modal padding */
  xxxl: 32,
  /** 40px - hero element spacing, touch target comfortable height */
  huge: 40,
  /** 48px - empty state padding, major hero spacing */
  massive: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Common semantic layout metrics */
export const layoutMetrics = {
  screenPaddingMobile: 16,
  screenPaddingTablet: 20,
  cardPaddingCompact: 12,
  cardPaddingRegular: 16,
  cardPaddingPadded: 20,
  cardRadius: 12,
  cardRadiusLg: 16,
  cardBorderWidth: 1,
  headerHeight: 54,
  minTouchTarget: 44,
  compactTouchTarget: 40,
  maxContentWidth: 680,
} as const;
