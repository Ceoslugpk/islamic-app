import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as settingsQueue from '../src/lib/settingsWriteQueue.ts';
const {
  createSerializedSettingsWriter,
  SettingsStorageQueueClosedError,
  SettingsStorageReconciliationRequiredError,
  SettingsStorageTimeoutError,
} = settingsQueue;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const NEVER = () => new Promise(() => {});

function loadRealSettings(storage, { setTimeoutImpl = setTimeout, asyncStorage = storage } = {}) {
  const transpile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  let capturedValue = null;
  let hookIndex = 0;
  let renderCount = 0;
  const stateSlots = [];
  const refs = [];
  const callbacks = [];
  const effects = [];

  const reactMock = {
    createContext: () => ({
      Provider: (props) => {
        capturedValue = props.value;
        return props.children;
      },
    }),
    useContext: () => capturedValue,
    useState: (initial) => {
      const index = hookIndex++;
      if (!stateSlots[index]) {
        stateSlots[index] = {
          value: typeof initial === 'function' ? initial() : initial,
        };
      }
      const slot = stateSlots[index];
      return [slot.value, (next) => {
        slot.value = typeof next === 'function' ? next(slot.value) : next;
      }];
    },
    useRef: (initial) => {
      const index = hookIndex++;
      refs[index] ??= { current: initial };
      return refs[index];
    },
    useEffect: (fn) => {
      if (renderCount === 0) effects.push(fn);
    },
    useCallback: (fn) => {
      callbacks.push(fn);
      return fn;
    },
    createElement: (type, props, ...children) => type({ ...(props ?? {}), children }),
  };

  const moduleObj = { exports: {} };
  const sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    require: (id) => {
      if (id === '@react-native-async-storage/async-storage') return asyncStorage;
      if (id === 'react') return reactMock;
      if (id === './settingsWriteQueue') {
        const queueModule = { exports: {} };
        const queueBox = {
          module: queueModule,
          exports: queueModule.exports,
          Promise,
          Error,
          JSON,
          Set,
        };
        vm.createContext(queueBox);
        vm.runInContext(transpile('src/lib/settingsWriteQueue.ts'), queueBox);
        return queueModule.exports;
      }
      if (id === './accents') return { DEFAULT_ACCENT: 'emerald', ACCENT_KEYS: ['emerald', 'amber', 'rose'] };
      if (id === './quranAudio') return {
        setAudioTranslationEnabled: () => {},
        setAudioTranslationEdition: async () => {},
        DEFAULT_AUDIO_TRANSLATION_EDITION_ID: 'en.sahih',
        AUDIO_TRANSLATION_EDITION_KEY: 'audio-translation-edition',
      };
      if (id === './quranLanguageState') return {
        getQuranTranslationLanguage: () => 'en',
        setQuranTranslationLanguage: async () => {},
      };
      if (id === './i18n') return {
        getBootLanguage: () => 'en',
        setAppLanguage: () => {},
        isAppLanguage: (value) => ['en', 'ur', 'ar'].includes(value),
      };
      if (id === './audio') return { setActiveAdhanReciterId: () => {} };
      if (id === './useLocation') return { setCachedLocation: () => {} };
      if (id === './tafsirSources') return { TAFSIR_SOURCES: [{ id: 'jalalayn' }] };
      return {};
    },
    console,
    Set,
    Map,
    Promise,
    Error,
    String,
    Boolean,
    Array,
    Object,
    Math,
    Date,
    Number,
    parseInt,
    isNaN,
    setTimeout: setTimeoutImpl,
    clearTimeout,
    JSON,
  };
  vm.createContext(sandbox);
  vm.runInContext(transpile('src/lib/settings.tsx'), sandbox);

  const render = () => {
    hookIndex = 0;
    const result = moduleObj.exports.SettingsProvider({ children: 'child' });
    renderCount += 1;
    return result;
  };

  return {
    exports: moduleObj.exports,
    callbacks,
    effects,
    render,
    get context() { return capturedValue; },
  };
}

const persistedPaper = JSON.stringify({
  settingsVersion: 2,
  themeMode: 'paper',
  language: 'en',
});

