import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';

export type LegalScreenKey =
  | 'privacy'
  | 'terms'
  | 'data'
  | 'licenses'
  | 'services'
  | 'contact';

export interface LegalScreenProps {
  screen: LegalScreenKey;
  onBack: () => void;
}

interface BadgeProps {
  label: string;
}

function Badge({ label }: BadgeProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' },
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

interface LegalSectionProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
}

function LegalSection({ title, badge, children }: LegalSectionProps) {
  const { colors } = useTheme();
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {badge ? <Badge label={badge} /> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

interface BulletItemProps {
  title?: string;
  text: string;
}

function BulletItem({ title, text }: BulletItemProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: colors.accent }]}>•</Text>
      <View style={styles.bulletContent}>
        {title ? (
          <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
        ) : null}
        <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

interface LibItemProps {
  name: string;
  license: string;
  desc: string;
}

function LibItem({ name, license, desc }: LibItemProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.libItem}>
      <View style={styles.libHeader}>
        <Text style={[styles.libName, { color: colors.textPrimary }]}>{name}</Text>
        <Badge label={license} />
      </View>
      <Text style={[styles.libDesc, { color: colors.textSecondary }]}>{desc}</Text>
    </View>
  );
}

interface ServiceItemProps {
  name: string;
  role: string;
  desc: string;
}

function ServiceItem({ name, role, desc }: ServiceItemProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.serviceItem}>
      <View style={styles.serviceHeader}>
        <Text style={[styles.serviceName, { color: colors.textPrimary }]}>{name}</Text>
        <Badge label={role} />
      </View>
      <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>{desc}</Text>
    </View>
  );
}

