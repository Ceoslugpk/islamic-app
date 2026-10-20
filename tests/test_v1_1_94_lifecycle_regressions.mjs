import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from '/home/ubuntu/.hermes/cache/scratch/islamic-app-android-layout-pilot-v1.1.88-worktree/node_modules/typescript/lib/typescript.js';

const repo = '/home/ubuntu/.hermes/cache/scratch/islamic-app-android-layout-pilot-v1.1.88-worktree';

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(`${repo}/${file}`, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
}

function loadModule(file, modules) {
  const module = { exports: {} };
  const requireStub = (name) => {
    assert.ok(name in modules, `Unexpected production import: ${name}`);
    return modules[name];
  };
  new Function('require', 'module', 'exports', transpile(file))(requireStub, module, module.exports);
  return module.exports;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function testPersistentTabPane() {
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length <= 1 ? children[0] : children } }) };
  const { PersistentTabPane } = loadModule('src/components/layout/PersistentTabPane.tsx', {
    react: React,
    'react-native': {
      Platform: { OS: 'android' },
      View: 'View',
      StyleSheet: {
        absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
        create: (styles) => styles,
      },
    },
  });
  const child = { type: 'expensive-tab-tree' };
  const pane = PersistentTabPane({ active: false, children: child });
  const style = Object.assign({}, ...pane.props.style);
  // DEVICE-LEARNED CONTRACT (v1.1.75, kept deliberately): on NATIVE an inactive pane must NOT use
  // display:none - discarding native layout makes every tab re-layout its whole screen on return.
  // Zero opacity skips drawing while keeping the measurements. A later pass re-introduced
  // display:none here on the strength of an automated perf finding and broke this contract; it was
  // reverted. Web may hide outright because the browser keeps its own layout work cheap.
  assert.equal(style.display, undefined, 'native inactive panes must keep their layout measurements');
  assert.equal(style.opacity, 0, 'native inactive panes must skip drawing via zero opacity');
  assert.equal(style.zIndex, 0, 'native inactive panes must sit behind the active pane');
  assert.equal(pane.props.children, child, 'inactive panes retain the React child for stateful remount-free switching');
  const activeStyle = Object.assign({}, ...PersistentTabPane({ active: true, children: child }).props.style);
  assert.equal(activeStyle.opacity, 1);
  assert.equal(activeStyle.zIndex, 1);
}

function makeTimers() {
  let nextId = 1;
  const timers = new Map();
  return {
    timers,
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
}

async function testConnectivityLifecycle() {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalFetch = globalThis.fetch;
  const timers = makeTimers();
  let fetchCount = 0;
  let appStateChange;
  const appState = {
    currentState: 'active',
    addEventListener(name, handler) {
      assert.equal(name, 'change');
      appStateChange = handler;
      return { remove() { appStateChange = undefined; } };
    },
  };
  globalThis.setTimeout = timers.setTimeout;
  globalThis.clearTimeout = timers.clearTimeout;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return { ok: true };
  };
  try {
    let cleanup;
    let updates = 0;
    const React = {
      useEffect: (effect) => { cleanup = effect(); },
      useState: (value) => [value, () => { updates += 1; }],
    };
    const connectivity = loadModule('src/lib/useConnectivity.ts', {
      react: React,
      'react-native': { AppState: appState, Platform: { OS: 'android' } },
    });
    await flush();
    assert.equal(fetchCount, 1);
    assert.equal(timers.timers.size, 0, 'the initial probe must not leave a poll alive without subscribers');

    const shape = connectivity.useConnectivity();
    assert.deepEqual(
      Object.keys(shape).sort(),
      ['isOnline', 'refreshKey'],
      'connectivity exposes only values that consumers use for re-rendering'
    );
    await flush();
    assert.equal(fetchCount, 2, 'the first subscriber must resync connectivity');
    assert.equal(timers.timers.size, 1, 'polling starts while a subscriber is present');
    assert.equal(typeof appStateChange, 'function');

    appStateChange('background');
    assert.equal(timers.timers.size, 0, 'backgrounding stops the active poll timer');
    appStateChange('active');
    await flush();
    assert.equal(fetchCount, 3, 'foregrounding resyncs connectivity');
    assert.equal(timers.timers.size, 1);

    cleanup();
    assert.equal(timers.timers.size, 0, 'polling stops as soon as the last subscriber leaves');
    assert.equal(updates, 0, 'a no-op probe must not notify subscribers for transient checking state');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.fetch = originalFetch;
  }
}

