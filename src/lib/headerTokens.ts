/**
 * Shared Header Geometry Tokens & Metrics
 * Single source of truth for header chrome across top-level and detail screens.
 */

export const headerTokens = {
  /** Top inset padding extra above safe-area insets.top */
  topInsetExtra: 10,
  /** Canonical horizontal screen padding for headers */
  horizontalPadding: 20,
  /** Canonical maximum content column width on tablet / desktop */
  maxWidth: 680,
  /** Canonical content row minimum height */
  height: 54,
  /** Canonical vertical padding within the header row */
  paddingVertical: 6,
  /** Default borderBottom separator visibility across variants (false = borderless, clean editorial) */
  separatorDefault: false,
} as const;

export const HEADER_TOP_INSET_EXTRA = headerTokens.topInsetExtra;
export const HEADER_HORIZONTAL_PADDING = headerTokens.horizontalPadding;
export const HEADER_MAX_WIDTH = headerTokens.maxWidth;
export const HEADER_HEIGHT = headerTokens.height;
export const HEADER_PADDING_VERTICAL = headerTokens.paddingVertical;
export const HEADER_SEPARATOR = headerTokens.separatorDefault;
