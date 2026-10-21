import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { PremiumCard } from '../ui/PremiumCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { OutlineButton } from '../ui/OutlineButton';
import { useThemeTokens } from '../../theme/tokens';
import { getCardShadow } from '../../lib/theme';
import i18n, { isRTL as isI18nRTL, t } from '../../lib/i18n';
import {
  diagT,
  getLocalizedMeasurementStatus,
  getLocalizedExportStatus,
  getLocalizedUnavailabilityReason,
} from '../../lib/diagnostic/diagnosticI18n';
import {
  DIAGNOSTIC_BUILD_ID,
  DIAGNOSTIC_VERSION,
  DIAGNOSTIC_VERSION_CODE,
} from '../../lib/diagnostic/diagnosticConfig';
import { DiagScreenProvider } from '../../lib/diagnostic/diagnosticScreenContext';
import {
  getTargetMeasurements,
  getAutoProbes,
  KNOWN_SCREENS,
  addDiagnosticListener,
  buildDiagnosticReport,
  exportDiagnosticReport,
  exportDiagnosticSummary,
  flushDiagnosticNotifications,
  getDiagnosticNotificationStats,
  getDiagnosticListenerCount,
  formatByteSize,
  getEstimatedReportSizeBytes,
  getEstimatedSummarySizeBytes,
  TargetLayoutRecord,
  AutoProbeRecord,
  DiagnosticDefectReportItem,
} from '../../lib/diagnostic';

interface RtlDiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

const MAX_DISPLAYED_ROWS = 50;

// ---------------------------------------------------------------------------
// Memoized Row Components — stable identity across flushes prevents row rebuild
// ---------------------------------------------------------------------------

interface TargetRowProps {
  target: TargetLayoutRecord;
  tokens: any;
  isScreenRTL: boolean;
  mode: any;
}

