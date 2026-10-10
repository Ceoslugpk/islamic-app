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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35' },
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.accent }]}>{t(label)}</Text>
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
  const { t } = useTranslation();
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t(title)}
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
  const { t } = useTranslation();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: colors.accent }]}>•</Text>
      <View style={styles.bulletContent}>
        {title ? (
          <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>
            {t(title)}
          </Text>
        ) : null}
        <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
          {t(text)}
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
  const { t } = useTranslation();
  return (
    <View style={styles.libItem}>
      <View style={styles.libHeader}>
        <Text style={[styles.libName, { color: colors.textPrimary }]}>{name}</Text>
        <Badge label={license} />
      </View>
      <Text style={[styles.libDesc, { color: colors.textSecondary }]}>{t(desc)}</Text>
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
  const { t } = useTranslation();
  return (
    <View style={styles.serviceItem}>
      <View style={styles.serviceHeader}>
        <Text style={[styles.serviceName, { color: colors.textPrimary }]}>{name}</Text>
        <Badge label={role} />
      </View>
      <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>{t(desc)}</Text>
    </View>
  );
}

export default function LegalScreen({ screen, onBack }: LegalScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
        title={t(meta.title)}
        subtitle={t(meta.subtitle)}
        eyebrow={t("About & Legal")}
        onBack={onBack}
        backLabel={t("Settings")}
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
                  {t("This application is built entirely as Sadaqah Jariyah (continuous charity) for the Muslim Ummah. We believe your spiritual practices, daily prayers, notes, and reflections are sacred and private to you alone. We do not sell, rent, monetize, or distribute any user data under any circumstances.")}
                </Text>
              </LegalSection>

              <LegalSection title="No Accounts & No Profiles" badge="Account-Free">
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The app requires no account creation, sign-in, email address, or phone number. We do not create user profiles, fingerprint your device, or track your identity across sessions or devices.")}
                </Text>
                <BulletItem
                  title="No authentication servers"
                  text={t("You can use every core feature immediately without ever signing in or providing personal credentials.")}
                />
                <BulletItem
                  title={t("No advertising identifiers")}
                  text={t("The app contains zero ad networks, tracking SDKs, or commercial behavioral tracking.")}
                />
              </LegalSection>

              <LegalSection title={t("On-Device Local Storage")} badge={t("Stored on Device")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("Your data stays exclusively on your phone in local storage (embedded SQLite database and secure key-value storage):")}
                </Text>
                <BulletItem
                  title={t("Quran Reader")}
                  text={t("Bookmarks, last read ayah position, reading plans, and verse reflection notes.")}
                />
                <BulletItem
                  title={t("Worship Trackers")}
                  text={t("Salah logs, tasbih counts, fasting history, and women’s cycle records.")}
                />
                <BulletItem
                  title={t("Preferences")}
                  text={t("Theme mode, calculation methods, madhab, reciter selection, and notification timings.")}
                />
              </LegalSection>

              <LegalSection title={t("Device Permissions")} badge={t("Optional & Revocable")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The app requests only the minimum permissions necessary to function:")}
                </Text>
                <BulletItem
                  title={t("Location (GPS)")}
                  text={t("Used strictly on-device to calculate local prayer times and determine the Qibla direction. Your coordinates are never sent to our servers or linked to your identity. You can revoke this permission anytime and choose a manual city instead.")}
                />
                <BulletItem
                  title={t("Notifications")}
                  text={t("Used solely to schedule local prayer alerts and Quran reminders directly on your phone. Notifications are generated locally without any external push-notification services.")}
                />
              </LegalSection>

              <LegalSection title={t("Network Requests to Public APIs")} badge={t("Minimal Queries")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("When network requests are required, they contact free, public APIs with only the bare minimum parameters needed to fulfill the request:")}
                </Text>
                <BulletItem
                  title={t("Prayer Times")}
                  text={t("Approximate latitude, longitude, and calculation method parameters are sent to Islamic.app to fetch the monthly prayer schedule.")}
                />
                <BulletItem
                  title={t("City & Mosque Search")}
                  text={t("Search text queries are sent to OpenStreetMap Nominatim for geocoding.")}
                />
                <BulletItem
                  title={t("Quran Audio & Text")}
                  text={t("Ayah audio streams and translations are downloaded from public CDNs without user identifiers.")}
                />
              </LegalSection>

              <LegalSection title={t("Zero Analytics & Telemetry")} badge={t("No Analytics")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The application has no analytics SDKs, crash trackers, or telemetry scripts. We do not collect usage statistics, screen view counts, or interaction events.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Women's Worship Data")} badge={t("On-Device & Private")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The optional Women's Worship feature may store the following records locally on your device: menstrual/period start and end dates, post-natal (nifas) start and end dates, user-entered private notes associated with those records, purity-day information, and missed-fasting records where the recorded reason relates to menstruation or post-natal status.")}
                </Text>
                <BulletItem
                  title={t("Stored locally only")}
                  text={t("These records are kept exclusively in the app's on-device SQLite database. They are never transmitted to our servers, Islamic.app, AlAdhan, Nominatim, Quran providers, or any analytics, advertising, or crash-reporting service.")}
                />
                <BulletItem
                  title={t("No Health Connect")}
                  text={t("The app does not integrate with Android Health Connect and does not read or write menstrual or reproductive-health data through Health Connect.")}
                />
                <BulletItem
                  title={t("No advertising or sale")}
                  text={t("Women's Worship data is never used for advertising and is never sold.")}
                />
                <BulletItem
                  title={t("Deletion")}
                  text={t("You can delete all Women's Worship records at any time via Settings → Women's Worship → 'Delete women's data', which erases cycle, purity, nifas, and related qada records.")}
                />
                <BulletItem
                  title={t("Backup & export")}
                  text={t("Women's Worship records are included in a user-created backup via Backup & Restore. The exported backup file is not automatically uploaded by the app; if you choose to share it using your device's share or document tools, you control where it goes. Because the exported file itself is not encrypted by the app, store any backup that contains Women's Worship data securely.")}
                />
                <BulletItem
                  title={t("Privacy lock")}
                  text={t("The optional privacy lock protects access to the Women's Worship screens using your device's supported authentication mechanisms (biometrics, PIN, pattern, or password). It does not transmit or store any Women's Worship data elsewhere.")}
                />
              </LegalSection>
            </>
          )}

          {screen === 'terms' && (
            <>
              <LegalSection title={t("Free Service as Sadaqah Jariyah")} badge={t("Free & Open")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("This application is provided completely free of charge as Sadaqah Jariyah (continuous charity) for the benefit of the global Muslim community. There are no in-app purchases, paid subscriptions, or paywalled content.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Religious & Educational Purpose")} badge={t("Educational")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("All content provided—including the Holy Quran text, translations, tafsir, hadiths, prayer time schedules, and worship guides—is intended for personal devotional and educational purposes. While we strive for absolute accuracy according to verified Islamic scholarship, this software is provided as a supportive companion and does not replace qualified human guidance.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Religious Scholarly Disclaimer")} badge={t("Important")}>
                <BulletItem
                  title={t("Prayer & Fasting Times")}
                  text={t("Prayer schedules are astronomical calculations based on established methods. For exact start and end times in special regions (such as extreme high latitudes) or local congregational adjustments, please consult your local mosque or regional Islamic authority.")}
                />
                <BulletItem
                  title={t("Fiqh & Medical Rulings")}
                  text={t("The worship tools (including the Women's Worship section) provide reference guidance according to major Islamic schools of thought (Hanafi, Shafi'i, Maliki, Hanbali). For intricate personal rulings, menstrual medical doubts, or complex legal questions, please consult a qualified Islamic scholar or medical professional.")}
                />
              </LegalSection>

              <LegalSection title={t("Respectful Use & Adab")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("Users agree to treat the Holy Quran, sacred names of Allah, hadiths, and devotional materials with respect and adab. Users must not attempt to abuse, distort, or maliciously disrupt the public APIs that power the application.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Disclaimer of Warranties & Liability")} badge={t("As-Is")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The application is provided on an \"as is\" and \"as available\" basis without warranties of any kind, whether express or implied. The developers and contributors make every reasonable effort to prevent errors, but assume no liability for calculation inaccuracies, compass magnetic interference, or third-party server downtime.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Changes to Terms")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("These terms may be updated occasionally as new features are added. Continued use of the application following an update constitutes acceptance of the revised terms.")}
                </Text>
              </LegalSection>
            </>
          )}

