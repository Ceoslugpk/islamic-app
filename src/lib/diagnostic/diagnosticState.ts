import { useState, useEffect, useCallback, useRef } from 'react';
import {
  I18nManager,
  Platform,
  Share,
  LayoutChangeEvent,
  StyleSheet,
  Dimensions,
  Appearance,
  StyleProp,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import i18n, { isRTL as isI18nRTL } from '../i18n';
import {
  getDiagnosticShareTitle,
  getDiagnosticShareDialogTitle,
} from './diagnosticI18n';
import {
  DIAGNOSTIC_BUILD_ID,
  DIAGNOSTIC_VERSION,
  DIAGNOSTIC_VERSION_CODE,
  isDiagnosticModeEnabled,
} from './diagnosticConfig';
import { useDiagScreen, getGlobalActiveScreen } from './diagnosticScreenContext';
import { KNOWN_SCREENS } from './diagnosticScreens';

export type DiagnosticTargetId =
  | 'quran-landing-surah-card'
  | 'downloads-empty-cta-card'
  | 'prayer-reminders-selection-controls'
  | 'mosque-finder-search-controls';

export type MeasurementStatus = 'measured' | 'pending' | 'measurementUnavailable';
export type OverflowStatus = 'no_overflow' | 'overflow' | 'unavailable';
export type ClippingStatus = 'not_clipped' | 'clipped' | 'unavailable';

export interface NamedLayoutRect {
  name: string;
  testID: string;
  parentIdentity: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  frameWidth: number | null;
  frameHeight: number | null;
  cardWidth?: number | null;
  cardHeight?: number | null;
  ancestorCard?: string | null;
  isAvailable: boolean;
  frameUnavailable?: boolean;
  measurementUnavailable?: boolean;
  unavailabilityReason?: string;
  staleAfterUnmount?: boolean;
  staleReason?: string;
  edgeOverflow?: {
    overflowsLeft: boolean;
    overflowsTop: boolean;
    overflowsRight: boolean;
    overflowsBottom: boolean;
    hasOverflow: boolean;
  } | null;
  allocationOverflow?: {
    overflowsLeft: boolean;
    overflowsTop: boolean;
    overflowsRight: boolean;
    overflowsBottom: boolean;
    hasOverflow: boolean;
  } | null;
}

export interface TargetLayoutRecord {
  staleAfterUnmount?: boolean;
  staleReason?: string;
  screenId: string;
  componentId: DiagnosticTargetId;
  targetTestId: string;
  parentTestId: string;
  status: MeasurementStatus;
  measurementUnavailable: boolean;
  nativeComputedStyleUnavailable: boolean;
  targetX: number | null;
  targetY: number | null;
  parentX: number | null;
  parentY: number | null;
  targetWidth: number | null;
  targetHeight: number | null;
  textContainerWidth: number | null; // Compatibility alias for targetWidth
  textContainerHeight: number | null; // Compatibility alias for targetHeight
  parentWidth: number | null;
  parentHeight: number | null;
  resolvedContainerLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  parentLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  resolvedStyleTextAlign: string;
  resolvedStyleWritingDirection: string;
  resolvedAlignment: string; // Compatibility alias
  resolvedWritingDirection: string; // Compatibility alias
  actualStyle: {
    textAlign: string;
    writingDirection: string;
  };
  overflowStatus: OverflowStatus;
  clippingStatus: ClippingStatus;
  isWidthOverflowing: boolean | null;
  isHeightOverflowing: boolean | null;
  edgeOverflow?: {
    overflowsLeft: boolean;
    overflowsTop: boolean;
    overflowsRight: boolean;
    overflowsBottom: boolean;
    hasOverflow: boolean;
  } | null;
  overflowDetails: {
    widthOverflow: boolean | null;
    heightOverflow: boolean | null;
    left?: boolean;
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
  };
  rectangles: Record<string, NamedLayoutRect>;
  nativeIsRTL: boolean;
  measuredAt?: string;
  unavailabilityReason?: string;
}

export interface DiagnosticMeasurementReportItem {
  screenId: string;
  componentId: string;
  targetTestId: string;
  parentTestId: string;
  status: MeasurementStatus;
  measurementUnavailable: boolean;
  nativeComputedStyleUnavailable: boolean;
  dimensions: {
    targetX?: number | null;
    targetY?: number | null;
    targetWidth: number | null;
    targetHeight: number | null;
    textContainerWidth: number | null;
    textContainerHeight: number | null;
    parentX?: number | null;
    parentY?: number | null;
    parentWidth: number | null;
    parentHeight: number | null;
  };
  resolvedContainerLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  parentLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  resolvedStyleTextAlign: string;
  resolvedStyleWritingDirection: string;
  alignment: {
    textAlign: string;
    writingDirection: string;
  };
  overflow: {
    status: OverflowStatus;
    clippingStatus: ClippingStatus;
    isWidthOverflowing: boolean | null;
    isHeightOverflowing: boolean | null;
    edgeOverflow?: {
      overflowsLeft: boolean;
      overflowsTop: boolean;
      overflowsRight: boolean;
      overflowsBottom: boolean;
      hasOverflow: boolean;
    } | null;
  };
  rectangles: Record<string, NamedLayoutRect>;
  nativeIsRTL: boolean;
}

export type DefectClass =
  | 'textTruncated'
  | 'subTouchTarget'
  | 'offScreen'
  | 'outsideParent'
  | 'siblingOverlap'
  | 'rtlTextAlignMismatch'
  | 'fixedHeightTextRisk';

export interface DefectItem {
  flag: boolean | null;
  reason?: string;
}

export interface ProbeDefects {
  textTruncated: DefectItem;
  subTouchTarget: DefectItem;
  offScreen: DefectItem;
  outsideParent: DefectItem;
  siblingOverlap: DefectItem;
  rtlTextAlignMismatch: DefectItem;
  fixedHeightTextRisk: DefectItem;
}

export interface DiagnosticDefectReportItem {
  probeId: string;
  defectClass: DefectClass;
  screen: string;
  reason?: string;
}

export type InteractionEffect = 'navigated' | 'stateChanged' | 'noObservableEffect' | 'error';

export interface DiagnosticInteractionRecord {
  id: string;
  screen: string;
  language: string;
  theme: 'light' | 'dark';
  timestamp: string;
  handlerPresent: boolean;
  disabled: boolean;
  effect: InteractionEffect;
  targetScreen?: string;
  errorName?: string;
}

export interface DiagnosticLanguageMatrixItem {
  probeId: string;
  screen: string;
  captures: Record<
    string,
    {
      width: number | null;
      height: number | null;
      textAlign?: string;
      writingDirection?: string;
      timestamp?: string;
    }
  >;
  languageGeometryMismatch: boolean;
  needsRevisit?: boolean;
  reason?: string;
}

export interface DiagnosticThemeMatrixItem {
  probeId: string;
  screen: string;
  light?: { width: number | null; height: number | null; timestamp?: string };
  dark?: { width: number | null; height: number | null; timestamp?: string };
  themeGeometryMismatch: boolean;
  needsRevisit?: boolean;
  reason?: string;
}

export interface DiagnosticNetworkRecord {
  host: string;
  path: string;
  method: string;
  status: number;
  ok: boolean;
  durationMs: number;
  errorClassName?: string;
  retryCount: number | null;
  timeout: boolean;
  offline: boolean;
  cachedFallback: boolean;
  timestamp: string;
}

export interface DiagnosticNetworkSummary {
  total: number;
  ok: number;
  failed: number;
  statusClassBreakdown: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
    'network/0': number;
  };
  timeouts: number;
  offlineFallbacks: number;
  slowestCall: { host: string; path: string; method: string; durationMs: number } | null;
}

export interface DiagnosticErrorRecord {
  timestamp: string;
  errorName: string;
  messageClass: string;
  screen: string;
  language: string;
  theme: 'light' | 'dark';
}

export interface DiagnosticCoverage {
  screensVisited: string[];
  screensUnvisited: string[];
  visitedCount: number;
  unvisitedCount: number;
  coveragePercent: number;
}

export interface AutoProbeRecord {
  id: string;
  kind: string;
  screen: string;
  language: string;
  theme: 'light' | 'dark';
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
  measuredAt: string | null;
  staleAfterUnmount: boolean;
  staleReason?: string;
  measurementUnavailable: boolean;
  unavailabilityReason?: string;
  overflow: {
    status: OverflowStatus;
    reason?: string;
    hasOverflow: boolean;
    overflowsLeft?: boolean;
    overflowsTop?: boolean;
    overflowsRight?: boolean;
    overflowsBottom?: boolean;
  } | null;
  overflowStatus: 'unknown' | 'no_overflow' | 'overflow';
  reason?: string;
  isText?: boolean;
  isInteractive?: boolean;
  numberOfLines?: number;
  reportedLineCount?: number;
  reportedTotalLineHeight?: number;
  containerFixedStyleHeight?: number;
  resolvedStyleTextAlign?: string;
  resolvedStyleWritingDirection?: string;
  defects: ProbeDefects;
}

export type DiagnosticProbeReportItem = AutoProbeRecord;

export interface DiagnosticReport {
  timestamp: string;
  buildId: string;
  version: string;
  versionCode: number;
  locale: string;
  theme: 'light' | 'dark';
  directionHelperResult: 'rtl' | 'ltr';
  i18nManagerIsRTL: boolean;
  probeCount: number;
  probes: DiagnosticProbeReportItem[];
  defects: {
    countsByClass: Record<DefectClass, number>;
    totalDefects: number;
    items: DiagnosticDefectReportItem[];
  };
  interactions: {
    total: number;
    countsByEffect: Record<InteractionEffect, number>;
    items: DiagnosticInteractionRecord[];
  };
  languageMatrix: {
    mismatchCount: number;
    items: DiagnosticLanguageMatrixItem[];
  };
  themeMatrix: {
    mismatchCount: number;
    items: DiagnosticThemeMatrixItem[];
  };
  network: {
    summary: DiagnosticNetworkSummary;
    items: DiagnosticNetworkRecord[];
  };
  errors: {
    total: number;
    items: DiagnosticErrorRecord[];
  };
  coverage: DiagnosticCoverage;
  summary: {
    probeCount: number;
    totalDefects: number;
    interactionCount: number;
    networkRequestCount: number;
    errorCount: number;
    visitedScreensCount: number;
  };
  // Backwards compatibility for existing tests
  screensVisited: string[];
  screensUnvisited: string[];
  measurements: DiagnosticMeasurementReportItem[];
}

export type ExportStatus =
  | 'success'
  | 'fileReady'
  | 'userActionRequired'
  | 'cancelledOrUnknown'
  | 'cancelled'
  | 'failed'
  | 'unavailable'
  | 'shareInvoked'; // compatibility alias

export type ShareStatus = 'unknown' | 'completed' | 'cancelled' | 'unavailable';

