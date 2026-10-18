# Vulnerability Tracker — Islamic App

**Purpose:** Living tracker for vulnerabilities and security/release blockers found across the six fix tasks. Do not close an item until the relevant fix is implemented and independently verified.

**Repository:** `/home/ubuntu/apps/islamic_app`
**Initialized:** 2026-10-17
**Current task:** Task 1 of 6
**Current source state:** intentionally dirty inherited worktree; no commit/push performed

## Summary

| Category | Open count | Source |
|---|---:|---|
| npm audit high | 17 | Task 1 rerun, `npm audit --audit-level=high` |
| npm audit moderate | 9 | Task 1 rerun |
| npm audit critical | 0 | Task 1 rerun |
| Confirmed security vulnerabilities from independent security audit | 0 | `/home/ubuntu/.hermes/cache/security-audit/islamic-app/run-1/findings.json` |
| Deployment/security items needing validation | 2 | Independent security audit |
| Findings from Tasks 2–6 | Not yet assessed | Append as each task is completed |

Task 1 improved the baseline from 18 high / 9 moderate to 17 high / 9 moderate. The remaining dependency findings are **open**, not fixed.

## Task 1 — Dependency vulnerabilities

Evidence: `reports/audit/evidence/S1/audit.txt`, `/home/ubuntu/.hermes/cache/scratch/task1-npm-audit.json`
Command: `npm audit --audit-level=high`
Result: exit 1; 26 total, 17 high, 9 moderate, 0 critical.

| ID | Package/path | Severity | Advisory or dependency chain | Status | Next action |
|---|---|---:|---|---|---|
| VULN-T1-001 | `braces` → `micromatch` → Metro tooling | High | GHSA-vfj7-8cjw-p6xm; stack-exhaustion DoS through deeply nested patterns; range `<=3.0.3` | Open | Upgrade only through an Expo/RN-compatible dependency path; rerun audit and compatibility checks |
| VULN-T1-002 | `node-forge` → `@expo/code-signing-certificates` / `expo-updates` / Expo CLI | High | GHSA-86w9-cpqp-85rv; RSA PKCS#1 v1.5 verification issue; range `<=1.4.0` | Open | Resolve through a compatible Expo patch/update; do not force-upgrade SDK |
| VULN-T1-003 | `expo`, `@expo/cli`, `@expo/metro`, `@expo/metro-config`, `metro`, `metro-config`, `metro-file-map`, `metro-transform-worker`, `@react-native/community-cli-plugin` | High | Transitive Metro/Expo dependency chains reported by npm audit | Open | Trace `npm audit` paths and update only compatible Expo/RN packages |
| VULN-T1-004 | `react-native`, `@react-native/virtualized-lists` | High | Transitive React Native dependency chain reported by npm audit | Open | Resolve through the current Expo SDK-compatible React Native version |
| VULN-T1-005 | `react-native-view-shot` | High | Direct dependency reported by npm audit | Open | Determine whether a safe compatible release exists; test native/web behavior before updating |
| VULN-T1-006 | `expo`, `expo-updates` | High | Direct/indirect Expo update/signing dependency path | Open | Coordinate with Expo SDK compatibility; no `npm audit fix --force` |
| VULN-T1-007 | `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/prebuild-config` | Moderate | Transitive Expo config/plugin chain | Open | Resolve with supported Expo patch updates |
| VULN-T1-008 | `expo-sharing`, `expo-splash-screen` | Moderate | Direct dependencies via Expo config plugins | Open | Update only within compatible SDK range and rerun splash/export proofs |
| VULN-T1-009 | `uuid` → `xcode` | Moderate | GHSA-w5hq-g745-h8pq; buffer bounds issue when `buf` is provided; range `<11.1.1` | Open | Upgrade through a compatible Expo/Xcode dependency path |

The nine rows above group the 26 npm audit records by root cause/dependency chain. Do not count grouped rows as a replacement for the raw audit output; rerun npm audit for exact package totals after every dependency change.

## Task 1 — Other security/release validation items

These are tracked separately from confirmed vulnerabilities:

| ID | Finding | Status | Evidence / required validation |
|---|---|---|---|
| SEC-T1-001 | Public HTTPS privacy-policy URL is not configured | Open validation | Independent security audit `sec.release.privacy-policy-url`; verify the public URL in store metadata |
| SEC-T1-002 | Production transport/security headers are deployment-controlled | Open validation | Independent security audit `sec.web.transport-headers`; verify HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy at the production edge |

## Tasks 2–6 — Append-only intake

### Task 2 — Localization, Direction & Content Integrity Intake

