# Home-Screen Widgets Architecture & Native Wiring Guide

> **Status:** Data Layer & Preview UI Implemented (`src/lib/widgets.ts`, `src/screens/WidgetPreviewScreen.tsx`).  
> **Platform Support:** iOS 14+ (WidgetKit) & Android 8+ (AppWidgetProvider / Jetpack Glance).  
> **Package Dependencies Added:** 0 (pure native blueprint; ready for EAS Build & Config Plugins).

---

## 1. Architectural Philosophy

Home-screen widgets in modern mobile operating systems (iOS WidgetKit and Android AppWidgetProvider) **never run the React Native JavaScript runtime**. They execute inside low-memory native extensions hosted by the OS SpringBoard/SystemUI process.

Therefore, the architectural pattern follows a **Decoupled Snapshot Model**:

```
┌────────────────────────────────────────────────────────┐
│               React Native Application                 │
│                                                        │
│  src/lib/prayerTimes.ts        src/lib/continuing.ts   │
│  src/lib/db.ts (salah entries) src/lib/hijri.ts        │
│                           │                            │
│                           ▼                            │
│                 src/lib/widgets.ts                     │
│         getWidgetBundle() -> JSON Snapshot             │
└───────────────────────────┬────────────────────────────┘
                            │ (On app background / state change)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Platform Shared Storage Layer                │
│                                                        │
│  iOS: NSUserDefaults(suiteName: "group.com.islamic.app")│
│  Android: Context.MODE_MULTI_PROCESS SharedPreferences │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐
│       iOS Extension       ││     Android Receiver      │
│  SwiftUI WidgetKit        ││  AppWidgetProvider /      │
│  TimelineProvider         ││  RemoteViews              │
└───────────────────────────┘└───────────────────────────┘
```

The app exports pure, zero-cost snapshot functions in `src/lib/widgets.ts`. The UI preview in `src/screens/WidgetPreviewScreen.tsx` provides high-fidelity previews with live 30-second ticking countdowns and design parity across iOS and Android.

---

## 2. The 4 Native Widgets Specification

| Widget | Default Size | Primary Data Source | Key Elements | Deep Link Target |
| :--- | :--- | :--- | :--- | :--- |
| **1. Next Prayer** | Medium (4×2) & Small (2×2) | `loadPrayerCache` + `getNextPrayer` | Large prayer time (Instrument Serif), uppercase name (`MAGHRIB`), live countdown (`in 42 min` / `Now`), progress bar | `salah://home` |
| **2. Prayer Progress** | Medium (4×2) | `getSalahEntries` + `getSalahHistory` | `TODAY` header, `3/5` completed count, 5 prayer rows (`Fajr`, `Dhuhr`, `Asr`, `Maghrib`, `Isha`) with `✓`/`○` indicators, streak counter | `salah://tracker` |
| **3. Quran Continue** | Small (2×2) & Medium (4×2) | `continuing.ts` (`quran-last-reading`) | Last read surah & ayah (`Al-Baqarah · 2:255`), Arabic title (`البَقَرَة`), `Continue →` CTA button | `salah://quran/{surah}/{ayah}` |
| **4. Hijri Calendar** | Small (2×2) | `hijri.ts` (tabular / API cache) | Big day number (Instrument Serif), Hijri month (`Rabi' al-Awwal`), year (`1448 AH`), Gregorian date | `salah://calendar` |

---

## 3. Data Contract (`WidgetBundle` JSON Schema)

When the app enters the background or updates a salah entry, it serializes this JSON payload to the shared store:

