export interface StringStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  /** Optional process-local fence supplied by the timed AsyncStorage adapter. */
  isUnresolvedOperation?: () => boolean;
  markUnresolvedOperation?: () => void;
}

export type StoredValueVerifier<T> = (raw: string, value: T) => void;

export type SettingsWriteStatus = 'idle' | 'pending' | 'confirmed' | 'failed' | 'unresolved';

export interface SettingsWriteState<T> {
  status: SettingsWriteStatus;
  generation: number;
  value: T | null;
  error: unknown;
  reconciliationRequired: boolean;
}

export interface SerializedSettingsWriter<T> {
  (value: T, verify?: StoredValueVerifier<T>): Promise<T>;
  getState(): SettingsWriteState<T>;
  reconcile(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export interface SerializedSettingsWriterOptions {
  /** Settings storage needs a read after a JS reload before claiming a new write durable. */
  requireReconciliation?: boolean;
  diagnosticObserver?: SettingsQueueDiagnosticObserver;
}

export type SettingsQueueLifecycleEvent = {
  category:
    | 'settings_write_pending'
    | 'settings_write_confirmed'
    | 'settings_write_rejected'
    | 'settings_write_unresolved'
    | 'queue_closed'
    | 'reconciliation_started'
    | 'reconciliation_completed';
  generation?: number;
  failureStage?: 'write' | 'readback';
  status?: SettingsWriteStatus;
  error?: unknown;
};

export type SettingsQueueDiagnosticObserver = (event: SettingsQueueLifecycleEvent) => void;

let globalDiagnosticObserver: SettingsQueueDiagnosticObserver | null = null;

export function registerSettingsQueueDiagnosticObserver(
  observer: SettingsQueueDiagnosticObserver | null
): () => void {
  globalDiagnosticObserver = observer;
  return () => {
    if (globalDiagnosticObserver === observer) {
      globalDiagnosticObserver = null;
    }
  };
}

export class SettingsStorageTimeoutError extends Error {
  constructor(operation: 'read' | 'write') {
    super(`Settings storage ${operation} timed out`);
    this.name = 'SettingsStorageTimeoutError';
  }
}

export class SettingsStorageQueueClosedError extends Error {
  readonly code = 'SETTINGS_STORAGE_QUEUE_CLOSED';
  readonly recoverable = true;

  constructor() {
    super('Settings storage queue closed after an unresolved operation; retry after a full relaunch and reconciliation');
    this.name = 'SettingsStorageQueueClosedError';
  }
}

export class SettingsStorageReconciliationRequiredError extends Error {
  readonly code = 'SETTINGS_STORAGE_RECONCILIATION_REQUIRED';
  readonly recoverable = true;

  constructor() {
    super('Settings storage requires a read reconciliation before a new write');
    this.name = 'SettingsStorageReconciliationRequiredError';
  }
}

function isStorageTimeoutError(error: unknown): error is SettingsStorageTimeoutError {
  return error instanceof SettingsStorageTimeoutError;
}

/**
 * Serializes writes and keeps optional readback verification inside the queue.
 * A timed-out native Promise cannot be cancelled. Its lane therefore remains
 * unresolved and closed for this runtime; a fresh writer must reconcile first.
 */
export function createSerializedSettingsWriter<T>(
  storage: StringStorage,
  key: string,
  onPersisted: (value: T) => void,
  options: SerializedSettingsWriterOptions = {},
): SerializedSettingsWriter<T> {
  let tail: Promise<void> = Promise.resolve();
  let closed = false;
  let closeError: SettingsStorageQueueClosedError | null = null;
  let reconciled = !options.requireReconciliation;
  let reconciliationTask: Promise<void> | null = null;
  let generation = 0;
  let state: SettingsWriteState<T> = {
    status: 'idle',
    generation: 0,
    value: null,
    error: null,
    reconciliationRequired: !reconciled,
  };
  const listeners = new Set<() => void>();

  const publish = (next: Partial<SettingsWriteState<T>>) => {
    state = { ...state, ...next };
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // A subscriber must not affect persistence.
      }
    }
  };

  const emitLifecycle = (event: SettingsQueueLifecycleEvent) => {
    try {
      options.diagnosticObserver?.(event);
      globalDiagnosticObserver?.(event);
    } catch {
      // Diagnostic observation must be completely fire-and-forget
    }
  };

  const getState = (): SettingsWriteState<T> => ({ ...state });