export interface ExportReportResult {
  success: boolean;
  status: ExportStatus;
  shareStatus: ShareStatus;
  fileReady: boolean;
  shareInvoked?: boolean;
  error?: string;
  filePath?: string;
}

const DEFAULT_TARGETS: Record<
  DiagnosticTargetId,
  {
    screenId: string;
    targetTestId: string;
    parentTestId: string;
  }
> = {
  'quran-landing-surah-card': {
    screenId: 'QuranLanding',
    targetTestId: 'quran-landing-surah-card-text',
    parentTestId: 'surah-row-1',
  },
  'downloads-empty-cta-card': {
    screenId: 'Downloads',
    targetTestId: 'downloads-empty-cta-text',
    parentTestId: 'downloads-empty-cta-card',
  },
  'prayer-reminders-selection-controls': {
    screenId: 'PrayerReminders',
    targetTestId: 'prayer-reminders-selection-controls',
    parentTestId: 'prayer-reminders-selection-card',
  },
  'mosque-finder-search-controls': {
    screenId: 'MosqueFinder',
    targetTestId: 'mosque-finder-search-controls',
    parentTestId: 'mosque-finder-search-card',
  },
};

const DEFAULT_NAMED_RECTS: Record<
  DiagnosticTargetId,
  { name: string; testID: string; parentIdentity: string; ancestorCard?: string }[]
> = {
  'quran-landing-surah-card': [
    { name: 'parent', testID: 'surah-row-1', parentIdentity: 'detail-screen-root' },
    { name: 'target', testID: 'quran-landing-surah-card-text', parentIdentity: 'surah-row-1' },
  ],
  'downloads-empty-cta-card': [
    { name: 'parent', testID: 'downloads-empty-cta-card', parentIdentity: 'downloads-list-viewport' },
    { name: 'button', testID: 'downloads-empty-cta-btn', parentIdentity: 'downloads-empty-cta-card', ancestorCard: 'downloads-empty-cta-card' },
    { name: 'gradient', testID: 'downloads-empty-cta-gradient', parentIdentity: 'downloads-empty-cta-btn', ancestorCard: 'downloads-empty-cta-card' },
    { name: 'label', testID: 'downloads-empty-cta-btn-label', parentIdentity: 'downloads-empty-cta-gradient', ancestorCard: 'downloads-empty-cta-card' },
    { name: 'listViewport', testID: 'downloads-list-viewport', parentIdentity: 'detail-screen-root' },
  ],
  'prayer-reminders-selection-controls': [
    { name: 'parent', testID: 'prayer-reminders-selection-card', parentIdentity: 'detail-screen-root' },
    { name: 'chipSelected', testID: 'prayer-reminders-chip-0', parentIdentity: 'prayer-reminders-selection-controls', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'chipUnselected', testID: 'prayer-reminders-chip-5', parentIdentity: 'prayer-reminders-selection-controls', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'gradient', testID: 'prayer-reminders-chip-gradient', parentIdentity: 'prayer-reminders-chip-0', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'label', testID: 'prayer-reminders-chip-label', parentIdentity: 'prayer-reminders-chip-gradient', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'unselectedGradient', testID: 'prayer-reminders-chip-unselected-gradient', parentIdentity: 'prayer-reminders-chip-5', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'unselectedLabel', testID: 'prayer-reminders-chip-unselected-label', parentIdentity: 'prayer-reminders-chip-5', ancestorCard: 'prayer-reminders-selection-card' },
  ],
  'mosque-finder-search-controls': [
    { name: 'parent', testID: 'mosque-finder-search-card', parentIdentity: 'detail-screen-root' },
    { name: 'searchField', testID: 'mosque-finder-search-field', parentIdentity: 'mosque-finder-search-controls', ancestorCard: 'mosque-finder-search-card' },
    { name: 'textInput', testID: 'mosque-finder-search-input', parentIdentity: 'mosque-finder-search-field', ancestorCard: 'mosque-finder-search-card' },
    { name: 'button', testID: 'mosque-finder-find-btn', parentIdentity: 'mosque-finder-search-controls', ancestorCard: 'mosque-finder-search-card' },
    { name: 'buttonGradient', testID: 'mosque-finder-find-btn-gradient', parentIdentity: 'mosque-finder-find-btn', ancestorCard: 'mosque-finder-search-card' },
    { name: 'buttonLabel', testID: 'mosque-finder-find-btn-label', parentIdentity: 'mosque-finder-find-btn-gradient', ancestorCard: 'mosque-finder-search-card' },
    { name: 'radiusSelected', testID: 'mosque-finder-radius-chip-selected', parentIdentity: 'mosque-finder-radius-pills', ancestorCard: 'mosque-finder-search-card' },
    { name: 'radiusUnselected', testID: 'mosque-finder-radius-chip-unselected', parentIdentity: 'mosque-finder-radius-pills', ancestorCard: 'mosque-finder-search-card' },
    { name: 'listViewport', testID: 'mosque-finder-list-viewport', parentIdentity: 'detail-screen-root' },
    { name: 'resultRow', testID: 'mosque-finder-result-row-0', parentIdentity: 'mosque-finder-list-viewport' },
  ],
};

function createInitialStore(): Record<DiagnosticTargetId, TargetLayoutRecord> {
  const store = {} as Record<DiagnosticTargetId, TargetLayoutRecord>;
  (Object.keys(DEFAULT_TARGETS) as DiagnosticTargetId[]).forEach((id) => {
    const rects: Record<string, NamedLayoutRect> = {};
    (DEFAULT_NAMED_RECTS[id] || []).forEach((spec) => {
      rects[spec.name] = {
        name: spec.name,
        testID: spec.testID,
        parentIdentity: spec.parentIdentity,
        x: null,
        y: null,
        width: null,
        height: null,
        frameWidth: null,
        frameHeight: null,
        cardWidth: null,
        cardHeight: null,
        ancestorCard: spec.ancestorCard || null,
        isAvailable: false,
        frameUnavailable: true,
        measurementUnavailable: true,
        unavailabilityReason: 'Pending layout measurement',
        edgeOverflow: null,
        allocationOverflow: null,
      };
    });

    store[id] = {
      screenId: DEFAULT_TARGETS[id].screenId,
      componentId: id,
      targetTestId: DEFAULT_TARGETS[id].targetTestId,
      parentTestId: DEFAULT_TARGETS[id].parentTestId,
      status: 'pending',
      measurementUnavailable: true,
      nativeComputedStyleUnavailable: true,
      targetX: null,
      targetY: null,
      parentX: null,
      parentY: null,
      targetWidth: null,
      targetHeight: null,
      textContainerWidth: null,
      textContainerHeight: null,
      parentWidth: null,
      parentHeight: null,
      resolvedContainerLayout: { x: null, y: null, width: null, height: null },
      parentLayout: { x: null, y: null, width: null, height: null },
      resolvedStyleTextAlign: 'unavailable',
      resolvedStyleWritingDirection: 'unavailable',
      resolvedAlignment: 'unavailable',
      resolvedWritingDirection: 'unavailable',
      actualStyle: {
        textAlign: 'unavailable',
        writingDirection: 'unavailable',
      },
      overflowStatus: 'unavailable',
      clippingStatus: 'unavailable',
      isWidthOverflowing: null,
      isHeightOverflowing: null,
      edgeOverflow: null,
      overflowDetails: {
        widthOverflow: null,
        heightOverflow: null,
        left: false,
        top: false,
        right: false,
        bottom: false,
      },
      rectangles: rects,
      nativeIsRTL: Boolean(I18nManager.isRTL),
    };
  });
  return store;
}

let measurementsStore: Record<DiagnosticTargetId, TargetLayoutRecord> = createInitialStore();
let probeStore: Record<string, AutoProbeRecord> = {};
let probeLRUOrder: string[] = [];

export const MAX_AUTO_PROBES = 400;
export const MAX_INTERACTION_ENTRIES = 200;
export const MAX_NETWORK_ENTRIES = 200;
export const MAX_ERROR_ENTRIES = 50;

let interactionLedger: DiagnosticInteractionRecord[] = [];
let networkLedger: DiagnosticNetworkRecord[] = [];
let errorLedger: DiagnosticErrorRecord[] = [];

const probeLanguageHistory = new Map<
  string,
  Map<string, { width: number | null; height: number | null; x: number | null; y: number | null; textAlign?: string; writingDirection?: string; timestamp: string }>
>();

const probeThemeHistory = new Map<
  string,
  Map<'light' | 'dark', { width: number | null; height: number | null; x: number | null; y: number | null; timestamp: string }>
>();

let activeThemeMode: 'light' | 'dark' = 'light';
let activeLanguageMode: string | null = null;

export function setDiagnosticActiveTheme(theme: 'light' | 'dark'): void {
  activeThemeMode = theme;
}

export function setDiagnosticActiveLanguage(lang: string | null): void {
  activeLanguageMode = lang;
}