```json
{
  "nextPrayer": {
    "name": "MAGHRIB",
    "rawName": "Maghrib",
    "time": "6:14 PM",
    "rawTime": "18:14",
    "countdownMs": 2520000,
    "countdownText": "in 42 min",
    "isTomorrow": false,
    "hasData": true,
    "locationLabel": "Dubai, UAE",
    "progressFraction": 0.65
  },
  "prayerProgress": {
    "label": "TODAY",
    "dateIso": "2026-10-04",
    "completedCount": 3,
    "totalCount": 5,
    "prayers": [
      { "name": "Fajr", "completed": true, "symbol": "✓" },
      { "name": "Dhuhr", "completed": true, "symbol": "✓" },
      { "name": "Asr", "completed": true, "symbol": "✓" },
      { "name": "Maghrib", "completed": false, "symbol": "○" },
      { "name": "Isha", "completed": false, "symbol": "○" }
    ],
    "streak": 7,
    "allCompleted": false
  },
  "continueReading": {
    "surahNumber": 2,
    "ayahNumber": 255,
    "surahEnglishName": "Al-Baqarah",
    "surahArabicName": "البَقَرَة",
    "reference": "Al-Baqarah · 2:255",
    "actionText": "Continue →",
    "hasPosition": true,
    "savedAt": 1791100485000,
    "deepLink": "salah://quran/2/255"
  },
  "hijri": {
    "day": "4",
    "month": "Rabi' al-Awwal",
    "year": "1448 AH",
    "fullString": "4 Rabi' al-Awwal 1448 AH",
    "weekday": "Sunday",
    "gregorianDate": "4 October 2026"
  },
  "generatedAt": 1791100500000
}
```

---

## 4. iOS Native Implementation (SwiftUI & WidgetKit)

### 4.1 Entitlements & App Group
In `app.json` (or via an Expo Config Plugin):
```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.islamic.app"
        ]
      }
    }
  }
}
```

### 4.2 Shared Storage Bridge (Swift Native Module)
A simple Swift method writes and reads from the shared suite:
```swift
import Foundation
import WidgetKit

@objc(WidgetBridge)
class WidgetBridge: NSObject {
  let appGroupId = "group.com.islamic.app"
  let bundleKey = "IslamicWidgetBundleKey"

  @objc func updateWidgetData(_ jsonString: String, resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    if let userDefaults = UserDefaults(suiteName: appGroupId) {
      userDefaults.set(jsonString, forKey: bundleKey)
      userDefaults.synchronize()
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      resolver(true)
    } else {
      rejecter("ERR_APP_GROUP", "Failed to access App Group", nil)
    }
  }
}
```

### 4.3 SwiftUI TimelineProvider & Views
```swift
import WidgetKit
import SwiftUI

struct PrayerEntry: TimelineEntry {
  let date: Date
  let bundle: WidgetBundleData
}

struct PrayerTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> PrayerEntry {
    PrayerEntry(date: Date(), bundle: .mock)
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    let bundle = loadBundleFromAppGroup()
    completion(PrayerEntry(date: Date(), bundle: bundle))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let bundle = loadBundleFromAppGroup()
    let now = Date()
    // Schedule timeline reloads at upcoming prayer times
    let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
    let entry = PrayerEntry(date: now, bundle: bundle)
    let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
    completion(timeline)
  }

  private func loadBundleFromAppGroup() -> WidgetBundleData {
    guard let defaults = UserDefaults(suiteName: "group.com.islamic.app"),
          let raw = defaults.string(forKey: "IslamicWidgetBundleKey"),
          let data = raw.data(using: .utf8),
          let decoded = try? JSONDecoder().decode(WidgetBundleData.self, from: data) else {
      return .mock
    }
    return decoded
  }
}

// Next Prayer Widget View
struct NextPrayerWidgetView: View {
  var entry: PrayerEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("NEXT PRAYER")
          .font(.system(size: 10, weight: .bold))
          .foregroundColor(Color("AccentAmber"))
        Spacer()
        Text(entry.bundle.nextPrayer.locationLabel)
          .font(.system(size: 10))
          .foregroundColor(.secondary)
      }

      Text(entry.bundle.nextPrayer.name)
        .font(.system(size: 13, weight: .bold))
        .foregroundColor(Color("AccentAmber"))

      Text(entry.bundle.nextPrayer.time)
        .font(.custom("InstrumentSerif-Regular", size: 38))
        .foregroundColor(.primary)

      HStack {
        Text(entry.bundle.nextPrayer.countdownText)
          .font(.system(size: 11, weight: .semibold))
          .padding(.horizontal, 8)
          .padding(.vertical, 3)
          .background(Color("AccentAmberDim"))
          .cornerRadius(8)
        Spacer()
      }
    }
    .padding()
    .widgetURL(URL(string: "salah://home"))
  }
}
```

