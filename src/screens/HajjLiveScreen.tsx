import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, ScreenTabs, OutlineButton, Chip } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { LiveVideoPlayer } from '../components/LiveVideoPlayer';
import { getHijriDate, HIJRI_MONTH_NAMES } from '../lib/fasting';

// Verified YouTube Channel IDs
const AL_EKHBARIYA_CHANNEL_ID = 'UCV01ajGl6nt09h40iDoHDNg'; // Official Saudi News & Live Hajj Broadcaster
const MINISTRY_HAJJ_CHANNEL_ID = 'UCA15eDKjLMPaCLpkwXlx0Fw'; // Ministry of Hajj & Umrah (وزارة الحج والعمرة)

export default function HajjLiveScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { t } = useTranslation();
  const { tokens } = useThemeTokens();
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

  const embedUrl = isHajjSeason
    ? `https://www.youtube.com/embed/live_stream?channel=${activeChannelId}&autoplay=1&mute=0`
    : undefined;
  const liveUrl = isHajjSeason
    ? `https://www.youtube.com/channel/${activeChannelId}/live`
    : undefined;
  const channelUrl = `https://www.youtube.com/channel/${activeChannelId}`;

  const openYouTubeLive = () => {
    if (!liveUrl) return;
    Linking.openURL(liveUrl).catch(() => {
      Linking.openURL(channelUrl);
    });
  };

  const openOfficialChannel = () => {
    Linking.openURL(channelUrl);
  };

  // Approximate time until next Hajj
  const monthsRemaining = hijri.month === 12 && hijri.day > 13 ? 12 : 12 - hijri.month;
  const currentHijriString = `${hijri.day} ${HIJRI_MONTH_NAMES[hijri.month - 1]} ${hijri.year} AH`;

  const channelTabs = [
    { id: 'ekhbariya', label: t('Al Ekhbariya (Live News)') },
    { id: 'ministry', label: t('Ministry of Hajj & Umrah') },
  ];

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          eyebrow={t('Hajj & Umrah')}
          title={t('Hajj Live')}
          subtitle={t('Official broadcasts from the Holy Sites of Mina, Arafat, Muzdalifah & Jamarat.')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[
          styles.content,
          { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
        ]}
      >
        {/* Channel Switcher Tabs at top */}
        <View style={{ marginBottom: 12 }}>
          <ScreenTabs
            tabs={channelTabs}
            activeTab={selectedChannel}
            onChange={(id) => setSelectedChannel(id as 'ekhbariya' | 'ministry')}
          />
        </View>

        {/* Season Status Indicator Chips */}
        <View style={[styles.seasonBanner, { marginBottom: 12 }]}>
          <Chip
            label={isHajjSeason ? t('HAJJ SEASON ACTIVE · 8–13 DHU AL-HIJJAH') : `${t('Today')}: ${currentHijriString}`}
            selected={isHajjSeason}
          />
        </View>

        {/* Off-season Explanatory Notice Card */}
        {!isHajjSeason && (
          <PremiumCard style={{ marginBottom: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={20} color={tokens.goldText} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: tokens.text }]}>
                  {t('Hajj Live Broadcast Notice')}
                </Text>
                <Text style={[styles.noticeBody, { color: tokens.muted }]}>
                  {t('Continuous multi-site live coverage across Mina, Mount Arafat, Muzdalifah, and the Jamarat bridge broadcasts during the sacred Hajj days (8–13 Dhu al-Hijjah).')}
                </Text>
                <Text style={[styles.noticeNextHajj, { color: tokens.goldText }]}>
                  {t('Next Hajj Season: 8–13 Dhu al-Hijjah')} {hijri.year + (hijri.month === 12 && hijri.day > 13 ? 1 : 0)} AH (approx. {monthsRemaining} month{monthsRemaining === 1 ? '' : 's'} away).
                </Text>
                <Text style={[styles.noticeNote, { color: tokens.muted }]}>
                  {t('Hajj live broadcasts are active exclusively during the pilgrimage season (8–13 Dhu al-Hijjah). Outside this window, recorded broadcasts and documentaries are available via the official channel.')}
                </Text>
              </View>
            </View>
          </PremiumCard>
        )}

        {/* Video Container: Mini Live Player when in season, or honest off-season card when out of season */}
        {isHajjSeason && embedUrl && liveUrl ? (
          <>
            <LiveVideoPlayer
              key={reloadKey}
              id="hajj"
              embedUrl={embedUrl}
              watchUrl={liveUrl}
              title={selectedChannel === 'ekhbariya' ? t('Al Ekhbariya Official Feed') : t('Ministry of Hajj & Umrah')}
              subtitle={t('Official broadcasting channel for Hajj proceedings')}
            />

            {/* Stream Controls for Web */}
            {Platform.OS === 'web' && (
              <View style={styles.webControls}>
                <OutlineButton
                  title={t('Reload Stream')}
                  icon="refresh"
                  onPress={() => setReloadKey((k) => k + 1)}
                  style={styles.controlBtn}
                />

                <OutlineButton
                  title={t('Open in YouTube')}
                  icon="open-outline"
                  onPress={openYouTubeLive}
                  style={styles.controlBtn}
                />
              </View>
            )}
          </>
        ) : (
          <PremiumCard style={{ marginBottom: 18, padding: 18 }}>
            <View style={styles.offSeasonHeader}>
              <View style={[styles.tvIconWrap, { backgroundColor: tokens.cardTop }]}>
                <Ionicons name="videocam-off-outline" size={22} color={tokens.goldText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.offSeasonTitle, { color: tokens.text }]}>
                  {selectedChannel === 'ekhbariya' ? t('Al Ekhbariya Official Feed') : t('Ministry of Hajj & Umrah')}
                </Text>
                <Text style={[styles.offSeasonSub, { color: tokens.muted }]}>
                  {t('Hajj live streams are unavailable outside Hajj season')}
                </Text>
              </View>
            </View>

            <Text style={[styles.offSeasonBody, { color: tokens.muted }]}>
              {t('Official multi-site broadcasts from Mina, Mount Arafat, Muzdalifah, and the Jamarat bridge air exclusively during the sacred Hajj pilgrimage (8–13 Dhu al-Hijjah). During the off-season, you can visit the verified official channel for news, documentaries, and archival coverage.')}
            </Text>

            <View style={{ marginTop: 14 }}>
              <OutlineButton
                title={t('Visit Official Channel')}
                icon="open-outline"
                onPress={openOfficialChannel}
                accessibilityLabel={t('Visit Official Channel')}
              />
            </View>
          </PremiumCard>
        )}

        {/* The Holy Sites of Hajj Overview */}
        <Text style={[styles.cardLead, { color: tokens.goldText, marginBottom: 8, paddingHorizontal: 4 }]}>
          {t('SACRED GEOGRAPHY')}
        </Text>
        {[
          {
            title: t('1. Mina (منى) — The City of Tents'),
            badge: t('8, 10–13 Dhu al-Hijjah'),
            desc: t('Located 8 km east of Makkah. More than 100,000 air-conditioned white Teflon-coated tents house millions of pilgrims on the 8th, 10th, 11th, 12th, and 13th of Dhu al-Hijjah. Site of the Jamarat stoning bridge.'),
          },
          {
            title: t('2. Mount Arafat & Plain of Arafah (جبل عرفات)'),
            badge: t('9th Dhu al-Hijjah'),
            desc: t('20 km southeast of Makkah. The granite hill of Jabal ar-Rahmah (Mount of Mercy) rises in the plain where Prophet Muhammad ﷺ delivered the Farewell Sermon. Pilgrims assemble here on the 9th of Dhu al-Hijjah from midday to sunset.'),
          },
          {
            title: t('3. Muzdalifah (مزدلفة)'),
            badge: t('Night of 9th Dhu al-Hijjah'),
            desc: t("An open plain between Mina and Arafah. Pilgrims arrive here after sunset on the 9th to pray Maghrib and Isha combined, rest under the stars, collect Jamarat pebbles, and make supplication at Al-Mash'ar al-Haram."),
          },
        ].map((site) => (
          <PremiumCard key={site.title} style={{ marginBottom: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.siteName, { color: tokens.text, flex: 1, marginRight: 8 }]}>
                {site.title}
              </Text>
              <Chip label={site.badge} selected={false} style={{ height: 26, paddingHorizontal: 8 }} />
            </View>
            <Text style={[styles.siteDesc, { color: tokens.muted }]}>
              {site.desc}
            </Text>
          </PremiumCard>
        ))}

        {/* The Farewell Sermon Reflection */}
        <PremiumCard style={{ marginBottom: 20, padding: 16 }}>
          <Text style={[styles.cardTitle, { color: tokens.text, marginBottom: 6 }]}>
            {t("From the Farewell Sermon (Khutbat al-Wada')")}
          </Text>
          <ArabicText style={[styles.sermonArabic, { color: tokens.text }]}>
            يَا أَيُّهَا النَّاسُ، إِنَّ رَبَّكُمْ وَاحِدٌ، وَإِنَّ أَبَاكُمْ وَاحِدٌ، كُلُّكُمْ لِآدَمَ، وَآدَمُ مِنْ تُرَابٍ، لَا فَضْلَ لِعَرَبِيٍّ عَلَىٰ أَعْجَمِيٍّ، وَلَا لِعَجَمِيٍّ عَلَىٰ عَرَبِيٍّ، وَلَا لِأَحْمَرَ عَلَىٰ أَسْوَدَ، وَلَا لِأَسْوَدَ عَلَىٰ أَحْمَرَ إِلَّا بِالتَّقْوَىٰ
          </ArabicText>
          <Text style={[styles.sermonTrans, { color: tokens.muted }]}>
            {t('"O people, indeed your Lord is One, and your father is one. All of you are from Adam, and Adam was made from dust. An Arab has no superiority over a non-Arab, nor does a non-Arab have any superiority over an Arab; nor does a red person have superiority over a black person, nor a black person over a red person, except by piety."')}
          </Text>
          <Text style={[styles.sermonRef, { color: tokens.muted }]}>
            {t('Musnad Ahmad 23489 · Authentic (Sahih)')}
          </Text>
        </PremiumCard>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 10 },
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
  offSeasonHeader: {
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
  offSeasonTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  offSeasonSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  offSeasonBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  webControls: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  controlBtn: {
    flex: 1,
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
