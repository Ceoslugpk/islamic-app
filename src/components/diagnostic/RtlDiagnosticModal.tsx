import React, { useState, useEffect, useCallback } from 'react';
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
import {
  getTargetMeasurements,
  addDiagnosticListener,
  buildDiagnosticReport,
  exportDiagnosticReport,
} from '../../lib/diagnostic/diagnosticState';

interface RtlDiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RtlDiagnosticModal({ visible, onClose }: RtlDiagnosticModalProps) {
  const { mode, tokens } = useThemeTokens();
  const [, setUpdateTick] = useState(0);
  const [exportStatus, setExportStatus] = useState<{
    state: 'idle' | 'busy' | 'success' | 'fileReady' | 'userActionRequired' | 'shareInvoked' | 'cancelled' | 'error';
    message?: string;
    filePath?: string;
  }>({ state: 'idle' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    return addDiagnosticListener(() => {
      setUpdateTick((t) => t + 1);
    });
  }, [visible]);

  const measurements = getTargetMeasurements();

  const handleExport = useCallback(async () => {
    setExportStatus({ state: 'busy' });
    try {
      const result = await exportDiagnosticReport();
      if (result.status === 'userActionRequired' || result.shareStatus === 'unknown') {
        // Chooser completion cannot be confirmed by Android OS; report unknown/action required with retry
        setExportStatus({
          state: 'userActionRequired',
          message: diagT('Report saved locally. Share result unknown (chooser may have been dismissed).'),
          filePath: result.filePath,
        });
      } else if (result.status === 'fileReady') {
        setExportStatus({
          state: 'fileReady',
          message: `${diagT('File saved locally')}${result.filePath ? ` (${result.filePath})` : ''}`,
          filePath: result.filePath,
        });
      } else if (result.status === 'cancelledOrUnknown' || result.status === 'cancelled') {
        setExportStatus({
          state: 'cancelled',
          message: diagT('Share cancelled or unconfirmed.') || t('Cancel'),
          filePath: result.filePath,
        });
      } else if (result.success || result.status === 'success') {
        setExportStatus({
          state: 'success',
          message: t('Backup exported'),
          filePath: result.filePath,
        });
      } else {
        setExportStatus({
          state: 'error',
          message: result.error ? getLocalizedUnavailabilityReason(result.error) : t('Export failed'),
          filePath: result.filePath,
        });
      }
    } catch (e) {
      setExportStatus({
        state: 'error',
        message: e instanceof Error ? getLocalizedUnavailabilityReason(e.message) : t('Export failed'),
      });
    }
  }, []);

  const handleCopy = useCallback(() => {
    try {
      const report = buildDiagnosticReport();
      Clipboard.setString(JSON.stringify(report, null, 2));
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

  const activeLocale = i18n.language || 'en';
  const directionHelper = isI18nRTL() ? 'rtl' : 'ltr';
  const nativeIsRTL = Boolean(I18nManager.isRTL);
  const isScreenRTL = isI18nRTL();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: tokens.bgTop }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: tokens.cardBorder }]}>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Instrumented Targets Section */}
          <AppText
            variant="eyebrow"
            highlight
            style={[styles.groupHeading, { textAlign: isScreenRTL ? 'right' : 'left' }]}
          >
            {t('TARGET')} ({measurements.length})
          </AppText>

          {measurements.map((target) => {
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
                key={target.componentId}
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
          })}

          {/* Export & Actions Section */}
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

            <View style={styles.buttonStack}>
              <PrimaryButton
                testID="export-rtl-report-btn"
                title={
                  exportStatus.state === 'busy'
                    ? `${t('Export to file')}…`
                    : t('Export to file')
                }
                onPress={handleExport}
                disabled={exportStatus.state === 'busy'}
                accessibilityLabel={t('Export to file')}
                style={styles.actionBtn}
              />

              <OutlineButton
                testID="copy-rtl-report-btn"
                title={copied ? t('Copied') : `${t('Copy')} (${t('Details')})`}
                icon={copied ? 'checkmark' : 'copy-outline'}
                onPress={handleCopy}
                accessibilityLabel={t('Copy')}
                style={styles.actionBtn}
              />
            </View>

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
                <AppText variant="caption" highlight style={styles.statusText}>
                  {exportStatus.message || t('Backup exported')}
                </AppText>
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
          </PremiumCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
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
  buttonStack: {
    gap: 8,
  },
  actionBtn: {
    width: '100%',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
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
});