async function testConnectivityNoOpEvents() {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  const timers = makeTimers();
  const handlers = new Map();
  const window = {
    addEventListener(name, handler) { handlers.set(name, handler); },
    dispatch(name) { handlers.get(name)?.(); },
  };
  globalThis.setTimeout = timers.setTimeout;
  globalThis.clearTimeout = timers.clearTimeout;
  globalThis.fetch = async () => ({ ok: true });
  globalThis.window = window;
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  try {
    const React = { useEffect: () => undefined, useState: (value) => [value, () => {}] };
    const connectivity = loadModule('src/lib/useConnectivity.ts', {
      react: React,
      'react-native': { Platform: { OS: 'web' } },
    });
    await flush();
    let notifications = 0;
    const unsubscribe = connectivity.subscribeConnectivity(() => { notifications += 1; });
    await flush();
    const beforeSameOnline = notifications;
    window.dispatch('online');
    window.dispatch('online');
    assert.equal(notifications, beforeSameOnline, 'repeated online events must not notify for an identical value');

    window.dispatch('offline');
    const afterOffline = notifications;
    assert.equal(connectivity.isAppOnline(), false);
    window.dispatch('offline');
    assert.equal(notifications, afterOffline, 'repeated offline events must not notify for an identical value');

    window.dispatch('online');
    assert.equal(connectivity.isAppOnline(), true);
    assert.equal(notifications, afterOffline + 1);
    unsubscribe();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalNavigator === undefined) delete globalThis.navigator; else Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
  }
}

function loadPermissions(
  storage,
  notification,
  react = { Alert: { alert() {} }, Platform: { OS: 'web' } },
  location = {},
  cachedLocationStatus = 'unavailable'
) {
  return loadModule('src/lib/firstLaunchPermissions.ts', {
    '@react-native-async-storage/async-storage': {
      async getItem(key) { return storage.get(key) ?? null; },
      async setItem(key, value) { storage.set(key, value); },
      async removeItem(key) { storage.delete(key); },
    },
    'react-native': react,
    'expo-location': location,
    './notifications': notification,
    './prayerTimes': {},
    './useLocation': { getCachedLocation: () => null, getCachedStatus: () => cachedLocationStatus },
    './i18n': { t: (value) => value },
  });
}

async function testPermissionDecisionCompletesAcrossLaunches() {
  const storage = new Map();
  let dialogCount = 0;
  let requestCount = 0;
  const notification = {
    async checkNotificationPermission() { return 'undetermined'; },
    async requestNotificationPermission() { requestCount += 1; return true; },
    async configureNotifications() {},
  };
  const React = {
    Alert: {
      alert(_title, _message, buttons) {
        dialogCount += 1;
        buttons[0].onPress();
      },
    },
    Platform: { OS: 'android' },
  };

  for (let launch = 0; launch < 3; launch += 1) {
    const permissions = loadPermissions(storage, notification, React);
    const result = await permissions.runFirstLaunchPermissions({ remindersEnabled: true, skipLocation: true });
    assert.equal(result.alreadyAsked, launch > 0, `launch ${launch + 1} should reflect the persisted decision`);
  }

  assert.equal(dialogCount, 1, 'Not now is one decision, not a prompt on every launch');
  assert.equal(requestCount, 0, 'an explicit rationale decline must not invoke the OS request');
  const finalPermissions = loadPermissions(storage, notification, React);
  assert.equal(await finalPermissions.hasAskedPermissions(), true, 'the decision writes the completion marker');

  const osDeniedStorage = new Map();
  const osDenied = loadPermissions(osDeniedStorage, {
    async checkNotificationPermission() { return 'undetermined'; },
    async requestNotificationPermission() { return false; },
    async configureNotifications() {},
  });
  const osDeniedResult = await osDenied.runFirstLaunchPermissions({ remindersEnabled: true, skipLocation: true });
  assert.equal(osDeniedResult.notificationsGranted, false);
  assert.equal(await osDenied.hasAskedPermissions(), true, 'an OS denial is also a completed user decision');
}

