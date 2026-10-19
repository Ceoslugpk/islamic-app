import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { AppText } from '../components/ui/AppText';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { LiveVideoPlayer } from '../components/LiveVideoPlayer';

const MADINAH_CHANNEL_ID = 'UCROKYPep-UuODNwyipe6JMw'; // Official Saudi Sunnah TV (قناة السنة النبوية)
const MADINAH_EMBED_URL = `https://www.youtube.com/embed/live_stream?channel=${MADINAH_CHANNEL_ID}&autoplay=1&mute=0`;
const MADINAH_LIVE_URL = `https://www.youtube.com/channel/${MADINAH_CHANNEL_ID}/live`;
const MADINAH_CHANNEL_URL = `https://www.youtube.com/channel/${MADINAH_CHANNEL_ID}`;

export default function MadinahLiveScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [reloadKey, setReloadKey] = useState(0);

  const openYouTubeLive = () => {
    Linking.openURL(MADINAH_LIVE_URL).catch(() => {
      Linking.openURL(MADINAH_CHANNEL_URL);
    });
  };

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Hajj & Umrah')}
          title={t('Madinah Live')}
          subtitle={t('24/7 Official High-Definition Live Broadcast from Al-Masjid an-Nabawi.')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        key={reloadKey}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: paddingH },
        ]}
        style={{ flex: 1 }}
      >
        <View style={styles.contentWrap}>
          {/* Virtues of the Prophet's Mosque */}
          <PremiumCard style={{ marginBottom: 14 }}>
            <AppText variant="eyebrow" highlight style={styles.cardLead}>{t('CITY OF THE MESSENGER ﷺ')}</AppText>
            <AppText variant="sectionTitle" style={styles.cardTitle}>
              {t('Virtues of Al-Masjid an-Nabawi')}
            </AppText>
            <ArabicText style={[styles.hadithArabic, { color: tokens.muted }]}>
              صَلَاةٌ فِي مَسْجِدِي هَذَا أَفْضَلُ مِنْ أَلْفِ صَلَاةٍ فِيمَا سِوَاهُ إِلَّا الْمَسْجِدَ الْحَرَامَ
            </ArabicText>
            <AppText variant="body" style={styles.hadithTranslation}>
              {t('The Messenger of Allah ﷺ said: "One prayer in this mosque of mine is better than one thousand prayers elsewhere, except the Sacred Mosque in Makkah."')}
            </AppText>
            <AppText variant="caption" tone="faint" style={styles.hadithRef}>
              {t('Sahih al-Bukhari 1190 · Sahih Muslim 1394')}
            </AppText>
          </PremiumCard>

          {/* Live Badge Bar */}
          <View style={styles.statusBar}>
            <View style={[styles.liveIndicator, { backgroundColor: tokens.danger + '20' }]}>
              <View style={[styles.liveDot, { backgroundColor: tokens.danger }]} />
              <AppText variant="caption" tone="danger" style={styles.liveText}>{t('LIVE STREAM')}</AppText>
            </View>
            <AppText variant="caption" tone="faint" style={styles.channelTag}>
              {t('قناة السنة النبوية · Saudi Sunnah TV')}
            </AppText>
          </View>

          {/* Video Container: Mini Live Player (HLS native / YouTube embed web / fallback) */}
          <LiveVideoPlayer
            id="madinah"
            embedUrl={MADINAH_EMBED_URL}
            watchUrl={MADINAH_LIVE_URL}
            title={t('Live Stream from Madinah')}
            subtitle={t('Official 24/7 HD feed from Al-Masjid an-Nabawi')}
          />

          {/* Stream Controls for Web */}
          {Platform.OS === 'web' && (
            <View style={styles.webControls}>
              <TouchableOpacity
                style={[styles.controlBtn, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}
                onPress={() => setReloadKey((k) => k + 1)}
                accessibilityRole="button"
                accessibilityLabel={t('Reload Stream')}
              >
                <Ionicons name="refresh" size={14} color={tokens.goldText} />
                <AppText variant="rowTitle" style={styles.controlBtnText}>
                  {t('Reload Stream')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}
                onPress={openYouTubeLive}
                accessibilityRole="button"
                accessibilityLabel={t('Open in YouTube')}
              >
                <Ionicons name="open-outline" size={14} color={tokens.goldText} />
                <AppText variant="rowTitle" style={styles.controlBtnText}>
                  {t('Open in YouTube')}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* Ar-Rawdah ash-Sharifah */}
          <PremiumCard style={{ marginBottom: 14 }}>
            <AppText variant="sectionTitle" style={[styles.cardTitle, { marginBottom: 8 }]}>
              {t('Ar-Rawdah ash-Sharifah (الروضة الشريفة)')}
            </AppText>
            <ArabicText style={[styles.hadithArabic, { color: tokens.muted }]}>
              مَا بَيْنَ بَيْتِي وَمِنْبَرِي رَوْضَةٌ مِنْ رِيَاضِ الْجَنَّةِ، وَمِنْبَرِي عَلَىٰ حَوْضِي
            </ArabicText>
            <AppText variant="body" style={styles.hadithTranslation}>
              {t('The Prophet ﷺ said: "Between my house and my pulpit is a garden from the gardens of Paradise, and my pulpit is above my pool (Al-Kawthar)."')}
            </AppText>
            <AppText variant="caption" tone="faint" style={styles.hadithRef}>
              {t('Sahih al-Bukhari 1196 · Sahih Muslim 1391')}
            </AppText>

            <Hairline style={{ marginVertical: 12 }} />

            <AppText variant="subtitle" style={styles.landmarkDesc}>
              {t("The Rawdah is recognized in the mosque by its distinct green carpeting, contrasting with the dark red carpets throughout the rest of the Prophet's Mosque. Pilgrims visit to offer voluntary prayers and make personal supplications in this heavenly sanctuary.")}
            </AppText>
          </PremiumCard>

          {/* Salawat and Greeting upon the Prophet */}
          <PremiumCard style={{ marginBottom: 0 }}>
            <AppText variant="sectionTitle" style={[styles.cardTitle, { marginBottom: 6 }]}>
              {t('Salawat & Greeting Upon the Beloved ﷺ')}
            </AppText>
            <ArabicText style={[styles.hadithArabic, { color: tokens.text }]}>
              السَّلَامُ عَلَيْكَ يَا رَسُولَ اللَّهِ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، أَشْهَدُ أَنَّكَ قَدْ بَلَّغْتَ الرِّسَالَةَ، وَأَدَّيْتَ الْأَمَانَةَ، وَنَصَحْتَ الْأُمَّةَ
            </ArabicText>
            <AppText variant="body" style={styles.hadithTranslation}>
              {t('"Peace be upon you, O Messenger of Allah, and the mercy of Allah and His blessings. I bear witness that you have conveyed the message, fulfilled the trust, and advised the nation faithfully."')}
            </AppText>
            <AppText variant="caption" tone="faint" style={styles.hadithRef}>
              {t("Sunnah greeting when passing the Prophet's noble chamber")}
            </AppText>
          </PremiumCard>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    minWidth: 0,
  },
  content: {},
  statusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 22,
    borderRadius: 12,
    flexShrink: 0,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.8,
    paddingVertical: 2,
  },
  channelTag: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    flexShrink: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 10,
  },
  webControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  controlBtnText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    paddingVertical: 2,
  },
  cardLead: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
    paddingVertical: 2,
  },
  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  hadithArabic: {
    fontSize: 17,
    marginVertical: 8,
  },
  hadithTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  hadithRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    paddingVertical: 2,
  },
  landmarkDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
  },
});
