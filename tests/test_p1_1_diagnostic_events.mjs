import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadTsModule(relativePath, mocks = {}, extraSandbox = {}) {
  const filename = path.join(ROOT, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => {
      if (request in mocks) return mocks[request];
      // Resolve relative modules within src/
      if (request.startsWith('.')) {
        const resolved = path.normalize(path.join(path.dirname(filename), request));
        const rel = path.relative(ROOT, resolved);
        const candidates = [
          rel,
          `${rel}.ts`,
          `${rel}.tsx`,
          `${rel}.js`,
          path.join(rel, 'index.ts'),
          path.join(rel, 'index.tsx'),
        ];
        for (const cand of candidates) {
          if (fs.existsSync(path.join(ROOT, cand))) {
            return loadTsModule(cand, mocks, extraSandbox);
          }
        }
      }
      assert.fail(`Unexpected production import from ${relativePath}: ${request}`);
    },
    console,
    process,
    globalThis,
    Set,
    Map,
    Promise,
    Error,
    TypeError,
    String,
    Boolean,
    Number,
    Array,
    Object,
    Math,
    Date,
    JSON,
    URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...extraSandbox,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename });
  return moduleObject.exports;
}

console.log('=== P1.1 DIAGNOSTIC INSTRUMENTATION TEST SUITE ===');

// Setup Mocks
let writtenFiles = [];
const mockFileSystem = {
  documentDirectory: 'file:///data/user/0/com.qashi.islamic/files/',
  cacheDirectory: 'file:///data/user/0/com.qashi.islamic/cache/',
  EncodingType: { UTF8: 'utf8' },
  getInfoAsync: async (p) => ({ exists: writtenFiles.some((f) => f.path === p), size: 100 }),
  makeDirectoryAsync: async () => {},
  writeAsStringAsync: async (filePath, content) => {
    writtenFiles.push({ path: filePath, content });
  },
};

let clipboardContent = '';
let clipboardShouldFail = false;
const mockClipboard = {
  setString: (text) => {
    if (clipboardShouldFail) {
      throw new Error('Clipboard service unavailable');
    }
    clipboardContent = text;
  },
};

const mockReactNative = {
  Clipboard: mockClipboard,
  Platform: { OS: 'android' },
  I18nManager: { isRTL: false },
};

// 1. Load Modules
const diagnosticConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts');
const settingsQueue = loadTsModule('src/lib/settingsWriteQueue.ts');

const mockSettings = {
  getActiveDiagnosticScope: () => 'general',
  subscribeSettingsScope: () => () => {},
};

const diagnosticEvents = loadTsModule('src/lib/diagnostic/diagnosticEvents.ts', {
  'react-native': mockReactNative,
  'expo-file-system/legacy': mockFileSystem,
  './diagnosticConfig': diagnosticConfig,
  '../settingsWriteQueue': settingsQueue,
  '../settings': mockSettings,
  '../i18n': { registerLanguageDiagnosticObserver: () => () => {} },
});

const {
  recordDiagnosticEvent,
  getDiagnosticEvents,
  clearDiagnosticEvents,
  installDiagnosticEventObserver,
  uninstallDiagnosticEventObserver,
  getDiagnosticSubscriptionCount,
  persistDiagnosticEventsSnapshot,
  buildDiagnosticEventsReport,
  copyDiagnosticReport,
  MAX_DIAGNOSTIC_EVENTS,
  ALLOWED_EVENT_FIELDS,
} = diagnosticEvents;

const {
  createSerializedSettingsWriter,
  SettingsStorageQueueClosedError,
  SettingsStorageTimeoutError,
} = settingsQueue;

const { setDiagnosticModeOverride, isDiagnosticModeEnabled, DIAGNOSTIC_BUILD_ID } = diagnosticConfig;

// ============================================================================
// TEST 1: Gate-off inertness: zero events recorded, zero writes, zero subscriptions
// ============================================================================
console.log('1. Gate-off inertness (flags absent / override false)');
setDiagnosticModeOverride(false);
assert.equal(isDiagnosticModeEnabled(), false, 'Diagnostic mode must be disabled');
clearDiagnosticEvents();
writtenFiles = [];

// Attempt to install observer while gate is OFF
installDiagnosticEventObserver();
assert.equal(
  getDiagnosticSubscriptionCount(),
  0,
  'Gate-off must register ZERO subscriptions'
);

// Trigger all diagnostic functions while gate is OFF
recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  status: 'pending',
});
recordDiagnosticEvent({
  category: 'language_selected',
  scope: 'language',
  status: 'pending',
});
recordDiagnosticEvent({
  category: 'settings_write_pending',
  scope: 'general',
  status: 'pending',
  generation: 1,
});

await persistDiagnosticEventsSnapshot();

