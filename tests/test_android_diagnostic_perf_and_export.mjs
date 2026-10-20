import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (p) => fs.readFileSync(p, 'utf8');

function loadTsModuleFromString(code, mocks = {}) {
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  const exportsObj = {};
  const moduleObj = { exports: exportsObj };
  const sandbox = {
    module: moduleObj,
    exports: exportsObj,
    require: (id) => mocks[id] || {},
    console,
    process,
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
    JSON,
    URL,
    Buffer,
    Blob: typeof Blob !== 'undefined' ? Blob : class {
      constructor(parts, options) {
        this.parts = parts;
        this.type = options?.type;
        this.size = parts.reduce((acc, p) => acc + (typeof p === 'string' ? Buffer.byteLength(p, 'utf8') : 0), 0);
      }
    },
    document: typeof document !== 'undefined' ? document : undefined,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox);
  return moduleObj.exports;
}

function loadTsModule(filePath, mocks = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  return loadTsModuleFromString(code, mocks);
}

console.log('=== ANDROID DIAGNOSTIC PERFORMANCE, EXPORT & USABILITY SUITE (v1.1.92) ===\n');

// Set up mocks for diagnostic testing
let mockNativeRTL = false;
let mockSharingAvailable = true;
let mockSharingRejects = false;
let mockFileWriteRejects = false;
let mockFileSystemDocDir = 'file:///data/user/0/com.qashi.islamic/files/';
let mockFileSystemCacheDir = 'file:///data/user/0/com.qashi.islamic/cache/';
let mockLastWrittenPath = null;
let mockLastWrittenContent = null;
let mockLastSharedPath = null;
let mockClipboardString = null;

const mockReactNative = {
  I18nManager: {
    get isRTL() {
      return mockNativeRTL;
    },
  },
  Platform: {
    OS: 'android',
  },
  Clipboard: {
    setString: (str) => {
      mockClipboardString = str;
    },
    getString: async () => mockClipboardString || '',
  },
  Share: {
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
    share: async (options) => ({ action: 'sharedAction' }),
  },
  StyleSheet: {
    hairlineWidth: 0.5,
    create: (styles) => styles,
    flatten: (styles) => {
      if (!styles) return {};
      if (Array.isArray(styles)) {
        return Object.assign({}, ...styles.filter(Boolean));
      }
      return styles;
    },
  },
  Dimensions: {
    get: () => ({ width: 412, height: 915 }),
  },
  Appearance: {
    getColorScheme: () => 'light',
  },
};

const mockFileSystem = {
  get documentDirectory() {
    return mockFileSystemDocDir;
  },
  get cacheDirectory() {
    return mockFileSystemCacheDir;
  },
  writeAsStringAsync: async (path, content) => {
    if (mockFileWriteRejects) throw new Error('Disk write error');
    mockLastWrittenPath = path;
    mockLastWrittenContent = content;
  },
  getInfoAsync: async (path) => ({
    exists: !mockFileWriteRejects,
    size: mockLastWrittenContent ? Buffer.byteLength(mockLastWrittenContent, 'utf8') : 1024,
  }),
  EncodingType: { UTF8: 'utf8' },
};

const mockSharing = {
  isAvailableAsync: async () => mockSharingAvailable,
  shareAsync: async (filePath) => {
    if (mockSharingRejects) throw new Error('Sharing failed to launch');
    mockLastSharedPath = filePath;
    return null;
  },
};

const mockI18n = {
  isRTL: () => mockNativeRTL,
  language: 'en',
  t: (key) => key,
};

const diagConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts');

const mocks = {
  'react-native': mockReactNative,
  'expo-file-system/legacy': mockFileSystem,
  'expo-file-system': mockFileSystem,
  'expo-sharing': mockSharing,
  '../i18n': mockI18n,
  '../../lib/i18n': mockI18n,
  './diagnosticConfig': diagConfig,
  './diagnosticI18n': loadTsModule('src/lib/diagnostic/diagnosticI18n.ts', {
    '../i18n': {
      default: mockI18n,
      t: (key) => key,
      getCurrentLanguage: () => 'en',
      isRtlLanguage: () => false,
    },
  }),
  './diagnosticScreens': loadTsModule('src/lib/diagnostic/diagnosticScreens.ts'),
  './diagnosticScreenContext': {
    useDiagScreen: () => 'Home',
    getGlobalActiveScreen: () => 'Home',
  },
};

const diagState = loadTsModule('src/lib/diagnostic/diagnosticState.ts', mocks);

// -----------------------------------------------------------------------------
// 1. Notification Coalescing & Closed Zero-Listener Contract (BUG A)
// -----------------------------------------------------------------------------
console.log('--- 1. Notification Coalescing & Closed Zero-Listener Contract ---');

diagConfig.setDiagnosticModeOverride(true);
diagState.resetDiagnosticMeasurements();

// Verify initial state: zero listeners
assert.equal(diagState.getDiagnosticListenerCount(), 0, 'Initially there must be zero listeners');

