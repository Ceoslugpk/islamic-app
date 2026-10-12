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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { LiveVideoPlayer } from '../components/LiveVideoPlayer';

const MAKKAH_VIDEO_ID = 'eC4LfEVxvKg'; // بث مباشر || قناة القرآن الكريم Makkah Live
const MAKKAH_CHANNEL_ID = 'UCos52azQNBgW63_9uDJoPDA'; // Official Saudi Quran TV (قناة القرآن الكريم)
const MAKKAH_EMBED_URL = `https://www.youtube.com/embed/${MAKKAH_VIDEO_ID}?autoplay=1&mute=0&rel=0`;
const MAKKAH_LIVE_URL = `https://www.youtube.com/watch?v=${MAKKAH_VIDEO_ID}`;
const MAKKAH_CHANNEL_URL = `https://www.youtube.com/channel/${MAKKAH_CHANNEL_ID}`;

export default function MakkahLiveScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 720);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [reloadKey, setReloadKey] = useState(0);

  const openYouTubeLive = () => {
    Linking.openURL(MAKKAH_LIVE_URL).catch(() => {
      Linking.openURL(MAKKAH_CHANNEL_URL);
    });
  };

  const openChannel = () => {
    Linking.openURL(MAKKAH_CHANNEL_URL);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[
        styles.content,
        { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
      ]}
    >
      <ScreenHeader
        eyebrow={t('Hajj & Umrah')}
        title={t('Makkah Live TV')}
        subtitle={t('24/7 Official High-Definition Live Broadcast from Al-Masjid Al-Haram.')}
        onBack={onBack}
        backLabel={t('Tools')}
      />

      {/* Live Badge Bar */}
      <View style={styles.statusBar}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('LIVE STREAM')}</Text>
        </View>
        <Text style={[styles.channelTag, { color: colors.textSecondary }]}>
          {t('قناة القرآن الكريم · Saudi Quran TV')}
        </Text>
      </View>

      {/* Video Container: Mini Live Player (HLS native / YouTube embed web / fallback) */}
      <LiveVideoPlayer
        id="makkah"
        embedUrl={MAKKAH_EMBED_URL}
        watchUrl={MAKKAH_LIVE_URL}
        title={t('Live Stream from Makkah')}
        subtitle={t('Official 24/7 HD feed from Al-Masjid Al-Haram')}
      />

      {/* Stream Controls for Web */}
      {Platform.OS === 'web' && (
        <View style={styles.webControls}>
          <TouchableOpacity
            style={[styles.controlBtn, { borderColor: colors.borderSubtle }]}
            onPress={() => setReloadKey((k) => k + 1)}
          >
            <Ionicons name="refresh" size={14} color={colors.accent} />
            <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>
              {t('Reload Stream')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { borderColor: colors.borderSubtle }]}
            onPress={openYouTubeLive}
          >
            <Ionicons name="open-outline" size={14} color={colors.accent} />
            <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>
              {t('Open in YouTube')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sacred Sanctuary Virtues Card */}
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={[styles.cardLead, { color: colors.accent }]}>{t('SACRED SANCTUARY')}</Text>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('Virtues of Al-Masjid Al-Haram')}
        </Text>
        <ArabicText style={[styles.hadithArabic, { color: colors.textSecondary }]}>
          صَلَاةٌ فِي الْمَسْجِدِ الْحَرَامِ أَفْضَلُ مِنْ مِائَةِ أَلْفِ صَلَاةٍ فِيمَا سِوَاهُ
        </ArabicText>
        <Text style={[styles.hadithTranslation, { color: colors.textSecondary }]}>
          {t('The Messenger of Allah ﷺ said: "One prayer in the Sacred Mosque is better than one hundred thousand prayers elsewhere."')}
        </Text>
        <Text style={[styles.hadithRef, { color: colors.textMuted }]}>
          {t('Sunan Ibn Majah 1406 · Authentic (Sahih)')}
        </Text>
      </Card>

      {/* Key Landmarks in View */}
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
          {t('Sacred Landmarks Visible on Stream')}
        </Text>

        <View style={styles.landmarkItem}>
          <Text style={[styles.landmarkName, { color: colors.textPrimary }]}>
            {t('The Holy Kaaba (الكعبة المشرفة)')}
          </Text>
          <Text style={[styles.landmarkDesc, { color: colors.textSecondary }]}>
            {t('The first house established for the worship of Allah on Earth, rebuilt by Prophet Ibrahim and Ismail (peace be upon them). Draped in the hand-woven black silk Kiswah adorned with gold Quranic calligraphy.')}
          </Text>
        </View>

        <Hairline style={{ marginVertical: 10 }} />

        <View style={styles.landmarkItem}>
          <Text style={[styles.landmarkName, { color: colors.textPrimary }]}>
            {t('Al-Hajar al-Aswad (الحجر الأسود)')}
          </Text>
          <Text style={[styles.landmarkDesc, { color: colors.textSecondary }]}>
            {t('The Black Stone set into the eastern corner of the Kaaba. It marks the starting and finishing boundary line for each of the seven circuits of Tawaf.')}
          </Text>
        </View>

        <Hairline style={{ marginVertical: 10 }} />

        <View style={styles.landmarkItem}>
          <Text style={[styles.landmarkName, { color: colors.textPrimary }]}>
            {t('Maqam Ibrahim (مقام إبراهيم)')}
          </Text>
          <Text style={[styles.landmarkDesc, { color: colors.textSecondary }]}>
            {t('The golden crystal enclosure preserving the stone footprint upon which Prophet Ibrahim (peace be upon him) stood while elevating the upper stones of the Kaaba walls.')}
          </Text>
        </View>

        <Hairline style={{ marginVertical: 10 }} />

        <View style={styles.landmarkItem}>
          <Text style={[styles.landmarkName, { color: colors.textPrimary }]}>
            {t('Hijr Ismail / Al-Hateem (حجر إسماعيل)')}
          </Text>
          <Text style={[styles.landmarkDesc, { color: colors.textSecondary }]}>
            {t('The low white marble semi-circular wall facing the northern wall of the Kaaba. It constitutes part of the original foundations of the Kaaba.')}
          </Text>
        </View>
      </Card>

      {/* Spiritual Etiquette Card */}
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 6 }]}>
          {t("Du'a Upon Seeing the Kaaba")}
        </Text>
        <ArabicText style={[styles.hadithArabic, { color: colors.textPrimary }]}>
          اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً، وَزِدْ مَنْ شَرَّفَهُ وَعَظَّمَهُ مِمَّنْ حَجَّهُ أَوِ اعْتَمَرَهُ تَشْرِيفًا وَتَكْرِيمًا وَتَعْظِيمًا وَبِرًّا
        </ArabicText>
        <Text style={[styles.hadithTranslation, { color: colors.textSecondary }]}>
          {t('"O Allah, increase this House in honor, esteem, respect, and reverence; and increase whoever honors and respects it from those who perform Hajj or Umrah in honor, respect, esteem, and piety."')}
        </Text>
        <Text style={[styles.hadithRef, { color: colors.textMuted }]}>
          {t('Al-Sunan al-Kubra by al-Bayhaqi (5/73)')}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
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
    borderRadius: 18,
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
    borderRadius: 14,
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
    borderRadius: 22,
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
    borderRadius: 14,
  },
  primaryActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
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
  landmarkItem: {
    marginVertical: 2,
  },
  landmarkName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    marginBottom: 3,
  },
  landmarkDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
});
