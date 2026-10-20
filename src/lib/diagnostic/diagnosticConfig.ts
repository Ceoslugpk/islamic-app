export const DIAGNOSTIC_VERSION = '1.1.94';
export const DIAGNOSTIC_VERSION_CODE = 113;

/**
 * The build identity is DERIVED from the version, never written twice.
 * The two-factor gate compares this constant against the value passed to the
 * build, so a version bump that forgets to update a hardcoded id would silently
 * switch diagnostics off in the field (it did, in v1.1.93's first build).
 */
export const DIAGNOSTIC_BUILD_ID = `RTL-STRUCT-${DIAGNOSTIC_VERSION}-EVIDENCE`;

/**
 * Source/test marker: Exact deterministic build command for building the signed v1.1.92 diagnostic APK.
 * The environment variables must be placed on the Gradle command itself so that
 * they propagate to the Metro bundler sub-process.
 */
export const DIAGNOSTIC_BUILD_COMMAND =
  `cd android && EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=${DIAGNOSTIC_BUILD_ID} ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4" ./gradlew assembleRelease --no-daemon`;

/**
 * Standard build command for an ordinary release (diagnostics completely disabled).
 */
export const ORDINARY_RELEASE_BUILD_COMMAND =
  'cd android && ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4" ./gradlew assembleRelease --no-daemon';

/**
 * Compile-time environment expression for Metro bundler inlining.
 * When built without EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 and DIAGNOSTIC_BUILD_ID,
 * this evaluates to false at bundle transform time.
 *
 * NOTE ON METRO BUNDLER BEHAVIOR:
 * React Native's Metro bundler is a static JavaScript bundler that does not perform
 * whole-module dead-code elimination across static import boundaries. Therefore,
 * code inside gated modules may still be present as byte code in the JS bundle.
 * We do NOT make false claims of byte-level exclusion. The strict acceptance contract
 * is that ZERO diagnostic UI, ZERO layout probes, ZERO test-only wrappers, and ZERO
 * diagnostic logic can ever render, attach, or execute when the two-factor gate is false.
 */
export const IS_DIAGNOSTIC_COMPILE_TIME: boolean =
  process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC === '1' &&
  (process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID === DIAGNOSTIC_BUILD_ID ||
    process.env.EXPO_PUBLIC_BUILD_IDENTITY === DIAGNOSTIC_BUILD_ID);

let diagnosticModeOverride: boolean | null = null;

/**
 * Allows test suites to explicitly enable/disable diagnostic mode without mutating environment variables.
 * Strictly ignored in production runtime builds to ensure two-factor gate integrity.
 */
export function setDiagnosticModeOverride(override: boolean | null): void {
  if (process.env.NODE_ENV !== 'production') {
    diagnosticModeOverride = override;
  }
}

/**
 * Extracts the explicit diagnostic build identity from runtime environment variables.
 */
export function getDiagnosticBuildIdentity(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID ||
    process.env.EXPO_PUBLIC_BUILD_IDENTITY ||
    undefined
  );
}

/**
 * Evaluates the two-factor gate:
 * 1. Opt-in environment flag must be exactly '1'
 * 2. Explicit diagnostic build identity must match the single source of truth DIAGNOSTIC_BUILD_ID
 *
 * Normal release builds MUST NOT expose diagnostics even if EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 leaks.
 */
export function evaluateDiagnosticGate(
  envFlag: string | undefined = process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC,
  buildIdentity: string | undefined = getDiagnosticBuildIdentity()
): boolean {
  const isEnvActive = envFlag === '1';
  const isIdentityActive = buildIdentity === DIAGNOSTIC_BUILD_ID;
  return isEnvActive && isIdentityActive;
}

/**
 * Returns true only if BOTH the diagnostic build identity and the opt-in env flag are active.
 */
export function isDiagnosticModeEnabled(): boolean {
  if (diagnosticModeOverride !== null && process.env.NODE_ENV !== 'production') {
    return diagnosticModeOverride;
  }
  return evaluateDiagnosticGate();
}
