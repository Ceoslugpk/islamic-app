/**
 * Config plugin: injects 5 real Android home-screen widgets + deep linking
 * into the generated android/ project (survives `expo prebuild`).
 *
 * 5 Widgets:
 * 1. Prayer Times (Compact small card & Medium 5-prayer schedule)
 * 2. Quran (Daily ayah + Arabic + translation, tap -> exact verse)
 * 3. Continue Reading (Last saved reading position, tap -> exact verse)
 * 4. Qibla (Bearing & distance to Kaaba with status)
 * 5. Dua / Adhkar (Configurable remembrance with Arabic & translation)
 * + IslamicWidgetProvider (legacy backwards-compatibility alias)
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.qashi.islamic';

const WIDGET_RECEIVERS = [
  { name: '.PrayerWidgetProvider', xml: '@xml/widget_prayer_info' },
  { name: '.QuranWidgetProvider', xml: '@xml/widget_quran_info' },
  { name: '.ContinueReadingWidgetProvider', xml: '@xml/widget_continue_info' },
  { name: '.QiblaWidgetProvider', xml: '@xml/widget_qibla_info' },
  { name: '.DuaWidgetProvider', xml: '@xml/widget_dua_info' },
  { name: '.IslamicWidgetProvider', xml: '@xml/islamic_widget_info' },
];

function withWidgetManifest(config) {
  return withAndroidManifest(config, (config) => {
    const { modResults } = config;
    const app = modResults.manifest.application?.[0];
    if (!app) return config;

    const namesToRemove = new Set(WIDGET_RECEIVERS.map((r) => r.name));

    // Remove any existing widget receivers (idempotent)
    if (Array.isArray(app.receiver)) {
      app.receiver = app.receiver.filter((r) => {
        const name = r?.['$']?.['android:name'] || '';
        return !namesToRemove.has(name) && !name.includes('WidgetProvider');
      });
    } else {
      app.receiver = [];
    }

    // Add all 6 receivers with android:exported="true"
    for (const item of WIDGET_RECEIVERS) {
      app.receiver.push({
        $: {
          'android:name': item.name,
          'android:exported': 'true',
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
              'android:resource': item.xml,
            },
          },
        ],
      });
    }

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
    fs.mkdirSync(path.join(resDir, 'layout-night'), { recursive: true });
    fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
    fs.mkdirSync(path.join(resDir, 'values'), { recursive: true });
    fs.mkdirSync(path.join(resDir, 'values-night'), { recursive: true });
    fs.mkdirSync(path.join(resDir, 'raw'), { recursive: true });
    fs.mkdirSync(javaDir, { recursive: true });

    // 0. Proguard keep rule so R8 keeps all widget providers + companion classes
    const proguardPath = path.join(projectRoot, 'android', 'app', 'proguard-rules.pro');
    try {
      let pg = fs.readFileSync(proguardPath, 'utf8');
      if (!pg.includes('PrayerWidgetProvider')) {
        pg += `\n# Islamic home-screen widgets — keep providers + companion classes (R8)\n-keep class ${PACKAGE}.*WidgetProvider { *; }\n-keep class ${PACKAGE}.*WidgetProvider$Companion { *; }\n-keep class ${PACKAGE}.IslamicWidget* { *; }\n-keep class ${PACKAGE}.WidgetUtils { *; }\n`;
        fs.writeFileSync(proguardPath, pg);
      }
    } catch {}

    // 0b. Disable AGP manifest minification in gradle.properties
    const gradlePropsPath = path.join(projectRoot, 'android', 'gradle.properties');
    try {
      let gp = fs.readFileSync(gradlePropsPath, 'utf8');
      if (!gp.includes('enableManifestMinification=false')) {
        gp = gp.replace(/\s*$/, '\n') + '\n# Keep widget receivers in the release manifest (R8 strips them otherwise).\nandroid.enableManifestMinification=false\n';
        fs.writeFileSync(gradlePropsPath, gp);
      }
    } catch {}

    // 0c. Resource keep rules to prevent shrinkResources from removing widget XML / drawables
    fs.writeFileSync(
      path.join(resDir, 'raw', 'keep.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:keep="@layout/widget_*,@layout/islamic_widget_layout,@xml/widget_*,@xml/islamic_widget_info,@drawable/widget_*,@color/widget_*" />`
    );

    // 1. Color resources (Light & Dark)
    const updateColorsXml = (filePath, tokens) => {
      let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '<resources>\n</resources>';
      for (const [key, val] of Object.entries(tokens)) {
        if (!content.includes(`name="${key}"`)) {
          content = content.replace('</resources>', `  <color name="${key}">${val}</color>\n</resources>`);
        }
      }
      fs.writeFileSync(filePath, content);
    };

    updateColorsXml(path.join(resDir, 'values', 'colors.xml'), {
      widget_bg: '#F8FAF9',
      widget_surface: '#FFFFFF',
      widget_border: '#E3E8E5',
      widget_text_primary: '#0E1214',
      widget_text_secondary: '#57503F',
      widget_text_muted: '#8C8474',
      widget_accent_amber: '#C26E17',
      widget_accent_green: '#0F5A4A',
      widget_badge_bg: '#FDF4EB',
      widget_badge_stroke: '#F5D5B8',
      widget_active_row_bg: '#EAEFEA',
    });

    updateColorsXml(path.join(resDir, 'values-night', 'colors.xml'), {
      widget_bg: '#0E1214',
      widget_surface: '#161B1E',
      widget_border: '#232B30',
      widget_text_primary: '#F4EEE1',
      widget_text_secondary: '#B3ADA2',
      widget_text_muted: '#756F64',
      widget_accent_amber: '#E8924C',
      widget_accent_green: '#157A64',
      widget_badge_bg: '#2A1E14',
      widget_badge_stroke: '#4D341F',
      widget_active_row_bg: '#17231E',
    });

    // 2. Drawables (Opaque background with ~18dp rounded corners + badges)
    fs.writeFileSync(
      path.join(resDir, 'drawable', 'widget_background.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/widget_bg" />
    <corners android:radius="18dp" />
    <stroke android:width="1dp" android:color="@color/widget_border" />
</shape>`
    );

    fs.writeFileSync(
      path.join(resDir, 'drawable', 'widget_badge_accent.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/widget_badge_bg" />
    <corners android:radius="6dp" />
    <stroke android:width="1dp" android:color="@color/widget_badge_stroke" />
</shape>`
    );

    fs.writeFileSync(
      path.join(resDir, 'drawable', 'widget_active_row.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/widget_active_row_bg" />
    <corners android:radius="6dp" />
    <stroke android:width="1dp" android:color="@color/widget_badge_stroke" />
</shape>`
    );

    // 3. Provider info XMLs (Sensible min/max resize limits)
    const writeInfoXml = (fileName, minWidth, minHeight, targetW, targetH, minResizeW, minResizeH, maxResizeW, maxResizeH, initialLayout, desc) => {
      fs.writeFileSync(
        path.join(resDir, 'xml', fileName),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${minWidth}"
    android:minHeight="${minHeight}"
    android:targetCellWidth="${targetW}"
    android:targetCellHeight="${targetH}"
    android:minResizeWidth="${minResizeW}"
    android:minResizeHeight="${minResizeH}"
    android:maxResizeWidth="${maxResizeW}"
    android:maxResizeHeight="${maxResizeH}"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/${initialLayout}"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="${desc}" />`
      );
    };

    writeInfoXml('widget_prayer_info.xml', '150dp', '90dp', '3', '2', '140dp', '80dp', '420dp', '180dp', 'widget_prayer_small', '@string/app_name');
    writeInfoXml('widget_quran_info.xml', '240dp', '90dp', '4', '2', '220dp', '80dp', '420dp', '180dp', 'widget_quran', '@string/app_name');
    writeInfoXml('widget_continue_info.xml', '150dp', '90dp', '3', '2', '140dp', '80dp', '320dp', '180dp', 'widget_continue', '@string/app_name');
    writeInfoXml('widget_qibla_info.xml', '150dp', '90dp', '2', '2', '140dp', '80dp', '320dp', '180dp', 'widget_qibla', '@string/app_name');
    writeInfoXml('widget_dua_info.xml', '240dp', '90dp', '4', '2', '220dp', '80dp', '420dp', '180dp', 'widget_dua', '@string/app_name');
    writeInfoXml('islamic_widget_info.xml', '150dp', '90dp', '3', '2', '140dp', '80dp', '420dp', '180dp', 'widget_prayer_small', '@string/app_name');

    // 4. RemoteViews Layouts (Compact glanceable redesign)
    const layoutPrayerSmall = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        <TextView
            android:id="@+id/widget_brand"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="ISLAMIC"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.15"
            android:textColor="@color/widget_accent_green" />
        <TextView
            android:id="@+id/widget_location"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Dubai"
            android:textSize="10sp"
            android:singleLine="true"
            android:ellipsize="end"
            android:textColor="@color/widget_text_secondary" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_prayer_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:text="NEXT PRAYER · FAJR"
        android:textSize="10sp"
        android:textStyle="bold"
        android:letterSpacing="0.1"
        android:textColor="@color/widget_accent_amber" />

    <TextView
        android:id="@+id/widget_prayer_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="05:12 AM"
        android:textSize="26sp"
        android:textStyle="bold"
        android:fontFamily="serif"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_primary" />

    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:background="@drawable/widget_badge_accent"
        android:paddingLeft="8dp"
        android:paddingRight="8dp"
        android:paddingTop="2dp"
        android:paddingBottom="2dp"
        android:gravity="center_vertical">
        <TextView
            android:id="@+id/widget_countdown"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="in 42 min"
            android:textSize="10sp"
            android:textStyle="bold"
            android:textColor="@color/widget_accent_amber" />
    </LinearLayout>
</LinearLayout>`;

    const layoutPrayerMedium = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        <TextView
            android:id="@+id/widget_brand"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="ISLAMIC"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.15"
            android:textColor="@color/widget_accent_green" />
        <TextView
            android:id="@+id/widget_location"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Dubai, UAE"
            android:textSize="10sp"
            android:singleLine="true"
            android:ellipsize="end"
            android:textColor="@color/widget_text_secondary" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layout_marginTop="4dp">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">
            <TextView
                android:id="@+id/widget_prayer_name"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="NEXT PRAYER · ASR"
                android:textSize="10sp"
                android:textStyle="bold"
                android:letterSpacing="0.1"
                android:textColor="@color/widget_accent_amber" />
            <TextView
                android:id="@+id/widget_prayer_time"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="3:30 PM"
                android:textSize="22sp"
                android:textStyle="bold"
                android:fontFamily="serif"
                android:includeFontPadding="false"
                android:textColor="@color/widget_text_primary" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_badge_accent"
            android:paddingLeft="8dp"
            android:paddingRight="8dp"
            android:paddingTop="3dp"
            android:paddingBottom="3dp">
            <TextView
                android:id="@+id/widget_countdown"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="in 42 min"
                android:textSize="10sp"
                android:textStyle="bold"
                android:textColor="@color/widget_accent_amber" />
        </LinearLayout>
    </LinearLayout>

    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginTop="6dp"
        android:layout_marginBottom="6dp"
        android:background="@color/widget_border" />

    <LinearLayout
        android:id="@+id/prayer_schedule_row"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:baselineAligned="false">

        <LinearLayout
            android:id="@+id/col_fajr"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:paddingTop="3dp"
            android:paddingBottom="3dp">
            <TextView
                android:id="@+id/name_fajr"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Fajr"
                android:textSize="9sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_secondary" />
            <TextView
                android:id="@+id/time_fajr"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:text="05:12"
                android:textSize="10sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_primary" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/col_dhuhr"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:paddingTop="3dp"
            android:paddingBottom="3dp">
            <TextView
                android:id="@+id/name_dhuhr"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Dhuhr"
                android:textSize="9sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_secondary" />
            <TextView
                android:id="@+id/time_dhuhr"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:text="12:15"
                android:textSize="10sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_primary" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/col_asr"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:paddingTop="3dp"
            android:paddingBottom="3dp">
            <TextView
                android:id="@+id/name_asr"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Asr"
                android:textSize="9sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_secondary" />
            <TextView
                android:id="@+id/time_asr"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:text="15:30"
                android:textSize="10sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_primary" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/col_maghrib"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:paddingTop="3dp"
            android:paddingBottom="3dp">
            <TextView
                android:id="@+id/name_maghrib"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Maghrib"
                android:textSize="9sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_secondary" />
            <TextView
                android:id="@+id/time_maghrib"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:text="18:05"
                android:textSize="10sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_primary" />
        </LinearLayout>

        <LinearLayout
            android:id="@+id/col_isha"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center"
            android:paddingTop="3dp"
            android:paddingBottom="3dp">
            <TextView
                android:id="@+id/name_isha"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Isha"
                android:textSize="9sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_secondary" />
            <TextView
                android:id="@+id/time_isha"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="1dp"
                android:text="19:25"
                android:textSize="10sp"
                android:textStyle="bold"
                android:textColor="@color/widget_text_primary" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>`;

    const layoutQuran = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="QURAN · VERSE OF THE DAY"
            android:textSize="9sp"
            android:textStyle="bold"
            android:letterSpacing="0.12"
            android:textColor="@color/widget_accent_green" />
        <TextView
            android:id="@+id/widget_quran_ref"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Al-Baqarah 2:255"
            android:textSize="10sp"
            android:textStyle="bold"
            android:textColor="@color/widget_text_secondary" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_quran_arabic"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="5dp"
        android:text="اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ"
        android:textSize="14sp"
        android:maxLines="2"
        android:ellipsize="end"
        android:textDirection="rtl"
        android:gravity="end"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_primary" />

    <TextView
        android:id="@+id/widget_quran_trans"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="3dp"
        android:text="Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence."
        android:textSize="11sp"
        android:maxLines="1"
        android:ellipsize="end"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_secondary" />

    <TextView
        android:id="@+id/widget_quran_cta"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="5dp"
        android:text="Read Ayah →"
        android:textSize="10sp"
        android:textStyle="bold"
        android:textColor="@color/widget_accent_amber" />
</LinearLayout>`;

    const layoutContinue = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="CONTINUE READING"
            android:textSize="9sp"
            android:textStyle="bold"
            android:letterSpacing="0.12"
            android:textColor="@color/widget_accent_green" />
        <TextView
            android:id="@+id/widget_continue_arabic_name"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="البَقَرَة"
            android:textSize="12sp"
            android:textStyle="bold"
            android:textDirection="rtl"
            android:textColor="@color/widget_text_secondary" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_continue_surah"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Al-Baqarah"
        android:textSize="18sp"
        android:textStyle="bold"
        android:fontFamily="serif"
        android:singleLine="true"
        android:ellipsize="end"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_primary" />

    <TextView
        android:id="@+id/widget_continue_reference"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="Surah 2 · Ayah 255"
        android:textSize="11sp"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_secondary" />

    <TextView
        android:id="@+id/widget_continue_cta"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:text="Resume Reading →"
        android:textSize="10sp"
        android:textStyle="bold"
        android:textColor="@color/widget_accent_amber" />
</LinearLayout>`;

    const layoutQibla = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="QIBLA DIRECTION"
        android:textSize="9sp"
        android:textStyle="bold"
        android:letterSpacing="0.12"
        android:textColor="@color/widget_accent_green" />

    <TextView
        android:id="@+id/widget_qibla_bearing"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="258° WSW"
        android:textSize="22sp"
        android:textStyle="bold"
        android:fontFamily="serif"
        android:includeFontPadding="false"
        android:textColor="@color/widget_accent_amber" />

    <TextView
        android:id="@+id/widget_qibla_distance"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="1,640 km to Makkah"
        android:textSize="11sp"
        android:textStyle="bold"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_primary" />

    <TextView
        android:id="@+id/widget_qibla_status"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="5dp"
        android:text="Dubai, UAE · Tap to align compass →"
        android:textSize="10sp"
        android:singleLine="true"
        android:ellipsize="end"
        android:textColor="@color/widget_text_secondary" />
</LinearLayout>`;

    const layoutDua = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:gravity="center_vertical">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="DUA &amp; REMEMBRANCE"
            android:textSize="9sp"
            android:textStyle="bold"
            android:letterSpacing="0.12"
            android:textColor="@color/widget_accent_green" />
        <TextView
            android:id="@+id/widget_dua_category"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_badge_accent"
            android:paddingLeft="6dp"
            android:paddingRight="6dp"
            android:paddingTop="2dp"
            android:paddingBottom="2dp"
            android:text="Morning"
            android:textSize="9sp"
            android:textStyle="bold"
            android:textColor="@color/widget_accent_amber" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_dua_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Morning Remembrance"
        android:textSize="12sp"
        android:textStyle="bold"
        android:singleLine="true"
        android:ellipsize="end"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_primary" />

    <TextView
        android:id="@+id/widget_dua_arabic"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="3dp"
        android:text="أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ"
        android:textSize="13sp"
        android:maxLines="1"
        android:ellipsize="end"
        android:textDirection="rtl"
        android:gravity="end"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_primary" />

    <TextView
        android:id="@+id/widget_dua_trans"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="We have entered a new morning and unto Allah belongs all sovereignty..."
        android:textSize="11sp"
        android:maxLines="1"
        android:ellipsize="end"
        android:includeFontPadding="false"
        android:textColor="@color/widget_text_secondary" />

    <TextView
        android:id="@+id/widget_dua_ref"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Sahih Muslim 2723 · Tap to view →"
        android:textSize="10sp"
        android:textColor="@color/widget_text_muted" />
</LinearLayout>`;

    const layouts = {
      'widget_prayer_small.xml': layoutPrayerSmall,
      'widget_prayer_medium.xml': layoutPrayerMedium,
      'widget_quran.xml': layoutQuran,
      'widget_continue.xml': layoutContinue,
      'widget_qibla.xml': layoutQibla,
      'widget_dua.xml': layoutDua,
      'islamic_widget_layout.xml': layoutPrayerSmall,
    };

    for (const [name, content] of Object.entries(layouts)) {
      fs.writeFileSync(path.join(resDir, 'layout', name), content);
      fs.writeFileSync(path.join(resDir, 'layout-night', name), content);
    }

    // 5. Kotlin Sources
    fs.writeFileSync(
      path.join(javaDir, 'WidgetUtils.kt'),
      `package ${PACKAGE}

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import org.json.JSONObject
import java.io.File

object WidgetUtils {
    const val PREFS = "islamic_widget_snapshot"
    const val KEY_BUNDLE = "bundle_json"
    const val FILE_SNAPSHOT = "widget_snapshot.json"

    fun getBundle(context: Context): JSONObject? {
        // 1. SharedPreferences lookup
        try {
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_BUNDLE, null)
            if (!json.isNullOrEmpty()) {
                return JSONObject(json)
            }
        } catch (e: Exception) {}

        // 2. Direct plain file fallback
        try {
            val file = File(context.filesDir, FILE_SNAPSHOT)
            if (file.exists()) {
                val content = file.readText()
                if (content.isNotEmpty()) {
                    return JSONObject(content)
                }
            }
        } catch (e: Exception) {}

        return null
    }

    fun createDeepLinkPendingIntent(context: Context, deepLinkUri: String, requestCode: Int): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUri)).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'IslamicWidgetPackage.kt'),
      `package ${PACKAGE}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class IslamicWidgetPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(IslamicWidgetModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'IslamicWidgetModule.kt'),
      `package ${PACKAGE}

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class IslamicWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "IslamicWidget"

  @ReactMethod
  fun updateWidget(bundleJson: String) {
    val context = reactApplicationContext

    // 1. SharedPreferences with commit() for immediate disk write
    try {
      val prefs: SharedPreferences =
        context.getSharedPreferences(WidgetUtils.PREFS, Context.MODE_PRIVATE)
      prefs.edit().putString(WidgetUtils.KEY_BUNDLE, bundleJson).commit()
    } catch (e: Exception) {}

    // 2. Direct file write in filesDir for robust process independence
    try {
      val file = File(context.filesDir, WidgetUtils.FILE_SNAPSHOT)
      file.writeText(bundleJson)
    } catch (e: Exception) {}

    // 3. Update all providers
    PrayerWidgetProvider.updateAll(context)
    QuranWidgetProvider.updateAll(context)
    ContinueReadingWidgetProvider.updateAll(context)
    QiblaWidgetProvider.updateAll(context)
    DuaWidgetProvider.updateAll(context)
    IslamicWidgetProvider.updateAll(context)
  }

  @ReactMethod
  fun getWidgetSnapshot(callback: com.facebook.react.bridge.Callback) {
    val context = reactApplicationContext
    val bundle = WidgetUtils.getBundle(context)
    callback.invoke(bundle?.toString() ?: "")
  }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'PrayerWidgetProvider.kt'),
      `package ${PACKAGE}

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

open class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        updateWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, PrayerWidgetProvider::class.java))
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val bundle = WidgetUtils.getBundle(context)
            val next = bundle?.optJSONObject("nextPrayer")
            val hasData = next != null && next.optBoolean("hasData", false)

            val options = manager.getAppWidgetOptions(id)
            val minWidth = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) ?: 0
            val isMedium = minWidth >= 220

            val layoutId = if (isMedium) R.layout.widget_prayer_medium else R.layout.widget_prayer_small
            val views = RemoteViews(context.packageName, layoutId)

            if (hasData && next != null) {
                var prayerName = (next.optString("name", "FAJR")).uppercase()
                var prayerTime = next.optString("time", "--:--")
                var countdown = next.optString("countdownText", "")
                val location = next.optString("locationLabel", "Location")

                // Dynamic recalculation from cached 5-prayer schedule on each onUpdate
                val prayers = next.optJSONArray("prayers")
                if (prayers != null && prayers.length() > 0) {
                    val cal = Calendar.getInstance()
                    val nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
                    var found = false
                    for (i in 0 until prayers.length()) {
                        val p = prayers.optJSONObject(i) ?: continue
                        val rawTime = p.optString("rawTime", "")
                        if (rawTime.contains(":")) {
                            val parts = rawTime.split(":")
                            val pMin = (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0)
                            if (pMin > nowMin) {
                                prayerName = p.optString("name", "").uppercase()
                                prayerTime = p.optString("time", prayerTime)
                                val diffMin = pMin - nowMin
                                countdown = if (diffMin < 60) "in \${diffMin} min" else "in \${diffMin / 60}h \${diffMin % 60}m"
                                found = true
                                break
                            }
                        }
                    }
                    if (!found) {
                        // After Isha -> tomorrow's Fajr
                        val firstPrayer = prayers.optJSONObject(0)
                        if (firstPrayer != null) {
                            prayerName = firstPrayer.optString("name", "FAJR").uppercase()
                            prayerTime = firstPrayer.optString("time", prayerTime)
                            val rawTime = firstPrayer.optString("rawTime", "")
                            if (rawTime.contains(":")) {
                                val parts = rawTime.split(":")
                                val pMin = (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0)
                                val diffMin = (1440 - nowMin) + pMin
                                countdown = if (diffMin < 60) "in \${diffMin} min" else "in \${diffMin / 60}h \${diffMin % 60}m"
                            }
                        }
                    }
                }

                views.setTextViewText(R.id.widget_brand, "ISLAMIC")
                views.setTextViewText(R.id.widget_location, location)
                views.setTextViewText(R.id.widget_prayer_name, "NEXT PRAYER · \$prayerName")
                views.setTextViewText(R.id.widget_prayer_time, prayerTime)
                views.setTextViewText(R.id.widget_countdown, if (countdown.isEmpty()) "Now" else countdown)

                if (isMedium && prayers != null) {
                    val nameIds = intArrayOf(R.id.name_fajr, R.id.name_dhuhr, R.id.name_asr, R.id.name_maghrib, R.id.name_isha)
                    val timeIds = intArrayOf(R.id.time_fajr, R.id.time_dhuhr, R.id.time_asr, R.id.time_maghrib, R.id.time_isha)
                    val colIds = intArrayOf(R.id.col_fajr, R.id.col_dhuhr, R.id.col_asr, R.id.col_maghrib, R.id.col_isha)
                    val prayerOrder = arrayOf("fajr", "dhuhr", "asr", "maghrib", "isha")

                    for (i in 0 until prayers.length()) {
                        val p = prayers.optJSONObject(i) ?: continue
                        val pName = p.optString("name", "")
                        val pTime = p.optString("time", "")
                        val pKey = pName.lowercase()
                        val idx = prayerOrder.indexOf(pKey)
                        if (idx in 0 until 5) {
                            views.setTextViewText(nameIds[idx], pName)
                            views.setTextViewText(timeIds[idx], pTime)
                            if (pName.equals(prayerName, ignoreCase = true)) {
                                views.setInt(colIds[idx], "setBackgroundResource", R.drawable.widget_active_row)
                            } else {
                                views.setInt(colIds[idx], "setBackgroundResource", 0)
                            }
                        }
                    }
                }

                views.setContentDescription(
                    R.id.widget_root,
                    "Next prayer \$prayerName at \$prayerTime, \$countdown. Location: \$location"
                )

                val deepLink = "salah://prayer/\${prayerName.lowercase()}"
                val pending = WidgetUtils.createDeepLinkPendingIntent(context, deepLink, id)
                views.setOnClickPendingIntent(R.id.widget_root, pending)
            } else {
                // Polished intentional empty state — NOT a broken implementation fallback
                views.setTextViewText(R.id.widget_brand, "ISLAMIC")
                views.setTextViewText(R.id.widget_location, "Tap to Set Up")
                views.setTextViewText(R.id.widget_prayer_name, "PRAYER TIMES")
                views.setTextViewText(R.id.widget_prayer_time, "Open App")
                views.setTextViewText(R.id.widget_countdown, "Tap to load times")

                if (isMedium) {
                    val nameIds = intArrayOf(R.id.name_fajr, R.id.name_dhuhr, R.id.name_asr, R.id.name_maghrib, R.id.name_isha)
                    val timeIds = intArrayOf(R.id.time_fajr, R.id.time_dhuhr, R.id.time_asr, R.id.time_maghrib, R.id.time_isha)
                    val defaultNames = arrayOf("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")
                    for (i in 0 until 5) {
                        views.setTextViewText(nameIds[i], defaultNames[i])
                        views.setTextViewText(timeIds[i], "--:--")
                    }
                }

                views.setContentDescription(
                    R.id.widget_root,
                    "Islamic Prayer Times. Tap to open app and load times."
                )

                val deepLink = "salah://today"
                val pending = WidgetUtils.createDeepLinkPendingIntent(context, deepLink, id)
                views.setOnClickPendingIntent(R.id.widget_root, pending)
            }

            manager.updateAppWidget(id, views)
        }
    }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'IslamicWidgetProvider.kt'),
      `package ${PACKAGE}

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.Bundle

class IslamicWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) PrayerWidgetProvider.updateWidget(context, appWidgetManager, id)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        PrayerWidgetProvider.updateWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    companion object {
        const val PREFS = WidgetUtils.PREFS
        const val KEY_BUNDLE = WidgetUtils.KEY_BUNDLE

        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, IslamicWidgetProvider::class.java))
            for (id in ids) PrayerWidgetProvider.updateWidget(context, manager, id)
        }
    }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'QuranWidgetProvider.kt'),
      `package ${PACKAGE}

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

class QuranWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, QuranWidgetProvider::class.java))
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val bundle = WidgetUtils.getBundle(context)
            val quran = bundle?.optJSONObject("quranVerse")
            val views = RemoteViews(context.packageName, R.layout.widget_quran)

            val ref = quran?.optString("reference") ?: "Al-Fatihah 1:1"
            val arabic = quran?.optString("arabicText") ?: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
            val trans = quran?.optString("translationText") ?: "In the name of Allah, the Entirely Merciful, the Especially Merciful."
            val deepLink = quran?.optString("deepLink") ?: "salah://quran/1/1"

            views.setTextViewText(R.id.widget_quran_ref, ref)
            views.setTextViewText(R.id.widget_quran_arabic, arabic)
            views.setTextViewText(R.id.widget_quran_trans, trans)
            views.setTextViewText(R.id.widget_quran_cta, "Read Ayah →")

            views.setContentDescription(R.id.widget_root, "Quran verse \$ref: \$trans")
            val pending = WidgetUtils.createDeepLinkPendingIntent(context, deepLink, id)
            views.setOnClickPendingIntent(R.id.widget_root, pending)

            manager.updateAppWidget(id, views)
        }
    }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'ContinueReadingWidgetProvider.kt'),
      `package ${PACKAGE}

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

class ContinueReadingWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, ContinueReadingWidgetProvider::class.java))
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val bundle = WidgetUtils.getBundle(context)
            val cont = bundle?.optJSONObject("continueReading")
            val hasPosition = cont != null && cont.optBoolean("hasPosition", false)
            val views = RemoteViews(context.packageName, R.layout.widget_continue)

            val surah = if (hasPosition) cont?.optString("surahEnglishName", "Al-Baqarah") ?: "Al-Baqarah" else "Start Quran"
            val arabic = if (hasPosition) cont?.optString("surahArabicName", "البَقَرَة") ?: "البَقَرَة" else "القُرْآن"
            val surahNum = cont?.optInt("surahNumber", 1) ?: 1
            val ayahNum = cont?.optInt("ayahNumber", 1) ?: 1
            val reference = if (hasPosition) "Surah \$surahNum · Ayah \$ayahNum" else "Begin with Al-Fatihah"
            val cta = if (hasPosition) "Resume Reading →" else "Start Reading →"
            val deepLink = cont?.optString("deepLink") ?: "salah://quran/\$surahNum/\$ayahNum"

            views.setTextViewText(R.id.widget_continue_surah, surah)
            views.setTextViewText(R.id.widget_continue_arabic_name, arabic)
            views.setTextViewText(R.id.widget_continue_reference, reference)
            views.setTextViewText(R.id.widget_continue_cta, cta)

            views.setContentDescription(R.id.widget_root, "Continue reading \$surah, Ayah \$ayahNum")
            val pending = WidgetUtils.createDeepLinkPendingIntent(context, deepLink, id)
            views.setOnClickPendingIntent(R.id.widget_root, pending)

            manager.updateAppWidget(id, views)
        }
    }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'QiblaWidgetProvider.kt'),
      `package ${PACKAGE}

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

class QiblaWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, QiblaWidgetProvider::class.java))
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val bundle = WidgetUtils.getBundle(context)
            val qibla = bundle?.optJSONObject("qibla")
            val hasLocation = qibla != null && qibla.optBoolean("hasLocation", false)
            val views = RemoteViews(context.packageName, R.layout.widget_qibla)

            val bearing = if (hasLocation) qibla?.optString("bearingText", "--°") ?: "--°" else "Qibla Compass"
            val distance = if (hasLocation) qibla?.optString("distanceText", "Distance to Makkah") ?: "Distance to Makkah" else "Makkah direction"
            val location = qibla?.optString("locationLabel", "Location") ?: "Location"
            val status = if (hasLocation) "\$location · Tap to align compass →" else "Open app to detect location →"
            val deepLink = qibla?.optString("deepLink") ?: "salah://qibla"

            views.setTextViewText(R.id.widget_qibla_bearing, bearing)
            views.setTextViewText(R.id.widget_qibla_distance, distance)
            views.setTextViewText(R.id.widget_qibla_status, status)

            views.setContentDescription(R.id.widget_root, "Qibla bearing \$bearing, \$distance from \$location")
            val pending = WidgetUtils.createDeepLinkPendingIntent(context, deepLink, id)
            views.setOnClickPendingIntent(R.id.widget_root, pending)

            manager.updateAppWidget(id, views)
        }
    }
}`
    );

    fs.writeFileSync(
      path.join(javaDir, 'DuaWidgetProvider.kt'),
      `package ${PACKAGE}

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

class DuaWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, DuaWidgetProvider::class.java))
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val bundle = WidgetUtils.getBundle(context)
            val dua = bundle?.optJSONObject("dua")
            val views = RemoteViews(context.packageName, R.layout.widget_dua)

            val title = dua?.optString("title") ?: "Daily Remembrance"
            val category = dua?.optString("category") ?: "Daily"
            val arabic = dua?.optString("arabicText") ?: "أَسْتَغْفِرُ اللَّهَ"
            val trans = dua?.optString("translationText") ?: "I ask Allah for forgiveness."
            val ref = dua?.optString("reference") ?: "Sahih Muslim"
            val deepLink = dua?.optString("deepLink") ?: "salah://duas"

            views.setTextViewText(R.id.widget_dua_title, title)
            views.setTextViewText(R.id.widget_dua_category, category)
            views.setTextViewText(R.id.widget_dua_arabic, arabic)
            views.setTextViewText(R.id.widget_dua_trans, trans)
            views.setTextViewText(R.id.widget_dua_ref, "\$ref · Tap to view →")

            views.setContentDescription(R.id.widget_root, "\$title (\$category): \$trans")
            val pending = WidgetUtils.createDeepLinkPendingIntent(context, deepLink, id)
            views.setOnClickPendingIntent(R.id.widget_root, pending)

            manager.updateAppWidget(id, views)
        }
    }
}`
    );

    // 6. Register package in MainApplication
    const mainAppPath = path.join(javaDir, 'MainApplication.kt');
    try {
      let ma = fs.readFileSync(mainAppPath, 'utf8');
      if (!ma.includes('IslamicWidgetPackage')) {
        ma = ma.replace(
          '// Packages that cannot be autolinked yet can be added manually here, for example:',
          'add(IslamicWidgetPackage())\n          // Packages that cannot be autolinked yet can be added manually here, for example:'
        );
        fs.writeFileSync(mainAppPath, ma);
      }
    } catch {}

    return config;
  }]);
}

module.exports = (config) => withWidgetManifest(withWidgetNativeFiles(config));
