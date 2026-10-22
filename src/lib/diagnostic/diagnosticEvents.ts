import { Clipboard } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  isDiagnosticModeEnabled,
  DIAGNOSTIC_BUILD_ID,
} from './diagnosticConfig';
import {
  registerSettingsQueueDiagnosticObserver,
  SettingsQueueLifecycleEvent,
} from '../settingsWriteQueue';
import {
  getActiveDiagnosticScope,
  getActiveOperationDiagnosticContext,
  subscribeSettingsScope,
} from '../settings';
import { registerLanguageDiagnosticObserver } from '../i18n';

export type DiagnosticEventCategory =
  | 'theme_selected'
  | 'language_selected'
  | 'settings_write_pending'
  | 'settings_write_confirmed'
  | 'settings_write_rejected'
  | 'settings_write_unresolved'
  | 'queue_closed'
  | 'reconciliation_started'
  | 'reconciliation_completed'
  | 'native_direction_prepared'
  | 'language_mirror_success'
  | 'language_mirror_failed'
  | 'reload_requested'
  | 'reload_completed'
  | 'reload_failed'
  | 'pending_restart_recorded'
  | 'pending_restart_cleared';

export type DiagnosticPersistenceScope = 'theme' | 'language' | 'general';
export type DiagnosticFailureStage = 'write' | 'readback' | 'mirror' | 'reload';
export type DiagnosticEventStatus = 'pending' | 'confirmed' | 'failed' | 'unresolved';

export interface DiagnosticEvent {
  category: DiagnosticEventCategory;
  scope?: DiagnosticPersistenceScope;
  generation?: number;
  correlationId?: string;
  errorName?: string;
  errorCode?: string;
  failureStage?: DiagnosticFailureStage;
  status?: DiagnosticEventStatus;
  nativeDirectionTransition?: string;
  buildId: string;
  timestamp: string;
}

export interface RecordDiagnosticEventInput {
  category: DiagnosticEventCategory;
  scope?: DiagnosticPersistenceScope;
  generation?: number;
  correlationId?: string;
  error?: unknown;
  errorName?: string;
  errorCode?: string;
  failureStage?: DiagnosticFailureStage;
  status?: DiagnosticEventStatus;
  nativeDirectionTransition?: string;
  timestamp?: string;
}

export const MAX_DIAGNOSTIC_EVENTS = 200;

export const ALLOWED_EVENT_FIELDS: readonly (keyof DiagnosticEvent)[] = Object.freeze([
  'category',
  'scope',
  'generation',
  'correlationId',
  'errorName',
  'errorCode',
  'failureStage',
  'status',
  'nativeDirectionTransition',
  'buildId',
  'timestamp',
]);

export const KNOWN_ERROR_NAMES: Readonly<Record<string, string>> = Object.freeze({
  SettingsStorageTimeoutError: 'SETTINGS_STORAGE_TIMEOUT',
  SettingsStorageQueueClosedError: 'SETTINGS_QUEUE_CLOSED',
  SettingsStorageReconciliationRequiredError: 'SETTINGS_RECONCILIATION_REQUIRED',
  LanguageMirrorPreparationError: 'LANGUAGE_MIRROR_FAILED',
  LanguagePersistenceTimeoutError: 'LANGUAGE_PERSISTENCE_TIMEOUT',
});

const KNOWN_SAFE_ERROR_NAMES: ReadonlySet<string> = new Set([
  'SETTINGS_STORAGE_TIMEOUT',
  'SETTINGS_QUEUE_CLOSED',
  'SETTINGS_RECONCILIATION_REQUIRED',
  'LANGUAGE_MIRROR_FAILED',
  'LANGUAGE_PERSISTENCE_TIMEOUT',
  'UNKNOWN_ERROR',
]);

const SAFE_IDENTIFIER_REGEX = /^[A-Za-z0-9_.-]+$/;
const MAX_IDENTIFIER_LENGTH = 64;

const diagnosticEventRing: DiagnosticEvent[] = [];
let activeSubscriptions: (() => void)[] = [];
let snapshotTask: Promise<void> | null = null;