  const reconcile = (): Promise<void> => {
    if (closed) return Promise.reject(closeError ?? new SettingsStorageQueueClosedError());
    if (storage.isUnresolvedOperation?.()) {
      if (!closed) {
        closed = true;
        closeError = new SettingsStorageQueueClosedError();
        emitLifecycle({
          category: 'queue_closed',
          status: 'unresolved',
          error: closeError,
        });
      }
      publish({ status: 'unresolved', error: closeError, reconciliationRequired: true });
      return Promise.reject(closeError);
    }
    if (reconciled) return Promise.resolve();
    if (reconciliationTask) return reconciliationTask;

    const reconcileGeneration = ++generation;
    publish({ status: 'pending', generation: reconcileGeneration, error: null });
    emitLifecycle({
      category: 'reconciliation_started',
      generation: reconcileGeneration,
      status: 'pending',
    });
    reconciliationTask = storage.getItem(key).then(
      () => {
        reconciled = true;
        publish({
          status: 'confirmed',
          generation: reconcileGeneration,
          reconciliationRequired: false,
          error: null,
        });
        emitLifecycle({
          category: 'reconciliation_completed',
          generation: reconcileGeneration,
          status: 'confirmed',
        });
      },
      (error) => {
        if (isStorageTimeoutError(error)) {
          const wasClosed = closed;
          closed = true;
          closeError = new SettingsStorageQueueClosedError();
          storage.markUnresolvedOperation?.();
          publish({ status: 'unresolved', generation: reconcileGeneration, error });
          emitLifecycle({
            category: 'settings_write_unresolved',
            generation: reconcileGeneration,
            failureStage: 'readback',
            status: 'unresolved',
            error,
          });
          if (!wasClosed) {
            emitLifecycle({
              category: 'queue_closed',
              generation: reconcileGeneration,
              failureStage: 'readback',
              status: 'unresolved',
              error: closeError,
            });
          }
        } else {
          publish({ status: 'failed', generation: reconcileGeneration, error });
          emitLifecycle({
            category: 'settings_write_rejected',
            generation: reconcileGeneration,
            failureStage: 'readback',
            status: 'failed',
            error,
          });
        }
        throw error;
      },
    ).finally(() => {
      reconciliationTask = null;
    });
    return reconciliationTask;
  };

  const write = ((value: T, verify?: StoredValueVerifier<T>) => {
    if (closed) {
      return Promise.reject(closeError ?? new SettingsStorageQueueClosedError());
    }
    if (!reconciled) {
      return Promise.reject(new SettingsStorageReconciliationRequiredError());
    }

    const writeGeneration = ++generation;
    publish({ status: 'pending', generation: writeGeneration, error: null });
    emitLifecycle({
      category: 'settings_write_pending',
      generation: writeGeneration,
      status: 'pending',
    });
    const task = tail.then(async () => {
      if (closed) {
        throw closeError ?? new SettingsStorageQueueClosedError();
      }
      let stage: 'write' | 'readback' = 'write';
      try {
        await storage.setItem(key, JSON.stringify(value));
        if (verify) {
          stage = 'readback';
          const raw = await storage.getItem(key);
          if (!raw) throw new Error('Storage readback failed: empty settings');
          verify(raw, value);
        }
        if (!closed) {
          publish({ status: 'confirmed', generation: writeGeneration, value, error: null });
          emitLifecycle({
            category: 'settings_write_confirmed',
            generation: writeGeneration,
            status: 'confirmed',
          });
          onPersisted(value);
        }
        return value;
      } catch (error) {
        if (isStorageTimeoutError(error)) {
          const wasClosed = closed;
          closed = true;
          closeError = new SettingsStorageQueueClosedError();
          storage.markUnresolvedOperation?.();
          // The native operation may still settle later, but it cannot call
          // onPersisted because this task already rejected and the lane is closed.
          publish({ status: 'unresolved', generation: writeGeneration, error });
          emitLifecycle({
            category: 'settings_write_unresolved',
            generation: writeGeneration,
            failureStage: stage,
            status: 'unresolved',
            error,
          });
          if (!wasClosed) {
            emitLifecycle({
              category: 'queue_closed',
              generation: writeGeneration,
              failureStage: stage,
              status: 'unresolved',
              error: closeError,
            });
          }
        } else if (state.status !== 'unresolved') {
          publish({ status: 'failed', generation: writeGeneration, error });
          emitLifecycle({
            category: 'settings_write_rejected',
            generation: writeGeneration,
            failureStage: stage,
            status: 'failed',
            error,
          });
        }
        throw error;
      }
    });

    // Rejections release ordinary writes; an unresolved timeout keeps `closed`
    // true so no successor can start native I/O in this runtime.
    tail = task.then(() => undefined, () => undefined);
    return task;
  }) as SerializedSettingsWriter<T>;

  write.getState = getState;
  write.reconcile = reconcile;
  write.subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return write;
}
