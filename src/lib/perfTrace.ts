/**
 * Development-only Performance Trace & Instrumentation
 *
 * Measures:
 * - Touch event received
 * - Navigation state updated
 * - Destination commit / first meaningful content
 * - JS event-loop stalls (> 50ms)
 * - Render counts and duration for shared/screen components
 *
 * Completely disabled/no-op in production unless EXPO_PUBLIC_PERF_TRACE='true'.
 */

export interface InteractionSpan {
  id: string;
  name: string;
  touchTime: number;
  navStateTime?: number;
  commitTime?: number;
  durationMs?: number;
  lagEvents: number;
  maxLagMs: number;
}

export interface ComponentRenderMetric {
  component: string;
  mounts: number;
  updates: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastDurationMs: number;
}

export const IS_PERF_TRACE_ENABLED =
  typeof __DEV__ !== 'undefined'
    ? __DEV__
    : process.env.NODE_ENV !== 'production' ||
      process.env.EXPO_PUBLIC_PERF_TRACE === 'true';

class PerformanceTracer {
  private activeSpan: InteractionSpan | null = null;
  private spans: InteractionSpan[] = [];
  private renderMetrics: Map<string, ComponentRenderMetric> = new Map();
  private isMonitoringLoop = false;
  private lastLoopTick = 0;
  private loopStallCount = 0;
  private maxLoopStallMs = 0;

  constructor() {
    if (IS_PERF_TRACE_ENABLED) {
      this.startLoopMonitor();
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).__PERF_TRACE__ = this;
      }
    }
  }

  public recordTouch(interactionName: string): string {
    if (!IS_PERF_TRACE_ENABLED) return '';
    const now = performance.now();
    const id = `${interactionName}-${Date.now()}`;
    this.activeSpan = {
      id,
      name: interactionName,
      touchTime: now,
      lagEvents: 0,
      maxLagMs: 0,
    };
    this.log(`[Touch] ${interactionName} received at ${now.toFixed(1)}ms`);
    return id;
  }

  public recordNavState(stateDescription: string): void {
    if (!IS_PERF_TRACE_ENABLED || !this.activeSpan) return;
    const now = performance.now();
    this.activeSpan.navStateTime = now;
    const delta = now - this.activeSpan.touchTime;
    this.log(`[NavState] ${stateDescription} (delta: ${delta.toFixed(1)}ms)`);
  }

  public recordCommit(screenOrComponent: string): void {
    if (!IS_PERF_TRACE_ENABLED || !this.activeSpan) return;
    const now = performance.now();
    this.activeSpan.commitTime = now;
    this.activeSpan.durationMs = now - this.activeSpan.touchTime;
    const span = { ...this.activeSpan };
    this.spans.push(span);
    this.log(
      `[Commit] ${screenOrComponent} complete for ${span.name}: total=${(span.durationMs ?? 0).toFixed(1)}ms (touch->nav: ${
        span.navStateTime ? (span.navStateTime - span.touchTime).toFixed(1) : 'N/A'
      }ms, nav->commit: ${
        span.navStateTime ? (now - span.navStateTime).toFixed(1) : 'N/A'
      }ms, loopStalls=${span.lagEvents})`
    );
    this.activeSpan = null;
  }

  public recordRender(
    componentName: string,
    phase: 'mount' | 'update',
    durationMs: number
  ): void {
    if (!IS_PERF_TRACE_ENABLED) return;
    let metric = this.renderMetrics.get(componentName);
    if (!metric) {
      metric = {
        component: componentName,
        mounts: 0,
        updates: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        lastDurationMs: 0,
      };
      this.renderMetrics.set(componentName, metric);
    }

    if (phase === 'mount') metric.mounts += 1;
    else metric.updates += 1;

    metric.totalDurationMs += durationMs;
    metric.lastDurationMs = durationMs;
    if (durationMs > metric.maxDurationMs) {
      metric.maxDurationMs = durationMs;
    }
  }

  public getSummary(): {
    spans: InteractionSpan[];
    renderMetrics: ComponentRenderMetric[];
    eventLoop: { stallCount: number; maxStallMs: number };
  } {
    return {
      spans: [...this.spans],
      renderMetrics: Array.from(this.renderMetrics.values()),
      eventLoop: {
        stallCount: this.loopStallCount,
        maxStallMs: this.maxLoopStallMs,
      },
    };
  }

  public clear(): void {
    this.spans = [];
    this.renderMetrics.clear();
    this.loopStallCount = 0;
    this.maxLoopStallMs = 0;
  }

  private startLoopMonitor(): void {
    if (this.isMonitoringLoop) return;
    this.isMonitoringLoop = true;
    this.lastLoopTick = performance.now();

    const check = () => {
      const now = performance.now();
      const elapsed = now - this.lastLoopTick;
      const stall = elapsed - 16.67; // expected 60fps frame delta

      if (stall > 50) {
        this.loopStallCount += 1;
        if (stall > this.maxLoopStallMs) {
          this.maxLoopStallMs = stall;
        }
        if (this.activeSpan) {
          this.activeSpan.lagEvents += 1;
          if (stall > this.activeSpan.maxLagMs) {
            this.activeSpan.maxLagMs = stall;
          }
        }
        this.log(`[EventLoopStall] JS thread blocked for ${stall.toFixed(1)}ms`);
      }

      this.lastLoopTick = now;
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(check);
      } else {
        setTimeout(check, 16);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(check);
    } else {
      setTimeout(check, 16);
    }
  }

  private log(msg: string): void {
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[IslamicPerf] ${msg}`);
    }
  }
}

export const perfTrace = new PerformanceTracer();
