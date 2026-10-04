# Building the Islamic App — Step-by-Step Guide

This app is an **Expo React Native (SDK 57)** project. To turn the source into an
installable **APK** you have two paths. Pick ONE.

---

## Path A — Build on YOUR OWN PC (no Expo account needed) ★ recommended

You need: a PC/laptop (Windows, macOS, or Linux) with ~10GB free disk.

### A1. Install the tools (once)

| Tool | Why | Install |
|------|-----|---------|
| **Node.js 20+** | Runs the Expo toolchain | https://nodejs.org (LTS) |
| **Java JDK 17** | Android compiler | Windows: https://adoptium.net (Temurin 17). macOS/Linux: `brew install openjdk@17` / `sudo apt install openjdk-17-jdk` |
| **Android Studio** | Provides the Android SDK | https://developer.android.com/studio — install, then in it: *SDK Manager* → install **Android SDK Platform 35** + **Build-Tools 35** |

### A2. Unzip the project
```bash
unzip islamic_app.zip -d islamic_app
cd islamic_app
```

### A3. Install dependencies
```bash
npm install
```

### A4. Set the ANDROID_HOME (Windows: skip — Android Studio sets it)
```bash
# macOS/Linux — add to ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
export ANDROID_HOME=$HOME/Android/Sdk           # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### A5. Generate the native Android project
```bash
npx expo prebuild --platform android
```
This creates an `android/` folder from app.json (package: `com.qashi.islamic`).

### A6. Build the APK

**Debug APK** (fastest, installable, good for personal use):
```bash
cd android
./gradlew assembleDebug        # macOS/Linux
gradlew.bat assembleDebug      # Windows
```
APK lands at: `android/app/build/outputs/apk/debug/app-debug.apk`

**Release APK** (smaller, needs a signing key — skip unless publishing):
```bash
cd android
./gradlew assembleRelease
# unsigned by default; generate a keystore first for Play Store:
# keytool -genkey -v -keystore islamic.keystore -alias islamic -keyalg RSA -keysize 2048 -validity 10000
```

### A7. Install on your phone
Copy the APK to your phone (USB or WhatsApp/Drive), open it, allow
"install unknown apps" when prompted.

---

## Path B — EAS Cloud Build (needs a free Expo account, zero local setup)

Works on any machine/VPS, including this one — the build runs in Expo's cloud.

### B1. Create a free account
https://expo.dev/signup

### B2. Create an access token
https://expo.dev/settings/access-tokens → **Create token** → copy it.

### B3. Install EAS CLI + log in (once)
```bash
npm install -g eas-cli
cd islamic_app
export EXPO_TOKEN=your_token_here        # keep it in this terminal only
```

### B4. Build the APK
```bash
eas build --platform android --profile preview
```
(~15-20 min. When done, EAS prints a **download link** to the .apk — open it on
your phone to install.)

### B5. Rebuild after changes
```bash
git add -A && git commit -m "update"     # EAS builds from the repo
eas build --platform android --profile preview
```
Each build gives a fresh link.

---

## Notes / Troubleshooting

- **`eas: command not found`** → `export PATH="$(npm config get prefix)/bin:$PATH"` then retry.
- **Prebuild fails on Windows about JDK** → make sure `java -version` shows 17.
- **Gradle out of memory** → in `android/gradle.properties`, raise `org.gradle.jvmargs=-Xmx4g`.
- **"SDK location not found"** → confirm ANDROID_HOME points at the SDK folder.
- **First gradle build is slow** (10-20 min) — it downloads dependencies once; later builds are fast.
- **Debug APK needs no signing** — installable directly. Release signing is only for Play Store/Play Protect.
- **Web preview** (no build needed): `npx expo export --platform web` then serve the `dist/` folder.

### Which path when?
- **Personal phone install, own PC** → Path A (debug APK, no account).
- **No PC / quick link** → Path B (EAS cloud).
- **Play Store publishing** → Path B production build + Play Console (needs a signed release APK/AAB).