{screen === 'data' && (
            <>
              <LegalSection title={t("What Data is Stored Locally")} badge={t("Stored on Phone")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("All your personal interactions and records remain stored strictly within your device's isolated application container. The app uses an embedded SQLite database (expo-sqlite) plus AsyncStorage for preferences:")}
                </Text>
                <BulletItem
                  title={t("Holy Quran")}
                  text={t("Reading bookmarks (bookmarks table), last-read ayah (quran_cache: 'last-read'), verse notes (notes table), and personal reading plan progress (plan_entries table).")}
                />
                <BulletItem
                  title={t("Salah Tracker & Tasbih")}
                  text={t("Daily prayer completion records (salah_entries table), prayer streaks, and digital tasbih tally counts (tasbih_entries, tasbih_daily tables).")}
                />
                <BulletItem
                  title={t("Women's Worship")}
                  text={t("Cycle dates (period_entries table), purity intervals, nifas tracking (nifas_entries table), and fasting qada records (missed_fasts table, filtered by reason). Optional PIN lock via hashPin.")}
                />
                <BulletItem
                  title={t("Fasting & Zakat")}
                  text={t("Fasting history (fasting_entries table) with type (ramadan/voluntary/qada), and zakat calculations (zakat_history table).")}
                />
                <BulletItem
                  title={t("Hifz & Hadith")}
                  text={t("Hifz memorization status (hifz_entries table), saved hadiths (hadith_saved table), and read markers (hadith_recent, hadith_read_markers tables).")}
                />
                <BulletItem
                  title={t("Downloaded Media")}
                  text={t("Preloaded Quranic text editions (quran_cache table) and downloaded audio recitation files (quran_cache: 'quran-audio-downloads').")}
                />
                <BulletItem
                  title={t("Application Settings")}
                  text={t("Theme, accent color, calculation method, madhab, notification reminders, font sizes, and reciter selection (AsyncStorage keys).")}
                />
              </LegalSection>

              <LegalSection title={t("Device Permissions Used")} badge={t("Optional & Revocable")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The app requests only the minimum permissions necessary. Each is optional and can be revoked in system settings:")}
                </Text>
                <BulletItem
                  title={t("Location (Precise & Approximate)")}
                  text={t("Used strictly on-device to calculate local prayer times and determine the Qibla direction. Your coordinates are never sent to our servers or linked to your identity. You can revoke this permission anytime and choose a manual city instead.")}
                />
                <BulletItem
                  title={t("Notifications")}
                  text="Used solely to schedule local prayer alerts, Adhan playback, and Quran reminders directly on your phone. Notifications are generated locally without any external push-notification services. No microphone permission is used — the app has no voice search feature."
                />
                <BulletItem
                  title={t("Storage (Media & Files)")}
                  text={t("Required to cache Quran text, translations, and downloaded audio recitations for offline access. You can clear this in Settings → Downloads.")}
                />
              </LegalSection>

              <LegalSection title={t("What Leaves Your Device (Network Endpoints)")} badge={t("Strictly Minimal")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("No personal profile data ever leaves your phone. Network traffic is restricted exclusively to the following public endpoints:")}
                </Text>
                <BulletItem
                  title={t("Prayer Times & Hadith API")}
                  text={t("api.islamic.app — receives approximate latitude, longitude, calculation method ID, and madhab to return prayer schedules and authentic hadith collections (Bukhari, Muslim, etc.).")}
                />
                <BulletItem
                  title={t("Quran Text & Translations")}
                  text={t("AlQuran Cloud (cdn.alquran.cloud / api.alquran.cloud) — provides verified Uthmani script, surah/ayah metadata, and multilingual translations. No user identifiers sent.")}
                />
                <BulletItem
                  title={t("Quran Audio Recitations")}
                  text={t("islamic.network / EveryAyah CDNs (cdn.islamic.network, everyayah.com) — direct requests for verse-by-verse audio from reciters like Alafasy, Abdulbasit, Al-Ghamadi. No tracking parameters.")}
                />
                <BulletItem
                  title={t("Hijri Calendar")}
                  text={t("AlAdhan / Umm al-Qura algorithms (local calculation with fallback to api.aladhan.com for validation) — astronomical Hijri date conversion.")}
                />
                <BulletItem
                  title={t("City & Mosque Search")}
                  text={t("OpenStreetMap Nominatim (nominatim.openstreetmap.org) — search text queries for geocoding city names and nearby mosque discovery via Overpass API.")}
                />
                <BulletItem
                  title={t("99 Names of Allah")}
                  text={t("EsmaulHusna.org — provides authentic meanings, benefits, and commentary for the 99 Beautiful Names.")}
                />
              </LegalSection>

              <LegalSection title={t("How to Clear or Erase Your Data")} badge={t("User Controlled")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("You have complete authority over your data at all times:")}
                </Text>
                <BulletItem
                  title={t("Delete Women's Data")}
                  text={t("Settings → Women's Worship → 'Delete women's data' — instantly erases all cycle, purity, nifas, and related qada records from SQLite.")}
                />
                <BulletItem
                  title={t("Clear Fasting History")}
                  text={t("Settings → Data & Privacy → use 'Clear fasting data' (if available) or clear fasting_entries and missed_fasts tables via Backup & Restore → Export → edit → Import.")}
                />
                <BulletItem
                  title={t("Remove Downloaded Audio & Text")}
                  text={t("Settings → Downloads → 'Clear All Downloads' — removes all cached Quran text editions and downloaded audio files, freeing device storage.")}
                />
                <BulletItem
                  title={t("Reset All App Data")}
                  text={t("Settings → Backup & Restore → 'Clear All Data' — wipes SQLite database, AsyncStorage, and cached files. Or use system Settings → Apps → Islamic → Clear Storage.")}
                />
                <BulletItem
                  title={t("Backup & Restore")}
                  text={t("Settings → Backup & Restore — export all local data as a JSON file for backup, or import a previously exported backup. No cloud sync involved.")}
                />
              </LegalSection>

              <LegalSection title={t("Independent & No Cloud Lock-In")} badge={t("Zero Lock-In")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("Because the application has no cloud accounts or remote user databases, your data is entirely decentralized. You are never subject to account suspensions, remote data leaks, or unexpected cloud sync discrepancies.")}
                </Text>
              </LegalSection>
            </>
          )}

          {screen === 'licenses' && (
            <>
              <LegalSection title={t("Open Source Foundation")} badge={t("Open Source")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("This application is proudly built on open-source foundations. We stand on the shoulders of generous engineers and communities who make mobile software accessible to all.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Core Runtime & Framework")}>
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

              <LegalSection title={t("Native Modules & Utilities")}>
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

              <LegalSection title={t("Open Font Licenses (OFL)")}>
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

              <LegalSection title={t("Architecture Note")} badge={t("TanStack-Free")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The app is architected with a strict zero-dependency philosophy for data state. Networking, caching, and state synchronization use lightweight React hooks and direct SQLite queries without heavy state management bloat.")}
                </Text>
              </LegalSection>
            </>
          )}

          {screen === 'services' && (
            <>
              <LegalSection title={t("Free Public APIs & Open Data")} badge={t("Public APIs")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("The application integrates with established, free public APIs and open data initiatives across the Muslim world. None of these providers receive personal identities or user profiles.")}
                </Text>
              </LegalSection>

              <LegalSection title={t("Services Directory")}>
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

              <LegalSection title={t("Terms of External Providers")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("Each external service operates under its respective terms of service and open data attribution licenses. We are profoundly grateful to every provider for their selfless contribution to Islamic technology. May Allah reward them all abundantly.")}
                </Text>
              </LegalSection>
            </>
          )}

          {screen === 'contact' && (
            <>
              <LegalSection title={t("Community Support & Feedback")} badge={t("Open Source")}>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t("This application is developed as a community project for the Ummah. If you spot a bug, find an error in prayer timings, notice a typo in translations, or wish to propose a new feature, we welcome your feedback.")}
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
                      {t("GitHub Issue Tracker")}
                    </Text>
                    <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                      Ceoslugpk/islamic-app
                    </Text>
                  </View>
                </View>

                <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  {t("Browse existing issues, report bugs, or submit suggestions directly on our public repository.")}
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                  onPress={() => handleOpenLink('https://github.com/Ceoslugpk/islamic-app/issues')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t("Open GitHub Issues")}
                >
                  <Ionicons name="open-outline" size={16} color={colors.onAccent} />
                  <Text style={[styles.primaryButtonText, { color: colors.onAccent }]}>
                    {t("Open GitHub Issues")}
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
                  accessibilityLabel={t("View GitHub Repository")}
                >
                  <Ionicons name="logo-github" size={16} color={colors.textPrimary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                    {t("View Repository")}
                  </Text>
                </TouchableOpacity>
              </Card>

              <LegalSection title={t("Tips for Helpful Issue Reports")}>
                <BulletItem
                  title={t("Device & OS")}
                  text="Mention whether you are on Android, iOS, or Web, along with your device model."
                />
                <BulletItem
                  title={t("Prayer Location & Settings")}
                  text="For prayer time issues, specify your city/country, chosen calculation method, and madhab."
                />
                <BulletItem
                  title={t("Expected vs Actual")}
                  text="Briefly explain what you expected to happen versus what actually occurred."
                />
              </LegalSection>

              <View style={styles.footerSignoff}>
                <Text style={[styles.signoffHeart, { color: colors.textMuted }]}>
                  {t("Made for Ummah ❤️")}
                </Text>
                <Text style={[styles.signoffArabic, { color: colors.textSecondary }]}>
                  جَزَاكُمُ ٱللَّٰهُ خَيْرًا
                </Text>
                <Text style={[styles.signoffSub, { color: colors.textMuted }]}>
                  {t("May Allah reward you with goodness")}
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
