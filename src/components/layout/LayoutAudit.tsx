import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  HEADER_BOTTOM,
  NAV_HEIGHT,
  NAV_BOTTOM,
} from './layout.constants';

export const IS_LAYOUT_AUDIT_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.EXPO_PUBLIC_LAYOUT_AUDIT === 'true' ||
    process.env.ENABLE_LAYOUT_AUDIT === 'true');

export interface AuditRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  bottom: number;
}

export interface TabAuditRecord {
  tab: string;
  viewportWidth: number;
  viewportHeight: number;
  header: AuditRect | null;
  row: AuditRect | null;
  logo: AuditRect | null;
  wordmark: AuditRect | null;
  bell: AuditRect | null;
  gear: AuditRect | null;
  nav: AuditRect | null;
  columns: Record<string, AuditRect | null>;
  activePill: AuditRect | null;
  activeLabel: AuditRect | null;
  scrim: AuditRect | null;
  firstContentTop?: number;
  lastContentBottom?: number;
}

export interface AssertionResult {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface LayoutAuditSummary {
  width: number;
  height: number;
  records: Record<string, TabAuditRecord>;
  assertions: AssertionResult[];
  allPassed: boolean;
  tableText: string;
}

function getElementRect(testID: string): AuditRect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-testid="${testID}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x * 10) / 10,
    y: Math.round(r.y * 10) / 10,
    width: Math.round(r.width * 10) / 10,
    height: Math.round(r.height * 10) / 10,
    top: Math.round(r.top * 10) / 10,
    bottom: Math.round(r.bottom * 10) / 10,
  };
}