assert.equal(
  getDiagnosticEvents().length,
  0,
  'Gate-off must record ZERO events in the ring buffer'
);
assert.equal(
  writtenFiles.length,
  0,
  'Gate-off must perform ZERO file writes / snapshots'
);
assert.equal(
  getDiagnosticSubscriptionCount(),
  0,
  'Gate-off must have zero active subscriptions'
);
console.log('   PASS: with flags absent, zero events recorded, zero writes, zero subscriptions');

// ============================================================================
// TEST 2: Gate-on lifecycle recording
// ============================================================================
console.log('2. Gate-on lifecycle recording');
setDiagnosticModeOverride(true);
assert.equal(isDiagnosticModeEnabled(), true, 'Diagnostic mode must be enabled');
clearDiagnosticEvents();
writtenFiles = [];

// Install observer under the gate
installDiagnosticEventObserver();
assert.ok(
  getDiagnosticSubscriptionCount() > 0,
  'Gate-on must register active observer subscription'
);

// 2a. Theme selection and write lifecycle
recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  status: 'pending',
});

// Create writer for theme scope
let memStorage = {};
const mockStorage = {
  setItem: async (k, v) => {
    memStorage[k] = v;
  },
  getItem: async (k) => memStorage[k] ?? null,
};

let currentScope = 'theme';
mockSettings.getActiveDiagnosticScope = () => currentScope;

const themeWriter = createSerializedSettingsWriter(
  mockStorage,
  'test-theme-key',
  () => {},
);

await themeWriter({ theme: 'dark' });

let events = getDiagnosticEvents();
const themeSelectedEvent = events.find((e) => e.category === 'theme_selected');
assert.ok(themeSelectedEvent, 'theme_selected event must be recorded');
assert.equal(themeSelectedEvent.scope, 'theme');
assert.equal(themeSelectedEvent.status, 'pending');

const themePendingEvent = events.find((e) => e.category === 'settings_write_pending' && e.scope === 'theme');
assert.ok(themePendingEvent, 'settings_write_pending for theme must be recorded');
assert.equal(themePendingEvent.generation, 1);
assert.equal(themePendingEvent.status, 'pending');

const themeConfirmedEvent = events.find((e) => e.category === 'settings_write_confirmed' && e.scope === 'theme');
assert.ok(themeConfirmedEvent, 'settings_write_confirmed for theme must be recorded');
assert.equal(themeConfirmedEvent.generation, 1);
assert.equal(themeConfirmedEvent.status, 'confirmed');

console.log('   PASS: theme selection records initiated + write lifecycle events with correct scope/generation/status');

// 2b. Language selection and write lifecycle
currentScope = 'language';
recordDiagnosticEvent({
  category: 'language_selected',
  scope: 'language',
  status: 'pending',
  nativeDirectionTransition: 'direction_changing',
});

await themeWriter({ language: 'ar' });

events = getDiagnosticEvents();
const langSelectedEvent = events.find((e) => e.category === 'language_selected');
assert.ok(langSelectedEvent, 'language_selected event must be recorded');
assert.equal(langSelectedEvent.scope, 'language');
assert.equal(langSelectedEvent.status, 'pending');
assert.equal(langSelectedEvent.nativeDirectionTransition, 'direction_changing');

const langConfirmedEvent = events.find((e) => e.category === 'settings_write_confirmed' && e.scope === 'language');
assert.ok(langConfirmedEvent, 'settings_write_confirmed for language must be recorded');
assert.equal(langConfirmedEvent.generation, 2);

console.log('   PASS: language selection records initiated + write lifecycle events with correct scope/generation/status');

// 2c. Timeout / unresolved records unresolved + queue_closed once
currentScope = 'general';
const timeoutStorage = {
  setItem: async () => {
    throw new SettingsStorageTimeoutError('write');
  },
  getItem: async () => null,
  isUnresolvedOperation: () => false,
  markUnresolvedOperation: () => {},
};

const failingWriter = createSerializedSettingsWriter(
  timeoutStorage,
  'test-timeout-key',
  () => {},
);

try {
  await failingWriter({ test: 123 });
  assert.fail('Should have thrown timeout');
} catch (err) {
  assert.ok(err instanceof SettingsStorageTimeoutError);
}

// Attempt a second write on the closed queue
try {
  await failingWriter({ test: 456 });
  assert.fail('Should have thrown queue closed');
} catch (err) {
  assert.ok(err instanceof SettingsStorageQueueClosedError);
}

events = getDiagnosticEvents();
const unresolvedEvents = events.filter((e) => e.category === 'settings_write_unresolved');
assert.ok(unresolvedEvents.length >= 1, 'settings_write_unresolved must be recorded');
assert.equal(unresolvedEvents[0].status, 'unresolved');
assert.equal(unresolvedEvents[0].failureStage, 'write');
assert.equal(unresolvedEvents[0].errorName, 'SETTINGS_STORAGE_TIMEOUT');