export default function LegalScreen({ screen, onBack }: LegalScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const maxW = 640;

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const getScreenMeta = (): { title: string; subtitle: string } => {
    switch (screen) {
      case 'privacy':
        return {
          title: 'Privacy Policy',
          subtitle: 'No accounts, zero tracking, on-device privacy',
        };
      case 'terms':
        return {
          title: 'Terms of Use',
          subtitle: 'Free religious & educational companion',
        };
      case 'data':
        return {
          title: 'Data & Privacy',
          subtitle: 'Local storage, third-party requests & data control',
        };
      case 'licenses':
        return {
          title: 'Open Source Licenses',
          subtitle: 'Expo, React Native & open-source libraries',
        };
      case 'services':
        return {
          title: 'Third-Party Services',
          subtitle: 'Public APIs for prayer times, Quran text & audio',
        };
      case 'contact':
        return {
          title: 'Contact & Feedback',
          subtitle: 'GitHub repository & community issue tracker',
        };
    }
  };

  const meta = getScreenMeta();

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title={meta.title}
        subtitle={meta.subtitle}
        eyebrow="About & Legal"
        onBack={onBack}
        backLabel="Settings"
        borderBottom
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: paddingH,
            paddingTop: 16,
            paddingBottom: Math.max(40, insets.bottom + 24),
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: maxW }]}>
          {screen === 'privacy' && (
            <>
              <LegalSection title="Our Commitment to Privacy" badge="Zero Data Sale">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  This application is built entirely as Sadaqah Jariyah (continuous charity) for the
                  Muslim Ummah. We believe your spiritual practices, daily prayers, notes, and
                  reflections are sacred and private to you alone. We do not sell, rent, monetize,
                  or distribute any user data under any circumstances.
                </Text>
              </LegalSection>

              <LegalSection title="No Accounts & No Profiles" badge="Account-Free">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The app requires no account creation, sign-in, email address, or phone number.
                  We do not create user profiles, fingerprint your device, or track your identity
                  across sessions or devices.
                </Text>
                <BulletItem
                  title="No authentication servers"
                  text="You can use every core feature immediately without ever signing in or providing personal credentials."
                />
                <BulletItem
                  title="No advertising identifiers"
                  text="The app contains zero ad networks, tracking SDKs, or commercial behavioral tracking."
                />
              </LegalSection>

              <LegalSection title="On-Device Local Storage" badge="Stored on Device">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  Your data stays exclusively on your phone in local storage (embedded SQLite
                  database and secure key-value storage):
                </Text>
                <BulletItem
                  title="Quran Reader"
                  text="Bookmarks, last read ayah position, reading plans, and verse reflection notes."
                />
                <BulletItem
                  title="Worship Trackers"
                  text="Salah logs, tasbih counts, fasting history, and women’s cycle records."
                />
                <BulletItem
                  title="Preferences"
                  text="Theme mode, calculation methods, madhab, reciter selection, and notification timings."
                />
              </LegalSection>

              <LegalSection title="Device Permissions" badge="Optional & Revocable">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The app requests only the minimum permissions necessary to function:
                </Text>
                <BulletItem
                  title="Location (GPS)"
                  text="Used strictly on-device to calculate local prayer times and determine the Qibla direction. Your coordinates are never sent to our servers or linked to your identity. You can revoke this permission anytime and choose a manual city instead."
                />
                <BulletItem
                  title="Notifications"
                  text="Used solely to schedule local prayer alerts and Quran reminders directly on your phone. Notifications are generated locally without any external push-notification services."
                />
              </LegalSection>

              <LegalSection title="Network Requests to Public APIs" badge="Minimal Queries">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  When network requests are required, they contact free, public APIs with only the
                  bare minimum parameters needed to fulfill the request:
                </Text>
                <BulletItem
                  title="Prayer Times"
                  text="Approximate latitude, longitude, and calculation method parameters are sent to Islamic.app to fetch the monthly prayer schedule."
                />
                <BulletItem
                  title="City & Mosque Search"
                  text="Search text queries are sent to OpenStreetMap Nominatim for geocoding."
                />
                <BulletItem
                  title="Quran Audio & Text"
                  text="Ayah audio streams and translations are downloaded from public CDNs without user identifiers."
                />
              </LegalSection>

              <LegalSection title="Zero Analytics & Telemetry" badge="No Analytics">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The application has no analytics SDKs, crash trackers, or telemetry scripts.
                  We do not collect usage statistics, screen view counts, or interaction events.
                </Text>
              </LegalSection>

              <LegalSection title="Women's Worship Data" badge="On-Device & Private">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The optional Women's Worship feature may store the following records locally on
                  your device: menstrual/period start and end dates, post-natal (nifas) start and
                  end dates, user-entered private notes associated with those records, purity-day
                  information, and missed-fasting records where the recorded reason relates to
                  menstruation or post-natal status.
                </Text>
                <BulletItem
                  title="Stored locally only"
                  text="These records are kept exclusively in the app's on-device SQLite database. They are never transmitted to our servers, Islamic.app, AlAdhan, Nominatim, Quran providers, or any analytics, advertising, or crash-reporting service."
                />
                <BulletItem
                  title="No Health Connect"
                  text="The app does not integrate with Android Health Connect and does not read or write menstrual or reproductive-health data through Health Connect."
                />
                <BulletItem
                  title="No advertising or sale"
                  text="Women's Worship data is never used for advertising and is never sold."
                />
                <BulletItem
                  title="Deletion"
                  text="You can delete all Women's Worship records at any time via Settings → Women's Worship → 'Delete women's data', which erases cycle, purity, nifas, and related qada records."
                />
                <BulletItem
                  title="Backup & export"
                  text="Women's Worship records are included in a user-created backup via Backup & Restore. The exported backup file is not automatically uploaded by the app; if you choose to share it using your device's share or document tools, you control where it goes. Because the exported file itself is not encrypted by the app, store any backup that contains Women's Worship data securely."
                />
                <BulletItem
                  title="Privacy lock"
                  text="The optional privacy lock protects access to the Women's Worship screens using your device's supported authentication mechanisms (biometrics, PIN, pattern, or password). It does not transmit or store any Women's Worship data elsewhere."
                />
              </LegalSection>
            </>
          )}

          {screen === 'terms' && (
            <>
              <LegalSection title="Free Service as Sadaqah Jariyah" badge="Free & Open">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  This application is provided completely free of charge as Sadaqah Jariyah
                  (continuous charity) for the benefit of the global Muslim community. There are no
                  in-app purchases, paid subscriptions, or paywalled content.
                </Text>
              </LegalSection>

              <LegalSection title="Religious & Educational Purpose" badge="Educational">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  All content provided—including the Holy Quran text, translations, tafsir,
                  hadiths, prayer time schedules, and worship guides—is intended for personal
                  devotional and educational purposes. While we strive for absolute accuracy
                  according to verified Islamic scholarship, this software is provided as a
                  supportive companion and does not replace qualified human guidance.
                </Text>
              </LegalSection>

              <LegalSection title="Religious Scholarly Disclaimer" badge="Important">
                <BulletItem
                  title="Prayer & Fasting Times"
                  text="Prayer schedules are astronomical calculations based on established methods. For exact start and end times in special regions (such as extreme high latitudes) or local congregational adjustments, please consult your local mosque or regional Islamic authority."
                />
                <BulletItem
                  title="Fiqh & Medical Rulings"
                  text="The worship tools (including the Women's Worship section) provide reference guidance according to major Islamic schools of thought (Hanafi, Shafi'i, Maliki, Hanbali). For intricate personal rulings, menstrual medical doubts, or complex legal questions, please consult a qualified Islamic scholar or medical professional."
                />
              </LegalSection>

              <LegalSection title="Respectful Use & Adab">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  Users agree to treat the Holy Quran, sacred names of Allah, hadiths, and
                  devotional materials with respect and adab. Users must not attempt to abuse,
                  distort, or maliciously disrupt the public APIs that power the application.
                </Text>
              </LegalSection>

              <LegalSection title="Disclaimer of Warranties & Liability" badge="As-Is">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The application is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
                  warranties of any kind, whether express or implied. The developers and
                  contributors make every reasonable effort to prevent errors, but assume no
                  liability for calculation inaccuracies, compass magnetic interference, or third-party
                  server downtime.
                </Text>
              </LegalSection>

              <LegalSection title="Changes to Terms">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  These terms may be updated occasionally as new features are added. Continued use
                  of the application following an update constitutes acceptance of the revised
                  terms.
                </Text>
              </LegalSection>
            </>
          )}