export function extractErrorDetails(error: unknown): { errorName?: string; errorCode?: string } {
  if (!error) return {};

  let errorName = 'UNKNOWN_ERROR';
  let errorCode: string | undefined;

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    const rawName = typeof err.name === 'string' ? err.name : undefined;
    if (rawName) {
      if (rawName in KNOWN_ERROR_NAMES) {
        errorName = KNOWN_ERROR_NAMES[rawName];
      } else if (KNOWN_SAFE_ERROR_NAMES.has(rawName)) {
        errorName = rawName;
      } else {
        errorName = 'UNKNOWN_ERROR';
      }
    } else {
      errorName = 'UNKNOWN_ERROR';
    }

    const rawCode =
      typeof err.code === 'string' || typeof err.code === 'number' ? String(err.code) : undefined;
    if (rawCode && rawCode.length <= MAX_IDENTIFIER_LENGTH && SAFE_IDENTIFIER_REGEX.test(rawCode)) {
      errorCode = rawCode;
    }
  } else if (typeof error === 'string') {
    if (error in KNOWN_ERROR_NAMES) {
      errorName = KNOWN_ERROR_NAMES[error];
    } else if (KNOWN_SAFE_ERROR_NAMES.has(error)) {
      errorName = error;
    } else {
      errorName = 'UNKNOWN_ERROR';
    }
  }

  if (errorName.length > MAX_IDENTIFIER_LENGTH || !SAFE_IDENTIFIER_REGEX.test(errorName)) {
    errorName = 'UNKNOWN_ERROR';
  }

  return {
    errorName,
    ...(errorCode ? { errorCode } : {}),
  };
}

export function recordDiagnosticEvent(input: RecordDiagnosticEventInput): void {
  if (!isDiagnosticModeEnabled()) return;

  let errorName: string | undefined;
  let errorCode: string | undefined;

  if (input.error) {
    const errDetails = extractErrorDetails(input.error);
    errorName = errDetails.errorName;
    errorCode = errDetails.errorCode;
  }

  if (input.errorName) {
    if (input.errorName in KNOWN_ERROR_NAMES) {
      errorName = KNOWN_ERROR_NAMES[input.errorName];
    } else if (KNOWN_SAFE_ERROR_NAMES.has(input.errorName)) {
      errorName = input.errorName;
    } else {
      errorName = 'UNKNOWN_ERROR';
    }
  }

  if (input.errorCode) {
    const rawCode = String(input.errorCode);
    if (rawCode.length <= MAX_IDENTIFIER_LENGTH && SAFE_IDENTIFIER_REGEX.test(rawCode)) {
      errorCode = rawCode;
    } else {
      errorCode = undefined;
    }
  }

  if (errorName) {
    if (errorName.length > MAX_IDENTIFIER_LENGTH || !SAFE_IDENTIFIER_REGEX.test(errorName)) {
      errorName = 'UNKNOWN_ERROR';
    }
  }

  const sanitized: DiagnosticEvent = {
    category: input.category,
    buildId: DIAGNOSTIC_BUILD_ID,
    timestamp: input.timestamp || new Date().toISOString(),
  };

  if (input.scope) {
    sanitized.scope = input.scope;
  }
  if (typeof input.generation === 'number') {
    sanitized.generation = input.generation;
  }
  if (typeof input.correlationId === 'string' && /^op-\d+$/.test(input.correlationId)) {
    sanitized.correlationId = input.correlationId;
  }
  if (errorName) {
    sanitized.errorName = errorName;
  }
  if (errorCode) {
    sanitized.errorCode = errorCode;
  }
  if (input.failureStage) {
    sanitized.failureStage = input.failureStage;
  }
  if (input.status) {
    sanitized.status = input.status;
  }
  if (input.nativeDirectionTransition) {
    sanitized.nativeDirectionTransition = input.nativeDirectionTransition;
  }

  // Bounded ring: evict oldest when capacity reached
  if (diagnosticEventRing.length >= MAX_DIAGNOSTIC_EVENTS) {
    diagnosticEventRing.shift();
  }
  diagnosticEventRing.push(sanitized);

  // Fire-and-forget plain JSON snapshot in app's diagnostic directory
  triggerDiagnosticEventsSnapshot();
}

export function getDiagnosticEvents(): DiagnosticEvent[] {
  return [...diagnosticEventRing];
}

export function clearDiagnosticEvents(): void {
  diagnosticEventRing.length = 0;
}

export function getDiagnosticSubscriptionCount(): number {
  return activeSubscriptions.length;
}