// Verify that records when closed do NOT crash and zero callbacks run
let listenerCallCount = 0;
const testListener = () => {
  listenerCallCount++;
};

// When closed: recording elements increments requested count without scheduling running timers
diagState.recordInteraction({
  id: 'test-btn-1',
  screen: 'Home',
  language: 'en',
  theme: 'light',
  timestamp: 1000,
  handlerPresent: true,
  disabled: false,
  effect: 'navigated',
});

assert.equal(listenerCallCount, 0, 'Closed modal must receive 0 calls');
assert.equal(diagState.getDiagnosticListenerCount(), 0, 'Still 0 listeners');

// Open modal: register listener
const unsubscribe = diagState.addDiagnosticListener(testListener);
assert.equal(diagState.getDiagnosticListenerCount(), 1, '1 listener registered when panel is open');

// Coalescing check: fire 20 records in a single tick
diagState.resetDiagnosticNotificationStats();
listenerCallCount = 0;

for (let i = 0; i < 20; i++) {
  diagState.recordInteraction({
    id: `test-btn-${i}`,
    screen: 'Home',
    language: 'en',
    theme: 'light',
    timestamp: 1000 + i,
    handlerPresent: true,
    disabled: false,
    effect: 'stateChanged',
  });
}

// Before flush: zero synchronous listener calls!
assert.equal(
  listenerCallCount,
  0,
  'Records must NEVER notify synchronously — prevents per-onLayout render storms'
);

const statsBefore = diagState.getDiagnosticNotificationStats();
assert.equal(statsBefore.requested, 20, '20 notification requests recorded');
assert.equal(statsBefore.delivered, 0, '0 delivered before coalesce flush');
assert.equal(statsBefore.coalesced, 20, 'All 20 pending notifications coalesced');

// Now flush notifications: exactly ONE delivered notification occurs
diagState.flushDiagnosticNotifications();
assert.equal(
  listenerCallCount,
  1,
  'Many records in one tick must produce exactly ONE delivered notification'
);

const statsAfter = diagState.getDiagnosticNotificationStats();
assert.equal(statsAfter.requested, 20);
assert.equal(statsAfter.delivered, 1);
assert.equal(statsAfter.coalesced, 19, 'Measured cost: 19 notifications saved/coalesced');

// Unsubscribe (modal closes)
unsubscribe();
assert.equal(
  diagState.getDiagnosticListenerCount(),
  0,
  'Zero listeners registered when modal is closed'
);

console.log('  ✓ Notification coalescing verified: 20 records in 1 tick yielded 1 delivered notification (19 coalesced)');
console.log('  ✓ Zero listeners verified when modal is closed');

// -----------------------------------------------------------------------------
// 2. Bounded Payload & Trimming Rules (BUG B)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Bounded Payload & Trimming Rules ---');

// Populate a huge store: 400 probes, 200 interactions, 200 network items, 50 errors
diagState.resetDiagnosticMeasurements();

// Call recordProbeLayout with the correct 5-argument arity:
// (id, kind, screen, layout, meta)
for (let i = 0; i < 400; i++) {
  diagState.recordProbeLayout(
    `probe-${i}`,
    'probe',
    i % 2 === 0 ? 'Home' : 'Settings',
    { x: 10, y: 20 + i, width: 200, height: i % 10 === 0 ? 30 : 48 },
    { isInteractive: true, frameWidth: 412, frameHeight: 915 }
  );
}

for (let i = 0; i < 200; i++) {
  diagState.recordInteraction({
    id: `interaction-${i}`,
    screen: 'Home',
    language: 'en',
    theme: 'light',
    timestamp: 1000 + i,
    handlerPresent: true,
    disabled: false,
    effect: 'navigated',
  });
}

for (let i = 0; i < 200; i++) {
  diagState.recordDiagnosticNetworkEvent({
    host: 'api.example.com',
    path: `/endpoint/${i}`,
    method: 'GET',
    status: 200,
    ok: true,
    durationMs: 15,
    timestamp: 2000 + i,
  });
}

for (let i = 0; i < 50; i++) {
  diagState.recordDiagnosticRuntimeError(new Error(`Test error ${i}`));
}

// Build report on populated store
const report = diagState.buildDiagnosticReport();
assert.equal(report.probeCount, 400, 'All 400 probes must be stored');
assert.equal(report.probes.length, 400, '400 probes in array');
assert.equal(report.defects.totalDefects, 438, '438 defects truthfully derived from sub-44dp probes');
assert.equal(report.defects.items.length, 438, 'All 438 defect items present in report');

// Verify serialized size is strictly under 1.5 MB cap
const serializedFull = diagState.serializeReportBounded(report);
const fullByteLength = Buffer.byteLength(serializedFull, 'utf8');
assert.ok(
  fullByteLength < diagState.MAX_REPORT_PAYLOAD_BYTES,
  `Serialized full report (${fullByteLength} bytes) must be strictly under ${diagState.MAX_REPORT_PAYLOAD_BYTES} bytes (1.5 MB)`
);