const queueClosedEvents = events.filter((e) => e.category === 'queue_closed');
assert.equal(
  queueClosedEvents.length,
  1,
  'queue_closed event must be recorded EXACTLY ONCE upon transition to closed'
);
assert.equal(queueClosedEvents[0].status, 'unresolved');
assert.equal(queueClosedEvents[0].errorName, 'SETTINGS_QUEUE_CLOSED');

console.log('   PASS: timeout/unresolved records unresolved + queue_closed once');

// 2d. Mirror success and failure
recordDiagnosticEvent({
  category: 'language_mirror_success',
  scope: 'language',
  status: 'confirmed',
  failureStage: 'mirror',
});
recordDiagnosticEvent({
  category: 'native_direction_prepared',
  scope: 'language',
  status: 'confirmed',
  nativeDirectionTransition: 'prepared',
});
recordDiagnosticEvent({
  category: 'language_mirror_failed',
  scope: 'language',
  status: 'failed',
  failureStage: 'mirror',
  errorName: 'LanguageMirrorPreparationError',
  errorCode: 'LANGUAGE_MIRROR_PREPARATION_FAILED',
});

events = getDiagnosticEvents();
const mirrorSuccess = events.find((e) => e.category === 'language_mirror_success');
assert.ok(mirrorSuccess, 'language_mirror_success must be recorded');
assert.equal(mirrorSuccess.failureStage, 'mirror');

const nativePrepared = events.find((e) => e.category === 'native_direction_prepared');
assert.ok(nativePrepared, 'native_direction_prepared must be recorded');
assert.equal(nativePrepared.nativeDirectionTransition, 'prepared');

const mirrorFailed = events.find((e) => e.category === 'language_mirror_failed');
assert.ok(mirrorFailed, 'language_mirror_failed must be recorded');
assert.equal(mirrorFailed.status, 'failed');
assert.equal(mirrorFailed.failureStage, 'mirror');
assert.equal(mirrorFailed.errorName, 'LANGUAGE_MIRROR_FAILED');
assert.equal(mirrorFailed.errorCode, 'LANGUAGE_MIRROR_PREPARATION_FAILED');

console.log('   PASS: mirror success and failure recorded with failureStage and error name/code');

// 2e. Reload requested, completed, failed
recordDiagnosticEvent({
  category: 'reload_requested',
  scope: 'language',
  status: 'pending',
  failureStage: 'reload',
});
recordDiagnosticEvent({
  category: 'reload_completed',
  scope: 'language',
  status: 'confirmed',
  failureStage: 'reload',
});
recordDiagnosticEvent({
  category: 'reload_failed',
  scope: 'language',
  status: 'failed',
  failureStage: 'reload',
  errorName: 'NativeReloadError',
  errorCode: 'RELOAD_DISMISSED',
});

events = getDiagnosticEvents();
const reloadReq = events.find((e) => e.category === 'reload_requested');
assert.ok(reloadReq, 'reload_requested must be recorded');
assert.equal(reloadReq.failureStage, 'reload');

const reloadComp = events.find((e) => e.category === 'reload_completed');
assert.ok(reloadComp, 'reload_completed must be recorded');

const reloadFail = events.find((e) => e.category === 'reload_failed');
assert.ok(reloadFail, 'reload_failed must be recorded');
assert.equal(reloadFail.status, 'failed');
assert.equal(reloadFail.failureStage, 'reload');
assert.equal(reloadFail.errorName, 'UNKNOWN_ERROR');
assert.equal(reloadFail.errorCode, 'RELOAD_DISMISSED');

console.log('   PASS: reload requested, completed, and failed recorded');

// 2f. Pending restart recorded and cleared
recordDiagnosticEvent({
  category: 'pending_restart_recorded',
  scope: 'language',
  status: 'pending',
  nativeDirectionTransition: 'direction_changing',
});
recordDiagnosticEvent({
  category: 'pending_restart_cleared',
  scope: 'language',
  status: 'confirmed',
});

events = getDiagnosticEvents();
const restartRec = events.find((e) => e.category === 'pending_restart_recorded');
assert.ok(restartRec, 'pending_restart_recorded must be recorded');
assert.equal(restartRec.nativeDirectionTransition, 'direction_changing');

const restartClr = events.find((e) => e.category === 'pending_restart_cleared');
assert.ok(restartClr, 'pending_restart_cleared must be recorded');
assert.equal(restartClr.status, 'confirmed');

console.log('   PASS: pending restart recorded and cleared');

// 2g. Reconciliation started and completed
const reconcilingWriter = createSerializedSettingsWriter(
  mockStorage,
  'reconcile-test-key',
  () => {},
  { requireReconciliation: true },
);
await reconcilingWriter.reconcile();

events = getDiagnosticEvents();
const recStarted = events.find((e) => e.category === 'reconciliation_started');
assert.ok(recStarted, 'reconciliation_started must be recorded');
assert.equal(recStarted.scope, 'general');
assert.equal(recStarted.status, 'pending');