export function getActiveTheme(): 'light' | 'dark' {
  if (activeThemeMode) return activeThemeMode;
  try {
    return Appearance?.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function getActiveLanguage(): string {
  if (activeLanguageMode) return activeLanguageMode;
  return i18n?.language || 'en';
}

const monotonicCounters: Record<string, number> = {};

export function getNextMonotonicProbeId(kind: string = 'probe'): string {
  monotonicCounters[kind] = (monotonicCounters[kind] || 0) + 1;
  return `auto-${kind}-${monotonicCounters[kind]}`;
}

export function getNextProbeInstanceSeq(): number {
  monotonicCounters.__instance = (monotonicCounters.__instance || 0) + 1;
  return monotonicCounters.__instance;
}

export function resetMonotonicCounters(): void {
  for (const k of Object.keys(monotonicCounters)) {
    delete monotonicCounters[k];
  }
}

export function resetDiagnosticProbes(): void {
  probeStore = {};
  probeLRUOrder = [];
  interactionLedger = [];
  networkLedger = [];
  errorLedger = [];
  probeLanguageHistory.clear();
  probeThemeHistory.clear();
  activeLanguageMode = null;
  activeThemeMode = 'light';
  resetMonotonicCounters();
  notifyListeners();
}

export function getAutoProbes(): AutoProbeRecord[] {
  return Object.values(probeStore);
}

export function getAutoProbe(id: string): AutoProbeRecord | undefined {
  return probeStore[id];
}

export function getInteractionLedger(): DiagnosticInteractionRecord[] {
  return [...interactionLedger];
}

export function getNetworkLedger(): DiagnosticNetworkRecord[] {
  return [...networkLedger];
}

export function getErrorLedger(): DiagnosticErrorRecord[] {
  return [...errorLedger];
}

export function recordInteraction(record: DiagnosticInteractionRecord): void {
  if (!isDiagnosticModeEnabled()) return;
  if (interactionLedger.length >= MAX_INTERACTION_ENTRIES) {
    interactionLedger.shift();
  }
  interactionLedger.push(record);
  notifyListeners();
}

export function sanitizeNetworkUrl(input: any): { host: string; path: string } {
  try {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    if (!rawUrl) return { host: 'unknown', path: '/' };

    const match = rawUrl.match(/^https?:\/\/([^/?#]+)([^?#]*)/i);
    if (match) {
      // Strip any userinfo (credentials) so a URL like https://user:pass@host/x
      // can never leak a secret into the report.
      const host = match[1].toLowerCase().replace(/^[^@]*@/, '').replace(/[^a-z0-9.\-:]/g, '');
      const path = match[2] || '/';
      return { host, path };
    }
    const relMatch = rawUrl.match(/^([^?#]*)/);
    return { host: 'internal', path: relMatch ? relMatch[1] : '/' };
  } catch {
    return { host: 'unknown', path: '/' };
  }
}

export function recordDiagnosticNetworkEvent(event: DiagnosticNetworkRecord): void {
  if (!isDiagnosticModeEnabled()) return;
  if (networkLedger.length >= MAX_NETWORK_ENTRIES) {
    networkLedger.shift();
  }
  networkLedger.push(event);
  notifyListeners();
}

export function recordDiagnosticNetworkFallback(details: {
  host: string;
  path: string;
  method?: string;
  status?: number;
}): void {
  if (!isDiagnosticModeEnabled()) return;
  recordDiagnosticNetworkEvent({
    host: details.host,
    path: details.path,
    method: (details.method || 'GET').toUpperCase(),
    status: details.status ?? 200,
    ok: true,
    durationMs: 0,
    retryCount: null,
    timeout: false,
    offline: false,
    cachedFallback: true,
    timestamp: new Date().toISOString(),
  });
}

let originalGlobalFetch: typeof fetch | null = null;
let isFetchInterceptionInstalled = false;

export function installDiagnosticNetworkInterceptor(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (isFetchInterceptionInstalled) return;
  if (typeof globalThis.fetch !== 'function') return;

  originalGlobalFetch = globalThis.fetch;
  isFetchInterceptionInstalled = true;

  globalThis.fetch = async function diagnosticWrappedFetch(
    input: any,
    init?: any
  ): Promise<Response> {
    if (!isDiagnosticModeEnabled()) {
      return originalGlobalFetch!(input, init);
    }

    const { host, path } = sanitizeNetworkUrl(input);
    const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await originalGlobalFetch!(input, init);
      const durationMs = Date.now() - startTime;
      recordDiagnosticNetworkEvent({
        host,
        path,
        method,
        status: response.status,
        ok: response.ok,
        durationMs,
        retryCount: null,
        timeout: false,
        offline: false,
        cachedFallback: false,
        timestamp,
      });
      return response;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorClassName = err?.name || 'NetworkError';
      const isTimeout = errorClassName === 'AbortError' || /timeout/i.test(err?.message || '');
      const isOffline = /network|offline|failed to fetch/i.test(err?.message || '');

      recordDiagnosticNetworkEvent({
        host,
        path,
        method,
        status: 0,
        ok: false,
        durationMs,
        errorClassName,
        retryCount: null,
        timeout: isTimeout,
        offline: isOffline,
        cachedFallback: false,
        timestamp,
      });
      throw err;
    }
  };
}

export function restoreDiagnosticNetworkInterceptor(): void {
  if (isFetchInterceptionInstalled && originalGlobalFetch) {
    globalThis.fetch = originalGlobalFetch;
    originalGlobalFetch = null;
    isFetchInterceptionInstalled = false;
  }
}

export function sanitizeErrorMessageClass(err: any): { errorName: string; messageClass: string } {
  const errorName = err?.name || (typeof err === 'string' ? 'Error' : 'UnknownError');
  const raw = (typeof err === 'string' ? err : err?.message || String(err || '')).toLowerCase();

  // messageClass is a coarse CATEGORY, never free text. Earlier revisions kept a
  // truncated copy of the raw message, which could retain an e-mail address or
  // arbitrary user content. Classification only - no message text is stored.
  let klass = 'unknown';
  if (/network request failed|failed to fetch|networkerror|offline/.test(raw)) klass = 'network';
  else if (/timed? ?out|timeout/.test(raw)) klass = 'timeout';
  else if (/abort|cancel/.test(raw)) klass = 'aborted';
  else if (/json|parse|unexpected ?(tok|char)|syntaxerror/.test(raw)) klass = 'parse';
  else if (/unauthor|forbidden|401|403/.test(raw)) klass = 'auth';
  else if (/rate limit|too many|429/.test(raw)) klass = 'rate_limited';
  else if (/not found|404/.test(raw)) klass = 'not_found';
  else if (/permission|denied/.test(raw)) klass = 'permission';
  else if (/sqlite|database|storage/.test(raw)) klass = 'storage';
  else if (/invalid|validation|required/.test(raw)) klass = 'validation';

  return { errorName, messageClass: `${errorName}: ${klass}` };
}

export function recordDiagnosticRuntimeError(
  err: any,
  screenOverride?: string
): void {
  if (!isDiagnosticModeEnabled()) return;

  const { errorName, messageClass } = sanitizeErrorMessageClass(err);
  const screen = screenOverride || getGlobalActiveScreen() || 'App';
  const language = getActiveLanguage();
  const theme = getActiveTheme();
  const timestamp = new Date().toISOString();

  const record: DiagnosticErrorRecord = {
    timestamp,
    errorName,
    messageClass,
    screen,
    language,
    theme,
  };

  if (errorLedger.length >= MAX_ERROR_ENTRIES) {
    errorLedger.shift();
  }
  errorLedger.push(record);
  notifyListeners();
}

let originalErrorHandler: any = null;
let isErrorInterceptionInstalled = false;

export function installDiagnosticErrorInterceptor(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (isErrorInterceptionInstalled) return;

  const globalObj = globalThis as any;
  if (globalObj.ErrorUtils && typeof globalObj.ErrorUtils.getGlobalHandler === 'function') {
    originalErrorHandler = globalObj.ErrorUtils.getGlobalHandler();
    isErrorInterceptionInstalled = true;
    globalObj.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      if (isDiagnosticModeEnabled()) {
        recordDiagnosticRuntimeError(error);
      }
      if (typeof originalErrorHandler === 'function') {
        originalErrorHandler(error, isFatal);
      }
    });
  }
}

export function restoreDiagnosticErrorInterceptor(): void {
  const globalObj = globalThis as any;
  if (isErrorInterceptionInstalled && globalObj.ErrorUtils && originalErrorHandler) {
    globalObj.ErrorUtils.setGlobalHandler(originalErrorHandler);
    originalErrorHandler = null;
    isErrorInterceptionInstalled = false;
  }
}

export function deriveProbeDefects(
  probe: Partial<AutoProbeRecord>,
  options?: {
    isText?: boolean;
    isInteractive?: boolean;
    numberOfLines?: number;
    reportedLineCount?: number;
    reportedTotalLineHeight?: number;
    containerFixedStyleHeight?: number;
    resolvedStyleTextAlign?: string;
    resolvedStyleWritingDirection?: string;
    windowDimensions?: { width: number; height: number };
    bottomSafeInset?: number;
    siblings?: Partial<AutoProbeRecord>[];
  }
): ProbeDefects {
  const isText = options?.isText ?? probe.isText ?? false;
  const isInteractive = options?.isInteractive ?? probe.isInteractive ?? false;
  const x = probe.x ?? null;
  const y = probe.y ?? null;
  const width = probe.width ?? null;
  const height = probe.height ?? null;
  const frameWidth = probe.frameWidth ?? null;
  const frameHeight = probe.frameHeight ?? null;

  // 1. textTruncated:
  let textTruncated: DefectItem;
  if (!isText) {
    textTruncated = { flag: null, reason: 'Not a text element' };
  } else {
    const numLines = options?.numberOfLines ?? probe.numberOfLines;
    const reportedLines = options?.reportedLineCount ?? probe.reportedLineCount;
    const reportedHeight = options?.reportedTotalLineHeight ?? probe.reportedTotalLineHeight;

    if (numLines != null && reportedLines != null) {
      if (reportedLines >= numLines && reportedHeight != null && height != null && height < reportedHeight - 1) {
        textTruncated = { flag: true, reason: `Text reached ${numLines} line limit and measured height (${height}) is less than line layout height (${reportedHeight})` };
      } else if (reportedHeight != null && height != null && height < reportedHeight - 1) {
        textTruncated = { flag: true, reason: `Measured height (${height}) is less than reported line layout height (${reportedHeight})` };
      } else if (reportedLines >= numLines) {
        textTruncated = { flag: true, reason: `Text reached ${numLines} line limit (${reportedLines} lines)` };
      } else {
        textTruncated = { flag: false };
      }
    } else if (reportedHeight != null && height != null && height < reportedHeight - 1) {
      textTruncated = { flag: true, reason: `Measured height (${height}) is less than reported line layout height (${reportedHeight})` };
    } else if (reportedLines != null) {
      textTruncated = { flag: false };
    } else {
      textTruncated = { flag: null, reason: 'Text line layout metrics unavailable' };
    }
  }

  // 2. subTouchTarget:
  let subTouchTarget: DefectItem;
  if (!isInteractive) {
    subTouchTarget = { flag: null, reason: 'Non-interactive element' };
  } else if (width == null || height == null) {
    subTouchTarget = { flag: null, reason: 'Geometry unavailable' };
  } else if (width < 44 || height < 44) {
    subTouchTarget = { flag: true, reason: `Interactive touch target ${width}x${height}dp is under 44x44dp minimum` };
  } else {
    subTouchTarget = { flag: false };
  }

  // 3. offScreen:
  let offScreen: DefectItem;
  if (x == null || y == null || width == null || height == null) {
    offScreen = { flag: null, reason: 'Geometry unavailable' };
  } else {
    let winWidth = 360;
    let winHeight = 640;
    try {
      const win = Dimensions?.get('window');
      if (win && win.width > 0 && win.height > 0) {
        winWidth = win.width;
        winHeight = win.height;
      }
    } catch {}
    if (options?.windowDimensions) {
      winWidth = options.windowDimensions.width;
      winHeight = options.windowDimensions.height;
    }

    const bottomInset = options?.bottomSafeInset ?? 24;
    const maxAllowedY = winHeight - bottomInset;
    if (x < 0 || y < 0 || (x + width) > winWidth || (y + height) > maxAllowedY) {
      offScreen = {
        flag: true,
        reason: `Element rect (${x}, ${y}, ${width}, ${height}) extends outside window bounds (${winWidth}x${maxAllowedY})`,
      };
    } else {
      offScreen = { flag: false };
    }
  }

  // 4. outsideParent:
  let outsideParent: DefectItem;
  if (frameWidth == null || frameHeight == null) {
    outsideParent = { flag: null, reason: 'No known parent frame' };
  } else if (x == null || y == null || width == null || height == null) {
    outsideParent = { flag: null, reason: 'Geometry unavailable' };
  } else if (x < 0 || y < 0 || (x + width) > frameWidth || (y + height) > frameHeight) {
    outsideParent = {
      flag: true,
      reason: `Child rect (${x}, ${y}, ${width}, ${height}) exceeds parent frame (${frameWidth}x${frameHeight})`,
    };
  } else {
    outsideParent = { flag: false };
  }

  // 5. siblingOverlap:
  let siblingOverlap: DefectItem;
  const siblings = options?.siblings || [];
  if (x == null || y == null || width == null || height == null || siblings.length === 0) {
    siblingOverlap = { flag: null, reason: 'No siblings observed in parent frame' };
  } else {
    let foundOverlap = false;
    let overlapDetails = '';
    for (const sib of siblings) {
      if (!sib || sib.id === probe.id || sib.x == null || sib.y == null || sib.width == null || sib.height == null) {
        continue;
      }
      const xOverlap = Math.max(0, Math.min(x + width, sib.x + sib.width) - Math.max(x, sib.x));
      const yOverlap = Math.max(0, Math.min(y + height, sib.y + sib.height) - Math.max(y, sib.y));
      if (xOverlap > 1 && yOverlap > 1) {
        foundOverlap = true;
        overlapDetails = `Intersects sibling '${sib.id || sib.kind}' by ${xOverlap.toFixed(1)}x${yOverlap.toFixed(1)}dp`;
        break;
      }
    }
    if (foundOverlap) {
      siblingOverlap = { flag: true, reason: overlapDetails };
    } else {
      siblingOverlap = { flag: false };
    }
  }

  // 6. rtlTextAlignMismatch:
  let rtlTextAlignMismatch: DefectItem;
  if (!isText) {
    rtlTextAlignMismatch = { flag: null, reason: 'Not a text element' };
  } else {
    const isRtl = isI18nRTL();
    const align = (options?.resolvedStyleTextAlign ?? probe.resolvedStyleTextAlign)?.toLowerCase();
    const dir = (options?.resolvedStyleWritingDirection ?? probe.resolvedStyleWritingDirection)?.toLowerCase();
    if (!align && !dir) {
      rtlTextAlignMismatch = { flag: null, reason: 'Alignment and writing direction unresolved' };
    } else if (isRtl) {
      if (align === 'left' || dir === 'ltr') {
        rtlTextAlignMismatch = {
          flag: true,
          reason: `RTL locale has LTR alignment (textAlign='${align || 'unset'}', writingDirection='${dir || 'unset'}')`,
        };
      } else {
        rtlTextAlignMismatch = { flag: false };
      }
    } else {
      if (align === 'right' || dir === 'rtl') {
        rtlTextAlignMismatch = {
          flag: true,
          reason: `LTR locale has RTL alignment (textAlign='${align || 'unset'}', writingDirection='${dir || 'unset'}')`,
        };
      } else {
        rtlTextAlignMismatch = { flag: false };
      }
    }
  }

  // 7. fixedHeightTextRisk:
  let fixedHeightTextRisk: DefectItem;
  const fixedHeight = options?.containerFixedStyleHeight ?? probe.containerFixedStyleHeight;
  const numLines = options?.numberOfLines ?? probe.numberOfLines;
  if (!isText) {
    fixedHeightTextRisk = { flag: null, reason: 'Not a text element' };
  } else if (fixedHeight != null && numLines != null) {
    if (height != null && Math.abs(height - fixedHeight) <= 1) {
      fixedHeightTextRisk = {
        flag: true,
        reason: `Container fixed height style (${fixedHeight}dp) equals container height with numberOfLines=${numLines}`,
      };
    } else {
      fixedHeightTextRisk = { flag: false };
    }
  } else {
    fixedHeightTextRisk = { flag: null, reason: 'No fixed height style with numberOfLines' };
  }

  return {
    textTruncated,
    subTouchTarget,
    offScreen,
    outsideParent,
    siblingOverlap,
    rtlTextAlignMismatch,
    fixedHeightTextRisk,
  };
}

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function addDiagnosticListener(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetDiagnosticMeasurements(): void {
  measurementsStore = createInitialStore();
  probeStore = {};
  probeLRUOrder = [];
  interactionLedger = [];
  networkLedger = [];
  errorLedger = [];
  probeLanguageHistory.clear();
  probeThemeHistory.clear();
  activeLanguageMode = null;
  activeThemeMode = 'light';
  resetMonotonicCounters();
  notifyListeners();
}

export function getTargetMeasurements(): TargetLayoutRecord[] {
  return Object.values(measurementsStore);
}

export function getTargetMeasurement(targetId: DiagnosticTargetId): TargetLayoutRecord | undefined {
  return measurementsStore[targetId];
}

function resetRecordToUnavailable(record: TargetLayoutRecord, reason: string): void {
  record.status = 'measurementUnavailable';
  record.measurementUnavailable = true;
  record.unavailabilityReason = reason;
  record.targetX = null;
  record.targetY = null;
  record.parentX = null;
  record.parentY = null;
  record.targetWidth = null;
  record.targetHeight = null;
  record.textContainerWidth = null;
  record.textContainerHeight = null;
  record.parentWidth = null;
  record.parentHeight = null;
  record.resolvedContainerLayout = { x: null, y: null, width: null, height: null };
  record.parentLayout = { x: null, y: null, width: null, height: null };
  record.edgeOverflow = null;
  record.overflowStatus = 'unavailable';
  record.clippingStatus = 'unavailable';
  record.isWidthOverflowing = null;
  record.isHeightOverflowing = null;
  record.overflowDetails = {
    widthOverflow: null,
    heightOverflow: null,
    left: false,
    top: false,
    right: false,
    bottom: false,
  };
  record.nativeIsRTL = Boolean(I18nManager.isRTL);

  if (record.rectangles) {
    for (const name of Object.keys(record.rectangles)) {
      const rect = record.rectangles[name];
      rect.isAvailable = false;
      rect.x = null;
      rect.y = null;
      rect.width = null;
      rect.height = null;
      rect.frameWidth = null;
      rect.frameHeight = null;
      rect.cardWidth = null;
      rect.cardHeight = null;
      rect.edgeOverflow = null;
      rect.allocationOverflow = null;
      rect.frameUnavailable = true;
      rect.measurementUnavailable = true;
      rect.unavailabilityReason = reason;
    }
  }
}

function updateOverflowAndStatus(record: TargetLayoutRecord): void {
  const hasParent = record.parentWidth != null && record.parentHeight != null && record.parentWidth > 0 && record.parentHeight > 0;
  const hasTarget = record.targetWidth != null && record.targetHeight != null && record.targetWidth > 0 && record.targetHeight > 0;

  if (hasParent && hasTarget) {
    const x = record.targetX ?? 0;
    const y = record.targetY ?? 0;
    const targetW = record.targetWidth!;
    const targetH = record.targetHeight!;
    const parentW = record.parentWidth!;
    const parentH = record.parentHeight!;

    const overflowsLeft = x < 0;
    const overflowsTop = y < 0;
    const overflowsRight = (x + targetW) > parentW;
    const overflowsBottom = (y + targetH) > parentH;
    const anyOverflow = overflowsLeft || overflowsTop || overflowsRight || overflowsBottom;

    record.edgeOverflow = {
      overflowsLeft,
      overflowsTop,
      overflowsRight,
      overflowsBottom,
      hasOverflow: anyOverflow,
    };
    record.isWidthOverflowing = overflowsLeft || overflowsRight;
    record.isHeightOverflowing = overflowsTop || overflowsBottom;
    record.overflowDetails = {
      widthOverflow: record.isWidthOverflowing,
      heightOverflow: record.isHeightOverflowing,
      left: overflowsLeft,
      top: overflowsTop,
      right: overflowsRight,
      bottom: overflowsBottom,
    };
    record.overflowStatus = anyOverflow ? 'overflow' : 'no_overflow';
    record.clippingStatus = anyOverflow ? 'clipped' : 'not_clipped';
    record.status = 'measured';
    record.measurementUnavailable = false;
    record.measuredAt = new Date().toISOString();

    // Re-evaluate ancestor card allocation overflow ONLY when explicitly named
    if (record.rectangles) {
      for (const name of Object.keys(record.rectangles)) {
        const rect = record.rectangles[name];
        if (rect.ancestorCard && rect.ancestorCard === record.parentTestId) {
          rect.cardWidth = parentW;
          rect.cardHeight = parentH;
          if (rect.isAvailable && rect.width != null && rect.height != null) {
            const rx = rect.x ?? 0;
            const ry = rect.y ?? 0;
            const aLeft = rx < 0;
            const aTop = ry < 0;
            const aRight = (rx + rect.width) > parentW;
            const aBottom = (ry + rect.height) > parentH;
            rect.allocationOverflow = {
              overflowsLeft: aLeft,
              overflowsTop: aTop,
              overflowsRight: aRight,
              overflowsBottom: aBottom,
              hasOverflow: aLeft || aTop || aRight || aBottom || rect.width > parentW || rect.height > parentH,
            };
          }
        }
      }
    }
  } else {
    // When either parent or target cannot be measured, do not report false or stale values
    record.targetX = null;
    record.targetY = null;
    record.edgeOverflow = null;
    record.isWidthOverflowing = null;
    record.isHeightOverflowing = null;
    record.overflowDetails = {
      widthOverflow: null,
      heightOverflow: null,
      left: false,
      top: false,
      right: false,
      bottom: false,
    };
    record.overflowStatus = 'unavailable';
    record.clippingStatus = 'unavailable';
    record.measurementUnavailable = true;
  }
}

export function recordParentLayout(
  targetId: DiagnosticTargetId,
  layout: { x?: number; y?: number; width: number; height: number }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  if (layout && typeof layout.width === 'number' && typeof layout.height === 'number' && layout.width > 0 && layout.height > 0) {
    record.parentX = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
    record.parentY = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
    record.parentWidth = Math.round(layout.width * 10) / 10;
    record.parentHeight = Math.round(layout.height * 10) / 10;
    record.parentLayout = {
      x: record.parentX,
      y: record.parentY,
      width: record.parentWidth,
      height: record.parentHeight,
    };
    record.nativeIsRTL = Boolean(I18nManager.isRTL);

    if (record.rectangles && record.rectangles.parent) {
      record.rectangles.parent.isAvailable = true;
      record.rectangles.parent.x = record.parentX;
      record.rectangles.parent.y = record.parentY;
      record.rectangles.parent.width = record.parentWidth;
      record.rectangles.parent.height = record.parentHeight;
      record.rectangles.parent.unavailabilityReason = undefined;
    }

    updateOverflowAndStatus(record);
  } else {
    resetRecordToUnavailable(record, 'Parent dimensions reported <= 0');
  }
  notifyListeners();
}

export function recordTargetLayout(
  targetId: DiagnosticTargetId,
  layout: { x?: number; y?: number; width: number; height: number },
  actualStyle?: {
    textAlign?: string;
    writingDirection?: string;
    [key: string]: any;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  record.nativeIsRTL = Boolean(I18nManager.isRTL);
  // React Native onLayout delivers geometry only; native computed styles are not accessible at JS runtime.
  record.nativeComputedStyleUnavailable = true;

  if (actualStyle?.textAlign) {
    record.resolvedStyleTextAlign = String(actualStyle.textAlign);
    record.actualStyle.textAlign = String(actualStyle.textAlign);
    record.resolvedAlignment = String(actualStyle.textAlign);
  } else {
    record.resolvedStyleTextAlign = 'unspecified';
    record.actualStyle.textAlign = 'unspecified';
    record.resolvedAlignment = 'unspecified';
  }

  if (actualStyle?.writingDirection) {
    record.resolvedStyleWritingDirection = String(actualStyle.writingDirection);
    record.actualStyle.writingDirection = String(actualStyle.writingDirection);
    record.resolvedWritingDirection = String(actualStyle.writingDirection);
  } else {
    record.resolvedStyleWritingDirection = 'unspecified';
    record.actualStyle.writingDirection = 'unspecified';
    record.resolvedWritingDirection = 'unspecified';
  }

  if (layout && typeof layout.width === 'number' && typeof layout.height === 'number' && layout.width > 0 && layout.height > 0) {
    record.targetX = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
    record.targetY = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
    record.targetWidth = Math.round(layout.width * 10) / 10;
    record.targetHeight = Math.round(layout.height * 10) / 10;
    record.textContainerWidth = record.targetWidth;
    record.textContainerHeight = record.targetHeight;
    record.resolvedContainerLayout = {
      x: record.targetX,
      y: record.targetY,
      width: record.targetWidth,
      height: record.targetHeight,
    };
    updateOverflowAndStatus(record);
  } else {
    resetRecordToUnavailable(record, 'Target dimensions reported <= 0');
  }
  notifyListeners();
}

/**
 * Backward compatibility alias for recordTargetLayout.
 */
export const recordTextLayout = recordTargetLayout;

export function recordNamedLayout(
  targetId: DiagnosticTargetId,
  name: string,
  layout: { x?: number; y?: number; width: number; height: number } | null | undefined,
  meta?: {
    testID?: string;
    parentIdentity?: string;
    frameWidth?: number | null;
    frameHeight?: number | null;
    cardWidth?: number | null;
    cardHeight?: number | null;
    ancestorCard?: string | null;
    unavailabilityReason?: string;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  if (!record.rectangles) {
    record.rectangles = {};
  }

  const existing: NamedLayoutRect = record.rectangles[name] || {
    name,
    testID: meta?.testID || name,
    parentIdentity: meta?.parentIdentity || record.parentTestId,
    x: null,
    y: null,
    width: null,
    height: null,
    frameWidth: null,
    frameHeight: null,
    cardWidth: null,
    cardHeight: null,
    ancestorCard: meta?.ancestorCard || null,
    isAvailable: false,
    frameUnavailable: true,
    measurementUnavailable: true,
    unavailabilityReason: 'Pending layout measurement',
    edgeOverflow: null,
    allocationOverflow: null,
  };

  if (meta?.testID) existing.testID = meta.testID;
  if (meta?.parentIdentity) existing.parentIdentity = meta.parentIdentity;
  existing.ancestorCard = meta?.ancestorCard !== undefined ? meta.ancestorCard : null;
  const storedGrad = record.rectangles?.gradient;
  // Bug 2: Prayer chip label rect reported frameWidth/frameHeight equal to its own size (24.3x19)
  // due to React Native synthetic event recycling in screen handlers.
  // Authoritative label frame must come from the stored gradient rect, never from the label's own event.
  const isLabelOwnEventRecycled =
    name === 'label' &&
    storedGrad?.isAvailable &&
    storedGrad.width != null &&
    storedGrad.height != null &&
    layout != null &&
    meta?.frameWidth != null &&
    meta?.frameHeight != null &&
    meta.frameWidth === Math.round(layout.width * 10) / 10 &&
    meta.frameHeight === Math.round(layout.height * 10) / 10 &&
    (meta.frameWidth !== storedGrad.width || meta.frameHeight !== storedGrad.height);

  if (isLabelOwnEventRecycled && storedGrad) {
    existing.frameWidth = storedGrad.width;
    existing.frameHeight = storedGrad.height;
  } else {
    existing.frameWidth = meta?.frameWidth != null ? Math.round(meta.frameWidth * 10) / 10 : null;
    existing.frameHeight = meta?.frameHeight != null ? Math.round(meta.frameHeight * 10) / 10 : null;
  }
  existing.cardWidth = meta?.cardWidth != null ? Math.round(meta.cardWidth * 10) / 10 : null;
  existing.cardHeight = meta?.cardHeight != null ? Math.round(meta.cardHeight * 10) / 10 : null;

  if (
    layout &&
    typeof layout.width === 'number' &&
    typeof layout.height === 'number' &&
    layout.width > 0 &&
    layout.height > 0
  ) {
    existing.isAvailable = true;
    existing.x = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
    existing.y = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
    existing.width = Math.round(layout.width * 10) / 10;
    existing.height = Math.round(layout.height * 10) / 10;

    // Evaluate edge overflow against the record's OWN frame:
    // If frame is unknown, set frameUnavailable/measurementUnavailable and do NOT emit hasOverflow: false.
    if (
      existing.frameWidth != null &&
      existing.frameHeight != null &&
      existing.frameWidth > 0 &&
      existing.frameHeight > 0
    ) {
      const fw = existing.frameWidth;
      const fh = existing.frameHeight;
      const rx = existing.x ?? 0;
      const ry = existing.y ?? 0;
      const rw = existing.width;
      const rh = existing.height;

      const overflowsLeft = rx < 0;
      const overflowsTop = ry < 0;
      const overflowsRight = (rx + rw) > fw;
      const overflowsBottom = (ry + rh) > fh;
      const hasOverflow = overflowsLeft || overflowsTop || overflowsRight || overflowsBottom;

      existing.edgeOverflow = {
        overflowsLeft,
        overflowsTop,
        overflowsRight,
        overflowsBottom,
        hasOverflow,
      };
      existing.frameUnavailable = false;
      existing.measurementUnavailable = false;
      existing.unavailabilityReason = undefined;
    } else {
      existing.frameUnavailable = true;
      existing.measurementUnavailable = true;
      existing.edgeOverflow = null;
      existing.unavailabilityReason = meta?.unavailabilityReason || 'Frame dimensions unavailable';
    }

    // Evaluate allocationOverflow against ancestor card ONLY when explicitly named
    if (
      existing.ancestorCard &&
      existing.cardWidth != null &&
      existing.cardHeight != null &&
      existing.cardWidth > 0 &&
      existing.cardHeight > 0
    ) {
      const cw = existing.cardWidth;
      const ch = existing.cardHeight;
      const rx = existing.x ?? 0;
      const ry = existing.y ?? 0;
      const rw = existing.width;
      const rh = existing.height;

      const aLeft = rx < 0;
      const aTop = ry < 0;
      const aRight = (rx + rw) > cw;
      const aBottom = (ry + rh) > ch;
      const hasAllocOverflow = aLeft || aTop || aRight || aBottom || rw > cw || rh > ch;

      existing.allocationOverflow = {
        overflowsLeft: aLeft,
        overflowsTop: aTop,
        overflowsRight: aRight,
        overflowsBottom: aBottom,
        hasOverflow: hasAllocOverflow,
      };
    } else {
      existing.allocationOverflow = null;
    }
  } else {
    // Clear stale values on invalid events or unmount
    existing.isAvailable = false;
    existing.x = null;
    existing.y = null;
    existing.width = null;
    existing.height = null;
    existing.frameWidth = null;
    existing.frameHeight = null;
    existing.cardWidth = null;
    existing.cardHeight = null;
    existing.edgeOverflow = null;
    existing.allocationOverflow = null;
    existing.frameUnavailable = true;
    existing.measurementUnavailable = true;
    existing.unavailabilityReason = meta?.unavailabilityReason || 'Dimensions <= 0 or invalid event';
  }

  record.rectangles[name] = existing;

  // When gradient rect is recorded/updated, propagate its dimensions to child label if present
  if (name === 'gradient' && existing.isAvailable && record.rectangles?.label?.isAvailable) {
    const lbl = record.rectangles.label;
    if (existing.width != null && existing.height != null && existing.width > 0 && existing.height > 0) {
      lbl.frameWidth = existing.width;
      lbl.frameHeight = existing.height;
      if (lbl.width != null && lbl.height != null) {
        const rx = lbl.x ?? 0;
        const ry = lbl.y ?? 0;
        const overflowsLeft = rx < 0;
        const overflowsTop = ry < 0;
        const overflowsRight = (rx + lbl.width) > existing.width;
        const overflowsBottom = (ry + lbl.height) > existing.height;
        lbl.edgeOverflow = {
          overflowsLeft,
          overflowsTop,
          overflowsRight,
          overflowsBottom,
          hasOverflow: overflowsLeft || overflowsTop || overflowsRight || overflowsBottom,
        };
        lbl.frameUnavailable = false;
        lbl.measurementUnavailable = false;
        lbl.unavailabilityReason = undefined;
      }
    }
  }

  notifyListeners();
}

export function recordNamedLayoutUnavailable(
  targetId: DiagnosticTargetId,
  name: string,
  reason: string,
  meta?: {
    testID?: string;
    parentIdentity?: string;
    ancestorCard?: string | null;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  if (!record.rectangles) {
    record.rectangles = {};
  }

  record.rectangles[name] = {
    name,
    testID: meta?.testID || name,
    parentIdentity: meta?.parentIdentity || record.parentTestId,
    x: null,
    y: null,
    width: null,
    height: null,
    frameWidth: null,
    frameHeight: null,
    cardWidth: null,
    cardHeight: null,
    ancestorCard: meta?.ancestorCard || null,
    isAvailable: false,
    frameUnavailable: true,
    measurementUnavailable: true,
    unavailabilityReason: reason,
    edgeOverflow: null,
    allocationOverflow: null,
  };
  notifyListeners();
}

export function recordMeasurementUnavailable(
  targetId: DiagnosticTargetId,
  reason: string = 'Native measurement could not be obtained'
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  resetRecordToUnavailable(record, reason);
  notifyListeners();
}

/**
 * Invalidate a diagnostic target on unmount or screen transition.
 * Wipes out all stale values and marks measurementUnavailable.
 */
/**
 * Keeps the last measured snapshot after a screen unmounts, flagged as stale.
 * Practical need: the diagnostics panel is opened from Settings, so by the time
 * the user exports a report the measured screen has already unmounted. Clearing
 * the values (invalidateDiagnosticTarget) would destroy the only device evidence.
 * Values are preserved but explicitly labelled, never presented as current.
 */
export function markDiagnosticTargetStale(
  targetId: DiagnosticTargetId,
  reason: string = 'Target unmounted'
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  record.staleAfterUnmount = true;
  record.staleReason = reason;

  Object.values(record.rectangles ?? {}).forEach((rect) => {
    if (!rect) return;
    rect.staleAfterUnmount = true;
    rect.staleReason = reason;
  });

  notifyListeners();
}

export function invalidateDiagnosticTarget(
  targetId: DiagnosticTargetId,
  reason: string = 'Target unmounted or invalidated'
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  resetRecordToUnavailable(record, reason);
  notifyListeners();
}

/**
 * Production diagnostic hook.
 * Gated by the two-factor diagnostic build identity + env flag.
 * Zero timers, zero global listeners, zero polling.
 * When diagnostics are disabled, returns empty props and undefined onLayout callbacks.
 */
export function useDiagnosticTarget(
  targetId: DiagnosticTargetId,
  options?: {
    actualStyle?: any;
    targetTestId?: string;
    parentTestId?: string;
  }
) {
  if (!isDiagnosticModeEnabled()) {
    return {
      isDiagnostic: false,
      parentProps: {},
      targetProps: {},
      recordNamed: () => {},
      recordNamedUnavailable: () => {},
      getNamedRectProps: () => ({}),
      invalidateTarget: () => {},
      markTargetStale: () => {},
    };
  }

  const flattenedStyle = options?.actualStyle ? StyleSheet.flatten(options.actualStyle) : undefined;
  const targetTestID = options?.targetTestId || DEFAULT_TARGETS[targetId].targetTestId;
  const parentTestID = options?.parentTestId || DEFAULT_TARGETS[targetId].parentTestId;

  const recordNamed = (
    name: string,
    e: LayoutChangeEvent,
    meta?: {
      testID?: string;
      parentIdentity?: string;
      frameWidth?: number | null;
      frameHeight?: number | null;
      cardWidth?: number | null;
      cardHeight?: number | null;
      ancestorCard?: string | null;
      unavailabilityReason?: string;
    }
  ) => {
    const layout = e?.nativeEvent?.layout;
    if (
      !layout ||
      typeof layout.width !== 'number' ||
      typeof layout.height !== 'number' ||
      layout.width <= 0 ||
      layout.height <= 0
    ) {
      recordNamedLayout(targetId, name, null, {
        testID: meta?.testID || name,
        parentIdentity: meta?.parentIdentity || parentTestID,
        ancestorCard: meta?.ancestorCard,
        unavailabilityReason: 'Empty or invalid layout event on named rectangle',
      });
      return;
    }
    recordNamedLayout(targetId, name, layout, {
      testID: meta?.testID || name,
      parentIdentity: meta?.parentIdentity || parentTestID,
      frameWidth: meta?.frameWidth,
      frameHeight: meta?.frameHeight,
      cardWidth: meta?.cardWidth,
      cardHeight: meta?.cardHeight,
      ancestorCard: meta?.ancestorCard,
    });
  };

  const recordNamedUnavailable = (
    name: string,
    reason: string,
    meta?: { testID?: string; parentIdentity?: string; ancestorCard?: string | null }
  ) => {
    recordNamedLayoutUnavailable(targetId, name, reason, {
      testID: meta?.testID || name,
      parentIdentity: meta?.parentIdentity || parentTestID,
      ancestorCard: meta?.ancestorCard,
    });
  };

  const getNamedRectProps = (
    name: string,
    meta?: {
      testID?: string;
      parentIdentity?: string;
      frameWidth?: number | null;
      frameHeight?: number | null;
      cardWidth?: number | null;
      cardHeight?: number | null;
      ancestorCard?: string | null;
    }
  ) => ({
    testID: meta?.testID || name,
    onLayout: (e: LayoutChangeEvent) => recordNamed(name, e, meta),
  });

  const invalidateTarget = (reason?: string) => {
    invalidateDiagnosticTarget(targetId, reason || 'Target unmounted or invalidated');
  };

  return {
    isDiagnostic: true,
    parentProps: {
      testID: parentTestID,
      onLayout: (e: LayoutChangeEvent) => {
        const layout = e?.nativeEvent?.layout;
        if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number' || layout.width <= 0 || layout.height <= 0) {
          recordMeasurementUnavailable(targetId, 'Empty or invalid layout event on parent');
          return;
        }
        recordParentLayout(targetId, layout);
      },
    },
    targetProps: {
      testID: targetTestID,
      onLayout: (e: LayoutChangeEvent) => {
        const layout = e?.nativeEvent?.layout;
        if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number' || layout.width <= 0 || layout.height <= 0) {
          recordMeasurementUnavailable(targetId, 'Empty or invalid layout event on target');
          return;
        }
        recordTargetLayout(targetId, layout, flattenedStyle);
      },
    },
    recordNamed,
    recordNamedUnavailable,
    getNamedRectProps,
    invalidateTarget,
    markTargetStale: (reason?: string) => markDiagnosticTargetStale(targetId, reason),
  };
}

export function recordProbeLayout(
  id: string,
  kind: string,
  screen: string,
  layout: { x?: number; y?: number; width: number; height: number } | null | undefined,
  meta?: {
    frameWidth?: number | null;
    frameHeight?: number | null;
    isText?: boolean;
    isInteractive?: boolean;
    numberOfLines?: number;
    reportedLineCount?: number;
    reportedTotalLineHeight?: number;
    containerFixedStyleHeight?: number;
    resolvedStyleTextAlign?: string;
    resolvedStyleWritingDirection?: string;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  if (
    !layout ||
    typeof layout.width !== 'number' ||
    typeof layout.height !== 'number' ||
    layout.width <= 0 ||
    layout.height <= 0
  ) {
    return;
  }

  // Ensure network and error interceptors are active in diagnostic builds
  if (typeof globalThis.fetch === 'function' && !isFetchInterceptionInstalled) {
    installDiagnosticNetworkInterceptor();
  }
  if (!isErrorInterceptionInstalled) {
    installDiagnosticErrorInterceptor();
  }

  const existing = probeStore[id];
  const x = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
  const y = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
  const width = Math.round(layout.width * 10) / 10;
  const height = Math.round(layout.height * 10) / 10;
  const measuredAt = new Date().toISOString();
  const activeLanguage = getActiveLanguage();
  const activeTheme = getActiveTheme();

  const fw = meta?.frameWidth != null ? Math.round(meta.frameWidth * 10) / 10 : existing?.frameWidth ?? null;
  const fh = meta?.frameHeight != null ? Math.round(meta.frameHeight * 10) / 10 : existing?.frameHeight ?? null;

  let overflow: AutoProbeRecord['overflow'] = null;
  let overflowStatus: 'unknown' | 'no_overflow' | 'overflow' = 'unknown';
  let reason: string | undefined = undefined;

  if (fw != null && fh != null && fw > 0 && fh > 0) {
    const overflowsLeft = x < 0;
    const overflowsTop = y < 0;
    const overflowsRight = (x + width) > fw;
    const overflowsBottom = (y + height) > fh;
    const hasOverflow = overflowsLeft || overflowsTop || overflowsRight || overflowsBottom;

    overflow = {
      status: hasOverflow ? 'overflow' : 'no_overflow',
      hasOverflow,
      overflowsLeft,
      overflowsTop,
      overflowsRight,
      overflowsBottom,
      reason: hasOverflow ? 'Exceeds frame dimensions' : 'Within frame bounds',
    };
    overflowStatus = hasOverflow ? 'overflow' : 'no_overflow';
  } else {
    overflow = null;
    overflowStatus = 'unknown';
    reason = 'No known parent frame for auto-probe (status: unknown)';
  }

  // Find existing siblings in the same frame
  const siblings: Partial<AutoProbeRecord>[] = [];
  if (fw != null && fh != null) {
    Object.values(probeStore).forEach((other) => {
      if (
        other.id !== id &&
        other.screen === screen &&
        other.frameWidth === fw &&
        other.frameHeight === fh
      ) {
        siblings.push(other);
      }
    });
  }

  const isText = meta?.isText ?? existing?.isText ?? false;
  const isInteractive = meta?.isInteractive ?? existing?.isInteractive ?? false;
  const numberOfLines = meta?.numberOfLines ?? existing?.numberOfLines;
  const reportedLineCount = meta?.reportedLineCount ?? existing?.reportedLineCount;
  const reportedTotalLineHeight = meta?.reportedTotalLineHeight ?? existing?.reportedTotalLineHeight;
  const containerFixedStyleHeight = meta?.containerFixedStyleHeight ?? existing?.containerFixedStyleHeight;
  const resolvedStyleTextAlign = meta?.resolvedStyleTextAlign ?? existing?.resolvedStyleTextAlign;
  const resolvedStyleWritingDirection = meta?.resolvedStyleWritingDirection ?? existing?.resolvedStyleWritingDirection;

  const probeDraft: Partial<AutoProbeRecord> = {
    id,
    kind,
    screen,
    x,
    y,
    width,
    height,
    frameWidth: fw,
    frameHeight: fh,
    isText,
    isInteractive,
    numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    containerFixedStyleHeight,
    resolvedStyleTextAlign,
    resolvedStyleWritingDirection,
  };

  const defects = deriveProbeDefects(probeDraft, {
    isText,
    isInteractive,
    numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    containerFixedStyleHeight,
    resolvedStyleTextAlign,
    resolvedStyleWritingDirection,
    siblings,
  });

  // LRU store eviction at MAX_AUTO_PROBES (400)
  if (!probeStore[id]) {
    if (probeLRUOrder.length >= MAX_AUTO_PROBES) {
      const oldestId = probeLRUOrder.shift();
      if (oldestId) {
        delete probeStore[oldestId];
        // Keep the matrices bounded too: an evicted probe must not linger there.
        probeLanguageHistory.delete(oldestId);
        probeThemeHistory.delete(oldestId);
      }
    }
    probeLRUOrder.push(id);
  } else {
    const idx = probeLRUOrder.indexOf(id);
    if (idx >= 0) {
      probeLRUOrder.splice(idx, 1);
    }
    probeLRUOrder.push(id);
  }

  probeStore[id] = {
    id,
    kind,
    screen,
    language: activeLanguage,
    theme: activeTheme,
    x,
    y,
    width,
    height,
    frameWidth: fw,
    frameHeight: fh,
    measuredAt,
    staleAfterUnmount: false,
    staleReason: undefined,
    measurementUnavailable: false,
    unavailabilityReason: undefined,
    overflow,
    overflowStatus,
    reason,
    isText,
    isInteractive,
    numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    containerFixedStyleHeight,
    resolvedStyleTextAlign,
    resolvedStyleWritingDirection,
    defects,
  };

  // Record history for Language and Theme matrices
  let langMap = probeLanguageHistory.get(id);
  if (!langMap) {
    langMap = new Map();
    probeLanguageHistory.set(id, langMap);
  }
  langMap.set(activeLanguage, {
    width,
    height,
    x,
    y,
    textAlign: resolvedStyleTextAlign,
    writingDirection: resolvedStyleWritingDirection,
    timestamp: measuredAt,
  });

  let themeMap = probeThemeHistory.get(id);
  if (!themeMap) {
    themeMap = new Map();
    probeThemeHistory.set(id, themeMap);
  }
  themeMap.set(activeTheme, {
    width,
    height,
    x,
    y,
    timestamp: measuredAt,
  });

  notifyListeners();
}

export function recordProbeTextLayout(
  id: string,
  lines: { x?: number; y?: number; width?: number; height?: number }[]
): void {
  if (!isDiagnosticModeEnabled()) return;
  const probe = probeStore[id];
  if (!probe) return;

  const reportedLineCount = lines.length;
  let reportedTotalLineHeight = 0;
  for (const line of lines) {
    reportedTotalLineHeight += (line.height || 0);
  }

  probe.reportedLineCount = reportedLineCount;
  probe.reportedTotalLineHeight = reportedTotalLineHeight;

  // Re-derive defects with updated text metrics
  probe.defects = deriveProbeDefects(probe, {
    isText: true,
    numberOfLines: probe.numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    containerFixedStyleHeight: probe.containerFixedStyleHeight,
    resolvedStyleTextAlign: probe.resolvedStyleTextAlign,
    resolvedStyleWritingDirection: probe.resolvedStyleWritingDirection,
  });

  notifyListeners();
}

export function markProbeStale(id: string, reason: string = 'Element unmounted'): void {
  if (!isDiagnosticModeEnabled()) return;
  const probe = probeStore[id];
  if (!probe) return;
  probe.staleAfterUnmount = true;
  probe.staleReason = reason;
  notifyListeners();
}

export interface AutoProbeOptions {
  isInteractive?: boolean;
  isText?: boolean;
  numberOfLines?: number;
  style?: StyleProp<any>;
  textAlign?: string;
  writingDirection?: string;
  onPress?: (e?: any) => void;
  disabled?: boolean;
  containerFixedStyleHeight?: number;
  testID?: string;
}

/**
 * Production auto-probe hook for shared primitives.
 * Gated by two-factor diagnostic gate:
 * - When gate is OFF: returns {} (or { onPress } if provided; zero onLayout, zero listeners, zero timers).
 * - When gate is ON: returns { onLayout, onTextLayout, onPress }, registers stable/monotonic id,
 *   tags with active screen, language, theme, and records interaction effects.
 */
export function useAutoProbe(
  id?: string,
  kind?: string,
  options?: AutoProbeOptions
): {
  onLayout?: (e: LayoutChangeEvent) => void;
  onTextLayout?: (e: NativeSyntheticEvent<TextLayoutEventData>) => void;
  onPress?: (e?: any) => void;
} {
  const isEnabled = isDiagnosticModeEnabled();
  const screen = useDiagScreen();
  const effectiveKind = kind || 'probe';

  const [monotonicFallback] = useState(() =>
    isEnabled && (!id || id.trim().length === 0) ? getNextMonotonicProbeId(effectiveKind) : ''
  );

  const [instanceSeq] = useState(() => (isEnabled ? getNextProbeInstanceSeq() : 0));
  const baseId = (id && id.trim().length > 0) ? id.trim() : monotonicFallback;
  const stableId = isEnabled
    ? `${screen || 'unknown'}::${effectiveKind}::${baseId}#${instanceSeq}`
    : '';

  const activeTimersRef = useRef<Set<any>>(new Set());

  useEffect(() => {
    if (!isEnabled || !stableId) return;
    const timers = activeTimersRef.current;
    return () => {
      markProbeStale(stableId, `${effectiveKind} unmounted`);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [isEnabled, stableId, effectiveKind]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    if (!isEnabled || !stableId) return;
    const layout = e?.nativeEvent?.layout;
    if (layout) {
      let fixedStyleHeight: number | undefined = options?.containerFixedStyleHeight;
      if (fixedStyleHeight === undefined && options?.style) {
        const flat = StyleSheet.flatten(options.style);
        if (typeof flat?.height === 'number') {
          fixedStyleHeight = flat.height;
        }
      }

      recordProbeLayout(stableId, effectiveKind, screen, layout, {
        isText: options?.isText,
        isInteractive: options?.isInteractive,
        numberOfLines: options?.numberOfLines,
        containerFixedStyleHeight: fixedStyleHeight,
        resolvedStyleTextAlign: options?.textAlign,
        resolvedStyleWritingDirection: options?.writingDirection,
      });
    }
  }, [isEnabled, stableId, effectiveKind, screen, options]);

  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (!isEnabled || !stableId) return;
    const lines = e?.nativeEvent?.lines;
    if (Array.isArray(lines)) {
      recordProbeTextLayout(stableId, lines);
    }
  }, [isEnabled, stableId]);

  const wrappedOnPress = useCallback((e?: any) => {
    if (!isEnabled) {
      options?.onPress?.(e);
      return;
    }

    const preScreen = getGlobalActiveScreen() || screen || 'App';
    const preProbesCount = Object.keys(probeStore).length;
    const preErrorCount = errorLedger.length;
    const activeLang = getActiveLanguage();
    const activeTheme = getActiveTheme();
    const timestamp = new Date().toISOString();

    const record: DiagnosticInteractionRecord = {
      id: stableId,
      screen: preScreen,
      language: activeLang,
      theme: activeTheme,
      timestamp,
      handlerPresent: typeof options?.onPress === 'function',
      disabled: Boolean(options?.disabled),
      effect: 'noObservableEffect',
      targetScreen: preScreen,
    };

    if (options?.disabled || !options?.onPress) {
      record.effect = 'noObservableEffect';
      recordInteraction(record);
      return;
    }

    let threw = false;
    try {
      options.onPress(e);
    } catch (err: any) {
      threw = true;
      record.effect = 'error';
      record.errorName = err?.name || 'Error';
      recordInteraction(record);
      throw err;
    }

    if (!threw) {
      recordInteraction(record);
      // Single-shot bounded timer (1000ms max, cleared on unmount)
      const timerId = setTimeout(() => {
        activeTimersRef.current.delete(timerId);
        const currentScreen = getGlobalActiveScreen() || 'App';
        if (currentScreen !== preScreen) {
          record.effect = 'navigated';
          record.targetScreen = currentScreen;
        } else if (errorLedger.length > preErrorCount) {
          record.effect = 'error';
        } else if (Object.keys(probeStore).length !== preProbesCount) {
          record.effect = 'stateChanged';
        } else {
          // Explicitly documented: signal to investigate, not proof of a broken button
          record.effect = 'noObservableEffect';
        }
        notifyListeners();
      }, 1000);
      activeTimersRef.current.add(timerId);
    }
  }, [isEnabled, stableId, screen, options]);

  // Strict hard gate check: return immediately if gate is off
  if (!isEnabled) {
    return options?.onPress ? { onPress: options.onPress } : {};
  }

  return {
    onLayout,
    onTextLayout: options?.isText ? onTextLayout : undefined,
    onPress: options?.onPress ? wrappedOnPress : undefined,
  };
}

/**
 * Builds an anonymized JSON report:
 * STRICT PRIVACY GUARANTEE:
 * - Zero Quran text
 * - Zero user content / user data
 * - Zero settings values
 * - Zero secrets/tokens / credentials
 * - Exported payload is strictly limited to structural layout geometry (dimensions, relative offsets x/y, overflow flags) and developer component/test IDs.
 */
export function buildDiagnosticReport(): DiagnosticReport {
  const activeLocale = getActiveLanguage();
  const activeTheme = getActiveTheme();
  const directionHelper = isI18nRTL() ? 'rtl' : 'ltr';
  const nativeIsRTL = Boolean(I18nManager.isRTL);

  const measurements: DiagnosticMeasurementReportItem[] = getTargetMeasurements().map((item) => ({
    screenId: item.screenId,
    componentId: item.componentId,
    targetTestId: item.targetTestId,
    parentTestId: item.parentTestId,
    status: item.status,
    measurementUnavailable: item.measurementUnavailable,
    staleAfterUnmount: item.staleAfterUnmount ?? false,
    staleReason: item.staleReason,
    nativeComputedStyleUnavailable: true,
    dimensions: {
      targetX: item.targetX,
      targetY: item.targetY,
      targetWidth: item.targetWidth,
      targetHeight: item.targetHeight,
      textContainerWidth: item.textContainerWidth,
      textContainerHeight: item.textContainerHeight,
      parentX: item.parentX,
      parentY: item.parentY,
      parentWidth: item.parentWidth,
      parentHeight: item.parentHeight,
    },
    resolvedContainerLayout: {
      x: item.targetX,
      y: item.targetY,
      width: item.targetWidth,
      height: item.targetHeight,
    },
    parentLayout: {
      x: item.parentX,
      y: item.parentY,
      width: item.parentWidth,
      height: item.parentHeight,
    },
    resolvedStyleTextAlign: item.resolvedStyleTextAlign,
    resolvedStyleWritingDirection: item.resolvedStyleWritingDirection,
    alignment: {
      textAlign: item.resolvedStyleTextAlign,
      writingDirection: item.resolvedStyleWritingDirection,
    },
    overflow: {
      status: item.overflowStatus,
      clippingStatus: item.clippingStatus,
      isWidthOverflowing: item.isWidthOverflowing,
      isHeightOverflowing: item.isHeightOverflowing,
      edgeOverflow: item.edgeOverflow,
    },
    rectangles: item.rectangles || {},
    nativeIsRTL: item.nativeIsRTL,
  }));

  // Diagnostics must not measure themselves: the panel renders the same shared
  // primitives, so excluding its own probe ids keeps the report about the app.
  const isDiagnosticSelfProbe = (p: { id: string; kind?: string; screen?: string }) => {
    if (p.screen === 'Diagnostics') return true;
    if ((p.kind || '').startsWith('diag')) return true;
    // ids are composed as screen::kind::base#instance in current builds, and were
    // plain base ids in earlier ones - check every segment for the diag- prefix.
    return p.id.split(/::|#/).some((seg) => seg.startsWith('diag-'));
  };
  const rawProbes = getAutoProbes().filter((p) => !isDiagnosticSelfProbe(p));
  const probes: DiagnosticProbeReportItem[] = rawProbes.map((p) => ({
    ...p,
  }));

  // Derive defect counts and items
  const defectCounts: Record<DefectClass, number> = {
    textTruncated: 0,
    subTouchTarget: 0,
    offScreen: 0,
    outsideParent: 0,
    siblingOverlap: 0,
    rtlTextAlignMismatch: 0,
    fixedHeightTextRisk: 0,
  };
  const defectItems: DiagnosticDefectReportItem[] = [];

  for (const p of rawProbes) {
    if (p.defects) {
      (Object.keys(defectCounts) as DefectClass[]).forEach((cls) => {
        const item = p.defects[cls];
        if (item && item.flag === true) {
          defectCounts[cls]++;
          defectItems.push({
            probeId: p.id,
            defectClass: cls,
            screen: p.screen,
            reason: item.reason,
          });
        }
      });
    }
  }
  const totalDefects = Object.values(defectCounts).reduce((a, b) => a + b, 0);

  // Interaction breakdown
  const interactionCounts: Record<InteractionEffect, number> = {
    navigated: 0,
    stateChanged: 0,
    noObservableEffect: 0,
    error: 0,
  };
  interactionLedger.forEach((it) => {
    if (interactionCounts[it.effect] !== undefined) {
      interactionCounts[it.effect]++;
    }
  });

  // Language matrix
  const languageMatrixItems: DiagnosticLanguageMatrixItem[] = [];
  let languageMismatchCount = 0;
  probeLanguageHistory.forEach((capturesMap, probeId) => {
    const probe = probeStore[probeId];
    const screen = probe?.screen || 'unknown';
    const captures = Object.fromEntries(capturesMap.entries());
    let mismatch = false;

    if (capturesMap.size >= 2) {
      let minW = Infinity;
      let maxW = -Infinity;
      let minH = Infinity;
      let maxH = -Infinity;
      capturesMap.forEach((cap) => {
        if (cap.width != null && cap.width > 0) {
          minW = Math.min(minW, cap.width);
          maxW = Math.max(maxW, cap.width);
        }
        if (cap.height != null && cap.height > 0) {
          minH = Math.min(minH, cap.height);
          maxH = Math.max(maxH, cap.height);
        }
      });
      if (minW < Infinity && maxW > -Infinity && minW > 0) {
        if ((maxW - minW) / minW > 0.20) mismatch = true;
      }
      if (minH < Infinity && maxH > -Infinity && minH > 0) {
        if ((maxH - minH) / minH > 0.20) mismatch = true;
      }
      if (mismatch) languageMismatchCount++;
      languageMatrixItems.push({
        probeId,
        screen,
        captures,
        languageGeometryMismatch: mismatch,
        needsRevisit: false,
      });
    } else {
      languageMatrixItems.push({
        probeId,
        screen,
        captures,
        languageGeometryMismatch: false,
        needsRevisit: true,
        reason: 'Only 1 language captured; switch language to record comparison',
      });
    }
  });

  // Theme matrix
  const themeMatrixItems: DiagnosticThemeMatrixItem[] = [];
  let themeMismatchCount = 0;
  probeThemeHistory.forEach((themeMap, probeId) => {
    const probe = probeStore[probeId];
    const screen = probe?.screen || 'unknown';
    const light = themeMap.get('light');
    const dark = themeMap.get('dark');

    if (light && dark) {
      let mismatch = false;
      if (light.width != null && dark.width != null && Math.min(light.width, dark.width) > 0) {
        const minW = Math.min(light.width, dark.width);
        if (Math.abs(light.width - dark.width) / minW > 0.20) mismatch = true;
      }
      if (light.height != null && dark.height != null && Math.min(light.height, dark.height) > 0) {
        const minH = Math.min(light.height, dark.height);
        if (Math.abs(light.height - dark.height) / minH > 0.20) mismatch = true;
      }
      if (mismatch) themeMismatchCount++;
      themeMatrixItems.push({
        probeId,
        screen,
        light,
        dark,
        themeGeometryMismatch: mismatch,
        needsRevisit: false,
      });
    } else {
      themeMatrixItems.push({
        probeId,
        screen,
        light,
        dark,
        themeGeometryMismatch: false,
        needsRevisit: true,
        reason: 'Only 1 theme captured; toggle theme to record comparison',
      });
    }
  });

  // Network summary
  const netSummary: DiagnosticNetworkSummary = {
    total: networkLedger.length,
    ok: networkLedger.filter((n) => n.ok).length,
    failed: networkLedger.filter((n) => !n.ok).length,
    statusClassBreakdown: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
      'network/0': 0,
    },
    timeouts: networkLedger.filter((n) => n.timeout).length,
    offlineFallbacks: networkLedger.filter((n) => n.cachedFallback).length,
    slowestCall: null,
  };
  let maxDuration = -1;
  networkLedger.forEach((n) => {
    if (n.status >= 200 && n.status < 300) netSummary.statusClassBreakdown['2xx']++;
    else if (n.status >= 300 && n.status < 400) netSummary.statusClassBreakdown['3xx']++;
    else if (n.status >= 400 && n.status < 500) netSummary.statusClassBreakdown['4xx']++;
    else if (n.status >= 500 && n.status < 600) netSummary.statusClassBreakdown['5xx']++;
    else netSummary.statusClassBreakdown['network/0']++;

    if (n.durationMs > maxDuration) {
      maxDuration = n.durationMs;
      netSummary.slowestCall = {
        host: n.host,
        path: n.path,
        method: n.method,
        durationMs: n.durationMs,
      };
    }
  });

  // Screen coverage
  const visitedScreens = Array.from(new Set(rawProbes.map((p) => p.screen))).filter(Boolean).sort();
  const unvisitedScreens = KNOWN_SCREENS.filter((s) => !visitedScreens.includes(s)).sort();
  const coverage: DiagnosticCoverage = {
    screensVisited: visitedScreens,
    screensUnvisited: unvisitedScreens,
    visitedCount: visitedScreens.length,
    unvisitedCount: unvisitedScreens.length,
    coveragePercent: KNOWN_SCREENS.length > 0 ? Math.round((visitedScreens.length / KNOWN_SCREENS.length) * 100) : 0,
  };

  return {
    timestamp: new Date().toISOString(),
    buildId: DIAGNOSTIC_BUILD_ID,
    version: DIAGNOSTIC_VERSION,
    versionCode: DIAGNOSTIC_VERSION_CODE,
    locale: activeLocale,
    theme: activeTheme,
    directionHelperResult: directionHelper,
    i18nManagerIsRTL: nativeIsRTL,
    probeCount: probes.length,
    probes,
    defects: {
      countsByClass: defectCounts,
      totalDefects,
      items: defectItems,
    },
    interactions: {
      total: interactionLedger.length,
      countsByEffect: interactionCounts,
      items: [...interactionLedger],
    },
    languageMatrix: {
      mismatchCount: languageMismatchCount,
      items: languageMatrixItems,
    },
    themeMatrix: {
      mismatchCount: themeMismatchCount,
      items: themeMatrixItems,
    },
    network: {
      summary: netSummary,
      items: [...networkLedger],
    },
    errors: {
      total: errorLedger.length,
      items: [...errorLedger],
    },
    coverage,
    summary: {
      probeCount: probes.length,
      totalDefects,
      interactionCount: interactionLedger.length,
      networkRequestCount: networkLedger.length,
      errorCount: errorLedger.length,
      visitedScreensCount: visitedScreens.length,
    },
    screensVisited: visitedScreens,
    screensUnvisited: unvisitedScreens,
    measurements,
  };
}

/**
 * Truthful export handling:
 * - Generates anonymized file successfully on disk first.
 * - Confirmed success is strictly reserved for confirmed filesystem writes / copy operations.
 * - On Android expo-sharing, chooser completion cannot be confirmed by the OS.
 *   Therefore, it is NEVER reported as success or "report ready" implying share completed.
 *   It explicitly returns shareStatus: 'unknown' and status: 'userActionRequired' with fileReady: true.
 * - Always keeps export actionable for retry with zero private content.
 */
export async function exportDiagnosticReport(): Promise<ExportReportResult> {
  try {
    const report = buildDiagnosticReport();
    const jsonString = JSON.stringify(report, null, 2);
    const fileName = `rtl-diagnostic-report-${Date.now()}.json`;

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return {
          success: true,
          status: 'fileReady',
          shareStatus: 'unavailable',
          fileReady: true,
          filePath: fileName,
          shareInvoked: false,
        };
      }
      return {
        success: false,
        status: 'unavailable',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'Web document environment is unavailable.',
      };
    }

    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) {
      return {
        success: false,
        status: 'unavailable',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'No writable directory found on device.',
      };
    }

    const filePath = `${dir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8',
    });

    // Verify written file exists on disk
    const fileInfo = await FileSystem.getInfoAsync(filePath).catch(() => null);
    if (!fileInfo || !fileInfo.exists) {
      return {
        success: false,
        status: 'failed',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'Report file could not be verified on disk.',
      };
    }

    // File generation is confirmed on disk
    const sharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (sharingAvailable) {
      try {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: getDiagnosticShareDialogTitle(),
        });
        // Android expo-sharing resolves with null for both share completion and chooser dismissal.
        // It cannot confirm completion. Report truthful shareStatus: 'unknown' and status: 'userActionRequired'.
        return {
          success: false,
          status: 'userActionRequired',
          shareStatus: 'unknown',
          fileReady: true,
          shareInvoked: true,
          filePath,
        };
      } catch (shareErr) {
        return {
          success: false,
          status: 'failed',
          shareStatus: 'unavailable',
          fileReady: true,
          shareInvoked: false,
          error: shareErr instanceof Error ? shareErr.message : String(shareErr),
          filePath,
        };
      }
    }

    // Native fallback to React Native Share
    if (Share && typeof Share.share === 'function') {
      try {
        const shareResult = await Share.share({
          title: getDiagnosticShareTitle(),
          message: jsonString,
        });

        if (shareResult.action === Share.dismissedAction) {
          return {
            success: false,
            status: 'cancelledOrUnknown',
            shareStatus: 'cancelled',
            fileReady: true,
            shareInvoked: true,
            error: 'Share dialog dismissed.',
            filePath,
          };
        } else if (shareResult.action === Share.sharedAction) {
          // On Android, sharedAction is returned even upon dismissal, so report shareStatus: 'unknown' truthfully.
          return {
            success: false,
            status: 'userActionRequired',
            shareStatus: 'unknown',
            fileReady: true,
            shareInvoked: true,
            filePath,
          };
        }
      } catch (rnShareErr) {
        return {
          success: false,
          status: 'failed',
          shareStatus: 'unavailable',
          fileReady: true,
          shareInvoked: false,
          error: rnShareErr instanceof Error ? rnShareErr.message : String(rnShareErr),
          filePath,
        };
      }
    }

    // No sharing module available, but file was written successfully
    return {
      success: true,
      status: 'fileReady',
      shareStatus: 'unavailable',
      fileReady: true,
      shareInvoked: false,
      filePath,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: 'failed',
      shareStatus: 'unavailable',
      fileReady: false,
      error: errorMessage,
    };
  }
}