---

## 5. Android Native Implementation (AppWidgetProvider & RemoteViews)

### 5.1 AndroidManifest.xml Entry
```xml
<receiver
  android:name=".widgets.NextPrayerWidgetProvider"
  android:exported="true">
  <intent-filter>
    <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
  </intent-filter>
  <meta-data
    android:name="android.appwidget.provider"
    android:resource="@xml/widget_next_prayer_info" />
</receiver>
```

### 5.2 Widget Provider XML Configuration (`res/xml/widget_next_prayer_info.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:minWidth="250dp"
  android:minHeight="110dp"
  android:targetCellWidth="4"
  android:targetCellHeight="2"
  android:updatePeriodMillis="1800000"
  android:initialLayout="@layout/widget_next_prayer"
  android:resizeMode="horizontal|vertical"
  android:widgetCategory="home_screen" />
```

### 5.3 Kotlin AppWidgetProvider
```kotlin
package com.islamic.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.islamic.app.R
import org.json.JSONObject

class NextPrayerWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    val prefs = context.getSharedPreferences("IslamicWidgetSharedPrefs", Context.MODE_PRIVATE)
    val rawJson = prefs.getString("IslamicWidgetBundleKey", null) ?: return

    val bundle = JSONObject(rawJson)
    val nextPrayer = bundle.optJSONObject("nextPrayer") ?: return

    for (widgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.widget_next_prayer)
      views.setTextViewText(R.id.tv_prayer_name, nextPrayer.optString("name", "MAGHRIB"))
      views.setTextViewText(R.id.tv_prayer_time, nextPrayer.optString("time", "6:14 PM"))
      views.setTextViewText(R.id.tv_countdown, nextPrayer.optString("countdownText", "in 42 min"))

      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("salah://home"))
      val pendingIntent = PendingIntent.getActivity(
        context, 0, intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

      appWidgetManager.updateAppWidget(widgetId, views)
    }
  }
}
```

### 5.4 Bypassing Android's 30-Minute Update Clamp
Android limits widget updates to a minimum of 30 minutes via `updatePeriodMillis`.
For prayer time updates, schedule an exact alarm with `AlarmManager.setExactAndAllowWhileIdle()` at the moment of each prayer time (Fajr, Dhuhr, Asr, Maghrib, Isha) or use `WorkManager` with a short-interval PeriodicWorkRequest.

---

## 6. How the React Native App Triggers Snapshot Sync

In `App.tsx` or a background sync listener:

```typescript
import { AppState } from 'react-native';
import { getWidgetBundle } from './src/lib/widgets';

AppState.addEventListener('change', async (nextState) => {
  if (nextState === 'background' || nextState === 'inactive') {
    const bundle = await getWidgetBundle();
    // On native build with bridge:
    // NativeModules.WidgetBridge?.updateWidgetData(JSON.stringify(bundle));
  }
});
```

---

## 7. Verification & QA Matrix

1. **Pure Data Layer:**
   - Run `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` — 100% type-safe with zero warnings.
   - Fallback states verified: missing position defaults to `"Start reading"`, missing cache displays `"Open app to load times"`.
2. **Preview Screen UI:**
   - Navigable from **Settings -> Home Screen Widgets**.
   - Toggles between iOS (WidgetKit rounded cards with drop shadows) and Android (Material You rounded surfaces).
   - Live 30-second countdown updates without re-mounting.
   - Deep links trigger app navigation or helpful intent confirmation modal.