const recCompleted = events.find((e) => e.category === 'reconciliation_completed');
assert.ok(recCompleted, 'reconciliation_completed must be recorded');
assert.equal(recCompleted.scope, 'general');
assert.equal(recCompleted.status, 'confirmed');

console.log('   PASS: reconciliation started and completed recorded');

// ============================================================================
// TEST 3: Ring cap evicts oldest (cap ~200 events)
// ============================================================================
console.log('3. Ring cap evicts oldest (cap = 200)');
clearDiagnosticEvents();

// Push 250 events into ring
for (let i = 1; i <= 250; i++) {
  recordDiagnosticEvent({
    category: 'settings_write_pending',
    scope: 'general',
    generation: i,
    status: 'pending',
  });
}

events = getDiagnosticEvents();
assert.equal(events.length, MAX_DIAGNOSTIC_EVENTS, `Ring must be capped at ${MAX_DIAGNOSTIC_EVENTS}`);
assert.equal(events[0].generation, 51, 'Oldest events (1..50) must have been evicted first');
assert.equal(events[events.length - 1].generation, 250, 'Latest event (250) must be at the end of the ring');
console.log(`   PASS: ring capacity strictly capped at ${MAX_DIAGNOSTIC_EVENTS} and evicts oldest (1..50 dropped, 51..250 retained)`);

// ============================================================================
// TEST 4: Report contains ONLY allowed fields (assert no private settings values)
// ============================================================================
console.log('4. Strict field whitelist & privacy guarantees');

// Test that attempts to pass arbitrary or private settings data are stripped
recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  generation: 999,
  // Attempted unauthorized fields:
  theme: 'dark',
  language: 'ar',
  userCredentials: 'secret-token',
  location: { lat: 21.4225, lng: 39.8262 },
  quranHistory: ['1:1', '2:255'],
  settings: { methodId: 16 },
  rawErrorMessage: 'Failed to write /data/user/secret/db.sqlite: permission denied',
});

events = getDiagnosticEvents();
const latestEvent = events[events.length - 1];

const allowedSet = new Set(ALLOWED_EVENT_FIELDS);
for (const key of Object.keys(latestEvent)) {
  assert.ok(
    allowedSet.has(key),
    `Prohibited field "${key}" detected in diagnostic event payload!`
  );
}

// Explicit assertions that no settings values or user data survived
assert.equal('theme' in latestEvent, false, 'Field "theme" must NOT be in event');
assert.equal('language' in latestEvent, false, 'Field "language" must NOT be in event');
assert.equal('userCredentials' in latestEvent, false, 'Field "userCredentials" must NOT be in event');
assert.equal('location' in latestEvent, false, 'Field "location" must NOT be in event');
assert.equal('quranHistory' in latestEvent, false, 'Field "quranHistory" must NOT be in event');
assert.equal('settings' in latestEvent, false, 'Field "settings" must NOT be in event');
assert.equal('rawErrorMessage' in latestEvent, false, 'Field "rawErrorMessage" must NOT be in event');

assert.equal(latestEvent.buildId, DIAGNOSTIC_BUILD_ID, 'buildId must match DIAGNOSTIC_BUILD_ID');
assert.ok(
  typeof latestEvent.timestamp === 'string' && !Number.isNaN(Date.parse(latestEvent.timestamp)),
  'timestamp must be valid ISO date string'
);

console.log('   PASS: report contains ONLY allowed fields; zero private/settings/user values leak');

// ============================================================================
// TEST 5: Copy action produces sanitized JSON without private fields
// ============================================================================
console.log('5. Copy action produces sanitized JSON and handles failures gracefully');
clipboardContent = '';
clipboardShouldFail = false;

const copyOk = copyDiagnosticReport(mockClipboard);
assert.equal(copyOk, true, 'copyDiagnosticReport must return true on success');
assert.ok(clipboardContent.length > 0, 'Clipboard content must be non-empty');

const parsedReport = JSON.parse(clipboardContent);
assert.equal(parsedReport.buildId, DIAGNOSTIC_BUILD_ID);
assert.ok(typeof parsedReport.timestamp === 'string');
assert.equal(parsedReport.count, MAX_DIAGNOSTIC_EVENTS);
assert.ok(Array.isArray(parsedReport.events));
assert.equal(parsedReport.events.length, MAX_DIAGNOSTIC_EVENTS);

// Verify all copied events are sanitized
for (const ev of parsedReport.events) {
  for (const k of Object.keys(ev)) {
    assert.ok(
      allowedSet.has(k),
      `Prohibited field "${k}" found in clipboard report!`
    );
  }
}

// Test clipboard failure resilience (never fail the app if clipboard fails)
clipboardShouldFail = true;
const copyFailedHandled = copyDiagnosticReport(mockClipboard);
assert.equal(
  copyFailedHandled,
  false,
  'copyDiagnosticReport must return false when clipboard fails'
);
// It must NOT have thrown an exception
clipboardShouldFail = false;

