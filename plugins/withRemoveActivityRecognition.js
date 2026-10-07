/**
 * Expo config plugin: remove android.permission.ACTIVITY_RECOGNITION from the
 * Android manifest at MERGE time. The permission is declared unconditionally
 * by expo-sensors' library manifest (Pedometer module) but the app only uses
 * Magnetometer (Qibla compass), which does not require it.
 *
 * Uses tools:node="remove" so the manifest merger strips the library-declared
 * permission even though it is not present in the app's source manifest.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const PERMISSION = 'android.permission.ACTIVITY_RECOGNITION';

module.exports = function withRemoveActivityRecognition(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'] || [];
    // 1. Drop any direct declaration (in case a future prebuild adds one).
    manifest.manifest['uses-permission'] = permissions.filter(
      (p) => !(p.$ && p.$.name === PERMISSION)
    );
    // 2. Add a merge-removal rule so the library-declared permission is
    //    stripped during manifest merging regardless of source.
    manifest.manifest['uses-permission'].push({
      $: {
        'android:name': PERMISSION,
        'tools:node': 'remove',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
    });
    return config;
  });
};