// D1: Verify EVERY recorded defect survives into the bounded report (no silent trimming!)
const parsedFull = JSON.parse(serializedFull);
assert.equal(parsedFull.defects.totalDefects, 438, 'totalDefects must be 438');
assert.equal(parsedFull.defects.items.length, 438, 'Every recorded defect item must survive in bounded export');
assert.equal(parsedFull.defects.defectsTruncated, false, 'defectsTruncated must be false when store fits under cap');
assert.equal(parsedFull.defects.includedDefects, 438, 'includedDefects must equal 438');
assert.equal(parsedFull.defects.kept, 'all', 'kept must state "all"');

// D1: Verify all 400 probes survive and keep the newest without silent loss
assert.equal(parsedFull.probes.length, 400, 'All 400 probes survive in export');
assert.equal(parsedFull.probesTruncated, false, 'probesTruncated must be false');
assert.equal(parsedFull.totalProbes, 400);
assert.equal(parsedFull.includedProbes, 400);

// Verify required schema fields are 100% preserved
assert.ok(parsedFull.timestamp, 'timestamp preserved');
assert.ok(parsedFull.buildId, 'buildId preserved');
assert.ok(parsedFull.version, 'version preserved');
assert.ok(parsedFull.locale, 'locale preserved');
assert.ok(parsedFull.theme, 'theme preserved');
assert.ok(parsedFull.directionHelperResult, 'directionHelperResult preserved');
assert.ok(typeof parsedFull.i18nManagerIsRTL === 'boolean', 'i18nManagerIsRTL preserved');
assert.ok(parsedFull.summary, 'summary preserved');
assert.ok(parsedFull.coverage, 'coverage preserved');
assert.ok(parsedFull.defects && parsedFull.defects.countsByClass, 'defect counts preserved');
assert.ok(Array.isArray(parsedFull.measurements), 'measurements array preserved');
assert.ok(Array.isArray(parsedFull.probes), 'probes array preserved');
assert.ok(Array.isArray(parsedFull.interactions.items), 'interactions array preserved');
assert.ok(Array.isArray(parsedFull.network.items), 'network array preserved');
assert.ok(Array.isArray(parsedFull.errors.items), 'errors array preserved');

// D1 Regression: Truncation disclosure when size cap forces trimming of defects
// Pass a tight budget (25 KB) that cannot fit all 438 defect items
const tightCapSerialized = diagState.serializeReportBounded(report, 25000);
const parsedTight = JSON.parse(tightCapSerialized);
assert.equal(parsedTight.defects.defectsTruncated, true, 'defectsTruncated must be true when trimmed');
assert.equal(parsedTight.defects.totalDefects, 438, 'totalDefects truthfully preserved under tight cap');
assert.ok(parsedTight.defects.includedDefects < 438, 'includedDefects reflects trimmed count');
assert.equal(parsedTight.defects.kept, 'newest-per-class', 'discloses the actual selection: newest item per defect class');
assert.equal(parsedTight.probesTruncated, true, 'probesTruncated disclosed');
assert.equal(parsedTight.probesKept, 'defect-probes+newest', 'discloses the actual probe selection: defect probes plus newest normals');

// D5: prove the kept-end PROPERTY by content, never by the label the payload prints
// about itself. Reversing the production traversal (oldest-first) must fail here.
const allDefectItems = parsedFull.defects.items || [];
const keptDefectItems = parsedTight.defects.items || [];
assert.ok(keptDefectItems.length > 0, 'tight cap must still carry defect items');

// (a) every defect class present in the store must survive truncation
const allClasses = new Set(allDefectItems.map((d) => d.defectClass));
const keptClasses = new Set(keptDefectItems.map((d) => d.defectClass));
const disclosedDropped = new Set(parsedTight.defects.defectClassesDropped || []);
for (const cls of allClasses) {
  assert.ok(
    keptClasses.has(cls) || disclosedDropped.has(cls),
    `defect class "${cls}" must either survive or be explicitly disclosed in defectClassesDropped`
  );
}
assert.ok(
  Array.isArray(parsedTight.defects.defectClassesDropped),
  'payload must always carry defectClassesDropped when defects are truncated'
);

// (b) each kept item must be the NEWEST item of its class in the full list
const newestIndexOfClass = new Map();
allDefectItems.forEach((d, i) => newestIndexOfClass.set(d.defectClass, i));
const indexOfItem = new Map(allDefectItems.map((d, i) => [`${d.probeId}|${d.defectClass}|${d.screen}`, i]));
for (const d of keptDefectItems) {
  const idx = indexOfItem.get(`${d.probeId}|${d.defectClass}|${d.screen}`);
  assert.ok(idx !== undefined, `kept defect ${d.probeId} must exist in the full store`);
  const newestIdx = newestIndexOfClass.get(d.defectClass);
  assert.ok(
    idx > newestIdx - 1 && idx <= newestIdx,
    `kept defect for class "${d.defectClass}" must be its newest occurrence (index ${newestIdx}), got ${idx}`
  );
}

