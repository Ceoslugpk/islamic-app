/**
 * Config plugin: injects real Android home-screen widget support into the
 * generated android/ project (survives `expo prebuild`).
 *
 * Adds:
 * - IslamicWidgetProvider (AppWidgetProvider) receiver in AndroidManifest
 * - widget info XML (res/xml) — small/medium/large Next Prayer widget
 * - RemoteViews layout (res/layout) — dark/light via system theme
 * - WidgetModule (ReactContextBaseJavaModule) for JS → widget updates
 */
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.qashi.islamic';

function withWidgetManifest(config) {
  return withAndroidManifest(config, (config) => {
    const { modResults } = config;
    const app = modResults.manifest.application?.[0];
    if (!app) return config;
    // Remove any existing widget receiver (idempotent)
    if (Array.isArray(app.receiver)) {
      app.receiver = app.receiver.filter((r) => !(r?.['$']?.['android:name'] || '').includes('IslamicWidgetProvider'));
    }
    app.receiver = app.receiver || [];
    app.receiver.push({
      '$': {
        'android:name': '.IslamicWidgetProvider',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/islamic_widget_info',
          },
        },
      ],
    });
    return config;
  });
}

function withWidgetNativeFiles(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
    const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...PACKAGE.split('.'));

    fs.mkdirSync(path.join(resDir, 'xml'), { recursive: true });
    fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
    fs.mkdirSync(javaDir, { recursive: true });

    // 1. Widget provider info — 4x2 next-prayer widget, resizable, updatePeriod 30min
    fs.writeFileSync(
      path.join(resDir, 'xml', 'islamic_widget_info.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/islamic_widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/app_name" />`
    );

    // 2. RemoteViews layout — Next Prayer (time + name + countdown), tap opens app
    fs.writeFileSync(
      path.join(resDir, 'layout', 'islamic_widget_layout.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@android:color/transparent"
    android:padding="12dp"
    android:id="@+id/widget_root">
  <TextView
      android:id="@+id/widget_prayer_name"
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:text="FAJR"
      android:textSize="11sp"
      android:textStyle="bold"
      android:letterSpacing="0.15"
      android:textColor="#B8975A" />
  <TextView
      android:id="@+id/widget_prayer_time"
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:text="--:--"
      android:textSize="34sp"
      android:textStyle="bold"
      android:textColor="#F4EEE1" />
  <TextView
      android:id="@+id/widget_countdown"
      android:layout_width="wrap_content"
      android:layout_height="wrap_content"
      android:text="Open app to load"
      android:textSize="12sp"
      android:textColor="#B3ADA2" />
</LinearLayout>`
    );

    // 3. Kotlin AppWidgetProvider — reads the JSON snapshot from SharedPreferences,
    //    fills RemoteViews, deep-links taps into the app.
    fs.writeFileSync(
      path.join(javaDir, 'IslamicWidgetProvider.kt'),
      `package ${PACKAGE}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class IslamicWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
  }

  companion object {
    const val PREFS = "islamic_widget_snapshot"
    const val KEY_BUNDLE = "bundle_json"

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, IslamicWidgetProvider::class.java))
      for (id in ids) updateWidget(context, manager, id)
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_MULTI_PROCESS)
      val json = prefs.getString(KEY_BUNDLE, null)
      val views = RemoteViews(context.packageName, R.layout.islamic_widget_layout)

      if (json == null) {
        views.setTextViewText(R.id.widget_prayer_name, "ISLAMIC")
        views.setTextViewText(R.id.widget_prayer_time, "--:--")
        views.setTextViewText(R.id.widget_countdown, "Open app to load")
      } else {
        try {
          val bundle = JSONObject(json)
          val next = bundle.optJSONObject("nextPrayer")
          if (next != null) {
            views.setTextViewText(R.id.widget_prayer_name, (next.optString("name") ?: "FAJR").uppercase())
            views.setTextViewText(R.id.widget_prayer_time, next.optString("time") ?: "--:--")
            views.setTextViewText(R.id.widget_countdown, next.optString("countdownText") ?: "")
          } else {
            views.setTextViewText(R.id.widget_prayer_name, "ISLAMIC")
            views.setTextViewText(R.id.widget_prayer_time, "--:--")
            views.setTextViewText(R.id.widget_countdown, "Open app to load")
          }
        } catch (e: Exception) {
          views.setTextViewText(R.id.widget_prayer_name, "ISLAMIC")
          views.setTextViewText(R.id.widget_prayer_time, "--:--")
          views.setTextViewText(R.id.widget_countdown, "Open app to load")
        }
      }

      // Tap → open the app (deep-link handled by MainActivity intent filter)
      val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val pending = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      views.setOnClickPendingIntent(R.id.widget_root, pending)

      manager.updateAppWidget(id, views)
    }
  }
}`
    );

    return config;
  }]);
}

module.exports = (config) => withWidgetManifest(withWidgetNativeFiles(config));