export function handleQueueLifecycleEvent(event: SettingsQueueLifecycleEvent): void {
  if (!isDiagnosticModeEnabled()) return;

  let scope: DiagnosticPersistenceScope = 'general';
  let correlationId: string | undefined;

  const isReconciliation = event.category.startsWith('reconciliation_');
  const activeOpContext = !isReconciliation ? getActiveOperationDiagnosticContext?.() : null;

  if (activeOpContext && activeOpContext.scope) {
    scope = activeOpContext.scope;
    correlationId = activeOpContext.correlationId;
  } else {
    try {
      scope = getActiveDiagnosticScope();
    } catch {
      scope = 'general';
    }
  }

  const status: DiagnosticEventStatus | undefined =
    event.status && event.status !== 'idle' ? event.status : undefined;

  recordDiagnosticEvent({
    category: event.category,
    scope,
    generation: event.generation,
    failureStage: event.failureStage,
    status,
    error: event.error,
    ...(correlationId ? { correlationId } : {}),
  });
}

export function installDiagnosticEventObserver(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (activeSubscriptions.length > 0) return;

  const unsubQueue = registerSettingsQueueDiagnosticObserver(handleQueueLifecycleEvent);
  activeSubscriptions.push(unsubQueue);

  try {
    const unsubScope = subscribeSettingsScope((scope) => {
      if (!isDiagnosticModeEnabled()) return;
      const opContext = getActiveOperationDiagnosticContext?.();
      const correlationId = opContext?.correlationId;
      if (scope === 'theme') {
        recordDiagnosticEvent({
          category: 'theme_selected',
          scope: 'theme',
          status: 'pending',
          ...(correlationId ? { correlationId } : {}),
        });
      } else if (scope === 'language') {
        recordDiagnosticEvent({
          category: 'language_selected',
          scope: 'language',
          status: 'pending',
          ...(correlationId ? { correlationId } : {}),
        });
      }
    });
    activeSubscriptions.push(unsubScope);
  } catch {}

  try {
    if (typeof registerLanguageDiagnosticObserver === 'function') {
      const unsubLanguage = registerLanguageDiagnosticObserver((event) => {
        recordDiagnosticEvent(event);
      });
      activeSubscriptions.push(unsubLanguage);
    }
  } catch {}
}

export function uninstallDiagnosticEventObserver(): void {
  for (const unsub of activeSubscriptions) {
    try {
      unsub();
    } catch {}
  }
  activeSubscriptions = [];
}

export async function persistDiagnosticEventsSnapshot(): Promise<void> {
  if (!isDiagnosticModeEnabled()) return;

  try {
    const dir = FileSystem?.documentDirectory || FileSystem?.cacheDirectory;
    if (!dir) return;

    const baseDir = dir.endsWith('/') ? dir : `${dir}/`;
    const diagDir = `${baseDir}diagnostic/`;
    const filePath = `${diagDir}diagnostic_events.json`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(diagDir).catch(() => null);
      if (!dirInfo || !dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(diagDir, { intermediates: true }).catch(() => {});
      }
    } catch {}

    const payload = JSON.stringify(diagnosticEventRing, null, 2);
    await FileSystem.writeAsStringAsync(filePath, payload, {
      encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8',
    });
  } catch {
    // Fire-and-forget: ignore any storage errors so app execution is never disrupted
  }
}

export function triggerDiagnosticEventsSnapshot(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (snapshotTask) return;
  snapshotTask = persistDiagnosticEventsSnapshot()
    .catch(() => {})
    .finally(() => {
      snapshotTask = null;
    });
}

export interface DiagnosticEventsReport {
  buildId: string;
  timestamp: string;
  count: number;
  events: DiagnosticEvent[];
}

export function buildDiagnosticEventsReport(): DiagnosticEventsReport {
  return {
    buildId: DIAGNOSTIC_BUILD_ID,
    timestamp: new Date().toISOString(),
    count: diagnosticEventRing.length,
    events: [...diagnosticEventRing],
  };
}

export function copyDiagnosticReport(customClipboard?: { setString: (text: string) => void }): boolean {
  try {
    const report = buildDiagnosticEventsReport();
    const json = JSON.stringify(report, null, 2);
    const clip = customClipboard || Clipboard;
    if (clip && typeof (clip as any).setString === 'function') {
      (clip as any).setString(json);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