console.log('   PASS: copy action produces sanitized JSON, excludes private fields, and safely handles clipboard failures');

// ============================================================================
// TEST 6: Exactly one language_selected through both real paths; one theme_selected per selection and two for two
// ============================================================================
console.log('6. Selection event deduplication (single publisher guarantee)');
uninstallDiagnosticEventObserver();

function createMockAsyncStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: async (k) => store[k] ?? null,
    setItem: async (k, v) => { store[k] = String(v); },
    removeItem: async (k) => { delete store[k]; },
    clear: async () => { for (const k in store) delete store[k]; },
    _store: store,
  };
}

function loadRealProductionSettings(asyncStorage) {
  let capturedValue = null;
  const reactMock = {
    createContext: () => ({
      Provider: (props) => {
        capturedValue = props.value;
        return props.children;
      },
    }),
    useContext: () => capturedValue,
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: (fn) => fn(),
    useCallback: (fn) => fn,
    createElement: (type, props, ...children) => type({ ...(props ?? {}), children }),
  };

  return loadTsModule('src/lib/settings.tsx', {
    react: reactMock,
    '@react-native-async-storage/async-storage': asyncStorage,
    './prayerTimes': {},
    './accents': { DEFAULT_ACCENT: 'emerald', ACCENT_KEYS: ['emerald'] },
    './names99': {},
    './quranAudio': {
      setAudioTranslationEnabled: () => {},
      setAudioTranslationEdition: async () => {},
      AUDIO_TRANSLATION_EDITION_KEY: 'key',
    },
    './quranLanguageState': {
      getQuranTranslationLanguage: () => 'en',
      setAutoLinkedQuranTranslationLanguage: async () => {},
    },
    './i18n': {
      getBootLanguage: () => 'en',
      setAppLanguage: () => {},
      isAppLanguage: (l) => ['en', 'ur', 'ar', 'ps'].includes(l),
      markLanguageDurable: () => {},
      recordRequestedLanguage: () => {},
    },
    './audio': { setActiveAdhanReciterId: () => {} },
    './useLocation': { setCachedLocation: () => {} },
    './tafsirSources': { TAFSIR_SOURCES: [] },
    './settingsWriteQueue': settingsQueue,
  });
}

const liveSettings = loadRealProductionSettings(createMockAsyncStorage());
const liveDiagEvents = loadTsModule('src/lib/diagnostic/diagnosticEvents.ts', {
  'react-native': mockReactNative,
  'expo-file-system/legacy': mockFileSystem,
  './diagnosticConfig': diagnosticConfig,
  '../settingsWriteQueue': settingsQueue,
  '../settings': liveSettings,
  '../i18n': { registerLanguageDiagnosticObserver: () => () => {} },
});

liveDiagEvents.installDiagnosticEventObserver();

// Path A: real publishSettingsScope('language') from internal setLanguage entry
liveDiagEvents.clearDiagnosticEvents();
liveSettings.publishSettingsScope('language');
let langEvents = liveDiagEvents.getDiagnosticEvents().filter((e) => e.category === 'language_selected');
assert.equal(langEvents.length, 1, 'Path A (setLanguage internal): exactly ONE language_selected must be recorded');

// Path B: real persistLanguageChange entry (~685)
liveDiagEvents.clearDiagnosticEvents();
const mockCustomStorage = {
  setItem: async () => {},
  getItem: async () => JSON.stringify({ language: 'ur' }),
};
await liveSettings.persistLanguageChange({ language: 'en' }, 'ur', mockCustomStorage);
langEvents = liveDiagEvents.getDiagnosticEvents().filter((e) => e.category === 'language_selected');
assert.equal(langEvents.length, 1, 'Path B (persistLanguageChange internal): exactly ONE language_selected must be recorded');

// Theme selection: exactly one for one selection, two for two selections
liveDiagEvents.clearDiagnosticEvents();
liveSettings.publishSettingsScope('theme');
let themeEvents = liveDiagEvents.getDiagnosticEvents().filter((e) => e.category === 'theme_selected');
assert.equal(themeEvents.length, 1, 'Single theme selection: exactly ONE theme_selected event');

liveSettings.publishSettingsScope('theme');
themeEvents = liveDiagEvents.getDiagnosticEvents().filter((e) => e.category === 'theme_selected');
assert.equal(themeEvents.length, 2, 'Two theme selections: exactly TWO theme_selected events');

// Static verification of SettingsScreen: ZERO publishSettingsScope calls remain in SettingsScreen
const settingsScreenSource = fs.readFileSync(path.join(ROOT, 'src/screens/SettingsScreen.tsx'), 'utf8');
assert.equal(
  settingsScreenSource.includes('publishSettingsScope'),
  false,
  'SettingsScreen must NOT contain any redundant screen-level publishSettingsScope calls'
);

