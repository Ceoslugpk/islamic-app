import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
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
import { AppText } from '../components/ui/AppText';
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
            interactive={false}
            numberOfLines={0}
            style={styles.seasonChip}
          />
        </View>

        {/* Off-season Explanatory Notice Card */}
        {!isHajjSeason && (
          <PremiumCard style={{ marginBottom: 14 }} contentStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={20} color={tokens.goldText} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="rowTitle" style={styles.noticeTitle}>
                  {t('Hajj Live Broadcast Notice')}
                </AppText>
                <AppText variant="body" tone="faint" style={styles.noticeBody}>
                  {t('Continuous multi-site live coverage across Mina, Mount Arafat, Muzdalifah, and the Jamarat bridge broadcasts during the sacred Hajj days (8–13 Dhu al-Hijjah).')}
                </AppText>
                <AppText variant="caption" highlight style={styles.noticeNextHajj}>
                  {t('Next Hajj Season: 8–13 Dhu al-Hijjah')} {hijri.year + (hijri.month === 12 && hijri.day > 13 ? 1 : 0)} AH (approx. {monthsRemaining} month{monthsRemaining === 1 ? '' : 's'} away).
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.noticeNote}>
                  {t('Hajj live broadcasts are active exclusively during the pilgrimage season (8–13 Dhu al-Hijjah). Outside this window, recorded broadcasts and documentaries are available via the official channel.')}
                </AppText>
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
          <PremiumCard style={{ marginBottom: 18 }} contentStyle={{ padding: 18 }}>
            <View style={styles.offSeasonHeader}>
              <View style={[styles.tvIconWrap, { backgroundColor: tokens.cardTop }]}>
                <Ionicons name="videocam-off-outline" size={22} color={tokens.goldText} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="sectionTitle" style={styles.offSeasonTitle}>
                  {selectedChannel === 'ekhbariya' ? t('Al Ekhbariya Official Feed') : t('Ministry of Hajj & Umrah')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.offSeasonSub}>
                  {t('Hajj live streams are unavailable outside Hajj season')}
                </AppText>
              </View>
            </View>

            <AppText variant="body" style={styles.offSeasonBody}>
              {t('Official multi-site broadcasts from Mina, Mount Arafat, Muzdalifah, and the Jamarat bridge air exclusively during the sacred Hajj pilgrimage (8–13 Dhu al-Hijjah). During the off-season, you can visit the verified official channel for news, documentaries, and archival coverage.')}
            </AppText>

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
        <AppText variant="eyebrow" highlight style={[styles.cardLead, { marginBottom: 8, paddingHorizontal: 4 }]}>
          {t('SACRED GEOGRAPHY')}
        </AppText>
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
          <PremiumCard key={site.title} style={{ marginBottom: 12 }} contentStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AppText variant="rowTitle" style={[styles.siteName, { flex: 1, minWidth: 140, marginEnd: 8 }]}>
                {site.title}
              </AppText>
              <View
                style={[
                  styles.siteBadge,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.cardBorder,
                  },
                ]}
                accessibilityRole="text"
              >
                <AppText variant="caption" tone="faint" style={styles.siteBadgeText}>
                  {site.badge}
                </AppText>
              </View>
            </View>
            <AppText variant="subtitle" style={styles.siteDesc}>
              {site.desc}
            </AppText>
          </PremiumCard>
        ))}

        {/* The Farewell Sermon Reflection */}
        <PremiumCard style={{ marginBottom: 0 }} contentStyle={{ padding: 16 }}>
          <AppText variant="sectionTitle" style={[styles.cardTitle, { marginBottom: 6 }]}>
            {t("From the Farewell Sermon (Khutbat al-Wada')")}
          </AppText>
          <ArabicText style={[styles.sermonArabic, { color: tokens.text }]}>
            يَا أَيُّهَا النَّاسُ، إِنَّ رَبَّكُمْ وَاحِدٌ، وَإِنَّ أَبَاكُمْ وَاحِدٌ، كُلُّكُمْ لِآدَمَ، وَآدَمُ مِنْ تُرَابٍ، لَا فَضْلَ لِعَرَبِيٍّ عَلَىٰ أَعْجَمِيٍّ، وَلَا لِعَجَمِيٍّ عَلَىٰ عَرَبِيٍّ، وَلَا لِأَحْمَرَ عَلَىٰ أَسْوَدَ، وَلَا لِأَسْوَدَ عَلَىٰ أَحْمَرَ إِلَّا بِالتَّقْوَىٰ
          </ArabicText>
          <AppText variant="body" style={styles.sermonTrans}>
            {t('"O people, indeed your Lord is One, and your father is one. All of you are from Adam, and Adam was made from dust. An Arab has no superiority over a non-Arab, nor does a non-Arab have any superiority over an Arab; nor does a red person have superiority over a black person, nor a black person over a red person, except by piety."')}
          </AppText>
          <AppText variant="caption" tone="faint" style={styles.sermonRef}>
            {t('Musnad Ahmad 23489 · Authentic (Sahih)')}
          </AppText>
        </PremiumCard>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: {},
  seasonBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  seasonChip: {
    maxWidth: '100%',
    paddingVertical: 6,
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
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 14,
    lineHeight: 19,
  },
  webControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
  },
  controlBtn: {
    flex: 1,
    minHeight: 44,
    minWidth: 120,
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
    fontSize: 14,
    marginBottom: 3,
  },
  siteDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  siteBadge: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  sermonArabic: {
    fontSize: 17,
    lineHeight: 28,
    marginVertical: 8,
  },
  sermonTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 4,
  },
  sermonRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
});