const TargetRow = React.memo(function TargetRow({
  target,
  tokens,
  isScreenRTL,
  mode,
}: TargetRowProps) {
  const isMeasured = target.status === 'measured';
  const isUnavailable = target.status === 'measurementUnavailable';
  const hasOverflow = target.overflowStatus === 'overflow';

  const statusColor = isMeasured
    ? tokens.accent
    : isUnavailable
    ? tokens.danger
    : tokens.textMuted;
  const statusBg = isMeasured
    ? tokens.accentDim
    : isUnavailable
    ? `${tokens.danger}18`
    : tokens.cardBorder;

  return (
    <PremiumCard
      testID={`diag-target-${target.componentId}`}
      style={[styles.card, getCardShadow(mode)]}
      padded
    >
      <View style={[styles.targetHeader, isScreenRTL && styles.targetHeaderRTL]}>
        <View style={{ flex: 1 }}>
          <AppText
            testID={`diag-target-id-${target.componentId}`}
            variant="rowTitle"
            style={[styles.targetTitle, { textAlign: isScreenRTL ? 'right' : 'left' }]}
          >
            {target.componentId}
          </AppText>
          <AppText
            variant="caption"
            tone="faint"
            style={{ textAlign: isScreenRTL ? 'right' : 'left' }}
          >
            {diagT('Screen')}: {target.screenId} · {t('Target')}: {target.targetTestId}
          </AppText>
          <AppText
            variant="caption"
            tone="faint"
            style={{ textAlign: isScreenRTL ? 'right' : 'left', fontSize: 10 }}
          >
            {diagT('Parent')}: {target.parentTestId}
          </AppText>
        </View>
        <View
          testID={`diag-status-${target.componentId}`}
          style={[styles.statusPill, { backgroundColor: statusBg }]}
        >
          <AppText
            variant="caption"
            style={{
              color: statusColor,
              fontWeight: '700',
              fontSize: 10,
            }}
          >
            {getLocalizedMeasurementStatus(target.status)}
          </AppText>
        </View>
      </View>

      {target.staleAfterUnmount ? (
        <AppText
          testID={`diag-stale-${target.componentId}`}
          variant="caption"
          tone="faint"
          style={styles.staleNote}
        >
          Snapshot taken before this screen was closed; reopen it for current values.
        </AppText>
      ) : null}

      <View style={[styles.divider, { backgroundColor: tokens.cardBorder }]} />

      <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {t('Status')}:
        </AppText>
        <AppText
          variant="caption"
          style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
        >
          {isMeasured
            ? diagT('Measured natively')
            : isUnavailable
            ? `${t('Error')}: ${target.unavailabilityReason ? getLocalizedUnavailabilityReason(target.unavailabilityReason) : diagT('Measurement Unavailable')}`
            : t('Pending')}
        </AppText>
      </View>

      <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {diagT('Alignment & Direction')}:
        </AppText>
        <AppText
          testID={`diag-align-${target.componentId}`}
          variant="caption"
          style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
        >
          {isMeasured
            ? `textAlign: ${target.resolvedStyleTextAlign} · dir: ${target.resolvedStyleWritingDirection}`
            : 'textAlign: unspecified · dir: unspecified'}
        </AppText>
      </View>

      <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {t('Target')} (W × H):
        </AppText>
        <AppText
          testID={`diag-dims-${target.componentId}`}
          variant="caption"
          style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
        >
          {target.targetWidth != null ? `${target.targetWidth} pt` : '—'} ×{' '}
          {target.targetHeight != null ? `${target.targetHeight} pt` : '—'}
        </AppText>
      </View>

      <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {diagT('Parent')} (W × H):
        </AppText>
        <AppText
          testID={`diag-parent-dims-${target.componentId}`}
          variant="caption"
          style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
        >
          {target.parentWidth != null ? `${target.parentWidth} pt` : '—'} ×{' '}
          {target.parentHeight != null ? `${target.parentHeight} pt` : '—'}
        </AppText>
      </View>

      <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {diagT('Native Computed Style')}:
        </AppText>
        <AppText
          testID={`diag-computed-style-flag-${target.componentId}`}
          variant="caption"
          style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
        >
          {target.nativeComputedStyleUnavailable
            ? diagT('Unavailable (JS probe only)')
            : diagT('Available')}
        </AppText>
      </View>

      <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {t('Status')} ({diagT('Overflow')}):
        </AppText>
        <AppText
          testID={`diag-overflow-${target.componentId}`}
          variant="caption"
          style={[
            styles.infoValue,
            {
              color: hasOverflow
                ? '#EF4444'
                : isMeasured
                ? '#10B981'
                : tokens.textMuted,
              fontWeight: '600',
              textAlign: isScreenRTL ? 'left' : 'right',
            },
          ]}
        >
          {hasOverflow
            ? `${target.isWidthOverflowing ? `${diagT('Width Overflow')} ` : ''}${
                target.isHeightOverflowing ? diagT('Height Overflow') : ''
              }`.trim()
            : isMeasured
            ? diagT('No Overflow (Bounded)')
            : t('Pending')}
        </AppText>
      </View>

      {target.rectangles && Object.keys(target.rectangles).length > 0 && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tokens.cardBorder }}>
          <AppText
            variant="caption"
            tone="faint"
            style={{ fontWeight: '700', marginBottom: 4, textAlign: isScreenRTL ? 'right' : 'left' }}
          >
            {t('Details')} · {diagT('Runtime Layout')} ({Object.keys(target.rectangles).length}):
          </AppText>
          {Object.entries(target.rectangles).map(([rName, r]) => (
            <View key={rName} style={[styles.infoRow, isScreenRTL && styles.infoRowRTL, { marginBottom: 2 }]}>
              <AppText variant="caption" tone="faint" style={[styles.infoLabel, { fontSize: 11, textAlign: isScreenRTL ? 'right' : 'left' }]}>
                {rName}:
              </AppText>
              <AppText
                variant="caption"
                style={[
                  styles.infoValue,
                  {
                    fontSize: 11,
                    color: r.isAvailable ? (r.edgeOverflow?.hasOverflow ? '#EF4444' : tokens.text) : tokens.textMuted,
                    textAlign: isScreenRTL ? 'left' : 'right',
                  },
                ]}
              >
                {r.isAvailable
                  ? `${r.width}×${r.height}${r.x != null && r.y != null ? ` @(${r.x},${r.y})` : ''} (${
                      r.frameUnavailable
                        ? diagT('Unavailable')
                        : r.edgeOverflow?.hasOverflow
                          ? ((r.edgeOverflow.overflowsLeft || r.edgeOverflow.overflowsRight)
                              ? diagT('Width Overflow')
                              : diagT('Height Overflow'))
                          : diagT('No Overflow (Bounded)')
                    })`
                  : t('Pending')}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {!isMeasured && (
        <AppText
          variant="caption"
          tone="faint"
          style={[styles.pendingHint, { textAlign: isScreenRTL ? 'right' : 'left' }]}
        >
          {t('Pending')}… {diagT('Navigate to')} {target.screenId}
        </AppText>
      )}
    </PremiumCard>
  );
});

interface ProbeRowProps {
  probe: AutoProbeRecord;
  tokens: any;
  isScreenRTL: boolean;
}

const ProbeRow = React.memo(function ProbeRow({ probe, tokens, isScreenRTL }: ProbeRowProps) {
  const hasOverflow = Boolean(probe.overflow?.hasOverflow);
  const isUnknown = probe.overflow === null;
  const statusColor = hasOverflow
    ? '#EF4444'
    : isUnknown
    ? tokens.textMuted
    : '#10B981';
  const statusBg = hasOverflow
    ? '#EF444418'
    : isUnknown
    ? tokens.cardBorder
    : '#10B98118';
  const statusText = hasOverflow
    ? (probe.overflow?.overflowsLeft || probe.overflow?.overflowsRight
        ? diagT('Width Overflow')
        : diagT('Height Overflow'))
    : isUnknown
    ? diagT('Unknown')
    : diagT('No overflow');

  return (
    <View
      testID={`diag-probe-${probe.id}`}
      style={[
        styles.probeItem,
        { borderBottomColor: tokens.cardBorder },
        isScreenRTL && styles.targetHeaderRTL,
      ]}
    >
      <View style={{ flex: 1 }}>
        <AppText
          variant="caption"
          style={[
            styles.probeTitle,
            { color: tokens.text, textAlign: isScreenRTL ? 'right' : 'left' },
          ]}
        >
          {probe.id}
        </AppText>
        <AppText
          variant="caption"
          tone="faint"
          style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}
        >
          {probe.screen || 'Unknown'} · {probe.kind || 'primitive'} · {probe.width}×{probe.height}
          {probe.staleAfterUnmount ? ` · ${diagT('Stale')}` : ''}
        </AppText>
      </View>
      <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
        <AppText
          variant="caption"
          style={{
            color: statusColor,
            fontWeight: '700',
            fontSize: 10,
          }}
        >
          {statusText}
        </AppText>
      </View>
    </View>
  );
});

interface DefectRowProps {
  defect: DiagnosticDefectReportItem;
  tokens: any;
  isScreenRTL: boolean;
}

const DefectRow = React.memo(function DefectRow({ defect, tokens, isScreenRTL }: DefectRowProps) {
  const isSuspicious = defect.defectClass === 'rtlWritingDirectionSuspicious';
  const tagColor = isSuspicious ? (tokens.eyebrow || '#D97706') : tokens.danger;
  return (
    <View style={styles.defectItemWrap}>
      <AppText
        variant="caption"
        style={[
          styles.defectTitle,
          { color: tagColor, textAlign: isScreenRTL ? 'right' : 'left' },
        ]}
      >
        [{defect.defectClass}] {defect.probeId}{defect.parentIdentity ? ` (parent: ${defect.parentIdentity})` : ''}
      </AppText>
      {defect.reason ? (
        <AppText
          variant="caption"
          tone="faint"
          style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}
        >
          {defect.reason}
        </AppText>
      ) : null}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Inner Content Component (Mounted only while visible)
// ---------------------------------------------------------------------------

function RtlDiagnosticModalContent({ visible, onClose }: RtlDiagnosticModalProps) {
  const { mode, tokens } = useThemeTokens();
  const [exportStatus, setExportStatus] = useState<{
    state: 'idle' | 'busy' | 'success' | 'fileReady' | 'userActionRequired' | 'shareInvoked' | 'cancelled' | 'error';
    message?: string;
    filePath?: string;
    fileSizeBytes?: number;
    clipboardCopied?: boolean;
  }>({ state: 'idle' });
  const [activeAction, setActiveAction] = useState<'report' | 'summary' | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedProbes, setCopiedProbes] = useState(false);

  // Collapsed sections by default — cheap initial mount and zero layout jump
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    perf: true, // Show measured cost by default
    targets: false,
    probes: false,
    defects: false,
    coverage: false,
    interactions: false,
    matrix: false,
    network: false,
    errors: false,
    appState: false,
    controls: false,
  });

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Built ON DEMAND (on open, explicit refresh, or export)
  const [reportState, setReportState] = useState(() => ({
    report: buildDiagnosticReport(),
    measurements: getTargetMeasurements(),
    probes: getAutoProbes(),
  }));

  const [perfStats, setPerfStats] = useState(getDiagnosticNotificationStats);
  const [estimatedSize, setEstimatedSize] = useState(getEstimatedReportSizeBytes);
  const [estimatedSummarySize, setEstimatedSummarySize] = useState(getEstimatedSummarySizeBytes);

  // Subscribe ONLY while modal is visible. Closed app has 0 listeners.
  useEffect(() => {
    if (!visible) return;
    return addDiagnosticListener(() => {
      // Coalesced flush: update only the cheap notification stats. Size estimates are
      // refreshed on initial mount or explicit refresh so this listener never rebuilds
      // and serializes the whole evidence report while it is measuring the app.
      setPerfStats(getDiagnosticNotificationStats());
    });
  }, [visible]);

  // Explicit refresh rebuilds report on demand
  const handleRefresh = useCallback(() => {
    flushDiagnosticNotifications();
    setReportState({
      report: buildDiagnosticReport(),
      measurements: getTargetMeasurements(),
      probes: getAutoProbes(),
    });
    setPerfStats(getDiagnosticNotificationStats());
    setEstimatedSize(getEstimatedReportSizeBytes());
    setEstimatedSummarySize(getEstimatedSummarySizeBytes());
  }, []);

  const report = reportState.report;
  const measurements = reportState.measurements;
  const probes = reportState.probes;
  const defects = report.defects;
  const interactions = report.interactions;
  const languageMatrix = report.languageMatrix;
  const themeMatrix = report.themeMatrix;
  const network = report.network;
  const errors = report.errors;
  const errorGroups = errors.groups || [];
  const appState = report.appState;
  const controlCoverage = report.coverage.interactiveControls;

  const visitedSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of probes) {
      if (p.screen) set.add(p.screen);
    }
    return set;
  }, [probes]);

  const visitedScreens = useMemo(() => Array.from(visitedSet).sort(), [visitedSet]);
  const unvisitedScreens = useMemo(
    () => KNOWN_SCREENS.filter((s) => !visitedSet.has(s)).sort(),
    [visitedSet]
  );

  const handleCopyProbes = useCallback(() => {
    try {
      const currentProbes = getAutoProbes();
      Clipboard.setString(JSON.stringify(currentProbes, null, 2));
      setCopiedProbes(true);
      setTimeout(() => setCopiedProbes(false), 2500);
    } catch {}
  }, []);

  const handleExport = useCallback(async () => {
    setExportStatus({ state: 'busy' });
    setActiveAction('report');
    try {
      const result = await exportDiagnosticReport();
      if (result.status === 'userActionRequired' || result.shareStatus === 'unknown') {
        setExportStatus({
          state: 'userActionRequired',
          message: diagT('Report saved locally. Share result unknown (chooser may have been dismissed).'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else if (result.status === 'fileReady') {
        setExportStatus({
          state: 'fileReady',
          message: result.message || `${diagT('File saved locally')}${result.filePath ? ` (${result.filePath})` : ''}`,
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else if (result.status === 'cancelledOrUnknown' || result.status === 'cancelled') {
        setExportStatus({
          state: 'cancelled',
          message: diagT('Share cancelled or unconfirmed.') || t('Cancel'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else if (result.success || result.status === 'success') {
        setExportStatus({
          state: 'success',
          message: t('Backup exported'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else {
        setExportStatus({
          state: 'error',
          message: result.error ? getLocalizedUnavailabilityReason(result.error) : t('Export failed'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      }
    } catch (e) {
      setExportStatus({
        state: 'error',
        message: e instanceof Error ? getLocalizedUnavailabilityReason(e.message) : t('Export failed'),
      });
    } finally {
      setActiveAction(null);
    }
  }, []);

  const handleExportSummaryAction = useCallback(async () => {
    setExportStatus({ state: 'busy' });
    setActiveAction('summary');
    try {
      const result = await exportDiagnosticSummary();
      if (result.status === 'userActionRequired' || result.shareStatus === 'unknown') {
        setExportStatus({
          state: 'userActionRequired',
          message: diagT('Report saved locally. Share result unknown (chooser may have been dismissed).'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else if (result.status === 'fileReady') {
        setExportStatus({
          state: 'fileReady',
          message: result.message || `${diagT('File saved locally')}${result.filePath ? ` (${result.filePath})` : ''}`,
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else if (result.status === 'cancelledOrUnknown' || result.status === 'cancelled') {
        setExportStatus({
          state: 'cancelled',
          message: diagT('Share cancelled or unconfirmed.') || t('Cancel'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else if (result.success || result.status === 'success') {
        setExportStatus({
          state: 'success',
          message: t('Backup exported'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      } else {
        setExportStatus({
          state: 'error',
          message: result.error ? getLocalizedUnavailabilityReason(result.error) : t('Export failed'),
          filePath: result.filePath,
          fileSizeBytes: result.fileSizeBytes,
          clipboardCopied: result.clipboardCopied,
        });
      }
    } catch (e) {
      setExportStatus({
        state: 'error',
        message: e instanceof Error ? getLocalizedUnavailabilityReason(e.message) : t('Export failed'),
      });
    } finally {
      setActiveAction(null);
    }
  }, []);

  const handleCopy = useCallback(() => {
    try {
      const latestReport = buildDiagnosticReport();
      Clipboard.setString(JSON.stringify(latestReport, null, 2));
      setCopied(true);
      setExportStatus({
        state: 'success',
        message: `${t('Copied')} (${t('Details')})`,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setExportStatus({
        state: 'error',
        message: t('Export failed'),
      });
    }
  }, []);

  const handleCopyPath = useCallback(() => {
    if (!exportStatus.filePath) return;
    try {
      Clipboard.setString(exportStatus.filePath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2500);
    } catch {}
  }, [exportStatus.filePath]);

  const activeLocale = i18n.language || 'en';
  const directionHelper = isI18nRTL() ? 'rtl' : 'ltr';
  const nativeIsRTL = Boolean(I18nManager.isRTL);
  const isScreenRTL = isI18nRTL();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: tokens.bgTop }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* =====================================================================
          FIXED HEADER BAR AT TOP (OUTSIDE SCROLL CONTAINER)
          All primary actions are stationary, reachable, and >=44x44 dp
          ===================================================================== */}
      <View style={[styles.fixedHeaderWrap, { borderBottomColor: tokens.cardBorder, backgroundColor: tokens.bgTop }]}>
        {/* Title and Close */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <AppText
              variant="title"
              style={[
                styles.headerTitle,
                { color: tokens.text, textAlign: isScreenRTL ? 'right' : 'left' },
              ]}
            >
              {t('Details')} · RTL
            </AppText>
            <AppText
              variant="caption"
              tone="faint"
              style={{ textAlign: isScreenRTL ? 'right' : 'left' }}
            >
              {t('About')} · {diagT('Runtime Layout')}
            </AppText>
          </View>
          <TouchableOpacity
            testID="close-rtl-diagnostics"
            onPress={onClose}
            style={[
              styles.closeButton,
              { backgroundColor: tokens.bgRaised, borderColor: tokens.cardBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('Close')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={tokens.text} />
          </TouchableOpacity>
        </View>

        {/* Action Controls Row (Export report, Refresh) */}
        <View style={[styles.actionRowPrimary, isScreenRTL && styles.actionRowRTL]}>
          <View style={styles.flexOne}>
            <PrimaryButton
              testID="export-rtl-report-btn"
              title={
                exportStatus.state === 'busy' && activeAction === 'report'
                  ? `${t('Export to file')}…`
                  : t('Export to file')
              }
              onPress={handleExport}
              disabled={exportStatus.state === 'busy'}
              accessibilityLabel={t('Export to file')}
              style={styles.actionBtn}
            />
          </View>

          <TouchableOpacity
            testID="diag-refresh-btn"
            onPress={handleRefresh}
            style={[
              styles.refreshButton,
              { backgroundColor: tokens.bgRaised, borderColor: tokens.cardBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel={diagT('Refresh')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={20} color={tokens.accent} />
          </TouchableOpacity>
        </View>

        {/* Secondary Action Controls Row (Export summary, Copy) */}
        <View style={[styles.actionRowSecondary, isScreenRTL && styles.actionRowRTL]}>
          <View style={styles.flexOne}>
            <OutlineButton
              testID="export-rtl-summary-btn"
              title={
                exportStatus.state === 'busy' && activeAction === 'summary'
                  ? `${diagT('Export summary')}…`
                  : diagT('Export summary')
              }
              icon="document-text-outline"
              onPress={handleExportSummaryAction}
              disabled={exportStatus.state === 'busy'}
              accessibilityLabel={diagT('Export summary')}
              style={styles.actionBtn}
            />
          </View>

          <View style={styles.flexOne}>
            <OutlineButton
              testID="copy-rtl-report-btn"
              title={copied ? t('Copied') : `${t('Copy')} (${t('Details')})`}
              icon={copied ? 'checkmark' : 'copy-outline'}
              onPress={handleCopy}
              accessibilityLabel={t('Copy')}
              style={styles.actionBtn}
            />
          </View>
        </View>

        {/* Readout row: Serialized report size & summary size indicators before action */}
        <View style={[styles.sizeIndicatorsRow, isScreenRTL && styles.actionRowRTL]}>
          <AppText variant="caption" tone="faint" style={styles.sizeIndicatorText}>
            {diagT('Report size')}: <AppText variant="caption" highlight>{formatByteSize(estimatedSize)}</AppText>
          </AppText>
          <AppText variant="caption" tone="faint" style={styles.sizeIndicatorText}>
            {diagT('Summary size')}: <AppText variant="caption" highlight>{formatByteSize(estimatedSummarySize)}</AppText>
          </AppText>
        </View>

        {/* Live performance & coalescing counters (stationary in fixed top region, outside ScrollView) */}
        <View
          testID="diag-perf-card"
          style={[styles.perfIndicatorsRow, isScreenRTL && styles.actionRowRTL]}
        >
          <View style={styles.perfStatCol}>
            <AppText variant="caption" tone="faint" style={styles.perfStatLabel}>
              {diagT('Coalesced')}:
            </AppText>
            <AppText
              testID="diag-perf-coalesced"
              variant="caption"
              highlight
              style={[styles.perfStatValue, { color: tokens.accent }]}
            >
              {perfStats.coalesced}
            </AppText>
          </View>

          <View style={styles.perfStatCol}>
            <AppText variant="caption" tone="faint" style={styles.perfStatLabel}>
              {diagT('Delivered')}:
            </AppText>
            <AppText
              testID="diag-perf-delivered"
              variant="caption"
              highlight
              style={styles.perfStatValue}
            >
              {perfStats.delivered}
            </AppText>
          </View>

          <View style={styles.perfStatCol}>
            <AppText variant="caption" tone="faint" style={styles.perfStatLabel}>
              {diagT('Requested')}:
            </AppText>
            <AppText
              testID="diag-perf-requested"
              variant="caption"
              highlight
              style={styles.perfStatValue}
            >
              {perfStats.requested}
            </AppText>
          </View>

          <View style={styles.perfStatCol}>
            <AppText variant="caption" tone="faint" style={styles.perfStatLabel}>
              {diagT('Notifications')}:
            </AppText>
            <AppText
              testID="diag-perf-listeners"
              variant="caption"
              highlight
              style={styles.perfStatValue}
            >
              {getDiagnosticListenerCount()}
            </AppText>
          </View>
        </View>
      </View>

      {/* =====================================================================
          SCROLLABLE CONTENT (BELOW FIXED HEADER)
          ===================================================================== */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Status / Truthful Export Feedback Card */}
        {exportStatus.state !== 'idle' && (
          <PremiumCard style={[styles.card, getCardShadow(mode)]} padded testID="diag-export-status-card">
            {exportStatus.state === 'busy' && (
              <View style={styles.statusBox}>
                <Ionicons name="hourglass-outline" size={18} color={tokens.accent} />
                <AppText variant="caption" highlight style={styles.statusText}>
                  {t('Export to file')}…
                </AppText>
              </View>
            )}

            {exportStatus.state === 'success' && (
              <View
                testID="export-status-success"
                style={[
                  styles.statusBox,
                  { backgroundColor: tokens.accentDim, borderColor: tokens.accent },
                ]}
                accessibilityRole="summary"
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="checkmark-circle" size={18} color={tokens.accent} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <AppText variant="caption" highlight style={styles.statusText}>
                    {exportStatus.message || t('Backup exported')}
                  </AppText>
                  {exportStatus.fileSizeBytes !== undefined && (
                    <AppText variant="caption" tone="faint" style={styles.statusText}>
                      {diagT('File size')}: {formatByteSize(exportStatus.fileSizeBytes)}
                    </AppText>
                  )}
                </View>
              </View>
            )}

            {exportStatus.state === 'fileReady' && (
              <View
                testID="export-status-file-ready"
                style={[
                  styles.statusBox,
                  { backgroundColor: tokens.accentDim, borderColor: tokens.accent },
                ]}
                accessibilityRole="summary"
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="document-text-outline" size={18} color={tokens.accent} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <AppText variant="caption" highlight style={[styles.statusText, { fontWeight: '700' }]}>
                    {getLocalizedExportStatus('fileReady')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.statusText}>
                    {exportStatus.message || diagT('File saved locally')}
                  </AppText>
                  {exportStatus.fileSizeBytes !== undefined && (
                    <AppText variant="caption" tone="faint" style={styles.statusText}>
                      {diagT('File size')}: {formatByteSize(exportStatus.fileSizeBytes)}
                    </AppText>
                  )}
                </View>
              </View>
            )}

            {(exportStatus.state === 'userActionRequired' || exportStatus.state === 'shareInvoked') && (
              <View
                testID="export-status-share-invoked"
                style={[
                  styles.statusBox,
                  { backgroundColor: tokens.bgRaised, borderColor: tokens.accent },
                ]}
                accessibilityRole="summary"
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="help-circle-outline" size={18} color={tokens.accent} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <AppText variant="caption" highlight style={[styles.statusText, { fontWeight: '700' }]}>
                    {getLocalizedExportStatus('userActionRequired')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.statusText}>
                    {exportStatus.message ||
                      diagT('Report saved locally. Share result unknown (chooser may have been dismissed).')}
                  </AppText>
                  <TouchableOpacity
                    testID="diag-retry-export-btn"
                    onPress={handleExport}
                    style={styles.retryInlineButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('Retry')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="refresh" size={14} color={tokens.accent} />
                    <AppText
                      variant="caption"
                      style={{ color: tokens.accent, fontWeight: '700', marginStart: 4 }}
                    >
                      {t('Retry')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {exportStatus.state === 'cancelled' && (
              <View
                testID="export-status-cancelled"
                style={[
                  styles.statusBox,
                  { backgroundColor: tokens.bgRaised, borderColor: tokens.cardBorder },
                ]}
                accessibilityRole="summary"
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="close-circle-outline" size={18} color={tokens.textMuted} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <AppText variant="caption" highlight style={[styles.statusText, { fontWeight: '700' }]}>
                    {getLocalizedExportStatus('cancelled')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.statusText}>
                    {exportStatus.message || diagT('Share cancelled or unconfirmed.')}
                  </AppText>
                  <TouchableOpacity
                    testID="diag-retry-cancelled-btn"
                    onPress={handleExport}
                    style={styles.retryInlineButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('Retry')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="refresh" size={14} color={tokens.accent} />
                    <AppText
                      variant="caption"
                      style={{ color: tokens.accent, fontWeight: '700', marginStart: 4 }}
                    >
                      {t('Retry')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {exportStatus.state === 'error' && (
              <View
                testID="export-status-error"
                style={[
                  styles.statusBox,
                  { backgroundColor: tokens.inset, borderColor: tokens.danger },
                ]}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Ionicons name="alert-circle" size={18} color={tokens.danger} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <AppText variant="caption" tone="danger" style={[styles.statusText, { fontWeight: '700' }]}>
                    {getLocalizedExportStatus('failed')}
                  </AppText>
                  <AppText variant="caption" tone="danger" style={styles.statusText}>
                    {exportStatus.message || t('Export failed')}
                  </AppText>
                  <TouchableOpacity
                    testID="diag-retry-error-btn"
                    onPress={handleExport}
                    style={styles.retryInlineButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('Retry')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="refresh" size={14} color={tokens.danger} />
                    <AppText
                      variant="caption"
                      style={{ color: tokens.danger, fontWeight: '700', marginStart: 4 }}
                    >
                      {t('Retry')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Path 3: Surface written path with copyable string */}
            {exportStatus.filePath ? (
              <View
                testID="diag-file-path-box"
                style={[styles.filePathBox, { backgroundColor: tokens.bgRaised, borderColor: tokens.cardBorder }]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" tone="faint" style={{ fontWeight: '700' }}>
                    {diagT('File path')}:
                  </AppText>
                  <AppText
                    testID="diag-file-path-text"
                    variant="caption"
                    selectable
                    style={styles.filePathText}
                  >
                    {exportStatus.filePath}
                  </AppText>
                </View>
                <TouchableOpacity
                  testID="diag-copy-path-btn"
                  onPress={handleCopyPath}
                  style={[styles.copyPathBtn, { borderColor: tokens.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel={diagT('Copy path')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={copiedPath ? 'checkmark' : 'copy-outline'} size={14} color={tokens.accent} />
                  <AppText variant="caption" style={{ color: tokens.accent, fontWeight: '700', marginStart: 4 }}>
                    {copiedPath ? t('Copied') : diagT('Copy path')}
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Clipboard fallback notice: tells user report JSON reached clipboard */}
            {exportStatus.clipboardCopied ? (
              <View
                testID="diag-clipboard-notice"
                style={[
                  styles.clipboardNoticeBox,
                  { backgroundColor: tokens.bgRaised, borderColor: tokens.accent },
                ]}
                accessibilityRole="summary"
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="clipboard-outline" size={16} color={tokens.accent} />
                <View style={{ flex: 1, marginStart: 8 }}>
                  <AppText
                    testID="diag-clipboard-notice-text"
                    variant="caption"
                    highlight
                    style={[styles.clipboardNoticeText, { fontWeight: '700' }]}
                  >
                    {diagT('Report JSON copied to clipboard')}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={{ marginTop: 2, fontSize: 11 }}>
                    {diagT('Clipboard contains complete diagnostic payload.')}
                  </AppText>
                </View>
              </View>
            ) : null}
          </PremiumCard>
        )}

        {/* Environment & Direction Summary */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-summary-card"
        >
          <AppText
            variant="eyebrow"
            highlight
            style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
          >
            {t('Details')} · {diagT('Environment & Direction')}
          </AppText>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText
              variant="caption"
              tone="faint"
              style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Diagnostic Build ID')}:
            </AppText>
            <AppText
              testID="diag-build-id"
              variant="caption"
              style={[
                styles.infoValue,
                { color: tokens.accent, fontWeight: '700', textAlign: isScreenRTL ? 'left' : 'right' },
              ]}
            >
              {DIAGNOSTIC_BUILD_ID}
            </AppText>
          </View>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText
              variant="caption"
              tone="faint"
              style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {t('App version')}:
            </AppText>
            <AppText
              testID="diag-version"
              variant="caption"
              style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
            >
              v{DIAGNOSTIC_VERSION} (code {DIAGNOSTIC_VERSION_CODE})
            </AppText>
          </View>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText
              variant="caption"
              tone="faint"
              style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {t('App Language')}:
            </AppText>
            <AppText
              testID="diag-active-locale"
              variant="caption"
              style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}
            >
              {activeLocale}
            </AppText>
          </View>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText
              variant="caption"
              tone="faint"
              style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Direction Result')}:
            </AppText>
            <AppText
              testID="diag-direction-helper"
              variant="caption"
              style={[
                styles.infoValue,
                {
                  color: directionHelper === 'rtl' ? tokens.accent : tokens.text,
                  textAlign: isScreenRTL ? 'left' : 'right',
                },
              ]}
            >
              {directionHelper}
            </AppText>
          </View>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText
              variant="caption"
              tone="faint"
              style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('I18nManager.isRTL')}:
            </AppText>
            <AppText
              testID="diag-i18n-manager-is-rtl"
              variant="caption"
              style={[
                styles.infoValue,
                {
                  color: nativeIsRTL ? tokens.accent : tokens.text,
                  textAlign: isScreenRTL ? 'left' : 'right',
                },
              ]}
            >
              {String(nativeIsRTL)}
            </AppText>
          </View>
        </PremiumCard>

        {/* Collapsible Defects Section (Collapsed by default, bounded to 50) */}
        <PremiumCard style={[styles.card, getCardShadow(mode)]} padded testID="diag-defects-card">
          <TouchableOpacity
            testID="diag-toggle-defects-btn"
            onPress={() => toggleSection('defects')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('Defects')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Defects')} ({defects.totalDefects})
            </AppText>
            <Ionicons
              name={expandedSections.defects ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Text Truncated')}:
            </AppText>
            <AppText testID="diag-defect-text-truncated" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.textTruncated}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Sub-44dp Touch Target')}:
            </AppText>
            <AppText testID="diag-defect-sub-touch" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.subTouchTarget}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Off-Screen')}:
            </AppText>
            <AppText testID="diag-defect-offscreen" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.offScreen}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Outside Parent Frame')}:
            </AppText>
            <AppText testID="diag-defect-outside-parent" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.outsideParent}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Sibling Overlap')}:
            </AppText>
            <AppText testID="diag-defect-sibling-overlap" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.siblingOverlap}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('RTL Text Align Mismatch')}:
            </AppText>
            <AppText testID="diag-defect-rtl-mismatch" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.rtlTextAlignMismatch}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Suspicious RTL Writing Direction')}:
            </AppText>
            <AppText testID="diag-defect-rtl-writing-dir" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.rtlWritingDirectionSuspicious ?? 0}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Fixed Height Text Risk')}:
            </AppText>
            <AppText testID="diag-defect-fixed-height" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {defects.countsByClass.fixedHeightTextRisk}
            </AppText>
          </View>

          {expandedSections.defects && defects.items.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tokens.cardBorder }}>
              <AppText variant="caption" style={{ fontWeight: '700', marginBottom: 4, textAlign: isScreenRTL ? 'right' : 'left' }}>
                {diagT('Detected Defect Items')} ({defects.items.length}):
              </AppText>
              {defects.items.slice(0, MAX_DISPLAYED_ROWS).map((d, i) => (
                <DefectRow
                  key={`${d.probeId}-${d.defectClass}-${i}`}
                  defect={d}
                  tokens={tokens}
                  isScreenRTL={isScreenRTL}
                />
              ))}
              {defects.items.length > MAX_DISPLAYED_ROWS && (
                <View testID="diag-more-defects" style={styles.moreBanner}>
                  <AppText variant="caption" tone="faint">
                    +{defects.items.length - MAX_DISPLAYED_ROWS} {diagT('more')}
                  </AppText>
                </View>
              )}
            </View>
          )}
        </PremiumCard>

        {/* Collapsible Auto Probes Section (Collapsed by default, bounded to 50) */}
        <PremiumCard style={[styles.card, getCardShadow(mode)]} padded testID="diag-probes-card">
          <TouchableOpacity
            testID="diag-toggle-probes-btn"
            onPress={() => toggleSection('probes')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('Probes')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Probes')} ({probes.length})
            </AppText>
            <Ionicons
              name={expandedSections.probes ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.probesSummaryRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText
              testID="diag-probes-count"
              variant="caption"
              style={[styles.infoLabel, { fontWeight: '700', textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {probes.length} {diagT('Probes')}
            </AppText>
            <TouchableOpacity
              testID="diag-copy-probes-btn"
              onPress={handleCopyProbes}
              style={[styles.probeActionButton, { borderColor: tokens.cardBorder, backgroundColor: tokens.bgRaised }]}
              accessibilityRole="button"
              accessibilityLabel={`${t('Copy')} ${diagT('Probes')}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={copiedProbes ? 'checkmark' : 'copy-outline'}
                size={16}
                color={tokens.accent}
              />
              <AppText
                variant="caption"
                style={{ color: tokens.accent, fontWeight: '700', marginStart: 6 }}
              >
                {copiedProbes ? t('Copied') : `${t('Copy')} ${diagT('Probes')}`}
              </AppText>
            </TouchableOpacity>
          </View>

          {probes.length === 0 ? (
            <AppText
              testID="diag-probes-empty"
              variant="caption"
              tone="faint"
              style={[styles.pendingHint, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('No primitive probes recorded yet.')}
            </AppText>
          ) : expandedSections.probes ? (
            <View style={styles.probesList}>
              {probes.slice(0, MAX_DISPLAYED_ROWS).map((probe) => (
                <ProbeRow
                  key={probe.id}
                  probe={probe}
                  tokens={tokens}
                  isScreenRTL={isScreenRTL}
                />
              ))}
              {probes.length > MAX_DISPLAYED_ROWS && (
                <View testID="diag-more-probes" style={styles.moreBanner}>
                  <AppText variant="caption" tone="faint">
                    +{probes.length - MAX_DISPLAYED_ROWS} {diagT('more')}
                  </AppText>
                </View>
              )}
            </View>
          ) : null}
        </PremiumCard>

        {/* Collapsible Instrumented Targets Section */}
        <PremiumCard style={[styles.card, getCardShadow(mode)]} padded testID="diag-targets-card">
          <TouchableOpacity
            testID="diag-toggle-targets-btn"
            onPress={() => toggleSection('targets')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={t('TARGET')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {t('TARGET')} ({measurements.length})
            </AppText>
            <Ionicons
              name={expandedSections.targets ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          {expandedSections.targets &&
            measurements.map((target) => (
              <TargetRow
                key={target.componentId}
                target={target}
                tokens={tokens}
                isScreenRTL={isScreenRTL}
                mode={mode}
              />
            ))}
        </PremiumCard>

        {/* Screen Coverage Section */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-screen-coverage-card"
        >
          <TouchableOpacity
            testID="diag-toggle-coverage-btn"
            onPress={() => toggleSection('coverage')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('Screen Coverage')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Screen Coverage')} ({visitedScreens.length} / {KNOWN_SCREENS.length})
            </AppText>
            <Ionicons
              name={expandedSections.coverage ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Visited')} ({visitedScreens.length}):
            </AppText>
            <AppText testID="diag-visited-count" variant="caption" style={[styles.infoValue, { color: visitedScreens.length > 0 ? tokens.accent : tokens.textMuted, fontWeight: '700', textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {visitedScreens.length}
            </AppText>
          </View>
          <AppText testID="diag-visited-list" variant="caption" tone="faint" style={[styles.screenListText, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
            {visitedScreens.length > 0 ? visitedScreens.join(', ') : '—'}
          </AppText>

          {expandedSections.coverage && (
            <>
              <View style={[styles.divider, { backgroundColor: tokens.cardBorder }]} />
              <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
                <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
                  {diagT('Unvisited')} ({unvisitedScreens.length}):
                </AppText>
                <AppText testID="diag-unvisited-count" variant="caption" style={[styles.infoValue, { color: tokens.textMuted, fontWeight: '700', textAlign: isScreenRTL ? 'left' : 'right' }]}>
                  {unvisitedScreens.length}
                </AppText>
              </View>
              <AppText testID="diag-unvisited-list" variant="caption" tone="faint" style={[styles.screenListText, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
                {unvisitedScreens.length > 0 ? unvisitedScreens.join(', ') : '—'}
              </AppText>
            </>
          )}

          {/* U3: interactive control coverage - instrumented (rendered) vs actually pressed.
              A report can no longer look complete while a screen's controls were never
              wired or never touched. */}
          <View style={[styles.divider, { backgroundColor: tokens.cardBorder }]} />
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Interactive Controls (rendered)')}:
            </AppText>
            <AppText testID="diag-controls-instrumented" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {controlCoverage ? controlCoverage.totalInstrumented : 0}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Controls actually pressed')}:
            </AppText>
            <AppText testID="diag-controls-pressed" variant="caption" style={[styles.infoValue, { color: tokens.accent, fontWeight: '700', textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {controlCoverage ? controlCoverage.totalPressed : 0} ({controlCoverage ? controlCoverage.coveragePercent : 0}%)
            </AppText>
          </View>
          <AppText testID="diag-controls-unpressed" variant="caption" tone="faint" style={[styles.screenListText, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
            {diagT('Screens with controls never pressed')}:{' '}
            {controlCoverage && controlCoverage.unpressedScreensWithInstrumentedControls.length > 0
              ? controlCoverage.unpressedScreensWithInstrumentedControls.join(', ')
              : diagT('none')}
          </AppText>
          {appState && appState.controls.stuckDisabledCount > 0 && (
            <AppText testID="diag-controls-stuck" variant="caption" style={[{ color: tokens.danger, fontWeight: '600', fontSize: 11 }, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Stuck disabled controls')} ({appState.controls.stuckDisabledCount}):{' '}
              {appState.controls.stuckControlIds.join(', ')}
            </AppText>
          )}
        </PremiumCard>

        {/* Collapsible Interactions Section */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-interactions-card"
        >
          <TouchableOpacity
            testID="diag-toggle-interactions-btn"
            onPress={() => toggleSection('interactions')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('Interactions')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Interactions')} ({interactions.total})
            </AppText>
            <Ionicons
              name={expandedSections.interactions ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Total Interactions')}:
            </AppText>
            <AppText testID="diag-interactions-count" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {interactions.total}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Navigated')}:
            </AppText>
            <AppText variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {interactions.countsByEffect.navigated}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('State Changed')}:
            </AppText>
            <AppText variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {interactions.countsByEffect.stateChanged}
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('No Observable Effect')}:
            </AppText>
            <AppText variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {interactions.countsByEffect.noObservableEffect}
            </AppText>
          </View>

          {expandedSections.interactions && (
            <View style={{ marginTop: 8 }}>
              {interactions.items.slice(0, MAX_DISPLAYED_ROWS).map((it, idx) => (
                <View key={it.id || `it-${idx}`} style={styles.itemRow}>
                  <AppText variant="caption" style={{ fontWeight: '700' }}>
                    {it.id} ({it.effect})
                  </AppText>
                  <AppText variant="caption" tone="faint" style={{ fontSize: 10 }}>
                    {it.screen} · {it.language} · {it.theme}
                  </AppText>
                </View>
              ))}
              {interactions.items.length > MAX_DISPLAYED_ROWS && (
                <View testID="diag-more-interactions" style={styles.moreBanner}>
                  <AppText variant="caption" tone="faint">
                    +{interactions.items.length - MAX_DISPLAYED_ROWS} {diagT('more')}
                  </AppText>
                </View>
              )}
            </View>
          )}
        </PremiumCard>

        {/* Collapsible Language & Theme Matrix */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-matrix-card"
        >
          <TouchableOpacity
            testID="diag-toggle-matrix-btn"
            onPress={() => toggleSection('matrix')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={`${diagT('Language Matrix')} & ${diagT('Theme Matrix')}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Language Matrix')} & {diagT('Theme Matrix')}
            </AppText>
            <Ionicons
              name={expandedSections.matrix ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Language Matrix Entries')}:
            </AppText>
            <AppText testID="diag-lang-matrix-count" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {languageMatrix.items.length} ({languageMatrix.mismatchCount} {diagT('mismatches')})
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Theme Matrix Entries')}:
            </AppText>
            <AppText testID="diag-theme-matrix-count" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {themeMatrix.items.length} ({themeMatrix.mismatchCount} {diagT('mismatches')})
            </AppText>
          </View>
        </PremiumCard>

        {/* Collapsible Network Ledger Section */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-network-card"
        >
          <TouchableOpacity
            testID="diag-toggle-network-btn"
            onPress={() => toggleSection('network')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('Network Ledger')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Network Ledger')} ({network.items.length})
            </AppText>
            <Ionicons
              name={expandedSections.network ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Total Requests')}:
            </AppText>
            <AppText testID="diag-network-total" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {network.summary.total} ({network.summary.ok} ok, {network.summary.failed} failed{network.summary.transportFailures > 0 ? `, ${network.summary.transportFailures} transport failure` : ''})
            </AppText>
          </View>
          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Timeouts / Offline Fallbacks')}:
            </AppText>
            <AppText variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {network.summary.timeouts} / {network.summary.offlineFallbacks}
            </AppText>
          </View>
          {expandedSections.network && network.items.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tokens.cardBorder }}>
              <AppText variant="caption" style={{ fontWeight: '700', marginBottom: 4, textAlign: isScreenRTL ? 'right' : 'left' }}>
                {diagT('Network Requests')} ({network.items.length}):
              </AppText>
              {network.items.slice(0, MAX_DISPLAYED_ROWS).map((net, i) => {
                const isTransportFailure = net.status === 0;
                const statusLabel = isTransportFailure
                  ? diagT('Transport Failure')
                  : `HTTP ${net.status}`;
                const statusColor = net.ok ? tokens.eyebrow : tokens.danger;
                return (
                  <View key={`net-${i}`} style={{ marginTop: 4, paddingTop: 4, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: tokens.cardBorder }}>
                    <AppText variant="caption" style={[{ color: statusColor, fontWeight: '600', fontSize: 11, textAlign: isScreenRTL ? 'right' : 'left' }]}>
                      [{statusLabel}] {net.method} {net.host} ({net.durationMs}ms)
                    </AppText>
                    <AppText variant="caption" tone="faint" style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}>
                      {net.path} {net.errorClassName ? `· ${net.errorClassName}` : ''}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}
        </PremiumCard>

        {/* Collapsible Runtime Errors Section */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-errors-card"
        >
          <TouchableOpacity
            testID="diag-toggle-errors-btn"
            onPress={() => toggleSection('errors')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('Runtime Errors')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('Runtime Errors')} ({errors.total})
            </AppText>
            <Ionicons
              name={expandedSections.errors ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Captured Errors')}:
            </AppText>
            <AppText testID="diag-errors-count" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {errors.total}
            </AppText>
          </View>
          {errors.items.length === 0 ? (
            <AppText variant="caption" tone="faint" style={{ fontSize: 11, textAlign: isScreenRTL ? 'right' : 'left' }}>
              {diagT('No runtime errors recorded.')}
            </AppText>
          ) : expandedSections.errors ? (
            <>
              {/* What the user could act on: class, screen, control id, how many times. */}
              {errorGroups.map((group, i) => (
                <AppText
                  key={`error-group-${i}`}
                  testID={`diag-error-group-${i}`}
                  variant="caption"
                  style={{ fontSize: 10, marginTop: 4, textAlign: isScreenRTL ? 'right' : 'left' }}
                >
                  {group.errorClass} · {group.screen}
                  {group.controlId ? ` · ${group.controlId}` : ''} · x{group.occurrences} · {group.source}
                </AppText>
              ))}
            </>
          ) : null}
          {errors.items.length > 0 && expandedSections.errors ? (
            errors.items.slice(0, MAX_DISPLAYED_ROWS).map((err, i) => (
              <View key={`error-${i}`} style={{ marginTop: 4, paddingTop: 4, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: tokens.cardBorder }}>
                <AppText variant="caption" style={[{ color: tokens.danger, fontWeight: '600', fontSize: 11, textAlign: isScreenRTL ? 'right' : 'left' }]}>
                  [{err.errorName}] {err.screen}
                </AppText>
                <AppText variant="caption" tone="faint" style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}>
                  {err.messageClass}
                </AppText>
              </View>
            ))
          ) : null}
        </PremiumCard>

        {/* App state domain: language-switch attempts, language/direction verdict, stuck controls */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode)]}
          padded
          testID="diag-app-state-card"
        >
          <TouchableOpacity
            testID="diag-toggle-app-state-btn"
            onPress={() => toggleSection('appState')}
            style={styles.collapsibleHeaderBtn}
            accessibilityRole="button"
            accessibilityLabel={diagT('App State')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText
              variant="eyebrow"
              highlight
              style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
            >
              {diagT('App State')} ({(appState ? appState.defects.length : 0)} {diagT('defects')})
            </AppText>
            <Ionicons
              name={expandedSections.appState ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={tokens.textMuted}
            />
          </TouchableOpacity>

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Language / direction')}:
            </AppText>
            <AppText
              testID="diag-consistency-verdict"
              variant="caption"
              style={[styles.infoValue, { color: appState && appState.consistency.agrees ? tokens.accent : tokens.danger, fontWeight: '700', textAlign: isScreenRTL ? 'left' : 'right' }]}
            >
              {appState ? appState.consistency.verdict : '—'}
            </AppText>
          </View>
          {appState && !appState.consistency.agrees && (
            <AppText variant="caption" tone="faint" style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}>
              {appState.consistency.persistedLanguage} → {appState.consistency.resolvedLanguage} ·{' '}
              {diagT('app')}={appState.consistency.appDirection} · I18nManager.isRTL=
              {String(appState.consistency.i18nManagerIsRTL)} · {appState.consistency.reason}
            </AppText>
          )}

          <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
            <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
              {diagT('Language switch attempts')}:
            </AppText>
            <AppText testID="diag-switch-attempts" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
              {appState ? appState.languageSwitchAttempts.total : 0}
              {appState && appState.languageSwitchAttempts.pendingCount > 0
                ? ` (+${appState.languageSwitchAttempts.pendingCount} ${diagT('pending')})`
                : ''}
            </AppText>
          </View>

          {expandedSections.appState && (
            <>
              <View style={[styles.divider, { backgroundColor: tokens.cardBorder }]} />
              {(appState ? appState.languageSwitchAttempts.items.slice(-MAX_DISPLAYED_ROWS) : []).map((attempt, i) => (
                <AppText
                  key={`switch-${attempt.id}`}
                  testID={`diag-switch-attempt-${i}`}
                  variant="caption"
                  style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}
                >
                  {attempt.fromLanguage} → {attempt.toLanguage} · {attempt.status} · {attempt.elapsedMs}ms ·{' '}
                  {attempt.reloadRequested ? diagT('reload requested') : diagT('no reload')}
                  {attempt.reason ? ` · ${attempt.reason}` : ''}
                </AppText>
              ))}

              <View style={[styles.divider, { backgroundColor: tokens.cardBorder }]} />
              <View style={[styles.infoRow, isScreenRTL && styles.infoRowRTL]}>
                <AppText variant="caption" tone="faint" style={[styles.infoLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}>
                  {diagT('Controls instrumented / pressed / disabled')}:
                </AppText>
                <AppText testID="diag-controls-tally" variant="caption" style={[styles.infoValue, { textAlign: isScreenRTL ? 'left' : 'right' }]}>
                  {appState
                    ? `${appState.controls.totalInstrumented} / ${appState.controls.pressedCount} / ${appState.controls.totalDisabled}`
                    : '0 / 0 / 0'}
                </AppText>
              </View>

              {(appState ? appState.defects : []).map((defect, i) => (
                <View key={`appstate-defect-${i}`} style={{ marginTop: 4, paddingTop: 4, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: tokens.cardBorder }}>
                  <AppText testID={`diag-appstate-defect-${i}`} variant="caption" style={[{ color: tokens.danger, fontWeight: '600', fontSize: 11, textAlign: isScreenRTL ? 'right' : 'left' }]}>
                    [{defect.defectClass}] {defect.screen}
                    {defect.controlId ? ` · ${defect.controlId}` : ''}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={{ fontSize: 10, textAlign: isScreenRTL ? 'right' : 'left' }}>
                    {defect.reason}
                  </AppText>
                </View>
              ))}
              {(!appState || appState.defects.length === 0) && (
                <AppText variant="caption" tone="faint" style={{ fontSize: 11, textAlign: isScreenRTL ? 'right' : 'left' }}>
                  {diagT('No app-state defects recorded.')}
                </AppText>
              )}
            </>
          )}
        </PremiumCard>

        {/* Bottom Actions card */}
        <PremiumCard
          style={[styles.card, getCardShadow(mode), { marginTop: 12 }]}
          padded
          testID="diag-actions-card"
        >
          <AppText
            variant="eyebrow"
            highlight
            style={[styles.sectionLabel, { textAlign: isScreenRTL ? 'right' : 'left' }]}
          >
            {t('Export to file')}
          </AppText>
          <AppText
            variant="caption"
            tone="faint"
            style={{ marginBottom: 12, textAlign: isScreenRTL ? 'right' : 'left' }}
          >
            {diagT('Exports runtime layout geometry and styles without user content.')}
          </AppText>
        </PremiumCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Root Export: Guarded so closed modal mounts ZERO components and registers ZERO listeners
// ---------------------------------------------------------------------------

export function RtlDiagnosticModal({ visible, onClose }: RtlDiagnosticModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <DiagScreenProvider name="Diagnostics">
        <RtlDiagnosticModalContent visible={visible} onClose={onClose} />
      </DiagScreenProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fixedHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginStart: 12,
  },
  actionRowPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionRowSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  actionRowRTL: {
    flexDirection: 'row-reverse',
  },
  flexOne: {
    flex: 1,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  sizeIndicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
    height: 18,
    minHeight: 18,
  },
  sizeIndicatorText: {
    fontSize: 11,
  },
  perfIndicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
    height: 22,
    minHeight: 22,
    maxHeight: 22,
    flexWrap: 'nowrap',
  },
  perfStatCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfStatLabel: {
    fontSize: 11,
  },
  perfStatValue: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  groupHeading: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: {
    marginBottom: 12,
  },
  collapsibleHeaderBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginStart: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 5,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 12,
    maxWidth: '55%',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 12,
    flexShrink: 1,
  },
  pendingHint: {
    marginTop: 6,
    fontSize: 11,
    fontStyle: 'italic',
  },
  staleNote: {
    marginTop: 4,
    flexShrink: 1,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusText: {
    flexShrink: 1,
  },
  retryInlineButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  filePathBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    gap: 8,
  },
  clipboardNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    gap: 8,
  },
  clipboardNoticeText: {
    fontSize: 12,
  },
  filePathText: {
    fontSize: 11,
    marginTop: 2,
  },
  copyPathBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenListText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  probesSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  probeActionButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  probesList: {
    marginTop: 4,
  },
  probeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  probeTitle: {
    fontWeight: '700',
    fontSize: 12,
  },
  defectItemWrap: {
    marginBottom: 6,
  },
  defectTitle: {
    fontWeight: '600',
    fontSize: 11,
  },
  itemRow: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8882',
  },
  moreBanner: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