{screen === 'data' && (
            <>
              <LegalSection title="What Data is Stored Locally" badge="Stored on Phone">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  All your personal interactions and records remain stored strictly within your
                  device&apos;s isolated application container. The app uses an embedded SQLite database
                  (expo-sqlite) plus AsyncStorage for preferences:
                </Text>
                <BulletItem
                  title="Holy Quran"
                  text="Reading bookmarks (bookmarks table), last-read ayah (quran_cache: 'last-read'), verse notes (notes table), and personal reading plan progress (plan_entries table)."
                />
                <BulletItem
                  title="Salah Tracker & Tasbih"
                  text="Daily prayer completion records (salah_entries table), prayer streaks, and digital tasbih tally counts (tasbih_entries, tasbih_daily tables)."
                />
                <BulletItem
                  title="Women's Worship"
                  text="Cycle dates (period_entries table), purity intervals, nifas tracking (nifas_entries table), and fasting qada records (missed_fasts table, filtered by reason). Optional PIN lock via hashPin."
                />
                <BulletItem
                  title="Fasting & Zakat"
                  text="Fasting history (fasting_entries table) with type (ramadan/voluntary/qada), and zakat calculations (zakat_history table)."
                />
                <BulletItem
                  title="Hifz & Hadith"
                  text="Hifz memorization status (hifz_entries table), saved hadiths (hadith_saved table), and read markers (hadith_recent, hadith_read_markers tables)."
                />
                <BulletItem
                  title="Downloaded Media"
                  text="Preloaded Quranic text editions (quran_cache table) and downloaded audio recitation files (quran_cache: 'quran-audio-downloads')."
                />
                <BulletItem
                  title="Application Settings"
                  text="Theme, accent color, calculation method, madhab, notification reminders, font sizes, and reciter selection (AsyncStorage keys)."
                />
              </LegalSection>

              <LegalSection title="Device Permissions Used" badge="Optional & Revocable">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The app requests only the minimum permissions necessary. Each is optional and can be revoked in system settings:
                </Text>
                <BulletItem
                  title="Location (Precise & Approximate)"
                  text="Used strictly on-device to calculate local prayer times and determine the Qibla direction. Your coordinates are never sent to our servers or linked to your identity. You can revoke this permission anytime and choose a manual city instead."
                />
                <BulletItem
                  title="Notifications"
                  text="Used solely to schedule local prayer alerts, Adhan playback, and Quran reminders directly on your phone. Notifications are generated locally without any external push-notification services. No microphone permission is used — the app has no voice search feature."
                />
                <BulletItem
                  title="Storage (Media & Files)"
                  text="Required to cache Quran text, translations, and downloaded audio recitations for offline access. You can clear this in Settings → Downloads."
                />
              </LegalSection>

              <LegalSection title="What Leaves Your Device (Network Endpoints)" badge="Strictly Minimal">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  No personal profile data ever leaves your phone. Network traffic is restricted
                  exclusively to the following public endpoints:
                </Text>
                <BulletItem
                  title="Prayer Times & Hadith API"
                  text="api.islamic.app — receives approximate latitude, longitude, calculation method ID, and madhab to return prayer schedules and authentic hadith collections (Bukhari, Muslim, etc.)."
                />
                <BulletItem
                  title="Quran Text & Translations"
                  text="AlQuran Cloud (cdn.alquran.cloud / api.alquran.cloud) — provides verified Uthmani script, surah/ayah metadata, and multilingual translations. No user identifiers sent."
                />
                <BulletItem
                  title="Quran Audio Recitations"
                  text="islamic.network / EveryAyah CDNs (cdn.islamic.network, everyayah.com) — direct requests for verse-by-verse audio from reciters like Alafasy, Abdulbasit, Al-Ghamadi. No tracking parameters."
                />
                <BulletItem
                  title="Hijri Calendar"
                  text="AlAdhan / Umm al-Qura algorithms (local calculation with fallback to api.aladhan.com for validation) — astronomical Hijri date conversion."
                />
                <BulletItem
                  title="City & Mosque Search"
                  text="OpenStreetMap Nominatim (nominatim.openstreetmap.org) — search text queries for geocoding city names and nearby mosque discovery via Overpass API."
                />
                <BulletItem
                  title="99 Names of Allah"
                  text="EsmaulHusna.org — provides authentic meanings, benefits, and commentary for the 99 Beautiful Names."
                />
              </LegalSection>

              <LegalSection title="How to Clear or Erase Your Data" badge="User Controlled">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  You have complete authority over your data at all times:
                </Text>
                <BulletItem
                  title="Delete Women's Data"
                  text="Settings → Women's Worship → 'Delete women's data' — instantly erases all cycle, purity, nifas, and related qada records from SQLite."
                />
                <BulletItem
                  title="Clear Fasting History"
                  text="Settings → Data & Privacy → use 'Clear fasting data' (if available) or clear fasting_entries and missed_fasts tables via Backup & Restore → Export → edit → Import."
                />
                <BulletItem
                  title="Remove Downloaded Audio & Text"
                  text="Settings → Downloads → 'Clear All Downloads' — removes all cached Quran text editions and downloaded audio files, freeing device storage."
                />
                <BulletItem
                  title="Reset All App Data"
                  text="Settings → Backup & Restore → 'Clear All Data' — wipes SQLite database, AsyncStorage, and cached files. Or use system Settings → Apps → Islamic → Clear Storage."
                />
                <BulletItem
                  title="Backup & Restore"
                  text="Settings → Backup & Restore — export all local data as a JSON file for backup, or import a previously exported backup. No cloud sync involved."
                />
              </LegalSection>

              <LegalSection title="Independent & No Cloud Lock-In" badge="Zero Lock-In">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  Because the application has no cloud accounts or remote user databases, your data
                  is entirely decentralized. You are never subject to account suspensions, remote
                  data leaks, or unexpected cloud sync discrepancies.
                </Text>
              </LegalSection>
            </>
          )}

          {screen === 'licenses' && (
            <>
              <LegalSection title="Open Source Foundation" badge="Open Source">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  This application is proudly built on open-source foundations. We stand on the
                  shoulders of generous engineers and communities who make mobile software
                  accessible to all.
                </Text>
              </LegalSection>

              <LegalSection title="Core Runtime & Framework">
                <LibItem
                  name="React (v19.2)"
                  license="MIT"
                  desc="Declarative UI component architecture created by Meta Platforms, Inc."
                />
                <Hairline />
                <LibItem
                  name="React Native (v0.86)"
                  license="MIT"
                  desc="Cross-platform native mobile application framework powered by Fabric and Hermes."
                />
                <Hairline />
                <LibItem
                  name="Expo (SDK 57)"
                  license="MIT"
                  desc="Universal application framework, build toolchain, and native device runtime."
                />
              </LegalSection>

              <LegalSection title="Native Modules & Utilities">
                <LibItem
                  name="expo-sqlite"
                  license="MIT"
                  desc="Embedded high-performance local SQLite database for offline prayer caching and worship data."
                />
                <Hairline />
                <LibItem
                  name="@react-native-async-storage/async-storage"
                  license="MIT"
                  desc="Asynchronous persistent key-value storage for app settings and preferences."
                />
                <Hairline />
                <LibItem
                  name="expo-notifications"
                  license="MIT"
                  desc="Local on-device notification scheduling for prayer times and Quran reminders."
                />
                <Hairline />
                <LibItem
                  name="expo-location"
                  license="MIT"
                  desc="Device GPS location services for prayer calculations and Qibla compass."
                />
                <Hairline />
                <LibItem
                  name="expo-audio & expo-file-system"
                  license="MIT"
                  desc="Audio playback engine and local file system management for Quran recitations."
                />
                <Hairline />
                <LibItem
                  name="expo-sensors & expo-haptics"
                  license="MIT"
                  desc="Hardware magnetometer for Qibla direction and tactile haptic feedback."
                />
                <Hairline />
                <LibItem
                  name="@expo/vector-icons"
                  license="MIT"
                  desc="Ionicons vector iconography package (MIT License)."
                />
                <Hairline />
                <LibItem
                  name="react-native-svg"
                  license="MIT"
                  desc="Hardware-accelerated vector graphic rendering for compass dials and charts."
                />
                <Hairline />
                <LibItem
                  name="react-native-safe-area-context"
                  license="MIT"
                  desc="Edge-to-edge device display and status bar inset management."
                />
              </LegalSection>

              <LegalSection title="Open Font Licenses (OFL)">
                <LibItem
                  name="Manrope"
                  license="OFL 1.1"
                  desc="Modern, geometric sans-serif typeface designed by Mikhail Sharanda."
                />
                <Hairline />
                <LibItem
                  name="Instrument Serif"
                  license="OFL 1.1"
                  desc="Expressive editorial serif typeface designed by Instrument & Rodrigo Fuenzalida."
                />
                <Hairline />
                <LibItem
                  name="Amiri"
                  license="OFL 1.1"
                  desc="Classic Arabic Naskh typeface for Holy Quran typesetting, designed by Khaled Hosny."
                />
                <Hairline />
                <LibItem
                  name="Noto Naskh Arabic"
                  license="OFL 1.1"
                  desc="Digital Naskh typeface optimized for digital legibility, by Google LLC."
                />
                <Hairline />
                <LibItem
                  name="Source Sans 3"
                  license="OFL 1.1"
                  desc="Clean open-source sans-serif UI typography by Adobe Systems Incorporated."
                />
              </LegalSection>

              <LegalSection title="Architecture Note" badge="TanStack-Free">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The app is architected with a strict zero-dependency philosophy for data state.
                  Networking, caching, and state synchronization use lightweight React hooks and
                  direct SQLite queries without heavy state management bloat.
                </Text>
              </LegalSection>
            </>
          )}

          {screen === 'services' && (
            <>
              <LegalSection title="Free Public APIs & Open Data" badge="Public APIs">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  The application integrates with established, free public APIs and open data
                  initiatives across the Muslim world. None of these providers receive personal
                  identities or user profiles.
                </Text>
              </LegalSection>

              <LegalSection title="Services Directory">
                <ServiceItem
                  name="Islamic.app (API)"
                  role="Prayer Times & Hadith"
                  desc="Provides prayer calculation algorithms and authentic Hadith text collections across major Sunni books (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Nawawi)."
                />
                <Hairline />
                <ServiceItem
                  name="AlAdhan & Umm al-Qura"
                  role="Hijri Calendar"
                  desc="Provides astronomical Hijri calendar conversion and date alignment algorithms based on official Islamic calendar authorities."
                />
                <Hairline />
                <ServiceItem
                  name="AlQuran Cloud"
                  role="Quran Text & Metadata"
                  desc="Provides verified Uthmani script Quran text, surah/ayah metadata, and multilingual translations."
                />
                <Hairline />
                <ServiceItem
                  name="islamic.network & EveryAyah"
                  role="Audio Recitations"
                  desc="Provides high-quality verse-by-verse audio recitations from renowned reciters (Mishary Rashid Alafasy, Abdulbasit Abdussamad, Al-Ghamadi, and more)."
                />
                <Hairline />
                <ServiceItem
                  name="OpenStreetMap & Nominatim"
                  role="Geocoding & Mosques"
                  desc="Community-driven geographical database for city lookup and nearby mosque discovery."
                />
                <Hairline />
                <ServiceItem
                  name="EsmaulHusna.org"
                  role="99 Names of Allah"
                  desc="Provides authentic meanings, benefits, and commentary for the 99 Beautiful Names of Allah."
                />
                <Hairline />
                <ServiceItem
                  name="Google Fonts"
                  role="Typography Assets"
                  desc="Hosts open-source font families (Manrope, Instrument Serif, Amiri, Noto Naskh Arabic)."
                />
              </LegalSection>

              <LegalSection title="Terms of External Providers">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  Each external service operates under its respective terms of service and open data
                  attribution licenses. We are profoundly grateful to every provider for their
                  selfless contribution to Islamic technology. May Allah reward them all abundantly.
                </Text>
              </LegalSection>
            </>
          )}

          {screen === 'contact' && (
            <>
              <LegalSection title="Community Support & Feedback" badge="Open Source">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  This application is developed as a community project for the Ummah. If you spot a
                  bug, find an error in prayer timings, notice a typo in translations, or wish to
                  propose a new feature, we welcome your feedback.
                </Text>
              </LegalSection>

              <Card style={styles.actionCard}>
                <View style={styles.actionHeader}>
                  <View
                    style={[
                      styles.actionIconWrap,
                      { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' },
                    ]}
                  >
                    <Ionicons name="logo-github" size={24} color={colors.accent} />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                      GitHub Issue Tracker
                    </Text>
                    <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                      Ceoslugpk/islamic-app
                    </Text>
                  </View>
                </View>

                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  Browse existing issues, report bugs, or submit suggestions directly on our public
                  repository.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                  onPress={() => handleOpenLink('https://github.com/Ceoslugpk/islamic-app/issues')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Open GitHub Issues"
                >
                  <Ionicons name="open-outline" size={16} color={colors.onAccent} />
                  <Text style={[styles.primaryButtonText, { color: colors.onAccent }]}>
                    Open GitHub Issues
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
                  ]}
                  onPress={() => handleOpenLink('https://github.com/Ceoslugpk/islamic-app')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="View GitHub Repository"
                >
                  <Ionicons name="logo-github" size={16} color={colors.textPrimary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                    View Repository
                  </Text>
                </TouchableOpacity>
              </Card>

              <LegalSection title="Tips for Helpful Issue Reports">
                <BulletItem
                  title="Device & OS"
                  text="Mention whether you are on Android, iOS, or Web, along with your device model."
                />
                <BulletItem
                  title="Prayer Location & Settings"
                  text="For prayer time issues, specify your city/country, chosen calculation method, and madhab."
                />
                <BulletItem
                  title="Expected vs Actual"
                  text="Briefly explain what you expected to happen versus what actually occurred."
                />
              </LegalSection>

              <View style={styles.footerSignoff}>
                <Text style={[styles.signoffHeart, { color: colors.textMuted }]}>
                  Made for Ummah ❤️
                </Text>
                <Text style={[styles.signoffArabic, { color: colors.textSecondary }]}>
                  جَزَاكُمُ ٱللَّٰهُ خَيْرًا
                </Text>
                <Text style={[styles.signoffSub, { color: colors.textMuted }]}>
                  May Allah reward you with goodness
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentWrap: {
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    letterSpacing: -0.1,
    flex: 1,
  },
  sectionBody: {
    gap: 10,
  },
  paragraph: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: -1,
  },
  bulletContent: {
    flex: 1,
    gap: 2,
  },
  bulletTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    lineHeight: 19,
  },
  bulletText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  libItem: {
    paddingVertical: 8,
    gap: 4,
  },
  libHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  libName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  libDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  serviceItem: {
    paddingVertical: 8,
    gap: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  serviceDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionCard: {
    padding: 18,
    borderRadius: 12,
    gap: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  actionSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    marginTop: 1,
  },
  actionDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    marginTop: 4,
  },
  primaryButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  footerSignoff: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  signoffHeart: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  signoffArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 19,
    lineHeight: 26,
  },
  signoffSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
});
