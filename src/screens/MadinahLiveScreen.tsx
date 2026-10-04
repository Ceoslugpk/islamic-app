import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';

const MADINAH_CHANNEL_ID = 'UCROKYPep-UuODNwyipe6JMw'; // Official Saudi Sunnah TV (قناة السنة النبوية)
const MADINAH_EMBED_URL = `https://www.youtube.com/embed/live_stream?channel=${MADINAH_CHANNEL_ID}&autoplay=1&mute=0`;
const MADINAH_LIVE_URL = `https://www.youtube.com/channel/${MADINAH_CHANNEL_ID}/live`;
const MADINAH_CHANNEL_URL = `https://www.youtube.com/channel/${MADINAH_CHANNEL_ID}`;

export default function MadinahLiveScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 720);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [reloadKey, setReloadKey] = useState(0);

  const openYouTubeLive = () => {
    Linking.openURL(MADINAH_LIVE_URL).catch(() => {
      Linking.openURL(MADINAH_CHANNEL_URL);
    });
  };

  const openChannel = () => {
    Linking.openURL(MADINAH_CHANNEL_URL);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[
        styles.content,
        { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
      ]}
    >
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Tools</Text>
        </TouchableOpacity>
      )}

      <SectionHeader
        compact
        eyebrow="Hajj & Umrah"
        title="Madinah Live"
        subtitle="24/7 Official High-Definition Live Broadcast from Al-Masjid an-Nabawi."
      />

      {/* Live Badge Bar */}
      <View style={styles.statusBar}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE STREAM</Text>
        </View>
        <Text style={[styles.channelTag, { color: colors.textSecondary }]}>
          قناة السنة النبوية · Saudi Sunnah TV
        </Text>
      </View>

      {/* Video Container: Web iframe vs Native Fallback */}
      {Platform.OS === 'web' ? (
        <View
          key={reloadKey}
          style={[
            styles.playerContainer,
            { backgroundColor: '#000000', borderColor: colors.borderSubtle },
          ]}
        >
          {React.createElement('iframe', {
            src: MADINAH_EMBED_URL,
            title: 'Madinah Live Stream - Saudi Sunnah TV',
            style: {
              width: '100%',
              height: '100%',
              border: 0,
            },
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowFullScreen: true,
          })}
        </View>
      ) : (
        <Card style={{ marginBottom: 18, padding: 18 }}>
          <View style={styles.nativeCardHeader}>
            <View style={[styles.tvIconWrap, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="tv-outline" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nativeTitle, { color: colors.textPrimary }]}>
                Live Stream from Madinah
              </Text>
              <Text style={[styles.nativeSub, { color: colors.textMuted }]}>
                Official 24/7 HD feed from Al-Masjid an-Nabawi
              </Text>
            </View>
          </View>

          <Text style={[styles.nativeBody, { color: colors.textSecondary }]}>
            The embedded web player runs seamlessly on the Web version of the app. On your mobile device, launch the official uninterrupted YouTube stream directly in the YouTube app or your browser:
          </Text>

          <View style={styles.nativeActions}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
              onPress={openYouTubeLive}
              accessibilityRole="button"
              accessibilityLabel="Watch Madinah Live on YouTube"
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Watch Live on YouTube</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, { borderColor: colors.borderSubtle }]}
              onPress={openChannel}
              accessibilityRole="button"
              accessibilityLabel="Open Saudi Sunnah TV Channel"
            >
              <Ionicons name="logo-youtube" size={16} color={colors.textSecondary} />
              <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
                Saudi Sunnah TV
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Stream Controls for Web */}
      {Platform.OS === 'web' && (
        <View style={styles.webControls}>
          <TouchableOpacity
            style={[styles.controlBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => setReloadKey((k) => k + 1)}
          >
            <Ionicons name="refresh" size={14} color={colors.accent} />
            <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>
              Reload Stream
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { borderColor: colors.borderSubtle }]}
            onPress={openYouTubeLive}
          >
            <Ionicons name="open-outline" size={14} color={colors.accent} />
            <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>
              Open in YouTube
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Virtues of the Prophet's Mosque */}
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={[styles.cardLead, { color: colors.accent }]}>CITY OF THE MESSENGER ﷺ</Text>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Virtues of Al-Masjid an-Nabawi
        </Text>
        <ArabicText style={[styles.hadithArabic, { color: colors.textSecondary }]}>
          صَلَاةٌ فِي مَسْجِدِي هَذَا أَفْضَلُ مِنْ أَلْفِ صَلَاةٍ فِيمَا سِوَاهُ إِلَّا الْمَسْجِدَ الْحَرَامَ
        </ArabicText>
        <Text style={[styles.hadithTranslation, { color: colors.textSecondary }]}>
          The Messenger of Allah ﷺ said: &quot;One prayer in this mosque of mine is better than one thousand prayers elsewhere, except the Sacred Mosque in Makkah.&quot;
        </Text>
        <Text style={[styles.hadithRef, { color: colors.textMuted }]}>
          Sahih al-Bukhari 1190 · Sahih Muslim 1394
        </Text>
      </Card>

      {/* Ar-Rawdah ash-Sharifah */}
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
          Ar-Rawdah ash-Sharifah (الروضة الشريفة)
        </Text>
        <ArabicText style={[styles.hadithArabic, { color: colors.textSecondary }]}>
          مَا بَيْنَ بَيْتِي وَمِنْبَرِي رَوْضَةٌ مِنْ رِيَاضِ الْجَنَّةِ، وَمِنْبَرِي عَلَىٰ حَوْضِي
        </ArabicText>
        <Text style={[styles.hadithTranslation, { color: colors.textSecondary }]}>
          The Prophet ﷺ said: &quot;Between my house and my pulpit is a garden from the gardens of Paradise, and my pulpit is above my pool (Al-Kawthar).&quot;
        </Text>
        <Text style={[styles.hadithRef, { color: colors.textMuted }]}>
          Sahih al-Bukhari 1196 · Sahih Muslim 1391
        </Text>

        <Hairline style={{ marginVertical: 12 }} />

        <Text style={[styles.landmarkDesc, { color: colors.textSecondary }]}>
          The Rawdah is recognized in the mosque by its distinct green carpeting, contrasting with the dark red carpets throughout the rest of the Prophet&apos;s Mosque. Pilgrims visit to offer voluntary prayers and make personal supplications in this heavenly sanctuary.
        </Text>
      </Card>

      {/* Salawat and Greeting upon the Prophet */}
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 6 }]}>
          Salawat &amp; Greeting Upon the Beloved ﷺ
        </Text>
        <ArabicText style={[styles.hadithArabic, { color: colors.textPrimary }]}>
          السَّلَامُ عَلَيْكَ يَا رَسُولَ اللَّهِ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، أَشْهَدُ أَنَّكَ قَدْ بَلَّغْتَ الرِّسَالَةَ، وَأَدَّيْتَ الْأَمَانَةَ، وَنَصَحْتَ الْأُمَّةَ
        </ArabicText>
        <Text style={[styles.hadithTranslation, { color: colors.textSecondary }]}>
          &quot;Peace be upon you, O Messenger of Allah, and the mercy of Allah and His blessings. I bear witness that you have conveyed the message, fulfilled the trust, and advised the nation faithfully.&quot;
        </Text>
        <Text style={[styles.hadithRef, { color: colors.textMuted }]}>
          Sunnah greeting when passing the Prophet&apos;s noble chamber
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#EF4444',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  channelTag: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
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
    gap: 10,
    marginBottom: 18,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  controlBtnText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  nativeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tvIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  nativeSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  nativeBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  nativeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12.5,
  },
  cardLead: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  hadithArabic: {
    fontSize: 17,
    lineHeight: 28,
    marginVertical: 8,
  },
  hadithTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  hadithRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  landmarkDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
});
