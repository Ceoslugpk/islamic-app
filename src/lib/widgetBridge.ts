import { Platform, NativeModules } from 'react-native';
import { getWidgetBundle, WidgetBundle } from './widgets';
import { useSettings } from './settings';

/**
 * Real home-screen widget bridge.
 * - Android: writes the WidgetBundle snapshot to the native widget
 *   SharedPreferences + refreshes all widget instances.
 * - iOS: WidgetKit not yet implemented (placeholder — snapshot is
 *   persisted to AsyncStorage for a future App Group share).
 * - Web/unsupported: no-op (the preview screen still works).
 */

const NATIVE_MODULE = 'IslamicWidget';

function getNativeModule(): any {
  if (Platform.OS === 'android' && NativeModules[`${NATIVE_MODULE}Module`]) {
    return NativeModules[`${NATIVE_MODULE}Module`];
  }
  // expo-modules-core registers under the Name() — try the direct key too
  if (Platform.OS === 'android' && NativeModules[NATIVE_MODULE]) {
    return NativeModules[NATIVE_MODULE];
  }
  return null;
}

/** Write the current widget snapshot to the native widget store. */
export async function updateWidgetSnapshot(): Promise<void> {
  try {
    const bundle = await getWidgetBundle();
    const mod = getNativeModule();
    if (mod && typeof mod.updateWidget === 'function') {
      await mod.updateWidget(JSON.stringify(bundle));
    } else if (Platform.OS === 'ios') {
      // iOS WidgetKit placeholder — persist snapshot for future App Group share
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('widget-bundle-last', JSON.stringify(bundle));
    }
  } catch {
    // Widget updates must never break the app
  }
}

/** Convenience: build + push the snapshot using current settings. */
export function useWidgetSync() {
  const { settings } = useSettings();
  // The settings context gives us location/method; build a snapshot on demand.
  return async () => {
    try {
      const bundle: WidgetBundle = await getWidgetBundle({
        location:
          settings.locationMode === 'auto' && settings.autoLocation
            ? settings.autoLocation
            : settings.manualLocation,
        method: settings.methodId,
        timeFormat: settings.timeFormat,
      });
      const mod = getNativeModule();
      if (mod && typeof mod.updateWidget === 'function') {
        await mod.updateWidget(JSON.stringify(bundle));
      } else if (Platform.OS === 'ios') {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('widget-bundle-last', JSON.stringify(bundle));
      }
    } catch {
      // no-op
    }
  };
}