async function testFailedHydrationKeepsDurableSettings() {
  const writes = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return persistedPaper;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      if (key === 'quran-font-size') throw new Error('legacy read failed');
      return null;
    },
    async setItem(key, value) {
      writes.push([key, value]);
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();

  assert.equal(harness.context.settings.themeMode, 'paper', 'a failed auxiliary read must not discard a durable settings read');
  assert.equal(writes.length, 0, 'hydration failure must not write defaults over durable preferences');
}

async function testPendingHydrationReachesReadyWithoutDefaultWrite() {
  const writes = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return persistedPaper;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      if (key === 'quran-font-size') return NEVER();
      return null;
    },
    async setItem(key, value) {
      writes.push([key, value]);
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(11_000);
  const result = harness.render();

  assert.deepEqual(result, ['child'], 'a timed-out hydration read must release the provider into its ready state');
  assert.equal(harness.context.settings.themeMode, 'paper', 'a successful primary read must survive a timed-out legacy read');
  assert.equal(writes.length, 0, 'a timed-out hydration read must not write defaults');
}

async function testHydrationFailureRollsBackLiveThemeToConfirmedGeneration() {
  let releasePrimary;
  let primaryReads = 0;
  const writes = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings' && primaryReads++ === 0) {
        return new Promise((resolve) => { releasePrimary = () => resolve(persistedPaper); });
      }
      if (key === 'islamic-settings') return persistedPaper;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    async setItem(key, value) {
      writes.push([key, value]);
      throw new Error('settings write failed');
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();

  const updateSettings = harness.callbacks[2];
  updateSettings((current) => ({ ...current, themeMode: 'ink' }));
  releasePrimary();
  await delay(50);
  harness.render();

  assert.equal(harness.context.settings.themeMode, 'paper', 'a failed live theme write must roll back to the last confirmed generation after hydration');
  assert.ok(writes.length >= 1, 'the assertion must exercise the production settings writer');
}

async function testHydrationChangeBackPreservesFieldGeneration() {
  const stored = {
    settingsVersion: 2,
    language: 'en',
    themeMode: 'ink',
    remindersEnabled: true,
  };
  let releasePrimary;
  let primaryRead = true;
  let storedRaw = JSON.stringify(stored);
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings' && primaryRead) {
        primaryRead = false;
        return new Promise((resolve) => { releasePrimary = () => resolve(JSON.stringify(stored)); });
      }
      if (key === 'islamic-settings') return storedRaw;
      if (key === 'islamic-settings-method-migrated-v16') return Promise.resolve('true');
      return Promise.resolve(null);
    },
    async setItem(key, value) {
      if (key === 'islamic-settings') storedRaw = value;
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();

  // The live value returns to its hydration baseline, so a final-value-vs-baseline
  // merge would incorrectly discard this field's newer generation.
  const updateSettings = harness.callbacks[2];
  updateSettings((current) => ({ ...current, themeMode: 'ink' }));
  updateSettings((current) => ({ ...current, themeMode: 'system' }));
  releasePrimary();
  await delay(50);
  harness.render();

  assert.equal(harness.context.settings.themeMode, 'system', 'change→change-back must retain the newer live field generation');
  assert.equal(harness.context.settings.remindersEnabled, true, 'untouched fields must hydrate from durable storage');
}