// (c) kept probes must include every defect probe and take the newest normal probes
const allProbeList = parsedFull.probes || [];
const keptProbeList = parsedTight.probes || [];
const isDefectProbe = (p) => p.defects && Object.values(p.defects).some((d) => d && d.flag === true);
const defectProbeIds = allProbeList.filter(isDefectProbe).map((p) => p.id);
const keptIdsSet = new Set(keptProbeList.map((p) => p.id));
if (keptProbeList.length > 0) {
  for (const id of defectProbeIds) {
    assert.ok(keptIdsSet.has(id), `defect probe ${id} must survive truncation when probes are kept`);
  }
} else {
  // Extreme trim drops probes entirely - that is allowed only if it is disclosed.
  assert.equal(parsedTight.probesTruncated, true, 'dropping all probes must be disclosed');
  assert.equal(parsedTight.includedProbes, 0, 'includedProbes must state 0 when no probes survive');
  assert.equal(parsedTight.totalProbes, allProbeList.length, 'totalProbes must still be truthful');
}
const normalIds = allProbeList.filter((p) => !isDefectProbe(p)).map((p) => p.id);
const keptNormalIds = keptProbeList.filter((p) => !isDefectProbe(p)).map((p) => p.id);
if (keptNormalIds.length > 0 && keptNormalIds.length < normalIds.length) {
  assert.deepEqual(
    keptNormalIds,
    normalIds.slice(normalIds.length - keptNormalIds.length),
    'kept normal probes must be the NEWEST ones (a suffix of the normal probe list)'
  );
}

// D5: trimMeasurementRectangles must be load-bearing - removing it must fail here.
const dupRectMeasurement = {
  probeId: 'probe-trim',
  screenId: 'Home',
  componentId: 'trim-check',
  targetTestId: 'trim-check-target',
  kind: 'probe',
  parentLayout: { x: 1, y: 2, width: 3, height: 4 },
  rectangles: {
    parent: { x: 1, y: 2, width: 3, height: 4 },
    target: { x: 9, y: 9, width: 5, height: 5 },
  },
};
const trimmedMeasurements = diagState.trimMeasurementRectangles([dupRectMeasurement]);
assert.ok(
  !trimmedMeasurements[0].rectangles.parent,
  'duplicated parent rectangle must be trimmed away (flat parentLayout carries the data)'
);
assert.ok(
  trimmedMeasurements[0].rectangles.target,
  'a non-duplicated rectangle must survive trimming'
);
const keptRect = diagState.trimMeasurementRectangles([
  { ...dupRectMeasurement, rectangles: { parent: { x: 7, y: 8, width: 9, height: 10 } } },
]);
assert.ok(
  keptRect[0].rectangles.parent,
  'a parent rectangle that differs from parentLayout must NOT be trimmed'
);
assert.ok(Buffer.byteLength(tightCapSerialized, 'utf8') <= 25000, 'Payload genuinely under tight cap');

// D1 Regression: Byte cap strictly holds for crafted 5 MB adversarial store
const craftedProbes = [];
for (let i = 0; i < 50; i++) {
  craftedProbes.push({
    id: 'p' + i + 'y'.repeat(100000),
    kind: 'probe',
    screen: 'Home',
    width: 1,
    height: 1,
    defects: null,
    overflow: null,
    textMetrics: null,
  });
}
const craftedReport = { ...report, probes: craftedProbes };
const craftedSerialized = diagState.serializeReportBounded(craftedReport, diagState.MAX_REPORT_PAYLOAD_BYTES);
const craftedBytes = Buffer.byteLength(craftedSerialized, 'utf8');
assert.ok(
  craftedBytes <= diagState.MAX_REPORT_PAYLOAD_BYTES,
  `Crafted 5 MB report MUST serialize under 1.5 MB cap (actual: ${craftedBytes} bytes)`
);
const parsedCrafted = JSON.parse(craftedSerialized);
assert.equal(parsedCrafted.probesTruncated, true, 'Crafted store must disclose probe truncation');

// D2: Verify Summary export contains EVERY defect item and reports real serialized size
const summaryReport = diagState.buildDiagnosticSummary();
const serializedSummary = JSON.stringify(summaryReport, null, 2);
const summaryByteLength = Buffer.byteLength(serializedSummary, 'utf8');

assert.equal(summaryReport.type, 'summary');
assert.equal(summaryReport.counts.totalDefects, 438, 'Summary totalDefects must be 438');
assert.equal(summaryReport.defects.length, 438, 'Summary must contain EVERY defect item as fallback');

// Verify per-item fields are trimmed
for (const d of summaryReport.defects) {
  assert.ok(d.probeId, 'probeId present');
  assert.ok(d.defectClass, 'defectClass present');
  assert.ok(d.screen, 'screen present');
  if (d.reason) assert.equal(d.reason, d.reason.trim(), 'reason trimmed of whitespace');
}

