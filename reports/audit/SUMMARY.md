# Islamic App — Pre-Release Audit Summary

**Audit mode:** read-only, `FIX_MODE=false`
**Target:** `http://15.235.203.134:9998`
**Repository:** `/home/ubuntu/apps/islamic_app`
**Baseline commit:** not supplied
**Audit date:** 2026-10-17

## Verdict: NO-GO

The app is not ready for release. The decision is forced by multiple independently verified critical/high findings, including missing public privacy-policy URL, critical accessibility violations, failed release gates, broken after-Isha prayer rollover, missing translation keys, and runtime route coverage blocked by a recurring location modal/API failure.

This is a pre-release audit result, not a claim that every feature is broken. Passing checks and blocked/manual checks are separated below.

## Scorecard

Scores are conservative, evidence-derived category scores from the 12 reports and independent high/critical verification. They are not a substitute for the detailed rows.

| Category | Weight | Score | Main evidence |
|---|---:|---:|---|
| Functionality | 20% | 45 | After-Isha rollover returns `null`; streak/summary checks fail or are blocked; runtime route crawl blocked |
| Content integrity | 10% | 80 | Quran/Hijri/core datasets largely pass; Kurdish direction mapping fails; Names scale requirement fails |
| Design conformance | 15% | 30 | 51 route rows blocked; palette/geometry contract conflicts; clipping and forbidden-color findings |
| Navigation and state | 10% | 35 | Location modal recurs; deep-link/refresh path blocked; route state is in-memory |
| i18n/RTL | 10% | 55 | 159 missing `t()` keys; 34 Urdu route failures; token mismatch and RTL/font gaps |
| Accessibility | 10% | 25 | Critical ARIA violations, missing radio state, target-size failures, contrast failures |
| Performance and stability | 10% | 35 | Fast-3G FCP ~30.5s; ~6.29MB JS bundle; interval leak and unhandled notification errors |
| Offline/data | 5% | 50 | Native/offline claims partly pass; web PWA has no service worker/cache and offline reload fails |
| Privacy/security | 5% | 75 | Security audit found no confirmed vulnerability; transport headers/privacy URL require deployment validation |
| Release readiness | 5% | 20 | Missing public privacy URL, feature graphic, build verification, and minification gate |
| **Weighted overall** | **100%** | **44.5** | **NO-GO** |

The release rules independently require NO-GO for any critical/blocker, any high finding in functionality/content/privacy/release, design below 90, or overall below 90. Multiple conditions are met.

## Ten most important problems

1. **Critical — public privacy-policy URL is missing.** `S11-019`; Google Play release metadata has no reachable public HTTPS privacy-policy URL.
2. **Critical — FloatingNav tabs lack a `tablist` parent.** `S6-001`; deterministic axe violation on the main navigation.
3. **Critical — Settings radios lack `aria-checked` and the modal backdrop uses prohibited labeling.** `S6-005`; deterministic across three reruns.
4. **High — after-Isha next-prayer rollover returns `null`.** `S3-prayer-next-rollover-after-isha`; expected tomorrow's Fajr.
5. **High — 159 production `t()` keys are absent from `en.json`.** `S5-003`; missing-key fallback can ship English/raw-key content.
6. **High — runtime route coverage is blocked by a recurring location setup modal and prayer API/CORS failure.** `S4-001`, `S8-035`, `S8-036`; 51 of 52 routes were not unobscured runtime-crawled.
7. **High — Fast-3G cold load/FCP fails the 2.5s budget.** `S7-001`; approximately 30.5s in all three runs.
8. **High — JavaScript bundle is monolithic and approximately 6.29MB raw.** `S7-003`; performance budget failure.
9. **High — release/dependency gates fail.** `S1-006`, `S1-007`, `S1-022`; npm audit reports 18 high vulnerabilities, Expo compatibility/configuration checks fail, and the release gate is not clear.
10. **High — required Names scale is not present.** `S3` verified only 99 bundled records, not the required 14,000+ dataset; search/filter/favorites acceptance is therefore incomplete.

## Coverage

Inventory found:

- 52 source route states
- 90 navigation aliases
- 56 feature rows
- 9 sheets/dialogs/modals
- 14 inventoried assets
- 20 external hosts

The 12 audit reports contain **375 test/check rows**. Their individual report files are `S1.json` through `S12.json`.

Runtime coverage was incomplete:

- Source routes found: 52
- Runtime routes unobscured and captured: 1
- Runtime routes blocked/missing: 51
- Runtime blocker: recurring location setup modal plus unavailable prayer-times API/CORS behavior
- Baseline visual comparison: BLOCKED because no `BASELINE_COMMIT` was supplied
- Android/native/device checks: BLOCKED/manual because no build/device was supplied

The unvisited routes are not treated as passing. They remain listed in S2, S4, S5, S6, S8, and S12 with explicit BLOCKED rows.

