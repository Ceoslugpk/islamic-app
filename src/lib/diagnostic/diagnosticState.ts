import { I18nManager, Platform, Share, LayoutChangeEvent, StyleSheet } from 'react-native';
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

export type DiagnosticTargetId =
  | 'quran-landing-surah-card'
  | 'downloads-empty-cta-card'
  | 'prayer-reminders-selection-controls';

export type MeasurementStatus = 'measured' | 'pending' | 'measurementUnavailable';
export type OverflowStatus = 'no_overflow' | 'overflow' | 'unavailable';
export type ClippingStatus = 'not_clipped' | 'clipped' | 'unavailable';

export interface TargetLayoutRecord {
  screenId: string;
  componentId: DiagnosticTargetId;
  targetTestId: string;
  parentTestId: string;
  status: MeasurementStatus;
  measurementUnavailable: boolean;
  nativeComputedStyleUnavailable: boolean;
  targetWidth: number | null;
  targetHeight: number | null;
  textContainerWidth: number | null; // Compatibility alias for targetWidth
  textContainerHeight: number | null; // Compatibility alias for targetHeight
  parentWidth: number | null;
  parentHeight: number | null;
  resolvedContainerLayout: {
    width: number | null;
    height: number | null;
  };
  parentLayout: {
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
  overflowDetails: {
    widthOverflow: boolean | null;
    heightOverflow: boolean | null;
  };
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
    targetWidth: number | null;
    targetHeight: number | null;
    textContainerWidth: number | null;
    textContainerHeight: number | null;
    parentWidth: number | null;
    parentHeight: number | null;
  };
  resolvedContainerLayout: {
    width: number | null;
    height: number | null;
  };
  parentLayout: {
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
  };
  nativeIsRTL: boolean;
}

export interface DiagnosticReport {
  timestamp: string;
  buildId: string;
  version: string;
  versionCode: number;
  locale: string;
  directionHelperResult: 'rtl' | 'ltr';
  i18nManagerIsRTL: boolean;
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
};

function createInitialStore(): Record<DiagnosticTargetId, TargetLayoutRecord> {
  const store = {} as Record<DiagnosticTargetId, TargetLayoutRecord>;
  (Object.keys(DEFAULT_TARGETS) as DiagnosticTargetId[]).forEach((id) => {
    store[id] = {
      screenId: DEFAULT_TARGETS[id].screenId,
      componentId: id,
      targetTestId: DEFAULT_TARGETS[id].targetTestId,
      parentTestId: DEFAULT_TARGETS[id].parentTestId,
      status: 'pending',
      measurementUnavailable: true,
      nativeComputedStyleUnavailable: true,
      targetWidth: null,
      targetHeight: null,
      textContainerWidth: null,
      textContainerHeight: null,
      parentWidth: null,
      parentHeight: null,
      resolvedContainerLayout: { width: null, height: null },
      parentLayout: { width: null, height: null },
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
      overflowDetails: {
        widthOverflow: null,
        heightOverflow: null,
      },
      nativeIsRTL: Boolean(I18nManager.isRTL),
    };
  });
  return store;
}

let measurementsStore: Record<DiagnosticTargetId, TargetLayoutRecord> = createInitialStore();
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
  record.targetWidth = null;
  record.targetHeight = null;
  record.textContainerWidth = null;
  record.textContainerHeight = null;
  record.parentWidth = null;
  record.parentHeight = null;
  record.resolvedContainerLayout = { width: null, height: null };
  record.parentLayout = { width: null, height: null };
  record.overflowStatus = 'unavailable';
  record.clippingStatus = 'unavailable';
  record.isWidthOverflowing = null;
  record.isHeightOverflowing = null;
  record.overflowDetails = {
    widthOverflow: null,
    heightOverflow: null,
  };
  record.nativeIsRTL = Boolean(I18nManager.isRTL);
}

function updateOverflowAndStatus(record: TargetLayoutRecord): void {
  const hasParent = record.parentWidth != null && record.parentHeight != null && record.parentWidth > 0 && record.parentHeight > 0;
  const hasTarget = record.targetWidth != null && record.targetHeight != null && record.targetWidth > 0 && record.targetHeight > 0;

  if (hasParent && hasTarget) {
    const widthOverflow = record.targetWidth! > record.parentWidth!;
    const heightOverflow = record.targetHeight! > record.parentHeight!;
    const anyOverflow = widthOverflow || heightOverflow;

    record.isWidthOverflowing = widthOverflow;
    record.isHeightOverflowing = heightOverflow;
    record.overflowDetails = {
      widthOverflow,
      heightOverflow,
    };
    record.overflowStatus = anyOverflow ? 'overflow' : 'no_overflow';
    record.clippingStatus = anyOverflow ? 'clipped' : 'not_clipped';
    record.status = 'measured';
    record.measurementUnavailable = false;
    record.measuredAt = new Date().toISOString();
  } else {
    // When either parent or target cannot be measured, do not report false or stale values
    record.isWidthOverflowing = null;
    record.isHeightOverflowing = null;
    record.overflowDetails = {
      widthOverflow: null,
      heightOverflow: null,
    };
    record.overflowStatus = 'unavailable';
    record.clippingStatus = 'unavailable';
    record.measurementUnavailable = true;
  }
}