// Summary real serialized size reflects actual ~72 KB size for 438 items
assert.ok(
  summaryByteLength >= 60000 && summaryByteLength <= 120000,
  `Summary report reflects truthful serialized size (actual: ${summaryByteLength} bytes, expected ~72 KB)`
);

console.log(`  ✓ Bounded payload verified: Populated store (400 probes, 438 defects) serialized to ${fullByteLength} bytes (< 1.5 MB)`);
console.log(`  ✓ Every recorded defect (438/438) survives in export with truncation disclosure`);
console.log(`  ✓ Crafted 5 MB store bounded under 1.5 MB cap (${craftedBytes} bytes) with explicit disclosure`);
console.log(`  ✓ Summary fallback contains all 438 defect items with truthful size (${summaryByteLength} bytes)`);
console.log('  ✓ All required schema fields preserved after trimming');

// -----------------------------------------------------------------------------
// 3. Three Reliable Export Paths & Truthful Status Semantics (BUG B)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Three Reliable Export Paths & Truthful Status Semantics ---');

// Reset mock states
mockSharingAvailable = true;
mockSharingRejects = false;
mockFileWriteRejects = false;
mockClipboardString = null;
mockLastWrittenPath = null;
mockLastSharedPath = null;

// PATH 1: Sharing available -> writes to documentDirectory, invokes Sharing.shareAsync, reports userActionRequired/unknown
const path1Result = await diagState.exportDiagnosticReport();
assert.equal(path1Result.success, false, 'Path 1: must never falsely report completed share');
assert.equal(path1Result.status, 'userActionRequired', 'Path 1: status is userActionRequired');
assert.equal(path1Result.shareStatus, 'unknown', 'Path 1: shareStatus is unknown');
assert.equal(path1Result.fileReady, true, 'Path 1: fileReady is true');
assert.ok(path1Result.filePath.startsWith(mockFileSystemDocDir), 'Path 1: must use documentDirectory, NOT cache');
assert.ok(path1Result.filePath.includes(diagConfig.DIAGNOSTIC_BUILD_ID.replace(/[^a-zA-Z0-9_-]/g, '_')));
assert.ok(path1Result.filePath.includes(diagConfig.DIAGNOSTIC_VERSION.replace(/[^a-zA-Z0-9._-]/g, '_')));
assert.ok(path1Result.fileSizeBytes > 0, 'Path 1: reports verified byte size');
assert.equal(mockLastSharedPath, path1Result.filePath, 'Path 1: Sharing.shareAsync called with verified file');

// PATH 2: Sharing unavailable -> writes to documentDirectory, copies to clipboard, confirms fileReady
mockSharingAvailable = false;
mockClipboardString = null;
const originalShare = mockReactNative.Share;
mockReactNative.Share = undefined;

const path2Result = await diagState.exportDiagnosticReport();
mockReactNative.Share = originalShare;

assert.equal(path2Result.success, true, 'Path 2: filesystem write confirmed');
assert.equal(path2Result.status, 'fileReady', 'Path 2: status is fileReady');
assert.equal(path2Result.shareStatus, 'unavailable', 'Path 2: shareStatus is unavailable');
assert.equal(path2Result.fileReady, true, 'Path 2: fileReady is true');
assert.equal(path2Result.clipboardCopied, true, 'Path 2: copies JSON to clipboard as fallback');
assert.ok(mockClipboardString && mockClipboardString.length > 0, 'Path 2: clipboard set with report text');
assert.ok(path2Result.filePath.startsWith(mockFileSystemDocDir), 'Path 2: uses documentDirectory');
assert.ok(path2Result.fileSizeBytes > 0, 'Path 2: reports byte size');

// PATH 2 (Share Failure Fallback): Sharing throws -> copies to clipboard, returns failed with error and file details
mockSharingAvailable = true;
mockSharingRejects = true;
mockClipboardString = null;

const path2FailResult = await diagState.exportDiagnosticReport();
assert.equal(path2FailResult.success, false);
assert.equal(path2FailResult.status, 'failed');
assert.equal(path2FailResult.shareStatus, 'unavailable');
assert.equal(path2FailResult.fileReady, true, 'File was written successfully before share threw');
assert.equal(path2FailResult.clipboardCopied, true, 'Copies to clipboard on share failure');
assert.ok(mockClipboardString && mockClipboardString.length > 0, 'Clipboard populated on share failure');

// Export summary execution
mockSharingAvailable = true;
mockSharingRejects = false;
const summaryExportResult = await diagState.exportDiagnosticSummary();
assert.ok(summaryExportResult.filePath.includes('rtl-diagnostic-summary'));
assert.equal(summaryExportResult.fileReady, true);