## Confirmed findings by area

### Code health and dependencies

- `npm audit`: 18 high and 9 moderate vulnerabilities; repeated three times.
- Expo doctor/configuration: splash schema issue, missing/peer mismatch around `expo-asset`, and seven SDK patch mismatches.
- Locale structural parity: `kk.json` misses 39 keys.
- Color/guardrail scan: `AnimatedSplash.tsx:32` contains a hardcoded `#E6BE6C`; raw `Text`/literal findings remain.
- License screen does not enumerate all direct dependencies.
- Three screen files are unreachable candidates: BackupRestore, Legal, Notifications.

### Functionality and data

- `getNextPrayer()` returns `null` after Isha instead of tomorrow's Fajr.
- Required Names scale is not met: 99 bundled records rather than 14,000+.
- Salah/fasting streak and Weekly Summary equality checks failed or remained blocked.
- Qibla, Zakat, Hijri conversion, and several core dataset checks passed; see S3 for exact evidence.

### i18n and RTL

- 159 code-invoked translation keys are absent from `en.json`.
- Arabic interpolation token mismatch: `{ن}` versus required `{n}`.
- Urdu route checks show leftover English on many routes.
- 44 files use physical left/right properties where logical RTL properties were expected.
- Urdu/Hindi/Malayalam/Sinhala font coverage is incomplete.
- Several modal/dialog strings remain hardcoded English.

### Accessibility and design

- FloatingNav has critical ARIA structure/state defects.
- Settings radio controls omit required `aria-checked`.
- 25 dark and 26 light route samples have muted-text contrast below 4.5:1.
- More than 340 interactive targets measure below 44×44px.
- Search inputs/textareas lack accessible labels on 15 routes.
- Compact header/pill clipping remains at 130% scale.
- Route-level design proof is mostly blocked; S2's requested 12dp contract conflicts with the current repository's 24dp spacing contract. The current 24dp contract is recorded, but it does not satisfy the separate S2 12dp request.

### Performance, offline, and release

- Fast-3G FCP is approximately 30.5s in all three runs.
- Monolithic JS bundle is approximately 6.29MB raw, 1.366MB gzip, 0.888MB Brotli.
- Home interval is not cleared after leaving the tab.
- Monkey runs observe notification scheduling errors/unhandled rejection.
- Web build has no service worker or CacheStorage entries; offline reload fails.
- No public HTTPS privacy-policy URL.
- 1024×500 Play Store feature graphic is missing.
- Release minification/resource shrinking is not enabled by explicit configuration.
- Native release artifact and device verification were not available.

## Security audit result

The independent Agy security-audit workflow completed with **0 confirmed security vulnerabilities**. It produced two `needs_validation` deployment items:

1. Confirm a public HTTPS privacy-policy URL in the store listing.
2. Confirm production edge headers such as HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.

Those results do not override the separate release-readiness and accessibility failures above.

## Required fixes before re-audit

1. Add and verify the public HTTPS privacy-policy URL.
2. Fix FloatingNav ARIA structure and active-state semantics.
3. Add `aria-checked` to radio controls and correct modal backdrop semantics.
4. Fix after-Isha rollover to tomorrow's Fajr and add a production-path regression test.
5. Restore translation-key parity and remove missing `t()` calls/fallback content.
6. Resolve the recurring location modal and prayer API/CORS failure, then rerun the full route crawl.
7. Reduce bundle/FCP through code splitting, lazy loading, and asset/data loading review.
8. Resolve high dependency and Expo compatibility findings.
9. Decide and document the authoritative header-gap contract, then rerun the complete geometry matrix.
10. Close Names dataset/search/favorites requirements or revise the acceptance requirement explicitly.
11. Provide the Android release artifact and perform device/native checks.
12. Add the missing Play Store feature graphic and verify store metadata.

No source fixes were applied during this audit.

## Manual/device checks still required

- Android launch and splash-flash behavior, including Android 12+ system splash.
- Native RTL direction after reload for every registered language.
- Notifications at scheduled times and cancellation/rescheduling.
- Haptics, compass sensor, GPS accuracy, and permission flows.
- Background audio and lock-screen/media controls.
- System share sheet, file picker, backup/restore on device.
- Full-screen player, live broadcast/DRM behavior, and network recovery.
- Play Store listing/privacy-policy accessibility and review of Data Safety declarations.

## Reproduction artifacts

- Inventory: `reports/audit/inventory.json`
- Individual reports: `reports/audit/S1.json` … `reports/audit/S12.json`
- Evidence: `reports/audit/evidence/`
- Independent high/critical verification: `/home/ubuntu/.hermes/cache/security-audit/islamic-app/verifier/`
- Independent security audit: `/home/ubuntu/.hermes/cache/security-audit/islamic-app/run-1/`

The final status is **NO-GO** until the critical/high findings and blocked coverage are resolved and the complete audit is rerun.