async function testThemeWriteRequiresReadbackConfirmation() {
  const writes = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return persistedPaper;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    async setItem(key, value) {
      writes.push([key, value]);
      // Native setItem reports success, but the subsequent readback remains stale.
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();
  harness.context.setThemeMode('ink');
  await delay(30);
  harness.render();

  assert.equal(harness.context.settings.themeMode, 'paper', 'theme must not remain optimistically changed when readback did not confirm it');
  assert.equal(writes.length, 1, 'the test must use the real production theme persistence path');
}

async function testThemeLifecycleConfirmsSuccessesAndRollsBackOnlyFailedField() {
  let raw = JSON.stringify({ language: 'en', themeMode: 'paper', hapticsEnabled: true });
  let failNextWrite = false;
  const writes = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return raw;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    async setItem(key, value) {
      if (key !== 'islamic-settings') return;
      writes.push(value);
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('theme write rejected');
      }
      raw = value;
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();

  harness.context.setThemeMode('ink');
  await delay(30);
  harness.render();
  assert.equal(harness.context.settings.themeMode, 'ink', 'the first successful theme write must remain active');
  assert.equal(harness.context.settingsPersistence.status, 'confirmed', 'the first theme write must publish confirmed');

  harness.context.setThemeMode('paper');
  await delay(30);
  harness.render();
  assert.equal(harness.context.settings.themeMode, 'paper', 'the second successful theme write must remain active');
  assert.equal(harness.context.settingsPersistence.status, 'confirmed', 'the second theme write must publish confirmed');
  assert.equal(writes.length, 2, 'both successful theme changes must use the production queue');

  failNextWrite = true;
  harness.context.setThemeMode('ink');
  harness.context.setHapticsEnabled(false);
  await delay(50);
  harness.render();
  assert.equal(harness.context.settings.themeMode, 'paper', 'a rejected theme write must roll back its field');
  assert.equal(harness.context.settings.hapticsEnabled, false, 'a newer unrelated field must survive theme rollback');
  assert.equal(harness.context.settingsPersistence.status, 'confirmed', 'the newer unrelated write must recover the queue');
}

async function testTimedOutWriteFailsClosedBeforeSuccessor() {
  const writes = [];
  const started = [];
  let releaseNativeWrite;
  let persistedRaw = persistedPaper;
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return persistedRaw;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    setItem(key, value) {
      started.push(value);
      if (started.length === 1) {
        return new Promise((resolve) => { releaseNativeWrite = resolve; });
      }
      writes.push([key, value]);
      persistedRaw = value;
      return Promise.resolve().then(() => {});
    },
  };
  const originalSetTimeout = globalThis.setTimeout;
  const fastTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay >= 1000 ? 5 : delay, ...args);
  const asyncStorage = {
    getItem: (...args) => storage.getItem(...args),
    setItem: (...args) => storage.setItem(...args),
  };
  const harness = loadRealSettings(storage, { setTimeoutImpl: fastTimeout, asyncStorage });
  const base = harness.exports.sanitizeSettings({ language: 'en', themeMode: 'paper' });
  const first = harness.exports.persistLanguageChange(base, 'ur', storage);
  const second = harness.exports.persistLanguageChange(base, 'ar', storage);

  const deadline = (message) => new Promise((_, reject) => originalSetTimeout(() => reject(new Error(message)), 80));
  await assert.rejects(Promise.race([first, deadline('first deadline exceeded')]), /timed out/);
  await assert.rejects(Promise.race([second, deadline('successor deadline exceeded')]), /queue closed/);
  assert.equal(harness.exports.getSettingsWriteState(storage).status, 'unresolved', 'the production settings path must expose timeout uncertainty');
  assert.equal(started.length, 1, 'a timed-out native write must not have a successor');
  assert.equal(writes.length, 0, 'the closed queue must not start a newer write');

  // The old native operation may settle detached; a fresh writer after relaunch
  // can retry once that native operation is no longer in flight.
  releaseNativeWrite();
  await new Promise((resolve) => originalSetTimeout(resolve, 0));
  const relaunched = loadRealSettings(storage, { setTimeoutImpl: fastTimeout, asyncStorage });
  const retried = await relaunched.exports.persistLanguageChange(base, 'ar', storage);
  assert.equal(retried.language, 'ar', 'a new writer can retry after the failed lane is abandoned');
  assert.equal(relaunched.exports.getSettingsWriteState(storage).status, 'confirmed', 'a full relaunch plus read reconciliation can confirm recovery');
}

async function testThemeTimeoutRejectsLanguageWithoutSuccessorNativeWrite() {
  const originalSetTimeout = globalThis.setTimeout;
  const writesStarted = [];
  let nativeWriteCount = 0;
  let raw = persistedPaper;
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return raw;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    setItem(key, value) {
      writesStarted.push([key, value]);
      nativeWriteCount += 1;
      if (nativeWriteCount === 1) {
        raw = value;
        return Promise.resolve().then(() => {});
      }
      return NEVER();
    },
  };
  const fastTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay >= 1000 ? 5 : delay, ...args);
  const harness = loadRealSettings(storage, { setTimeoutImpl: fastTimeout, asyncStorage: storage });
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();

  harness.context.setThemeMode('ink');
  await delay(20);
  harness.render();
  assert.equal(harness.context.settingsPersistence.status, 'confirmed', 'a confirmed theme write must precede the uncertain write');
  assert.equal(harness.context.settings.themeMode, 'ink');

  harness.context.setThemeMode('paper');
  await delay(20);
  harness.render();
  assert.equal(harness.context.settingsPersistence.status, 'unresolved', 'a never-settling theme write must publish unresolved');
  await assert.rejects(harness.context.setLanguage('ur'), /queue closed/, 'language must receive the typed closed-lane error');
  assert.equal(writesStarted.length, 2, 'language selection must not start a successor native write');
  assert.equal(harness.exports.getSettingsWriteState(storage).status, 'unresolved');
}