console.log('  ✓ Path 1 verified: documentDirectory, build ID & version in filename, shareAsync invoked, truthful unknown status');
console.log('  ✓ Path 2 verified: clipboard copy fallback when sharing unavailable or failing, exact file path reported');
console.log('  ✓ Export summary verified: writes compact summary to documentDirectory');

// -----------------------------------------------------------------------------
// 4. Modal Fixed Header, Stationary Actions & Touch Targets (BUG C1)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Modal Fixed Header, Stationary Actions & Touch Targets ---');

const modalSrc = read('src/components/diagnostic/RtlDiagnosticModal.tsx');

// Assert fixed header is placed OUTSIDE the scroll container
const fixedHeaderIdx = modalSrc.indexOf('styles.fixedHeaderWrap');
const scrollIdx = modalSrc.indexOf('<ScrollView');
assert.ok(fixedHeaderIdx > 0, 'Modal must declare fixedHeaderWrap');
assert.ok(scrollIdx > 0, 'Modal must contain ScrollView');
assert.ok(
  fixedHeaderIdx < scrollIdx,
  'Fixed header must be rendered BEFORE (outside) the ScrollView so actions never scroll away'
);

// Assert primary actions are inside the fixed header (before ScrollView)
const headerCode = modalSrc.slice(fixedHeaderIdx, scrollIdx);
assert.ok(headerCode.includes('testID="export-rtl-report-btn"'), 'export-rtl-report-btn in fixed header');
assert.ok(headerCode.includes('testID="export-rtl-summary-btn"'), 'export-rtl-summary-btn in fixed header');
assert.ok(headerCode.includes('testID="copy-rtl-report-btn"'), 'copy-rtl-report-btn in fixed header');
assert.ok(headerCode.includes('testID="diag-refresh-btn"'), 'diag-refresh-btn in fixed header');
assert.ok(headerCode.includes('testID="close-rtl-diagnostics"'), 'close-rtl-diagnostics in fixed header');

// Assert 44dp minimum touch targets & hitSlop
assert.ok(modalSrc.includes('minHeight: 44'), 'Buttons specify minHeight: 44');
assert.ok(modalSrc.includes('width: 44') && modalSrc.includes('height: 44'), 'Icon buttons specify 44x44 dp');
assert.ok(
  modalSrc.includes('hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}'),
  'Interactive buttons declare adequate hitSlop'
);

// Assert size indicators rendered before user acts
assert.ok(headerCode.includes('formatByteSize(estimatedSize)'), 'Report size indicator exposed in header');
assert.ok(headerCode.includes('formatByteSize(estimatedSummarySize)'), 'Summary size indicator exposed in header');

// D4: Assert perf counters sit in fixed top region OUTSIDE ScrollView with fixed height and no wrap
const perfCardIdx = modalSrc.indexOf('testID="diag-perf-card"');
assert.ok(perfCardIdx > 0 && perfCardIdx < scrollIdx, 'Perf counters MUST be outside ScrollView in fixed top region');
assert.ok(headerCode.includes('testID="diag-perf-coalesced"'), 'diag-perf-coalesced in fixed header');
assert.ok(headerCode.includes('testID="diag-perf-delivered"'), 'diag-perf-delivered in fixed header');
assert.ok(headerCode.includes('testID="diag-perf-requested"'), 'diag-perf-requested in fixed header');
assert.ok(headerCode.includes('testID="diag-perf-listeners"'), 'diag-perf-listeners in fixed header');
assert.ok(modalSrc.includes("flexWrap: 'nowrap'"), 'perfIndicatorsRow declares flexWrap: nowrap');
assert.ok(modalSrc.includes('maxHeight: 22') || modalSrc.includes('height: 22'), 'perfIndicatorsRow declares fixed height');

// D2: Assert misleading "(small)" wording removed from summary button
assert.ok(!modalSrc.includes("diagT('Export summary (small)')"), 'Misleading "(small)" removed from summary button label');
assert.ok(headerCode.includes("diagT('Export summary')"), 'Truthful "Export summary" button label declared');

console.log('  ✓ Fixed stationary header bar verified outside ScrollView (all 5 actions stationary)');
console.log('  ✓ Perf counters placed in stationary top header with fixed height & flexWrap nowrap');
console.log('  ✓ Touch targets >= 44x44 dp and hitSlop verified for all interactive controls');

// -----------------------------------------------------------------------------
// 5. Automatic Up/Down Scrolling Root Cause & Tap Reliability (BUG C2 & C3)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Automatic Up/Down Scrolling Root Cause & Tap Reliability ---');

// Assert absence of any scroll-mutating effects (scrollTo, scrollToEnd, onContentSizeChange)
assert.ok(!modalSrc.includes('.scrollTo('), 'Modal must NOT call scrollTo');
assert.ok(!modalSrc.includes('.scrollToEnd('), 'Modal must NOT call scrollToEnd');
assert.ok(!modalSrc.includes('onContentSizeChange='), 'ScrollView must NOT have scroll-mutating onContentSizeChange');

