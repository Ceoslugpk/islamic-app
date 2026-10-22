import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function createHarness() {
  let nextTimerId = 1;
  const timers = new Map();
  const stateHistory = [];
  const cleanups = [];
  const React = {
    useState(initial) {
      let value = typeof initial === 'function' ? initial() : initial;
      stateHistory.push(value);
      return [value, (next) => {
        value = typeof next === 'function' ? next(value) : next;
        stateHistory.push(value);
      }];
    },
    useRef(initial) {
      return { current: initial };
    },
    useEffect(effect) {
      const cleanup = effect?.();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
    createElement(type, props, ...children) {
      return {
        type,
        props: {
          ...(props || {}),
          children: children.length <= 1 ? children[0] ?? null : children,
        },
      };
    },
  };
  const StyleSheet = {
    absoluteFill: { position: 'absolute', inset: 0 },
    create: (styles) => styles,
    flatten(style) {
      if (!Array.isArray(style)) return style || undefined;
      return style.reduce((result, item) => Object.assign(result, StyleSheet.flatten(item) || {}), {});
    },
  };
  const module = { exports: {} };
  const sourcePath = path.join(ROOT, 'src/components/InteractiveSurface.tsx');
  const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require(id) {
      if (id === 'react') return { __esModule: true, default: React };
      if (id === 'react-native') {
        return { __esModule: true, Pressable: 'Pressable', View: 'View', StyleSheet };
      }
      throw new Error(`Unexpected import: ${id}`);
    },
    setTimeout(callback, delay) {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    console,
  }, { filename: sourcePath });
  return {
    InteractiveSurface: module.exports.InteractiveSurface,
    React,
    StyleSheet,
    stateHistory,
    runTimers() {
      for (const [id, timer] of [...timers]) {
        timers.delete(id);
        timer.callback();
      }
    },
    cleanup() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}

function eventAt(pageX = 100, pageY = 100) {
  return { nativeEvent: { pageX, pageY } };
}

function renderSurface(options = {}) {
  const harness = createHarness();
  const calls = { press: [], longPress: [], child: [] };
  const child = harness.React.createElement('View', { testID: 'background' },
    harness.React.createElement('Pressable', {
      testID: 'nested-button',
      onPress: (event) => calls.child.push(event),
    }),
  );
  const root = harness.InteractiveSurface({
    children: child,
    onPress: (event) => calls.press.push(event),
    onLongPress: (event) => calls.longPress.push(event),
    activeOpacity: 0.8,
    ...options,
  });
  return { ...harness, root, calls, child };
}

function contentNode(root) {
  const children = Array.isArray(root.props.children) ? root.props.children : [root.props.children];
  return children.find((node) => node?.type === 'View' && node !== root);
}

function directPressable(root) {
  const children = Array.isArray(root.props.children) ? root.props.children : [root.props.children];
  return children.find((node) => node?.type === 'Pressable');
}

// Ordinary background hit uses the existing absolute Pressable path exactly once.
{
  const surface = renderSurface();
  const event = eventAt();
  const pressable = directPressable(surface.root);
  pressable.props.onPressIn(event);
  pressable.props.onPressOut(event);
  pressable.props.onPress(event);
  assert.deepEqual(surface.calls.press, [event]);
  assert.deepEqual(surface.calls.longPress, []);
}

// The direct Pressable path lets native Pressability own long-press timing and
// still suppresses any unexpected normal press after native long press.
{
  const surface = renderSurface();
  const event = eventAt();
  const pressable = directPressable(surface.root);
  pressable.props.onPressIn(event);
  surface.runTimers();
  pressable.props.onLongPress(event);
  pressable.props.onPressOut(event);
  pressable.props.onPress(event);
  assert.deepEqual(surface.calls.longPress, [event]);
  assert.deepEqual(surface.calls.press, []);
}

// Native Pressability reports a cancelled drag-out through onPressOut and
// withholds onPress. Its internal press-rect/re-entry decision is native-only.
{
  const surface = renderSurface();
  const event = eventAt();
  const pressable = directPressable(surface.root);
  pressable.props.onPressIn(event);
  pressable.props.onPressOut(event);
  assert.deepEqual(surface.calls.longPress, []);
  assert.deepEqual(surface.calls.press, []);
}

// A long press is terminal for the normal card action.
{
  const surface = renderSurface();
  const event = eventAt();
  surface.root.props.onStartShouldSetResponder(event);
  surface.root.props.onResponderGrant(event);
  surface.runTimers();
  surface.root.props.onResponderRelease(event);
  assert.deepEqual(surface.calls.longPress, [event]);
  assert.deepEqual(surface.calls.press, []);
}

// A small move remains inside responder slop and still activates the card.
{
  const surface = renderSurface();
  const event = eventAt();
  surface.root.props.onResponderGrant(event);
  surface.root.props.onResponderMove(eventAt(107, 106));
  surface.root.props.onResponderRelease(event);
  assert.deepEqual(surface.calls.press, [event]);
  assert.deepEqual(surface.calls.longPress, []);
}

// Moving beyond slop cancels both feedback paths, including a pending long press.
{
  const surface = renderSurface();
  const event = eventAt();
  surface.root.props.onResponderGrant(event);
  surface.root.props.onResponderMove(eventAt(113, 100));
  surface.runTimers();
  surface.root.props.onResponderRelease(event);
  assert.deepEqual(surface.calls.press, []);
  assert.deepEqual(surface.calls.longPress, []);
  assert.equal(surface.stateHistory.at(-1), false);
}

// ScrollView termination is explicitly allowed and cannot turn into a card press.
{
  const surface = renderSurface();
  const event = eventAt();
  surface.root.props.onResponderGrant(event);
  assert.equal(surface.root.props.onResponderTerminationRequest(event), true);
  surface.root.props.onResponderTerminate(event);
  surface.runTimers();
  assert.deepEqual(surface.calls.press, []);
  assert.deepEqual(surface.calls.longPress, []);
  assert.equal(surface.stateHistory.at(-1), false);
}

// A nested button owns its event; it must not activate the card callback.
{
  const surface = renderSurface();
  assert.equal(contentNode(surface.root).props.pointerEvents, 'box-none');
  assert.deepEqual(directPressable(surface.root).props.style, { position: 'absolute', inset: 0 });
  const nested = contentNode(surface.root).props.children.props.children;
  const event = eventAt();
  nested.props.onPress(event);
  assert.deepEqual(surface.calls.child, [event]);
  assert.deepEqual(surface.calls.press, []);
}

// Only the child-arrangement subset of the outer style crosses the layout seam.
for (const direction of ['row', 'column']) {
  const surface = renderSurface({
    style: {
      flexDirection: direction,
      padding: 14,
      width: 320,
      height: 80,
      backgroundColor: '#123456',
      borderWidth: 2,
      transform: [{ scale: 0.98 }],
      testID: 'not-a-view-style',
    },
    testID: 'surface-test-id',
    accessibilityRole: 'button',
    accessibilityLabel: 'Card surface',
  });
  const content = contentNode(surface.root);
  const innerStyle = surface.StyleSheet.flatten(content.props.style);
  const outerStyle = surface.StyleSheet.flatten(surface.root.props.style);
  assert.equal(innerStyle.flexDirection, direction);
  assert.equal(innerStyle.padding, undefined);
  assert.equal(innerStyle.width, undefined);
  assert.equal(innerStyle.height, undefined);
  assert.equal(innerStyle.backgroundColor, undefined);
  assert.equal(innerStyle.borderWidth, undefined);
  assert.equal(innerStyle.transform, undefined);
  assert.equal(outerStyle.padding, 14);
  assert.equal(outerStyle.width, 320);
  assert.equal(outerStyle.height, 80);
  assert.equal(outerStyle.backgroundColor, '#123456');
  assert.equal(directPressable(surface.root).props.testID, 'surface-test-id');
  assert.equal(directPressable(surface.root).props.accessibilityRole, 'button');
  assert.equal(directPressable(surface.root).props.accessibilityLabel, 'Card surface');
}

console.log('PASS: InteractiveSurface responder, nested-control, and row/column contracts execute the production module');