export function computeAuditAssertions(
  records: Record<string, TabAuditRecord>,
  viewportWidth: number,
  viewportHeight: number
): { assertions: AssertionResult[]; allPassed: boolean; tableText: string } {
  const tabs = ['home', 'quran', 'library', 'tools'];
  const presentTabs = tabs.filter((t) => records[t]);
  const assertions: AssertionResult[] = [];

  const checkMaxDiff = (
    name: string,
    getter: (r: TabAuditRecord) => number | undefined,
    tolerance = 0.5
  ) => {
    const values = presentTabs
      .map((t) => ({ tab: t, val: getter(records[t]) }))
      .filter((v): v is { tab: string; val: number } => typeof v.val === 'number');

    if (values.length < 2) {
      assertions.push({
        name,
        expected: `<= ${tolerance}dp diff across tabs`,
        actual: `Insufficient tab records (${values.length})`,
        passed: false,
      });
      return;
    }

    const min = Math.min(...values.map((v) => v.val));
    const max = Math.max(...values.map((v) => v.val));
    const diff = Math.round((max - min) * 10) / 10;
    const passed = diff <= tolerance;

    assertions.push({
      name,
      expected: `<= ${tolerance}dp diff`,
      actual: `diff=${diff}dp (min=${min}, max=${max})`,
      passed,
    });
  };

  // 1. Shared Frame Identity Assertions (diff <= 0.5dp across all 4 hubs)
  checkMaxDiff('Header height identity', (r) => r.header?.height);
  checkMaxDiff('Header top identity', (r) => r.header?.top);
  checkMaxDiff('Header row top identity', (r) => r.row?.top);
  checkMaxDiff('Header row height identity', (r) => r.row?.height);
  checkMaxDiff('Logo width identity', (r) => r.logo?.width);
  checkMaxDiff('Logo height identity', (r) => r.logo?.height);
  checkMaxDiff('Bell button width identity', (r) => r.bell?.width);
  checkMaxDiff('Bell button height identity', (r) => r.bell?.height);
  checkMaxDiff('Gear button width identity', (r) => r.gear?.width);
  checkMaxDiff('Gear button height identity', (r) => r.gear?.height);
  checkMaxDiff('Floating nav width identity', (r) => r.nav?.width);
  checkMaxDiff('Floating nav height identity', (r) => r.nav?.height);
  checkMaxDiff('Floating nav top identity', (r) => r.nav?.top);
  checkMaxDiff('Floating nav bottom identity', (r) => r.nav?.bottom);
  if (presentTabs.some((t) => records[t].scrim)) {
    checkMaxDiff('Scrim height identity', (r) => r.scrim?.height);
  }

  // 2. Active pill & label responsive assertions
  for (const t of presentTabs) {
    const pill = records[t].activePill;
    const label = records[t].activeLabel;
    const nav = records[t].nav;
    const col = records[t].columns[t];
    if (pill) {
      const heightPassed = Math.abs(pill.height - 36) <= 0.5;
      assertions.push({
        name: `Active pill height (${t})`,
        expected: '36dp (±0.5dp)',
        actual: `${pill.height}dp`,
        passed: heightPassed,
      });

      if (nav) {
        const pillCenterY = pill.top + pill.height / 2;
        const navCenterY = nav.top + nav.height / 2;
        const centerDiffY = Math.abs(pillCenterY - navCenterY);
        const centerPassedY = centerDiffY <= 1.0;
        assertions.push({
          name: `Active pill vertical centering (${t})`,
          expected: 'centered inside dock (±1dp)',
          actual: `offset=${Math.round(centerDiffY * 10) / 10}dp`,
          passed: centerPassedY,
        });
      }

      if (col) {
        const pillCenterX = pill.x + pill.width / 2;
        const colCenterX = col.x + col.width / 2;
        const centerDiffX = Math.abs(pillCenterX - colCenterX);
        const centerPassedX = centerDiffX <= 1.5;
        assertions.push({
          name: `Active pill horizontal centering in column (${t})`,
          expected: 'centered in column (±1.5dp)',
          actual: `offset=${Math.round(centerDiffX * 10) / 10}dp`,
          passed: centerPassedX,
        });

        const pillFitPassed = pill.width <= col.width - 2;
        assertions.push({
          name: `Active pill fits inside column width (${t})`,
          expected: `<= ${col.width - 2}dp`,
          actual: `pill=${pill.width}dp, col=${col.width}dp`,
          passed: pillFitPassed,
        });
      }

      if (label) {
        const labelFits = label.width <= pill.width - 16;
        assertions.push({
          name: `Active label fits inside pill without clipping (${t})`,
          expected: `<= ${pill.width - 16}dp (pill minus icon/pad)`,
          actual: `label=${label.width}dp, pill=${pill.width}dp`,
          passed: labelFits,
        });
      }
    }
  }

  // 3. First content starts at or after HEADER_BOTTOM
  for (const t of presentTabs) {
    const firstTop = records[t].firstContentTop;
    const headerBottom = HEADER_BOTTOM(0);
    if (typeof firstTop === 'number') {
      const passed = firstTop >= headerBottom - 1;
      assertions.push({
        name: `First content starts at/after HEADER_BOTTOM (${t})`,
        expected: `>= ${headerBottom}dp`,
        actual: `${firstTop}dp`,
        passed,
      });
    }
  }

  // 4. Nav bottom clears screen
  const expectedNavBottom = viewportHeight - NAV_BOTTOM(0);
  const sampleNav = records[presentTabs[0]]?.nav;
  if (sampleNav) {
    const navPassed = Math.abs(sampleNav.bottom - (viewportHeight - 14)) <= 1;
    assertions.push({
      name: 'Nav bottom position',
      expected: `${viewportHeight - 14}dp`,
      actual: `${sampleNav.bottom}dp`,
      passed: navPassed,
    });
  }

  const allPassed = assertions.every((a) => a.passed);

  // Build comparative markdown table
  let tableText = `\n### Layout Audit Comparative Matrix (${viewportWidth}x${viewportHeight})\n\n`;
  tableText += `| Element / Metric | Property | Home | Quran | Library | Tools | Status |\n`;
  tableText += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;

  const rows: [string, string, (r: TabAuditRecord) => any][] = [
    ['AppHeader', 'top / height', (r) => (r.header ? `${r.header.top} / ${r.header.height}` : '—')],
    ['Header Row', 'top / height', (r) => (r.row ? `${r.row.top} / ${r.row.height}` : '—')],
    ['Brand Logo', 'w × h', (r) => (r.logo ? `${r.logo.width} × ${r.logo.height}` : '—')],
    ['Wordmark', 'height', (r) => (r.wordmark ? `${r.wordmark.height}` : '—')],
    ['Bell Action', 'w × h', (r) => (r.bell ? `${r.bell.width} × ${r.bell.height}` : '—')],
    ['Gear Action', 'w × h', (r) => (r.gear ? `${r.gear.width} × ${r.gear.height}` : '—')],
    ['Floating Nav', 'top / bottom', (r) => (r.nav ? `${r.nav.top} / ${r.nav.bottom}` : '—')],
    ['Floating Nav', 'width × height', (r) => (r.nav ? `${r.nav.width} × ${r.nav.height}` : '—')],
    ['Active Pill', 'width × height', (r) => (r.activePill ? `${r.activePill.width} × ${r.activePill.height}` : '—')],
    ['Active Label', 'width × height', (r) => (r.activeLabel ? `${r.activeLabel.width} × ${r.activeLabel.height}` : '—')],
    ['Scrim', 'height', (r) => (r.scrim ? `${r.scrim.height}` : '—')],
    ['First Content Top', 'top', (r) => (typeof r.firstContentTop === 'number' ? `${r.firstContentTop}` : '—')],
  ];

  for (const [elem, prop, getter] of rows) {
    const homeVal = records.home ? getter(records.home) : '—';
    const quranVal = records.quran ? getter(records.quran) : '—';
    const libVal = records.library ? getter(records.library) : '—';
    const toolsVal = records.tools ? getter(records.tools) : '—';

    // Verify consistency
    const vals = [homeVal, quranVal, libVal, toolsVal].filter((v) => v !== '—');
    const isUniform = vals.length > 0 && vals.every((v) => v === vals[0]);
    const status = isUniform ? 'PASS' : 'WARN';

    tableText += `| ${elem} | ${prop} | ${homeVal} | ${quranVal} | ${libVal} | ${toolsVal} | ${status} |\n`;
  }

  tableText += `\n**Overall Identity & Geometry Status**: ${allPassed ? 'ALL ASSERTIONS PASSED (<=0.5dp identity)' : 'FAILURES DETECTED'}\n\n`;

  return { assertions, allPassed, tableText };
}