// Assert ScrollView has NO dynamic changing key that would trigger remounting
const scrollTagMatch = modalSrc.match(/<ScrollView[^>]*>/);
assert.ok(scrollTagMatch, 'ScrollView found');
assert.ok(!scrollTagMatch[0].includes('key='), 'ScrollView must NOT have dynamic key (prevents remounting and scroll resets)');

// Assert sections are collapsed by default to prevent layout jump and unbounded height
assert.ok(modalSrc.includes('perf: true'), 'Perf stats section visible by default');
assert.ok(modalSrc.includes('defects: false'), 'Defects section collapsed by default');
assert.ok(modalSrc.includes('probes: false'), 'Probes section collapsed by default');
assert.ok(modalSrc.includes('targets: false'), 'Targets section collapsed by default');

// Assert maximum rows rendered per section is bounded (e.g. 50) with "+N more" indicator
assert.ok(modalSrc.includes('MAX_DISPLAYED_ROWS = 50'), 'Maximum 50 rows per section rendered');
assert.ok(modalSrc.includes('testID="diag-more-probes"'), '+N more indicator for probes');
assert.ok(modalSrc.includes('testID="diag-more-defects"'), '+N more indicator for defects');

// Assert row components are memoized with React.memo for stable identity across flushes
assert.ok(modalSrc.includes('const TargetRow = React.memo('), 'TargetRow is memoized');
assert.ok(modalSrc.includes('const ProbeRow = React.memo('), 'ProbeRow is memoized');
assert.ok(modalSrc.includes('const DefectRow = React.memo('), 'DefectRow is memoized');

// Assert Path 3: copyable file path surfaced in UI
assert.ok(modalSrc.includes('testID="diag-file-path-box"'), 'File path box rendered');
assert.ok(modalSrc.includes('testID="diag-file-path-text"'), 'File path text rendered');
assert.ok(modalSrc.includes('testID="diag-copy-path-btn"'), 'Copy path button rendered');

// D3: Assert clipboard fallback notice rendered in UI
assert.ok(modalSrc.includes('testID="diag-clipboard-notice"'), 'diag-clipboard-notice rendered');
assert.ok(modalSrc.includes('testID="diag-clipboard-notice-text"'), 'diag-clipboard-notice-text rendered');
assert.ok(modalSrc.includes("diagT('Report JSON copied to clipboard')"), 'Localized clipboard notice rendered');
assert.ok(modalSrc.includes("diagT('Clipboard contains complete diagnostic payload.')"), 'Localized clipboard detail rendered');

console.log('  ✓ Root cause eliminated: zero scroll-mutating effects, no dynamic ScrollView keys');
console.log('  ✓ Collapsed sections by default & MAX_DISPLAYED_ROWS = 50 prevent layout thrashing');
console.log('  ✓ React.memo row memoization preserves identity across flushes');
console.log('  ✓ Path 3 copyable file path and localized clipboard notice surfaced in UI');

// -----------------------------------------------------------------------------
// 6. Mutation Checks (Failure Injections on Real Production Source)
// -----------------------------------------------------------------------------
console.log('\n--- 6. Mutation Checks (Failure Injections on Real Production Source) ---');

// Mutation 1: Revert production notification coalescing guarantee in diagnosticState.ts
// Replace coalesce timer schedule with immediate synchronous delivery -> causes re-render storm
{
  const realStateSrc = read('src/lib/diagnostic/diagnosticState.ts');
  assert.ok(realStateSrc.includes('if (!isCoalesceScheduled) {'), 'Production source must guard timer schedule with !isCoalesceScheduled');

  const mutatedCoalescingSrc = realStateSrc.replace(
    /if \(!isCoalesceScheduled\) \{[\s\S]*?flushDiagnosticNotifications\(\);\s*\}, COALESCE_INTERVAL_MS\);\s*\}/,
    'listeners.forEach((cb) => { try { cb(); } catch {} });'
  );
  assert.notEqual(mutatedCoalescingSrc, realStateSrc, 'Mutation 1 successfully injected');

  const mutatedState = loadTsModuleFromString(mutatedCoalescingSrc, mocks);
  diagConfig.setDiagnosticModeOverride(true);
  mutatedState.resetDiagnosticMeasurements();

  let mutatedDeliveries = 0;
  mutatedState.addDiagnosticListener(() => {
    mutatedDeliveries++;
  });

  // Record 5 interactions in one tick
  for (let i = 0; i < 5; i++) {
    mutatedState.recordInteraction({
      id: `mut-btn-${i}`,
      screen: 'Home',
      language: 'en',
      theme: 'light',
      timestamp: 1000 + i,
      handlerPresent: true,
      disabled: false,
      effect: 'navigated',
    });
  }

  // Mutated source delivers 5 times synchronously (storm) -> violates coalescing guarantee
  assert.equal(mutatedDeliveries, 5, 'Mutated code went RED: delivered 5 synchronous notifications instead of coalescing');

  // Verify production code stays GREEN (0 synchronous deliveries before flush)
  let prodDeliveries = 0;
  diagState.resetDiagnosticMeasurements();
  const unsubProd = diagState.addDiagnosticListener(() => {
    prodDeliveries++;
  });
  for (let i = 0; i < 5; i++) {
    diagState.recordInteraction({
      id: `prod-btn-${i}`,
      screen: 'Home',
      language: 'en',
      theme: 'light',
      timestamp: 1000 + i,
      handlerPresent: true,
      disabled: false,
      effect: 'navigated',
    });
  }
  assert.equal(prodDeliveries, 0, 'Production code stays GREEN: zero synchronous deliveries before flush');
  diagState.flushDiagnosticNotifications();
  assert.equal(prodDeliveries, 1, 'Production code delivers exactly once on flush');
  unsubProd();
  console.log('  ✓ Mutation 1 (notification coalescing): mutated source went RED (5/5 sync deliveries), production stays GREEN (0/5 sync, 1 coalesced)');
}

