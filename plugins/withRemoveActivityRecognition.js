/**
 * Expo config plugin: remove unwanted Android permissions from the merged
 * manifest at MERGE time:
 *   - android.permission.ACTIVITY_RECOGNITION  (declared by expo-sensors'
 *     Pedometer module; app only uses Magnetometer for Qibla — not required)
 *   - android.permission.RECORD_AUDIO           (re-added by expo-audio's
 *     library manifest; the app never records audio — it only plays)
 *   - android.permission.SYSTEM_ALERT_WINDOW    (overlay permission; Play
 *     restricts device availability when present — the app never draws
 *     overlays)
 *
 * Uses tools:node="remove" so the manifest merger strips the library-declared
 * permissions even though they are not present in the app's source manifest.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const PERMISSIONS = [
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
];

module.exports = function withRemoveUnusedPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'] || [];
    // 1. Drop direct declarations while preserving existing merge-removal
    //    rules. Keeping the rules makes this mod safe to apply repeatedly.
    manifest.manifest['uses-permission'] = permissions.filter(
      (p) => !(p.$ && PERMISSIONS.includes(p.$.name) && p.$['tools:node'] !== 'remove')
    );
    // 2. Add any missing merge-removal rules so library-declared permissions
    //    are stripped during manifest merging regardless of source.
    for (const perm of PERMISSIONS) {
      const hasRemovalRule = manifest.manifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === perm && p.$['tools:node'] === 'remove'
      );
      if (hasRemovalRule) continue;

      manifest.manifest['uses-permission'].push({
        $: {
          'android:name': perm,
          'tools:node': 'remove',
          'xmlns:tools': 'http://schemas.android.com/tools',
        },
      });
    }
    return config;
  });
};