async function testLocationDecisionBookkeeping() {
  const storage = new Map();
  let dialogCount = 0;
  const permissions = loadPermissions(storage, {
    async checkNotificationPermission() { return 'denied'; },
    async requestNotificationPermission() { throw new Error('must not reach the OS request'); },
    async configureNotifications() {},
  }, {
    Alert: {
      alert(_title, _message, buttons) {
        dialogCount += 1;
        buttons[0].onPress();
      },
    },
    Platform: { OS: 'android' },
  }, {
    async getForegroundPermissionsAsync() { return { status: 'undetermined', granted: false }; },
  }, 'pending');

  await permissions.runFirstLaunchPermissions({ remindersEnabled: false, skipLocation: false, hasUsableLocation: false });
  assert.equal(dialogCount, 1, 'the exported non-skipped path reaches the location rationale');
  assert.equal(await permissions.hasAskedPermissions(), true, 'an explicit location decline completes that path');
}

async function testPermissionInterruptionReruns() {
  const storage = new Map();
  let firstDialogOpened = 0;
  const interrupted = loadPermissions(storage, {
    async checkNotificationPermission() { return 'undetermined'; },
    async requestNotificationPermission() { throw new Error('must not reach the OS request'); },
    async configureNotifications() {},
  }, {
    Alert: { alert() { firstDialogOpened += 1; } },
    Platform: { OS: 'android' },
  });

  // The unresolved rationale models a process killed while the user still had not decided.
  void interrupted.runFirstLaunchPermissions({ remindersEnabled: true, skipLocation: true });
  await flush(10);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(firstDialogOpened, 1, 'the interrupted run reached the rationale prompt');
  assert.equal(storage.has('permissions-asked-v1'), false, 'an interrupted run cannot persist completion');

  let resumedDialogCount = 0;
  const resumed = loadPermissions(storage, {
    async checkNotificationPermission() { return 'undetermined'; },
    async requestNotificationPermission() { throw new Error('must not reach the OS request'); },
    async configureNotifications() {},
  }, {
    Alert: { alert(_title, _message, buttons) { resumedDialogCount += 1; buttons[0].onPress(); } },
    Platform: { OS: 'android' },
  });
  await resumed.runFirstLaunchPermissions({ remindersEnabled: true, skipLocation: true });
  assert.equal(resumedDialogCount, 1, 'a fresh run retries after the interrupted run');
  assert.equal(await resumed.hasAskedPermissions(), true);
}

async function testPermissionStepThrowSurfacesAndRetries() {
  const storage = new Map();
  let checkCount = 0;
  const failure = new Error('notification dependency unavailable');
  const notification = {
    async checkNotificationPermission() {
      checkCount += 1;
      throw failure;
    },
    async requestNotificationPermission() { throw new Error('must not reach the OS request'); },
    async configureNotifications() {},
  };
  const React = { Alert: { alert() { throw new Error('must not open a rationale after a failed check'); } }, Platform: { OS: 'android' } };
  const permissions = loadPermissions(storage, notification, React);

  await assert.rejects(
    permissions.runFirstLaunchPermissions({ remindersEnabled: true, skipLocation: true }),
    (error) => error === failure,
    'a thrown notification step must be visible to the caller'
  );
  await assert.rejects(
    permissions.runFirstLaunchPermissions({ remindersEnabled: true, skipLocation: true }),
    (error) => error === failure,
    'a persistently failing notification step must not become a silent no-op'
  );
  assert.equal(checkCount, 2, 'a failed step is retried on the next run');
  assert.equal(storage.has('permissions-asked-v1'), false, 'a failed step cannot write completion');
}

testPersistentTabPane();
await testConnectivityLifecycle();
await testConnectivityNoOpEvents();
await testPermissionDecisionCompletesAcrossLaunches();
await testLocationDecisionBookkeeping();
await testPermissionInterruptionReruns();
await testPermissionStepThrowSurfacesAndRetries();
console.log('lifecycle regressions passed');
