import React from 'react';
import {
  isDiagnosticModeEnabled,
  DIAGNOSTIC_BUILD_ID,
  DIAGNOSTIC_VERSION,
  DIAGNOSTIC_VERSION_CODE,
  IS_DIAGNOSTIC_COMPILE_TIME,
  setDiagnosticModeOverride,
  evaluateDiagnosticGate,
  getDiagnosticBuildIdentity,
  DIAGNOSTIC_BUILD_COMMAND,
  ORDINARY_RELEASE_BUILD_COMMAND,
} from './diagnosticConfig';
import {
  useDiagnosticTarget,
  recordTargetLayout,
  recordParentLayout,
  recordTextLayout,
  recordMeasurementUnavailable,
  getTargetMeasurements,
  getTargetMeasurement,
  resetDiagnosticMeasurements,
  addDiagnosticListener,
  buildDiagnosticReport,
  exportDiagnosticReport,
  DiagnosticTargetId,
  TargetLayoutRecord,
  DiagnosticMeasurementReportItem,
  DiagnosticReport,
  ExportStatus,
  ShareStatus,
  ExportReportResult,
} from './diagnosticState';
import {
  diagT,
  getDiagnosticShareTitle,
  getDiagnosticShareDialogTitle,
  getLocalizedMeasurementStatus,
  getLocalizedExportStatus,
  getLocalizedUnavailabilityReason,
} from './diagnosticI18n';
import { RtlDiagnosticModal } from '../../components/diagnostic/RtlDiagnosticModal';

export interface GatedDiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Single guarded component boundary for the diagnostic modal.
 * When the diagnostic gate is false, strictly returns null and renders zero UI.
 */
export function GatedDiagnosticModal({ visible, onClose }: GatedDiagnosticModalProps): React.ReactElement | null {
  if (!isDiagnosticModeEnabled()) {
    return null;
  }
  return React.createElement(RtlDiagnosticModal, { visible, onClose });
}

export {
  isDiagnosticModeEnabled,
  DIAGNOSTIC_BUILD_ID,
  DIAGNOSTIC_VERSION,
  DIAGNOSTIC_VERSION_CODE,
  IS_DIAGNOSTIC_COMPILE_TIME,
  setDiagnosticModeOverride,
  evaluateDiagnosticGate,
  getDiagnosticBuildIdentity,
  DIAGNOSTIC_BUILD_COMMAND,
  ORDINARY_RELEASE_BUILD_COMMAND,
  useDiagnosticTarget,
  recordTargetLayout,
  recordParentLayout,
  recordTextLayout,
  recordMeasurementUnavailable,
  getTargetMeasurements,
  getTargetMeasurement,
  resetDiagnosticMeasurements,
  addDiagnosticListener,
  buildDiagnosticReport,
  exportDiagnosticReport,
  DiagnosticTargetId,
  TargetLayoutRecord,
  DiagnosticMeasurementReportItem,
  DiagnosticReport,
  ExportStatus,
  ShareStatus,
  ExportReportResult,
  diagT,
  getDiagnosticShareTitle,
  getDiagnosticShareDialogTitle,
  getLocalizedMeasurementStatus,
  getLocalizedExportStatus,
  getLocalizedUnavailabilityReason,
};