async function testWriterLifecycleIsExplicitAndLateCompletionCannotConfirm() {
  let stored = null;
  let releaseLateWrite;
  let resolveTimeout;
  let writeCalls = 0;
  let unresolved = false;
  const storage = {
    async getItem() { return stored; },
    isUnresolvedOperation: () => unresolved,
    markUnresolvedOperation: () => { unresolved = true; },
    setItem(_key, value) {
      writeCalls += 1;
      if (writeCalls > 1) {
        stored = value;
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        releaseLateWrite = () => {
          unresolved = false;
          stored = value;
          resolve();
        };
        resolveTimeout = () => reject(new SettingsStorageTimeoutError('write'));
      });
    },
  };
  const writer = createSerializedSettingsWriter(storage, 'islamic-settings', () => {}, { requireReconciliation: true });

  assert.equal(writer.getState().reconciliationRequired, true, 'a new settings writer must require a read reconciliation');
  await writer.reconcile();
  assert.equal(writer.getState().status, 'confirmed', 'a successful reconciliation is a confirmed storage snapshot');

  const pending = writer({ language: 'ur' });
  assert.equal(writer.getState().status, 'pending', 'an in-flight write is explicitly pending');
  await delay(0);
  resolveTimeout();
  await assert.rejects(pending, /timed out/);
  assert.equal(writer.getState().status, 'unresolved', 'a timeout is unresolved, never confirmed');

  await assert.rejects(
    writer({ language: 'ar' }),
    (error) => error instanceof SettingsStorageQueueClosedError,
    'the same runtime must reject conflicting writes after an unresolved operation',
  );

  const blockedReloadWriter = createSerializedSettingsWriter(storage, 'islamic-settings', () => {}, { requireReconciliation: true });
  // The raw operation is still unresolved until its late completion; a reload
  // in the same native process must not let a newer preference race through it.
  await assert.rejects(
    blockedReloadWriter.reconcile(),
    (error) => error instanceof SettingsStorageQueueClosedError,
    'a fresh writer must remain blocked while the old native operation is unresolved',
  );
  releaseLateWrite();
  await delay(0);
  assert.equal(writer.getState().status, 'unresolved', 'a late native completion cannot become a confirmed preference');
  const relaunchedWriter = createSerializedSettingsWriter(storage, 'islamic-settings', () => {}, { requireReconciliation: true });
  await assert.rejects(
    relaunchedWriter({ language: 'ar' }),
    (error) => error instanceof SettingsStorageReconciliationRequiredError,
    'a fresh writer must reconcile before it can claim a durable write',
  );
  await relaunchedWriter.reconcile();
  await relaunchedWriter({ language: 'ar' });
  assert.equal(relaunchedWriter.getState().status, 'confirmed', 'reconciliation permits bounded recovery after reload');
}

async function testWriterMarksRejectedWritesAndRecovers() {
  let fail = true;
  const storage = {
    async getItem() { return null; },
    async setItem(_key, value) {
      if (fail) {
        fail = false;
        throw new Error('forced rejection');
      }
      return value;
    },
  };
  const writer = createSerializedSettingsWriter(storage, 'islamic-settings', () => {}, { requireReconciliation: true });
  await writer.reconcile();
  await assert.rejects(writer({ language: 'ur' }), /forced rejection/);
  assert.equal(writer.getState().status, 'failed', 'a confirmed rejection is distinct from unresolved timeout');
  await writer({ language: 'ar' });
  assert.equal(writer.getState().status, 'confirmed', 'the queue recovers after a confirmed rejection');
}

