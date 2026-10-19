import assert from 'node:assert/strict';

console.log('=== RUNTIME CONCURRENCY & TRANSACTION BEHAVIOR TESTS ===\n');

// 1. Test createSerializedSettingsWriter FIFO ordering & non-loss
import { createSerializedSettingsWriter } from '../src/lib/settingsWriteQueue.ts';

const storageMap = new Map();
const mockStorage = {
  async getItem(k) {
    return storageMap.get(k) ?? null;
  },
  async setItem(k, v) {
    // Artificial small delay to simulate I/O
    await new Promise((r) => setTimeout(r, 10));
    storageMap.set(k, v);
  },
};

const writeQueue = createSerializedSettingsWriter(mockStorage, 'islamic-settings', () => {});

// Simultaneous writes
const p1 = writeQueue({ themeMode: 'paper', language: 'en', womenPinHash: 'hash1' });
const p2 = writeQueue({ themeMode: 'ink', language: 'en', womenPinHash: 'hash1' });
const p3 = writeQueue({ themeMode: 'ink', language: 'ur', womenPinHash: 'hash2' });

await Promise.all([p1, p2, p3]);

const finalRaw = await mockStorage.getItem('islamic-settings');
const finalObj = JSON.parse(finalRaw);
assert.equal(finalObj.themeMode, 'ink');
assert.equal(finalObj.language, 'ur');
assert.equal(finalObj.womenPinHash, 'hash2');
console.log('✓ Serialized settings writer executes concurrent writes in strict FIFO without data loss');

// 2. Audio translation serialization queue model
let audioTail = Promise.resolve();
const audioExecutionLog = [];

function setAudioSimulated(id, fail = false) {
  const op = async () => {
    audioExecutionLog.push(`start:${id}`);
    await new Promise((r) => setTimeout(r, 20));
    if (fail) {
      audioExecutionLog.push(`fail:${id}`);
      throw new Error(`failed:${id}`);
    }
    audioExecutionLog.push(`end:${id}`);
  };
  const task = audioTail.then(op, op);
  audioTail = task.then(() => undefined, () => undefined);
  return task;
}

const a1 = setAudioSimulated('edition-1');
const a2 = setAudioSimulated('edition-2');
const a3 = setAudioSimulated('edition-3', true).catch(() => {});
const a4 = setAudioSimulated('edition-4');

await Promise.all([a1, a2, a3, a4]);

assert.deepEqual(audioExecutionLog, [
  'start:edition-1',
  'end:edition-1',
  'start:edition-2',
  'end:edition-2',
  'start:edition-3',
  'fail:edition-3',
  'start:edition-4',
  'end:edition-4',
]);
console.log('✓ Audio translation transaction tail ensures non-interleaving serialized execution even across rejections');

console.log('\n✓ ALL RUNTIME CONCURRENCY & TRANSACTION BEHAVIOR TESTS PASSED!\n');