/**
 * Dev-only hook to measure and record tab chrome layout geometry.
 * Completely no-op in production and when env flag is not set.
 */
export function useLayoutAudit(activeTab: string) {
  useEffect(() => {
    if (!IS_LAYOUT_AUDIT_ENABLED) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!activeTab) return;

      // Find first visible content element inside active scroller
      const visible = (e: Element) => {
        const r = e.getBoundingClientRect();
        const s = window.getComputedStyle(e);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      };

      const scroller = [...document.querySelectorAll('*')].find(
        (e) =>
          visible(e) &&
          ['auto', 'scroll'].includes(window.getComputedStyle(e).overflowY) &&
          e.clientHeight > 200
      );

      let firstContentTop: number | undefined;
      let lastContentBottom: number | undefined;

      if (scroller) {
        const contentContainer = scroller.firstElementChild;
        if (contentContainer) {
          const children = [...contentContainer.children].filter(visible);
          if (children.length > 0) {
            const contentChildren = children.filter(
              (el) =>
                el.getAttribute('data-testid') !== 'app-header-container' &&
                !el.querySelector('[data-testid="app-header-container"]')
            );
            if (contentChildren.length > 0) {
              firstContentTop = Math.round(contentChildren[0].getBoundingClientRect().top * 10) / 10;
            } else {
              firstContentTop = Math.round(children[0].getBoundingClientRect().top * 10) / 10;
            }
            const lastChild = children[children.length - 1];
            lastContentBottom = Math.round(lastChild.getBoundingClientRect().bottom * 10) / 10;
          }
        }
      }

      const columns: Record<string, AuditRect | null> = {
        home: getElementRect('floating-nav-tab-home'),
        quran: getElementRect('floating-nav-tab-quran'),
        library: getElementRect('floating-nav-tab-library'),
        tools: getElementRect('floating-nav-tab-tools'),
      };

      const record: TabAuditRecord = {
        tab: activeTab,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        header: getElementRect('app-header-container'),
        row: getElementRect('app-header-row'),
        logo: getElementRect('app-header-logo'),
        wordmark: getElementRect('app-header-wordmark'),
        bell: getElementRect('app-header-bell'),
        gear: getElementRect('app-header-gear'),
        nav: getElementRect('floating-nav-container'),
        columns,
        activePill: getElementRect('floating-nav-active-pill'),
        activeLabel: getElementRect('floating-nav-active-label'),
        scrim: getElementRect('floating-nav-scrim'),
        firstContentTop,
        lastContentBottom,
      };

      const win = window as any;
      win.__LAYOUT_AUDIT__ = win.__LAYOUT_AUDIT__ || {};
      win.__LAYOUT_AUDIT__[activeTab] = record;

      win.__RUN_LAYOUT_AUDIT_REPORT__ = () => {
        return computeAuditAssertions(win.__LAYOUT_AUDIT__, window.innerWidth, window.innerHeight);
      };

      // Check if all 4 tabs are recorded
      const recorded = Object.keys(win.__LAYOUT_AUDIT__);
      if (['home', 'quran', 'library', 'tools'].every((t) => recorded.includes(t))) {
        const report = computeAuditAssertions(win.__LAYOUT_AUDIT__, window.innerWidth, window.innerHeight);
        win.__LAYOUT_AUDIT_REPORT__ = report;
        if (console && console.log) {
          console.log('[LayoutAudit] Completed cross-tab audit:\n' + report.tableText);
        }
      }
    }
  }, [activeTab]);
}
