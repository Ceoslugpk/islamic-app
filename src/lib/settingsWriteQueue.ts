export interface StringStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
}

export type StoredValueVerifier<T> = (raw: string, value: T) => void;

/** Serializes writes and keeps optional readback verification inside the queue. */
export function createSerializedSettingsWriter<T>(
  storage: StringStorage,
  key: string,
  onPersisted: (value: T) => void,
): (value: T, verify?: StoredValueVerifier<T>) => Promise<T> {
  let tail: Promise<void> = Promise.resolve();

  return (value, verify) => {
    const task = tail.then(async () => {
      await storage.setItem(key, JSON.stringify(value));
      if (verify) {
        const raw = await storage.getItem(key);
        if (!raw) throw new Error('Storage readback failed: empty settings');
        verify(raw, value);
      }
      onPersisted(value);
      return value;
    });

    tail = task.then(() => undefined, () => undefined);
    return task;
  };
}