async function testHydrationMigrationReconcilesBeforePersisting() {
  const stored = {
    settingsVersion: 1,
    methodId: 8,
    language: 'en',
  };
  const settingsWrites = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return JSON.stringify(stored);
      if (key === 'islamic-settings-method-migrated-v16') return null;
      return null;
    },
    async setItem(key, value) {
      if (key === 'islamic-settings') {
        settingsWrites.push(value);
        Object.assign(stored, JSON.parse(value));
      }
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);

  assert.equal(settingsWrites.length, 1, 'hydration migration must durably write islamic-settings');
  const persisted = JSON.parse(settingsWrites[0]);
  assert.equal(persisted.settingsVersion, 2, 'migration must persist the current settings schema version');
  assert.equal(persisted.methodId, 16, 'migration must persist the upgraded method');
}

async function testHydrationMigrationFailureRollsBackToConfirmedBaseline() {
  const durable = {
    settingsVersion: 1,
    methodId: 8,
    language: 'en',
    prayerConfigs: {
      Fajr: { enabled: false, adhan: true, vibration: false },
    },
  };
  let raw = JSON.stringify(durable);
  const migrationMarkerWrites = [];
  const settingsWrites = [];
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return raw;
      if (key === 'islamic-settings-method-migrated-v16') return null;
      return null;
    },
    async setItem(key, value) {
      if (key === 'islamic-settings-method-migrated-v16') {
        migrationMarkerWrites.push(value);
        return;
      }
      if (key === 'islamic-settings') {
        settingsWrites.push(value);
        throw new Error('migration settings write failed');
      }
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();

  assert.equal(settingsWrites.length, 1, 'the test must reject the real hydration migration write');
  assert.equal(JSON.parse(raw).methodId, 8, 'failed migration must leave durable method 8 in storage');
  assert.equal(JSON.parse(raw).settingsVersion, 1, 'failed migration must leave durable schema version 1 in storage');
  assert.equal(migrationMarkerWrites.length, 0, 'the migration marker must not claim a failed settings migration');
  assert.equal(harness.context.settings.methodId, 8, 'failed migration rollback must restore the confirmed method');
  assert.equal(harness.context.settings.settingsVersion, 1, 'failed migration rollback must restore the confirmed schema version');
  assert.deepEqual(
    JSON.parse(JSON.stringify(harness.context.settings.prayerConfigs.Fajr)),
    durable.prayerConfigs.Fajr,
    'rollback must preserve the confirmed nested settings fields',
  );
}

async function testStandaloneCustomStorageReconcilesBeforeFirstWrite() {
  let raw = JSON.stringify({ language: 'en', themeMode: 'paper' });
  let reads = 0;
  let writes = 0;
  const storage = {
    async getItem(key) {
      assert.equal(key, 'islamic-settings');
      reads += 1;
      return raw;
    },
    async setItem(key, value) {
      assert.equal(key, 'islamic-settings');
      writes += 1;
      raw = value;
    },
  };
  const harness = loadRealSettings(storage);
  const customStorage = {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
  };
  const persisted = await harness.exports.enqueueSettingsUpdate(
    (current) => ({ ...current, themeMode: 'ink' }),
    customStorage,
  );

  assert.equal(persisted.themeMode, 'ink', 'the real standalone update path must return the persisted field');
  assert.equal(JSON.parse(raw).themeMode, 'ink', 'the custom storage must receive the updated settings');
  assert.equal(writes, 1, 'the custom storage update must perform one write');
  assert.ok(reads >= 3, 'the path must read the snapshot, reconcile the writer, and verify the write');
}

