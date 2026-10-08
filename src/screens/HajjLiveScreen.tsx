import React, { useState, useMemo } from 'react';
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
import { getHijriDate, HIJRI_MONTH_NAMES } from '../lib/fasting';

// Verified YouTube Channel IDs
const AL_EKHBARIYA_CHANNEL_ID = 'UCV01ajGl6nt09h40iDoHDNg'; // Official Saudi News & Live Hajj Broadcaster
const MINISTRY_HAJJ_CHANNEL_ID = 'UCA15eDKjLMPaCLpkwXlx0Fw'; // Ministry of Hajj & Umrah (وزارة الحج والعمرة)

export default function HajjLiveScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 720);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [selectedChannel, setSelectedChannel] = useState<'ekhbariya' | 'ministry'>('ekhbariya');
  const [reloadKey, setReloadKey] = useState(0);

  // Compute Hijri date for Hajj season detection
  const hijri = useMemo(() => getHijriDate(new Date()), []);
  const isHajjSeason = hijri.month === 12 && hijri.day >= 8 && hijri.day <= 13;

  const activeChannelId =
    selectedChannel === 'ekhbariya' ? AL_EKHBARIYA_CHANNEL_ID : MINISTRY_HAJJ_CHANNEL_ID;

  const embedUrl = `https://www.youtube.com/embed/live_stream?channel=${activeChannelId}&autoplay=1&mute=0`;
  const liveUrl = `https://www.youtube.com/channel/${activeChannelId}/live`;
  const channelUrl = `https://www.youtube.com/channel/${activeChannelId}`;

  const openYouTubeLive = () => {
    Linking.openURL(liveUrl).catch(() => {
      Linking.openURL(channelUrl);
    });
  };

  const openChannel = () => {
    Linking.openURL(channelUrl);
  };

  // Approximate time until next Hajj
  const monthsRemaining = hijri.month === 12 && hijri.day > 13 ? 12 : 12 - hijri.month;
  const currentHijriString = `${hijri.day} ${HIJRI_MONTH_NAMES[hijri.month - 1]} ${hijri.year} AH`;

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
        title={t('Hajj Live')}
        subtitle={t('Official broadcasts from the Holy Sites of Mina, Arafat, Muzdalifah & Jamarat.')}
        onBack={onBack}
        backLabel={t('Tools')}
      />

      {/* Season Status Indicator */}
      <View style={styles.seasonBanner}>
        {isHajjSeason ? (
          <View style={[styles.statusBadge, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
            <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>
              {t('HAJJ SEASON ACTIVE · 8–13 DHU AL-HIJJAH')}
            </Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Ionicons name="calendar-outline" size={13} color={colors.accent} />
            <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>
              {t('Today')}: {currentHijriString}
            </Text>
          </View>
        )}
      </View>

      {/* Off-season Explanatory Notice Card */}
      {!isHajjSeason && (
        <Card style={{ marginBottom: 14, padding: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>
                {t('Hajj Live Broadcast Notice')}
              </Text>
              <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>
                {t('Continuous multi-site live coverage across Mina, Mount Arafat, Muzdalifah, and the Jamarat bridge broadcasts during the sacred Hajj days (8–13 Dhu al-Hijjah).')}
              </Text>
              <Text style={[styles.noticeNextHajj, { color: colors.accent }]}>
                {t('Next Hajj Season: 8–13 Dhu al-Hijjah')} {hijri.year + (hijri.month === 12 && hijri.day > 13 ? 1 : 0)} AH (approx. {monthsRemaining} month{monthsRemaining === 1 ? '' : 's'} away).
              </Text>
              <Text style={[styles.noticeNote, { color: colors.textMuted }]}>
                {t('The live stream below provides official 24/7 Saudi national broadcasts, Grand Mosque coverage, and Hajj Ministry documentation throughout the year.')}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Channel Switcher */}
      <View style={styles.channelSwitcher}>
        <TouchableOpacity
          style={[
            styles.switchBtn,
            {
              backgroundColor: selectedChannel === 'ekhbariya' ? colors.accent : colors.bgSurface,
              borderColor: selectedChannel === 'ekhbariya' ? colors.accent : colors.borderSubtle,
            },
          ]}
          onPress={() => setSelectedChannel('ekhbariya')}
        >
          <Text
            style={[
              styles.switchBtnText,
              { color: selectedChannel === 'ekhbariya' ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            {t('Al Ekhbariya (Live News & Events)')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchBtn,
            {
              backgroundColor: selectedChannel === 'ministry' ? colors.accent : colors.bgSurface,
              borderColor: selectedChannel === 'ministry' ? colors.accent : colors.borderSubtle,
            },
          ]}
          onPress={() => setSelectedChannel('ministry')}
        >
          <Text
            style={[
              styles.switchBtnText,
              { color: selectedChannel === 'ministry' ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            {t('Ministry of Hajj & Umrah')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Video Container: Mini Live Player (HLS native / YouTube embed web / fallback) */}
      <LiveVideoPlayer
        id="hajj"
        embedUrl={embedUrl}
        watchUrl={liveUrl}
        title={selectedChannel === 'ekhbariya' ? t('Al Ekhbariya Official Feed') : t('Ministry of Hajj & Umrah')}
        subtitle={t('Official broadcasting channel for Hajj proceedings')}
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

      {/* The Holy Sites of Hajj Overview */}
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={[styles.cardLead, { color: colors.accent }]}>{t('SACRED GEOGRAPHY')}</Text>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
          {t('The Holy Sites of Hajj')}
        </Text>

        <View style={styles.siteItem}>
          <Text style={[styles.siteName, { color: colors.textPrimary }]}>
            {t('1. Mina (منى) — The City of Tents')}
          </Text>
          <Text style={[styles.siteDesc, { color: colors.textSecondary }]}>
            {t('Located 8 km east of Makkah. More than 100,000 air-conditioned white Teflon-coated tents house millions of pilgrims on the 8th, 10th, 11th, 12th, and 13th of Dhu al-Hijjah. Site of the Jamarat stoning bridge.')}
          </Text>
        </View>

        <Hairline style={{ marginVertical: 10 }} />

        <View style={styles.siteItem}>
          <Text style={[styles.siteName, { color: colors.textPrimary }]}>
            {t('2. Mount Arafat & Plain of Arafah (جبل عرفات)')}
          </Text>
          <Text style={[styles.siteDesc, { color: colors.textSecondary }]}>
            {t('20 km southeast of Makkah. The granite hill of Jabal ar-Rahmah (Mount of Mercy) rises in the plain where Prophet Muhammad ﷺ delivered the Farewell Sermon. Pilgrims assemble here on the 9th of Dhu al-Hijjah from midday to sunset.')}
          </Text>
        </View>

        <Hairline style={{ marginVertical: 10 }} />

        <View style={styles.siteItem}>
          <Text style={[styles.siteName, { color: colors.textPrimary }]}>
            {t('3. Muzdalifah (مزدلفة)')}
          </Text>
          <Text style={[styles.siteDesc, { color: colors.textSecondary }]}>
            {t("An open plain between Mina and Arafah. Pilgrims arrive here after sunset on the 9th to pray Maghrib and Isha combined, rest under the stars, collect Jamarat pebbles, and make supplication at Al-Mash'ar al-Haram.")}
          </Text>
        </View>
      </Card>

      {/* The Farewell Sermon Reflection */}
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 6 }]}>
          {t("From the Farewell Sermon (Khutbat al-Wada')")}
        </Text>
        <ArabicText style={[styles.sermonArabic, { color: colors.textPrimary }]}>
          يَا أَيُّهَا النَّاسُ، إِنَّ رَبَّكُمْ وَاحِدٌ، وَإِنَّ أَبَاكُمْ وَاحِدٌ، كُلُّكُمْ لِآدَمَ، وَآدَمُ مِنْ تُرَابٍ، لَا فَضْلَ لِعَرَبِيٍّ عَلَىٰ أَعْجَمِيٍّ، وَلَا لِعَجَمِيٍّ عَلَىٰ عَرَبِيٍّ، وَلَا لِأَحْمَرَ عَلَىٰ أَسْوَدَ، وَلَا لِأَسْوَدَ عَلَىٰ أَحْمَرَ إِلَّا بِالتَّقْوَىٰ
        </ArabicText>
        <Text style={[styles.sermonTrans, { color: colors.textSecondary }]}>
          {t('"O people, indeed your Lord is One, and your father is one. All of you are from Adam, and Adam was made from dust. An Arab has no superiority over a non-Arab, nor does a non-Arab have any superiority over an Arab; nor does a red person have superiority over a black person, nor a black person over a red person, except by piety."')}
        </Text>
        <Text style={[styles.sermonRef, { color: colors.textMuted }]}>
          {t('Musnad Ahmad 23489 · Authentic (Sahih)')}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
  seasonBanner: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 0.6,
  },
  noticeTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  noticeBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 6,
  },
  noticeNextHajj: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  noticeNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
  },
  channelSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  switchBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
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
  siteItem: {
    marginVertical: 2,
  },
  siteName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    marginBottom: 3,
  },
  siteDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  sermonArabic: {
    fontSize: 17,
    lineHeight: 28,
    marginVertical: 8,
  },
  sermonTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  sermonRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
});