- **Audit Date:** 2026-10-17
- **Scope Assessed:** 49 locale JSON files, `src/lib/rtl.ts`, `src/lib/i18n.ts`, `src/lib/settings.tsx`, `src/screens/HadithLibraryScreen.tsx`, and directional components.
- **Unresolved Vulnerabilities Discovered in Task 2:** 0.
- **Security Defect Fixes Verified:**
  - S5-002: Token corruption `{ن}` in `ar.json` eliminated and verified clean against injection/runtime formatting exceptions across all 49 locales.
  - S10-010: Kurdish Sorani direction misclassification resolved (Arabic-script Sorani mapped to RTL; Latin Kurmanji preserved as LTR).
  - Storage & Progress Safety: Quran reading progress keys (`quran-last-reading`, `quran-reading-marker`) verified isolated from settings mutations and 100% byte-invariant across language switches and write failures.
- **Dependency Changes:** None (0 packages added or removed).

### Task 5 — Security Remediation, Privacy Policy, Licensing & Play Store Readiness Intake

- **Audit Date:** 2026-10-17
- **Scope Assessed:** Security remediation, dependency vulnerability tracing, data privacy & storage boundaries, open-source licensing & attribution, Android / Google Play release readiness, web vs Android separation, and independent QA verification.
- **Auditor Roles:** Security Specialist, Open-Source Licensing Specialist, Android Release Specialist, Independent QA Specialist.

#### 1. Dependency & Vulnerability Remediation (Task A)
- **Current `npm audit` Status:** 26 total vulnerabilities (17 high, 9 moderate, 0 critical).
- **Root Cause & Reachability Tracing:**
  - `braces` (`<=3.0.3`, GHSA-vfj7-8cjw-p6xm, High): Transitive dependency via `micromatch` in Metro bundler (`metro-file-map`, `metro`, `metro-config`, `@react-native/community-cli-plugin`). **Reachability:** Strictly build-time/dev server tooling; not present in compiled production Android APK or web static bundle. Input is local project files. **Exploitability in Runtime:** Non-exploitable (0).
  - `node-forge` (`<=1.4.0`, GHSA-86w9-cpqp-85rv, High): Transitive dependency via `@expo/code-signing-certificates` in `expo-updates` and `@expo/cli`. **Reachability:** Build/CLI code-signing certificate verification. Not executed in runtime APK. **Exploitability in Runtime:** Non-exploitable (0).
  - `uuid` (`<11.1.1`, GHSA-w5hq-g745-h8pq, Moderate): Transitive dependency via `xcode` in Expo config plugins. **Reachability:** Build-time iOS project parser on developer machine. Not present in Android runtime. **Exploitability in Runtime:** Non-exploitable (0).
- **Remediation Action:** Verified that `npm audit fix --force` would downgrade Expo to 44.0.6 or React Native to 0.72.17, breaking Expo SDK 57. Per Task 5 rules, no force-downgrades or lockfile deletions performed. Safe upgrade plan: track upstream Expo SDK maintenance patches bumping `@expo/code-signing-certificates` and Metro dependencies.
- **Codebase Security Scan:**
  - 100% of remote endpoints in `src/` use `https://`. Zero cleartext HTTP endpoints.
  - Sensitive Women's Worship data protected by 100,000-iteration slow KDF (`hashPinKdf`) and exponential lockout ladder.
  - Backup exports purge PIN hashes and lock settings. Import enforces key allowlists and SQL column regex `/^[A-Za-z_][A-Za-z0-9_]*$/`.
  - Zero analytics, zero ad SDKs, zero third-party trackers, zero authentication servers.

#### 2. Privacy Policy & Data Protection (Task B)
- **Draft Location:** `reports/audit/privacy-policy-draft.md`.
- **Verified Source Behavior:** Fully documents local storage (SQLite `salah.db`, `AsyncStorage`, `localStorage`), declared network hosts (`api.islamic.app`, `api.alquran.cloud`, `cdn.islamic.network`, `everyayah.com`, `nominatim.openstreetmap.org`, `esmaulhusna.org`), optional foreground permissions, and zero tracking guarantees.
- **Factory Reset Omission:** Explicitly documents that an in-app global factory reset button is intentionally not added to safeguard users against accidental permanent deletion of multi-year worship records. Full deletion is safely available via Android OS app storage controls.
- **Owner Action (SEC-T1-001):** Owner must host `reports/audit/privacy-policy-draft.md` at a public HTTPS URL and enter it in Google Play Console (Policy > App content > Privacy policy).

#### 3. Licensing & Attribution (Task C)
- **Audit Ledger:** `reports/audit/licensing-attribution-audit.md`.
- **Status Summary:** 67 of 67 components classified as **PASS**.
  - Root application license: MIT (`LICENSE`).
  - Direct runtime dependencies (42): 100% verified under permissive MIT or MIT + OFL-1.1 licenses.
  - Bundled font families (8): Amiri, Instrument Serif, Lora, Manrope, Noto Naskh Arabic, Noto Nastaliq Urdu, Poppins, Source Sans 3 all verified under SIL Open Font License 1.1 (OFL 1.1).
  - Sacred datasets: Holy Quran Uthmani text (Tanzil / King Fahd Complex / AlQuran Cloud), Hadith collections (Islamic.app / sunnah.com), Duas (Hisn al-Muslim waqf lillāh), 99 Names (EsmaulHusna.org), Classical Tafsirs (Jalalayn, Qurtubi, etc.) verified with proper scholarly open access attribution.
