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

  const getState = (): SettingsWriteState<T> => ({ ...state });

  const reconcile = (): Promise<void> => {
    if (closed) return Promise.reject(closeError ?? new SettingsStorageQueueClosedError());
    if (storage.isUnresolvedOperation?.()) {
      closed = true;
      closeError = new SettingsStorageQueueClosedError();
      publish({ status: 'unresolved', error: closeError, reconciliationRequired: true });
      return Promise.reject(closeError);
    }
    if (reconciled) return Promise.resolve();
    if (reconciliationTask) return reconciliationTask;

    const reconcileGeneration = ++generation;
    publish({ status: 'pending', generation: reconcileGeneration, error: null });
    reconciliationTask = storage.getItem(key).then(
      () => {
        reconciled = true;
        publish({
          status: 'confirmed',
          generation: reconcileGeneration,
          reconciliationRequired: false,
          error: null,
        });
      },
      (error) => {
        if (isStorageTimeoutError(error)) {
          closed = true;
          closeError = new SettingsStorageQueueClosedError();
          storage.markUnresolvedOperation?.();
          publish({ status: 'unresolved', generation: reconcileGeneration, error });
        } else {
          publish({ status: 'failed', generation: reconcileGeneration, error });
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
    const task = tail.then(async () => {
      if (closed) {
        throw closeError ?? new SettingsStorageQueueClosedError();
      }
      try {
        await storage.setItem(key, JSON.stringify(value));
        if (verify) {
          const raw = await storage.getItem(key);
          if (!raw) throw new Error('Storage readback failed: empty settings');
          verify(raw, value);
        }
        if (!closed) {
          publish({ status: 'confirmed', generation: writeGeneration, value, error: null });
          onPersisted(value);
        }
        return value;
      } catch (error) {
        if (isStorageTimeoutError(error)) {
          closed = true;
          closeError = new SettingsStorageQueueClosedError();
          storage.markUnresolvedOperation?.();
          // The native operation may still settle later, but it cannot call
          // onPersisted because this task already rejected and the lane is closed.
          publish({ status: 'unresolved', generation: writeGeneration, error });
        } else if (state.status !== 'unresolved') {
          publish({ status: 'failed', generation: writeGeneration, error });
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