async function testReconciliationStatusHasNullValueAndUserMutationHasNonNullValue() {
  let raw = persistedPaper;
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return raw;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    async setItem(key, value) {
      if (key === 'islamic-settings') raw = value;
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();

  // On startup / hydration, initial state has value === null
  assert.equal(harness.context.settingsPersistence.value, null, 'initial state must have value=null (not a user write)');
  assert.equal(harness.context.settingsPersistence.scope, 'settings', 'initial scope must be settings');

  // User mutation sets scope: 'theme' and confirmed state has non-null value
  harness.context.setThemeMode('ink');
  harness.render();
  assert.equal(harness.context.settingsPersistence.scope, 'theme', 'setThemeMode must set scope to theme');
  await delay(30);
  harness.render();

  assert.equal(harness.context.settingsPersistence.scope, 'theme', 'confirmed theme write must retain theme scope');
  assert.equal(harness.context.settingsPersistence.status, 'confirmed', 'successful theme write must confirm');
  assert.ok(harness.context.settingsPersistence.value !== null, 'confirmed user mutation must have non-null value');
  assert.equal(harness.context.settingsPersistence.value.themeMode, 'ink', 'confirmed value must reflect user mutation');

  // General setting mutation sets scope: 'settings'
  harness.context.setMethod(3);
  harness.render();
  assert.equal(harness.context.settingsPersistence.scope, 'settings', 'general setting must set scope to settings');
  await delay(30);
  harness.render();
  assert.equal(harness.context.settingsPersistence.scope, 'settings', 'confirmed general write must retain settings scope');
  assert.equal(harness.context.settingsPersistence.status, 'confirmed', 'general setting write must confirm');
  assert.equal(harness.context.settingsPersistence.value.methodId, 3);
}

async function testDirectionChangingLanguagePersistencePublishesLanguageScope() {
  let raw = JSON.stringify({ settingsVersion: 2, themeMode: 'paper', language: 'en' });
  const storage = {
    async getItem(key) {
      if (key === 'islamic-settings') return raw;
      if (key === 'islamic-settings-method-migrated-v16') return 'true';
      return null;
    },
    async setItem(key, value) {
      if (key === 'islamic-settings') {
        raw = value;
      }
    },
  };
  const harness = loadRealSettings(storage);
  harness.render();
  for (const effect of harness.effects) effect();
  await delay(30);
  harness.render();

  harness.context.setThemeMode('ink');
  harness.render();
  await delay(30);
  harness.render();
  assert.equal(harness.context.settingsPersistence.scope, 'theme', 'scope must be theme after theme change');

  // Direction-changing language persistence must publish scope='language'
  await harness.exports.persistLanguageChange(harness.context.settings, 'ur');
  harness.render();
  assert.equal(harness.context.settingsPersistence.scope, 'language', 'persistLanguageChange must publish language scope');
}

const only = process.env.P1_ONLY;
const cases = [
  ['hydration-failed', testFailedHydrationKeepsDurableSettings, 'failed hydration preserves the successful durable read without writing defaults'],
  ['hydration-pending', testPendingHydrationReachesReadyWithoutDefaultWrite, 'pending hydration reaches ready after timeout without default overwrite'],
  ['hydration-race', testHydrationFailureRollsBackLiveThemeToConfirmedGeneration, 'hydration-time live theme failure rolls back to the confirmed generation'],
  ['hydration-change-back', testHydrationChangeBackPreservesFieldGeneration, 'hydration preserves a field whose generation advanced even after it returned to baseline'],
  ['theme-readback', testThemeWriteRequiresReadbackConfirmation, 'theme persistence requires readback confirmation'],
  ['theme-lifecycle', testThemeLifecycleConfirmsSuccessesAndRollsBackOnlyFailedField, 'theme lifecycle confirms successes and rolls back only the failed field'],
  ['write-timeout', testTimedOutWriteFailsClosedBeforeSuccessor, 'timed-out writes fail closed after the native operation drains'],
  ['theme-timeout-language', testThemeTimeoutRejectsLanguageWithoutSuccessorNativeWrite, 'theme timeout rejects language without a successor native write'],
  ['writer-lifecycle', testWriterLifecycleIsExplicitAndLateCompletionCannotConfirm, 'writer exposes lifecycle states and requires reconciliation after uncertainty'],
  ['writer-rejection', testWriterMarksRejectedWritesAndRecovers, 'writer distinguishes rejection and recovers for the next write'],
  ['hydration-migration-reconcile', testHydrationMigrationReconcilesBeforePersisting, 'hydration migration reconciles the shared writer before persisting'],
  ['hydration-migration-failure', testHydrationMigrationFailureRollsBackToConfirmedBaseline, 'failed hydration migration rolls back to the confirmed durable baseline'],
  ['standalone-custom-reconcile', testStandaloneCustomStorageReconcilesBeforeFirstWrite, 'standalone custom storage reconciles before its first write'],
  ['reconcile-null-vs-user-mutation', testReconciliationStatusHasNullValueAndUserMutationHasNonNullValue, 'reconciliation has value=null while user mutations confirm non-null values with appropriate scopes'],
  ['language-scope-ownership', testDirectionChangingLanguagePersistencePublishesLanguageScope, 'direction-changing language persistence publishes language scope before/with operation'],
];
for (const [name, test, message] of cases) {
  if (only && only !== name) continue;
  await test();
  console.log(`✓ ${message}`);
}