console.log('   PASS: exactly one language_selected through both real paths; one theme_selected per selection and two for two');

// ============================================================================
// TEST 7: Privacy & Error Sanitization (malicious and malformed samples)
// ============================================================================
console.log('7. Privacy & Error Sanitization: defense-in-depth, charset, and length enforcement');

const { extractErrorDetails: testExtract } = liveDiagEvents;

// Known error map -> safe identifiers
assert.equal(testExtract(new settingsQueue.SettingsStorageTimeoutError('write')).errorName, 'SETTINGS_STORAGE_TIMEOUT');
assert.equal(testExtract(new settingsQueue.SettingsStorageQueueClosedError()).errorName, 'SETTINGS_QUEUE_CLOSED');
assert.equal(testExtract(new settingsQueue.SettingsStorageReconciliationRequiredError()).errorName, 'SETTINGS_RECONCILIATION_REQUIRED');
assert.equal(testExtract({ name: 'LanguageMirrorPreparationError' }).errorName, 'LANGUAGE_MIRROR_FAILED');
assert.equal(testExtract({ name: 'LanguagePersistenceTimeoutError' }).errorName, 'LANGUAGE_PERSISTENCE_TIMEOUT');

// Malicious sample 1: Path-like names (Linux and Windows)
const samplePath1 = testExtract({ name: '/etc/shadow/passwd', message: 'secret' });
assert.equal(samplePath1.errorName, 'UNKNOWN_ERROR', 'Path-like error name must map to UNKNOWN_ERROR');

const samplePath2 = testExtract({ name: 'C:\\Windows\\system32\\secret.dll', code: 'C:\\bad\\path' });
assert.equal(samplePath2.errorName, 'UNKNOWN_ERROR');
assert.equal(samplePath2.errorCode, undefined, 'Invalid code charset must be dropped');

// Malicious sample 2: 300-char names and codes
const sample300 = testExtract({ name: 'A'.repeat(300), code: 'B'.repeat(300) });
assert.equal(sample300.errorName, 'UNKNOWN_ERROR', 'Overlong name must map to UNKNOWN_ERROR');
assert.equal(sample300.errorCode, undefined, 'Code over 64 chars must be dropped');

// Malicious sample 3: Tokens / credentials in name or code
const sampleToken = testExtract({
  name: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  code: 'Bearer token-12345',
});
assert.equal(sampleToken.errorName, 'UNKNOWN_ERROR');
assert.equal(sampleToken.errorCode, undefined);

// Malicious sample 4: Objects with message fields containing settings values
const sensitiveSettingsMessage = JSON.stringify({
  methodId: 16,
  pin: '1234',
  secretToken: 'sk_live_abcdef123456789',
  quranHistory: ['1:1', '2:255'],
});
const sampleMessage = testExtract({
  name: 'DatabaseError',
  message: sensitiveSettingsMessage,
  stack: `Error at /user/app/secret/db.sqlite: ${sensitiveSettingsMessage}`,
});
assert.equal(sampleMessage.errorName, 'UNKNOWN_ERROR');
assert.equal('message' in sampleMessage, false, 'Message field must never exist in extracted error details');
assert.equal('stack' in sampleMessage, false, 'Stack field must never exist in extracted error details');

// Malicious sample 5: Constructor names must NEVER be used
const sampleConstructor = testExtract(Object.create({
  constructor: { name: 'InternalSensitiveAdminClass' },
}));
assert.equal(sampleConstructor.errorName, 'UNKNOWN_ERROR', 'Constructor name must NEVER leak');

// Malicious sample 6: Charset enforcement on errorCode
const sampleBadCode = testExtract({
  name: 'SettingsStorageTimeoutError',
  code: 'CODE WITH SPACES & SYMBOLS!',
});
assert.equal(sampleBadCode.errorName, 'SETTINGS_STORAGE_TIMEOUT');
assert.equal(sampleBadCode.errorCode, undefined, 'Code with spaces and symbols must be dropped');

const sampleGoodCode = testExtract({
  name: 'SettingsStorageTimeoutError',
  code: 'E_STORAGE_TIMEOUT-1.0',
});
assert.equal(sampleGoodCode.errorName, 'SETTINGS_STORAGE_TIMEOUT');
assert.equal(sampleGoodCode.errorCode, 'E_STORAGE_TIMEOUT-1.0', 'Valid charset code must be preserved');