export function recordParentLayout(
  targetId: DiagnosticTargetId,
  layout: { width: number; height: number }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  if (layout && typeof layout.width === 'number' && typeof layout.height === 'number' && layout.width > 0 && layout.height > 0) {
    record.parentWidth = Math.round(layout.width * 10) / 10;
    record.parentHeight = Math.round(layout.height * 10) / 10;
    record.parentLayout = {
      width: record.parentWidth,
      height: record.parentHeight,
    };
    record.nativeIsRTL = Boolean(I18nManager.isRTL);
    updateOverflowAndStatus(record);
  } else {
    resetRecordToUnavailable(record, 'Parent dimensions reported <= 0');
  }
  notifyListeners();
}

export function recordTargetLayout(
  targetId: DiagnosticTargetId,
  layout: { width: number; height: number },
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
    record.targetWidth = Math.round(layout.width * 10) / 10;
    record.targetHeight = Math.round(layout.height * 10) / 10;
    record.textContainerWidth = record.targetWidth;
    record.textContainerHeight = record.targetHeight;
    record.resolvedContainerLayout = {
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
    };
  }

  const flattenedStyle = options?.actualStyle ? StyleSheet.flatten(options.actualStyle) : undefined;

  return {
    isDiagnostic: true,
    parentProps: {
      testID: options?.parentTestId || DEFAULT_TARGETS[targetId].parentTestId,
      onLayout: (e: LayoutChangeEvent) => {
        const layout = e.nativeEvent?.layout;
        if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number' || layout.width <= 0 || layout.height <= 0) {
          recordMeasurementUnavailable(targetId, 'Empty or invalid layout event on parent');
          return;
        }
        recordParentLayout(targetId, layout);
      },
    },
    targetProps: {
      testID: options?.targetTestId || DEFAULT_TARGETS[targetId].targetTestId,
      onLayout: (e: LayoutChangeEvent) => {
        const layout = e.nativeEvent?.layout;
        if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number' || layout.width <= 0 || layout.height <= 0) {
          recordMeasurementUnavailable(targetId, 'Empty or invalid layout event on target');
          return;
        }
        recordTargetLayout(targetId, layout, flattenedStyle);
      },
    },
  };
}

/**
 * Builds an anonymized JSON report:
 * STRICT PRIVACY GUARANTEE:
 * - Zero Quran text
 * - Zero user content
 * - Zero coordinates (no x/y offsets)
 * - Zero settings values
 * - Zero secrets/tokens
 */
export function buildDiagnosticReport(): DiagnosticReport {
  const activeLocale = i18n.language || 'en';
  const directionHelper = isI18nRTL() ? 'rtl' : 'ltr';
  const nativeIsRTL = Boolean(I18nManager.isRTL);

  const measurements: DiagnosticMeasurementReportItem[] = getTargetMeasurements().map((item) => ({
    screenId: item.screenId,
    componentId: item.componentId,
    targetTestId: item.targetTestId,
    parentTestId: item.parentTestId,
    status: item.status,
    measurementUnavailable: item.measurementUnavailable,
    nativeComputedStyleUnavailable: true,
    dimensions: {
      targetWidth: item.targetWidth,
      targetHeight: item.targetHeight,
      textContainerWidth: item.textContainerWidth,
      textContainerHeight: item.textContainerHeight,
      parentWidth: item.parentWidth,
      parentHeight: item.parentHeight,
    },
    resolvedContainerLayout: {
      width: item.targetWidth,
      height: item.targetHeight,
    },
    parentLayout: {
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
    },
    nativeIsRTL: item.nativeIsRTL,
  }));

  return {
    timestamp: new Date().toISOString(),
    buildId: DIAGNOSTIC_BUILD_ID,
    version: DIAGNOSTIC_VERSION,
    versionCode: DIAGNOSTIC_VERSION_CODE,
    locale: activeLocale,
    directionHelperResult: directionHelper,
    i18nManagerIsRTL: nativeIsRTL,
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