// Mutation 2: Revert persistent documentDirectory guarantee in diagnosticState.ts
// Revert to cacheDirectory -> violates persistent file retention guarantee
{
  const realStateSrc = read('src/lib/diagnostic/diagnosticState.ts');
  assert.ok(realStateSrc.includes('FileSystem.documentDirectory || FileSystem.cacheDirectory'), 'Production source uses documentDirectory first');

  const mutatedExportSrc = realStateSrc.replace(
    'const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;',
    'const dir = FileSystem.cacheDirectory;'
  );
  assert.notEqual(mutatedExportSrc, realStateSrc, 'Mutation 2 successfully injected');

  const mutatedExportState = loadTsModuleFromString(mutatedExportSrc, mocks);
  diagConfig.setDiagnosticModeOverride(true);
  mockSharingAvailable = true;
  mockSharingRejects = false;
  mockFileWriteRejects = false;

  const mutResult = await mutatedExportState.exportDiagnosticReport();
  const mutUsesDocumentDir = mutResult.filePath.startsWith(mockFileSystemDocDir);
  assert.equal(mutUsesDocumentDir, false, 'Mutated code went RED: wrote to cacheDirectory instead of persistent documentDirectory');

  // Verify production code stays GREEN (writes strictly to documentDirectory)
  const prodResult = await diagState.exportDiagnosticReport();
  assert.ok(prodResult.filePath.startsWith(mockFileSystemDocDir), 'Production code stays GREEN: writes to documentDirectory');
  console.log('  ✓ Mutation 2 (persistent storage directory): mutated source went RED (cacheDirectory used), production stays GREEN (documentDirectory)');
}

// Mutation 3: Revert stationary top header guarantee in RtlDiagnosticModal.tsx
// Move fixedHeaderWrap inside ScrollView -> violates stationary action bar guarantee
{
  const realModalSrc = read('src/components/diagnostic/RtlDiagnosticModal.tsx');
  const prodHeaderIdx = realModalSrc.indexOf('testID="export-rtl-report-btn"');
  const prodScrollIdx = realModalSrc.indexOf('<ScrollView');
  assert.ok(prodHeaderIdx < prodScrollIdx, 'Production fixed header is outside ScrollView');

  // Cut fixedHeaderWrap from the top and move it INSIDE ScrollView
  const headerStart = realModalSrc.indexOf('<View style={[styles.fixedHeaderWrap');
  const headerEnd = realModalSrc.indexOf('</View>\n\n      {/* =====================================================================\n          SCROLLABLE CONTENT');
  assert.ok(headerStart > 0 && headerEnd > headerStart, 'Fixed header boundaries identified');

  const headerJsx = realModalSrc.slice(headerStart, headerEnd + 7);
  const withoutHeader = realModalSrc.slice(0, headerStart) + realModalSrc.slice(headerEnd + 7);
  const mutatedModalSrc = withoutHeader.replace(
    '<ScrollView',
    `<ScrollView>\n        ${headerJsx}`
  );

  const mutatedHeaderIdx = mutatedModalSrc.indexOf('testID="export-rtl-report-btn"');
  const mutatedScrollIdx = mutatedModalSrc.indexOf('<ScrollView');
  const mutatedIsOutside = mutatedHeaderIdx < mutatedScrollIdx;

  assert.equal(mutatedIsOutside, false, 'Mutated code went RED: actions rendered inside ScrollView container');
  assert.ok(prodHeaderIdx < prodScrollIdx, 'Production code stays GREEN: stationary actions rendered before ScrollView');
  console.log('  ✓ Mutation 3 (stationary actions outside ScrollView): mutated source went RED (inside ScrollView), production stays GREEN (outside ScrollView)');
}

console.log('  ✓ All 3 mutation checks confirmed: mutations go red, production code stays green');

console.log('\n=============================================================================');
console.log('ALL ANDROID DIAGNOSTIC PERFORMANCE, EXPORT & USABILITY CHECKS PASSED (6/6)');
console.log('=============================================================================');
