import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const repoRequire = createRequire(path.join(ROOT, 'package.json'));
const babel = repoRequire('@babel/core');

class TimerWheel {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.pending = new Map();
  }

  setTimeout(callback, delay) {
    const id = this.nextId++;
    this.pending.set(id, { callback, deadline: this.now + delay, order: id });
    return id;
  }

  clearTimeout(id) {
    this.pending.delete(id);
  }

  tick(milliseconds) {
    const deadline = this.now + milliseconds;
    this.now = deadline;
    let due = [...this.pending.values()].filter((timer) => timer.deadline <= deadline);
    while (due.length > 0) {
      due.sort((left, right) => left.deadline - right.deadline || left.order - right.order);
      const timer = due[0];
      this.pending.delete(timer.order);
      timer.callback();
      due = [...this.pending.values()].filter((item) => item.deadline <= deadline);
    }
  }
}

function loadPressability(wheel) {
  const source = fs.readFileSync(
    path.join(ROOT, 'node_modules/react-native/Libraries/Pressability/Pressability.js'),
    'utf8',
  );
  const flowSource = source
    .replace(/ as const\b/g, '')
    .replace(/ as void \| \(PointerEvent => void\)/g, '');
  const output = babel.transformSync(flowSource, {
    plugins: [
      repoRequire('@babel/plugin-transform-flow-strip-types'),
      repoRequire('@babel/plugin-transform-modules-commonjs'),
    ],
    babelrc: false,
    configFile: false,
    filename: 'Pressability.js',
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require(id) {
      if (id === '../../src/private/featureflags/ReactNativeFeatureFlags') {
        return { shouldPressibilityUseW3CPointerEventsForHover: () => false };
      }
      if (id === '../Components/Sound/SoundManager') return { playTouchSound() {}, stop() {} };
      if (id === '../ReactNative/UIManager') return { measure() {} };
      if (id === '../StyleSheet/Rect') return { normalizeRect: (rect) => rect };
      if (id === '../Utilities/Platform') {
        return { OS: 'android', select: (options) => options.android, Version: 34 };
      }
      if (id === './HoverState') return { isHoverEnabled: () => false };
      if (id === './PressabilityPerformanceEventEmitter.js') {
        return { __esModule: true, default: { emitEvent() {} } };
      }
      if (id === './PressabilityTypes.js') return {};
      if (id === 'invariant') {
        return (condition, message) => {
          if (!condition) throw new Error(`invariant failed: ${message}`);
        };
      }
      throw new Error(`Unexpected Pressability import: ${id}`);
    },
    console,
    process: { env: { NODE_ENV: 'production' } },
    setTimeout: (callback, delay) => wheel.setTimeout(callback, delay),
    clearTimeout: (id) => wheel.clearTimeout(id),
    Date,
    Math,
  }, { filename: 'Pressability.js' });
  return module.exports.default;
}

function loadInteractiveSurface(wheel) {
  const React = {
    useState(initial) {
      let value = typeof initial === 'function' ? initial() : initial;
      return [value, (next) => {
        value = typeof next === 'function' ? next(value) : next;
      }];
    },
    useRef(initial) {
      return { current: initial };
    },
    useEffect(effect) {
      effect?.();
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
    flatten(style) {
      if (style == null) return undefined;
      if (!Array.isArray(style)) return style;
      return Object.assign({}, ...style.filter(Boolean).map((item) => StyleSheet.flatten(item) ?? {}));
    },
    create: (styles) => styles,
  };
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
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require(id) {
      if (id === 'react') return { __esModule: true, default: React };
      if (id === 'react-native') return { Pressable: 'Pressable', View: 'View', StyleSheet };
      throw new Error(`Unexpected InteractiveSurface import: ${id}`);
    },
    setTimeout: (callback, delay) => wheel.setTimeout(callback, delay),
    clearTimeout: (id) => wheel.clearTimeout(id),
    console,
  }, { filename: sourcePath });
  return { InteractiveSurface: module.exports.InteractiveSurface, React };
}

function touchEvent(wheel, pageX, pageY) {
  return {
    persist() {},
    currentTarget: {
      measure(callback) {
        callback(0, 0, 300, 80, 10, 100);
      },
    },
    nativeEvent: {
      pageX,
      pageY,
      timestamp: wheel.now,
      touches: [{ pageX, pageY }],
      changedTouches: [{ pageX, pageY }],
    },
  };
}

function createDirectScenario(delayLongPress = 1000) {
  const wheel = new TimerWheel();
  const Pressability = loadPressability(wheel);
  const { InteractiveSurface, React } = loadInteractiveSurface(wheel);
  const calls = { press: [], longPress: [] };
  const root = InteractiveSurface({
    children: React.createElement('View', { testID: 'body' }, 'content'),
    onPress: (event) => calls.press.push(event),
    onLongPress: (event) => calls.longPress.push(event),
    delayLongPress,
  });
  const children = Array.isArray(root.props.children) ? root.props.children : [root.props.children];
  const pressable = children.find((child) => child?.type === 'Pressable');
  assert.ok(pressable, 'InteractiveSurface must render its direct Pressable hit target');
  const pressability = new Pressability({
    ...pressable.props,
    disabled: undefined,
    isPressable: true,
  });
  return { wheel, handlers: pressability.getEventHandlers(), calls };
}

function runCase(name, drive, expected) {
  const { wheel, handlers, calls } = createDirectScenario();
  drive(wheel, handlers);
  assert.deepEqual(
    { longPress: calls.longPress.length, press: calls.press.length },
    expected,
    name,
  );
}

runCase('stationary hold', (wheel, handlers) => {
  handlers.onStartShouldSetResponder();
  handlers.onResponderGrant(touchEvent(wheel, 50, 120));
  wheel.tick(1100);
  handlers.onResponderRelease(touchEvent(wheel, 50, 120));
}, { longPress: 1, press: 0 });

runCase('15px in-rect hold', (wheel, handlers) => {
  handlers.onStartShouldSetResponder();
  handlers.onResponderGrant(touchEvent(wheel, 50, 120));
  handlers.onResponderMove(touchEvent(wheel, 65, 120));
  wheel.tick(1100);
  handlers.onResponderRelease(touchEvent(wheel, 65, 120));
}, { longPress: 0, press: 1 });

runCase('quick tap with 15px in-rect drift', (wheel, handlers) => {
  handlers.onStartShouldSetResponder();
  handlers.onResponderGrant(touchEvent(wheel, 50, 120));
  handlers.onResponderMove(touchEvent(wheel, 65, 120));
  handlers.onResponderRelease(touchEvent(wheel, 65, 120));
}, { longPress: 0, press: 1 });

runCase('true outside-rect drag-out', (wheel, handlers) => {
  handlers.onStartShouldSetResponder();
  handlers.onResponderGrant(touchEvent(wheel, 50, 120));
  handlers.onResponderMove(touchEvent(wheel, 50, 400));
  wheel.tick(1100);
  handlers.onResponderRelease(touchEvent(wheel, 50, 400));
}, { longPress: 0, press: 0 });

runCase('quick tap', (wheel, handlers) => {
  handlers.onStartShouldSetResponder();
  handlers.onResponderGrant(touchEvent(wheel, 50, 120));
  wheel.tick(60);
  handlers.onResponderRelease(touchEvent(wheel, 50, 120));
}, { longPress: 0, press: 1 });

console.log('PASS: InteractiveSurface direct path matches installed RN Pressability baseline');