// Verify SettingsScreen reload-error call site flows only through sanitizer
liveDiagEvents.clearDiagnosticEvents();
liveDiagEvents.recordDiagnosticEvent({
  category: 'reload_failed',
  scope: 'language',
  status: 'failed',
  failureStage: 'reload',
  error: {
    name: '/private/var/log/secret.log',
    message: 'CRITICAL_TOKEN=987654321',
    code: 'RELOAD_FAILED',
  },
});
const reloadFailedEvent = liveDiagEvents.getDiagnosticEvents().find((e) => e.category === 'reload_failed');
assert.ok(reloadFailedEvent, 'reload_failed event must be recorded');
assert.equal(reloadFailedEvent.errorName, 'UNKNOWN_ERROR', 'Reload error name must be sanitized to UNKNOWN_ERROR');
assert.equal(reloadFailedEvent.errorCode, 'RELOAD_FAILED', 'Valid error code must be preserved');
assert.equal(JSON.stringify(reloadFailedEvent).includes('secret.log'), false, 'Path must not leak');
assert.equal(JSON.stringify(reloadFailedEvent).includes('987654321'), false, 'Token must not leak');

console.log('   PASS: all malicious samples produce only sanitized identifiers, max 64, charset enforced');

// ============================================================================
// TEST 8: Overlap attribution (language write pending, user initiates theme write)
// ============================================================================
// ============================================================================
// TEST 8: Overlap attribution (language write pending, user initiates theme write)
// ============================================================================
console.log('8. Overlap attribution: language write with delayed native storage');

let resolveLanguageNative;
let rejectLanguageReadback;
let languageWritePending = false;
let languageReadbackFailed = false;
let savedValue = JSON.stringify({ language: 'en', themeMode: 'system' });

// Delayed native storage on the shared settings storage lane
const overlappingStorage = {
  getItem: async (k) => {
    if (k === 'islamic-settings' && languageWritePending && !languageReadbackFailed) {
      languageReadbackFailed = true;
      return new Promise((_, reject) => {
        rejectLanguageReadback = () => reject(new Error('Storage readback failed: delayed mismatch'));
      });
    }
    return savedValue;
  },
  setItem: async (k, v) => {
    if (k === 'islamic-settings' && !languageWritePending) {
      languageWritePending = true;
      return new Promise((resolve) => {
        resolveLanguageNative = () => {
          savedValue = String(v);
          resolve();
        };
      });
    }
    savedValue = String(v);
  },
};

const overlapSettings = loadRealProductionSettings(overlappingStorage);
const overlapDiagEvents = loadTsModule('src/lib/diagnostic/diagnosticEvents.ts', {
  'react-native': mockReactNative,
  'expo-file-system/legacy': mockFileSystem,
  './diagnosticConfig': diagnosticConfig,
  '../settingsWriteQueue': settingsQueue,
  '../settings': overlapSettings,
  '../i18n': { registerLanguageDiagnosticObserver: () => () => {} },
});

overlapDiagEvents.installDiagnosticEventObserver();
overlapDiagEvents.clearDiagnosticEvents();
overlapSettings.__resetOperationDiagnosticContextForTest();

// 1. Language write starts in shared queue lane with scope 'language'
const langOpPromise = (async () => {
  try {
    await overlapSettings.enqueueSharedSettingsMutation(
      (latest) => ({ ...latest, language: 'ur' }),
      undefined,
      (raw) => {
        throw new Error('Verification failed');
      },
      'language'
    );
  } catch {
    // Expected readback failure
  }
})();

// Yield event loop so queue starts language write
await new Promise((r) => setTimeout(r, 20));

let overlapEvents = overlapDiagEvents.getDiagnosticEvents();
const langPendingEvent = overlapEvents.find((e) => e.category === 'settings_write_pending');
assert.ok(langPendingEvent, 'Language write pending must be emitted');
assert.equal(langPendingEvent.scope, 'language', 'Language pending must have scope language');
assert.equal(langPendingEvent.correlationId, 'op-1', 'Language pending must have correlationId op-1');

// 2. While language write is pending in native storage, user initiates theme write!
const themeOpPromise = (async () => {
  try {
    await overlapSettings.enqueueSharedSettingsMutation(
      (latest) => ({ ...latest, themeMode: 'dark' }),
      undefined,
      undefined,
      'theme'
    );
  } catch (err) {
    // Theme completion
  }
})();

// 3. Delayed language readback failure occurs
resolveLanguageNative();
await new Promise((r) => setTimeout(r, 20));
if (rejectLanguageReadback) rejectLanguageReadback();
await langOpPromise;

// Assert language failure event STILL attributes scope 'language' and correlationId 'op-1'
overlapEvents = overlapDiagEvents.getDiagnosticEvents();
const langFailedEvent = overlapEvents.find((e) => e.category === 'settings_write_rejected' || e.category === 'settings_write_unresolved');
assert.ok(langFailedEvent, 'Language failure event must be recorded');
assert.equal(langFailedEvent.scope, 'language', 'Delayed readback failure must still attribute scope language');
assert.equal(langFailedEvent.correlationId, 'op-1', 'Delayed readback failure must still attribute correlationId op-1');

// 4. Now theme write runs in shared queue with scope 'theme' and correlationId 'op-2'
await themeOpPromise;

