<div align="center">

<img src="assets/icon.png" width="96" height="96" alt="Islamic" />

# Islamic — Your Daily Companion

**Prayer times · Qur'an · Hadith · Duas · Qibla · Adhan** — in one calm, beautiful app.

[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-0F5A4A)](https://github.com/Ceoslugpk/islamic-app)
[![Framework](https://img.shields.io/badge/Expo%20SDK-57-0F5A4A)](https://expo.dev)
[![License](https://img.shields.io/badge/License-MIT-8B7355)](LICENSE)
[![Made for Ummah](https://img.shields.io/badge/Made%20for-Ummah%20%E2%9D%A4%EF%B8%8F-B24A3D)](https://github.com/Ceoslugpk/islamic-app)

> **تَوَكَّلْتُ عَلَى ٱللَّٰهُ** — *I place my trust in Allah.*

**This app makes no revenue. It is made entirely as Sadaqah Jariyah (ongoing charity).**

</div>

---

## 🌙 The Mission

Prayer times that are **accurate**, a Qur'an that is **beautiful to read**, and content that is **calm** — free forever, for every Muslim.

- **No accounts. No ads. No data sale.**
- Works **offline** — the Qur'an, prayer times, and your notes are all there when the signal isn't.
- **Private by design** — everything you read, memorise, or save stays on your device.
- Honest, **free public APIs** — with every provider thanked.

---

## ✨ Features

### 🕌 Prayer
- **Single authoritative provider** — prayer times come from Islamic.app only; never silently swapped between providers.
- **Dubai (IACAD) calculation method** — Fajr/Isha 18.2°, matching official UAE timetables (customisable in Settings).
- **SQLite daily cache** — instant offline display, stable across reopens; the same schedule drives notifications.
- Full **AUTO / MANUAL / TRAVEL** location modes — saved location used silently, permission asked only when genuinely needed.
- **Adhan** — 11 reciters with preview, Stop/Snooze, per-prayer notification/adhan/vibration controls, pre-prayer reminders.
- Qibla compass, mosque finder, Salah tracker with streaks.

### 📖 Qur'an
- Full Qur'an text (AlQuran Cloud) + translations + **Tafsir**.
- **Long-press a verse** → Play / Bookmark / Note / Copy / Share.
- Reading position remembered; scroll position restored; clean, distraction-free reader.
- **Audio** — every ayah, multiple reciters, background playback, surah downloads, playlist queue.

### 🕌 More
- Hadith library, Duas, 99 Names, Daily content rail, Tasbih, Hijri calendar, Zakat & Fasting trackers, Women's worship tools.
- Home-screen widgets (Android), notification health, offline-first everywhere.
- Dark/light themes with 10 accent palettes, RTL-aware Arabic, accessibility + reduce-motion support.

---

## 🏗 Architecture

```
Expo SDK 57 · React Native (Fabric) · TypeScript strict
```

| Layer | Tech |
|---|---|
| UI | React Native, custom design system (tokens: spacing, typography, buttons, icons) |
| Persistence | SQLite (`expo-sqlite`) on native, localStorage on web — shared facade |
| Prayer times | **Islamic.app** (sole remote provider) → SQLite daily cache → offline fallback |
| Notifications | `expo-notifications` — exact alarms, boot recovery, same schedule as the UI |
| Audio | `expo-audio` — Adhan + Qur'an recitation, background playback |
| Location | `expo-location` — AUTO/MANUAL/TRAVEL, persisted, permission-aware |
| Data APIs | Islamic.app, AlQuran Cloud, islamic.network, EveryAyah, OpenStreetMap Nominatim |

---

## 🚀 Getting Started

```bash
git clone https://github.com/Ceoslugpk/islamic-app.git
cd islamic-app
npm install
npx expo start          # dev server
npx expo run:android    # native build
```

### TypeScript

```bash
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit   # strict, exit 0 required
npm test                # 10 architecture tests (provider/cache/offline/notifications)
```

---

## 📸 Screenshots

*(Coming soon — install the app and explore: prayer hero, Qur'an reader, tools.)*

---

## 🛡 Privacy

- No accounts, no telemetry, no data sale.
- Bookmarks, notes, settings, and downloads are stored **locally on your device**.
- Only the necessary parameters (e.g. coordinates for prayer times, a city search) are sent to free public APIs.
- Permissions (location, notifications) are used only for their stated purpose and can be revoked anytime.

See **Settings → About & Legal** in the app for the full Privacy Policy, Terms of Use, and Third-Party Services.

---

## 🤲 Sadaqah Jariyah

This app is a gift to the Ummah. It makes **no revenue** — build it, use it, share it, and may Allah accept it as ongoing charity.

<div align="center">

**Made for Ummah ❤️** · **تَوَكَّلْتُ عَلَى ٱللَّٰهُ**

*Thank you to every provider who makes this possible: Islamic.app · AlAdhan · AlQuran Cloud · islamic.network · EveryAyah · EsmaulHusna.org · OpenStreetMap · Google Fonts · Expo & the open-source community.*

</div>

---

## 📬 Contact / Report an Issue

Found a bug or have feedback? Open an issue on the [repository](https://github.com/Ceoslugpk/islamic-app/issues) — it means the world to the project.

<div align="center">

<sub>© 2026 · Islamic — Your Daily Companion · Free forever, for the Ummah</sub>

</div>
