/**
 * Authoritative layout constants and safe-area dependent geometry helpers
 * for unified tab chrome (AppHeader, FloatingNav, TabScreen).
 */

export const HEADER_ROW_HEIGHT = 48;
export const HEADER_FADE = 10;
export const NAV_HEIGHT = 54.5;
export const NAV_SIDE_MARGIN = 14;
export const NAV_RADIUS = 27;

export const CONTENT_GAP = 24;
export const SCREEN_CONTENT_MAX_WIDTH = 680;

/** Authoritative shared geometry contract (CONTENT_GAP = 24dp, bottom clearance = 32dp) */
export const SPACING_CONTRACT = {
  CONTENT_GAP: 24,
  BOTTOM_CLEARANCE: 32,
} as const;

export const SUBHEADER_HEIGHT = 54;
export const SHEET_HEADER_HEIGHT = 54;
export const DRAG_PILL_WIDTH = 36;
export const DRAG_PILL_HEIGHT = 5;
export const DRAG_PILL_RADIUS = 2.5;

/** Dynamic formulas based on safe-area insets */
export const HEADER_ROW_TOP = (safeTop: number): number => safeTop + 2;
export const HEADER_BOTTOM = (safeTop: number): number => safeTop + HEADER_ROW_HEIGHT + 2;
export const SUBHEADER_BOTTOM = (safeTop: number): number => safeTop + SUBHEADER_HEIGHT;
export const NAV_BOTTOM = (safeBottom: number): number => safeBottom + 14;
export const NAV_TOP = (safeBottom: number): number => NAV_BOTTOM(safeBottom) + NAV_HEIGHT;
export const SCRIM_HEIGHT = (safeBottom: number): number => safeBottom + 14 + NAV_HEIGHT + 24;
export const TAB_PAD_TOP = (_safeTop: number): number => 0;
export const TAB_PAD_BOTTOM = (safeBottom: number): number => NAV_HEIGHT + safeBottom + 14 + 32;

/**
 * Detail route bottom clearance helper with single-owner safe-area clearance contract.
 * - When a normal-flow audio player sibling is present (hasPlayback = true):
 *   The player wrapper in App.tsx renders as a normal-flow sibling below the screen
 *   and already owns the safe bottom inset (Math.max(insets.bottom, 12)).
 *   The detail route content sits above the player and requires ONLY standard content
 *   breathing room (SPACING_CONTRACT.BOTTOM_CLEARANCE = 32dp). It must NOT add insets.bottom again.
 * - When no normal-flow player is present (hasPlayback = false):
 *   The detail route extends directly to the device bottom, so detail content is the sole
 *   owner of safe bottom clearance: safeBottom + SPACING_CONTRACT.BOTTOM_CLEARANCE (32dp).
 */
export const DETAIL_PAD_BOTTOM = (safeBottom: number, hasPlayback: boolean = false): number =>
  hasPlayback ? SPACING_CONTRACT.BOTTOM_CLEARANCE : safeBottom + SPACING_CONTRACT.BOTTOM_CLEARANCE;

export const DETAIL_CONTENT_PAD_BOTTOM = DETAIL_PAD_BOTTOM;

/** Auto-hide navigation configuration for reader screens */
export const READER_AUTOHIDE_NAV = {
  THRESHOLD_Y: 90,
  DELTA_Y: 2,
  RESET_Y: 10,
  DURATION: 180,
} as const;

/** CamelCase helper aliases */
export const getHeaderRowTop = HEADER_ROW_TOP;
export const getHeaderBottom = HEADER_BOTTOM;
export const getSubheaderBottom = SUBHEADER_BOTTOM;
export const getNavBottom = NAV_BOTTOM;
export const getNavTop = NAV_TOP;
export const getScrimHeight = SCRIM_HEIGHT;
export const getTabPadTop = TAB_PAD_TOP;
export const getTabPadBottom = TAB_PAD_BOTTOM;
export const getDetailPadBottom = DETAIL_PAD_BOTTOM;
export const getDetailContentPadBottom = DETAIL_CONTENT_PAD_BOTTOM;