overlapEvents = overlapDiagEvents.getDiagnosticEvents();
const themePendingEv = overlapEvents.find((e) => e.category === 'settings_write_pending' && e.correlationId === 'op-2');
assert.ok(themePendingEv, 'Theme write pending must be recorded with op-2');
assert.equal(themePendingEv.scope, 'theme', 'Theme pending must have scope theme');
assert.equal(themePendingEv.correlationId, 'op-2', 'Theme pending must have correlationId op-2');

const themeConfirmedEv = overlapEvents.find((e) => e.category === 'settings_write_confirmed' && e.correlationId === 'op-2');
assert.ok(themeConfirmedEv, 'Theme write confirmed must be recorded with op-2');
assert.equal(themeConfirmedEv.scope, 'theme', 'Theme confirmed must have scope theme');
assert.equal(themeConfirmedEv.correlationId, 'op-2', 'Theme confirmed must have correlationId op-2');

console.log('   PASS: overlap attribution: language write keeps scope language and correlationId op-1; theme keeps scope theme and correlationId op-2');

// ============================================================================
// TEST 9: Queue closure + late completion attribution unchanged
// ============================================================================
console.log('9. Queue closure + late completion attribution');
overlapDiagEvents.clearDiagnosticEvents();

// Trigger reconciliation events: must fall back to global scope ('general') with no correlationId
await overlapSettings.getSettingsWriter(overlappingStorage).reconcile();
const reconcEvents = overlapDiagEvents.getDiagnosticEvents().filter((e) => e.category.startsWith('reconciliation_'));
assert.ok(reconcEvents.length >= 2, 'Reconciliation started and completed must be recorded');
for (const rev of reconcEvents) {
  assert.equal(rev.scope, 'general', 'Reconciliation events must have scope general');
  assert.equal(rev.correlationId, undefined, 'Reconciliation events must not have correlationId');
}

// When context is inactive, lifecycle events safely fall back to global scope
overlapDiagEvents.clearDiagnosticEvents();
overlapDiagEvents.handleQueueLifecycleEvent({
  category: 'settings_write_confirmed',
  generation: 99,
  status: 'confirmed',
});
const fallbackEvent = overlapDiagEvents.getDiagnosticEvents()[0];
assert.equal(fallbackEvent.scope, 'general');
assert.equal(fallbackEvent.correlationId, undefined);

console.log('   PASS: queue closure and reconciliation fall back to global scope with zero leak');

// ============================================================================
// TEST 10: correlationId matches op-<n> pattern and never contains setting values
// ============================================================================
console.log('10. correlationId format and privacy enforcement');
liveDiagEvents.clearDiagnosticEvents();

// Attempt malicious/setting values in correlationId
liveDiagEvents.recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  correlationId: 'dark', // setting value
});
assert.equal(liveDiagEvents.getDiagnosticEvents()[0].correlationId, undefined, 'Setting value "dark" in correlationId must be dropped');

liveDiagEvents.clearDiagnosticEvents();
liveDiagEvents.recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  correlationId: 'token_secret_12345',
});
assert.equal(liveDiagEvents.getDiagnosticEvents()[0].correlationId, undefined, 'Token in correlationId must be dropped');

liveDiagEvents.clearDiagnosticEvents();
liveDiagEvents.recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  correlationId: 'op-invalid',
});
assert.equal(liveDiagEvents.getDiagnosticEvents()[0].correlationId, undefined, 'Invalid correlationId pattern must be dropped');

liveDiagEvents.clearDiagnosticEvents();
liveDiagEvents.recordDiagnosticEvent({
  category: 'theme_selected',
  scope: 'theme',
  correlationId: 'op-42',
});
assert.equal(liveDiagEvents.getDiagnosticEvents()[0].correlationId, 'op-42', 'Valid op-<n> correlationId must be retained');

// Subscriber events attach correlationId when context is active
liveDiagEvents.clearDiagnosticEvents();
const tokenTheme = liveSettings.setOperationDiagnosticContext('theme');
liveSettings.publishSettingsScope('theme');
liveSettings.clearOperationDiagnosticContext(tokenTheme);

const themeSelectedWithOp = liveDiagEvents.getDiagnosticEvents().find((e) => e.category === 'theme_selected');
assert.ok(themeSelectedWithOp, 'theme_selected must be recorded');
assert.ok(themeSelectedWithOp.correlationId?.startsWith('op-'), 'theme_selected subscriber event must attach current correlationId when active');

liveDiagEvents.uninstallDiagnosticEventObserver();
console.log('   PASS: correlationId strictly matches op-<n> and never contains setting values');

// Teardown observer
uninstallDiagnosticEventObserver();
assert.equal(getDiagnosticSubscriptionCount(), 0, 'Observer must uninstall cleanly');

console.log('\n=== ALL P1.1 DIAGNOSTIC INSTRUMENTATION CHECKS PASSED ===');