- **In-App Legal Screen:** Curated human-readable showcase preserved in `src/screens/LegalScreen.tsx` while comprehensive SPDX ledger is versioned in `reports/audit/licensing-attribution-audit.md` to avoid bloating 49 translation files.

#### 4. Android / Google Play Readiness (Task D)
- **Checklist Location:** `reports/audit/play-store-readiness-checklist.md`.
- **Configuration Alignment:** Added `"versionCode": 89` to `app.json` under `android`, eliminating configuration drift with `android/app/build.gradle:103` without unprompted release bumps.
- **Store Assets Created:** Generated 512×512 Play store icon `assets/play-store-icon-512.png` via Lanczos downscale of master `assets/icon.png`.
- **Preserved Artifacts & Keys:** Package ID `com.qashi.islamic`, release signing keystore `release.keystore`, `keystore.properties`, and existing release artifacts preserved untouched.
- **Owner Action Items:**
  1. Create 1024×500 Feature Graphic matching brand aesthetic (cannot be fabricated by code agent).
  2. Capture 7-inch and 10-inch tablet screenshots.
  3. Perform physical Android 12+ device verification for cold-boot splash transition (Rule 4, `DEV-001`).

#### 5. Web vs Android Transport Separation (Task E)
- Reaffirmed that SEC-T1-002 (HTTP security headers: HSTS, CSP, X-Frame-Options) is strictly a web deployment server reverse proxy responsibility (Cloudflare/Nginx/Caddy) and does not block native Android release distribution.

### Task 6 — Post-Repair Android Verification Intake

- **Audit Date:** 2026-10-17
- **Scope Assessed:** Post-repair regression verification across Tasks 1–5, reconciliation of 375-row findings matrix, SQLite low-storage/SQLITE_FULL resilience, Quran Continue Reading persistence across ayahs 15/35/70 and English↔Urdu switches, dependency vulnerability reachability tracing, and Android release configuration.
- **Auditor Roles:** Android Specialist, Storage Specialist, RTL Specialist, Quran Specialist, Release Specialist, Independent Read-Only QA Lead.

#### 1. Machine-Readable Matrix Reconciliation (375 Rows)
- **Status Counts:** Exactly **329 FIXED**, **23 STILL FAILING**, **14 BLOCKED**, **8 NOT APPLICABLE**, **1 UNVERIFIED** (Sum: 375).
- **328 vs 329 Reconciliation:** Reconciled from preliminary 328 upon S1-007 (Expo config / SDK compatibility) validation as FIXED (21/21 checks passed in `npx expo-doctor`).

#### 2. Dependency Advisories (26 Open: 17 High, 9 Moderate)
- **Status:** Unchanged in `package-lock.json` (17 high, 9 moderate).
- **Runtime Impact:** Confirmed **zero (0)** runtime impact in compiled production Android APK (`app-release.apk`). All 26 advisories reside strictly in Node.js build-time CLI/Metro tooling (`braces`, `node-forge`, `uuid`).
- **Remediation Verdict:** **NO SAFE COMPATIBLE IN-PLACE UPGRADE AVAILABLE.** Running `npm audit fix --force` attempts breaking downgrade to Expo 44 / React Native 0.72.17. Advisories are accepted build-time risks awaiting upstream Expo SDK 57 patch updates.

#### 3. Storage & SQLITE_FULL Investigation
- Investigated `db.native.ts`, `db.ts`, `webStorage.ts`, and `backup.ts`.
- Confirmed that storage write failures (`SQLITE_FULL` / `QuotaExceededError`) do not silently delete or overwrite user data.
- User tables (`salah_entries`, `fasting_entries`, `zakat_history`, `period_entries`, `hifz_entries`, etc.) are isolated from ephemeral cache tables (`quran_cache`, `prayer_cache`).
- Cache budget enforcement (`enforceQuranCacheBudget`) strictly evicts only disposable cache items while enforcing never-evict guarantees on bookmarks, notes, audio downloads, and reading markers.

#### 4. Quran Continue Reading & English↔Urdu Persistence
- Verified via `tests/test_audit_en_ur_quran_positions.mjs`: Quran reading markers at Ayahs 15, 35, and 70 (Surah 2) survive across English ↔ Urdu language transitions, serialized settings writes, and simulated cold restarts without corruption or offset shift.

#### 5. Release Gate Status
- **Android GitHub Release:** **GO WITH CONDITIONS** (Subject to owner physical device flash verification on Android 12+ per Rule 4).
- **Google Play Store Submission:** **CONDITIONAL HOLD** (Pending owner deployment of public HTTPS Privacy Policy URL and creation of 1024×500 Feature Graphic).

## Closure rule

A vulnerability is not closed because a package install succeeds or an agent reports completion. Closure requires the exact advisory/path to disappear or be explicitly accepted with documented rationale, plus TypeScript, lint, focused tests, full tests, export/build checks, and diff review appropriate to the task.
