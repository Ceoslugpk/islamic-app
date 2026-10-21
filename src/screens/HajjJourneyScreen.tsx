import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, fontRoles, cardTokens } from '../theme/tokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, PrimaryButton, Chip } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { hScrollRTLStyle } from '../lib/rtl';

interface HajjDay {
  id: string;
  dayNumber: string;
  hijriDate: string;
  title: string;
  arabicTitle: string;
  theme: string;
  location: string;
  summary: string;
  rituals: {
    name: string;
    description: string;
    obligation: 'Pillar (Rukn)' | 'Obligatory (Wajib)' | 'Sunnah';
  }[];
  duas?: {
    title: string;
    arabic: string;
    transliteration: string;
    translation: string;
    reference: string;
  }[];
  practicalNotes: string[];
}

export const HAJJ_DAYS: HajjDay[] = [
  {
    id: 'day-8',
    dayNumber: 'Day 1',
    hijriDate: '8th Dhu al-Hijjah',
    title: 'Yawm al-Tarwiyah (The Day of Reflection)',
    arabicTitle: 'يوم التروية',
    theme: 'Preparation & Moving to Mina',
    location: 'Makkah Residence → Tent City of Mina',
    summary:
      'Pilgrims enter the state of Ihram from their residence in Makkah, formulate their intention for Hajj, chant the Talbiyah, and move to the sprawling tent city of Mina to spend the day in prayer and spiritual reflection.',
    rituals: [
      {
        name: 'Entering Ihram from Makkah',
        description: 'Perform Ghusl, put on Ihram garments, and declare intention: "Labbayk Allahumma Hajjan" (لَبَّيْكَ اللَّهُمَّ حَجًّا).',
        obligation: 'Pillar (Rukn)',
      },
      {
        name: 'Journeying to Mina',
        description: 'Depart Makkah in the morning and settle into designated tents in Mina.',
        obligation: 'Sunnah',
      },
      {
        name: 'Prayers in Mina',
        description: 'Pray Dhuhr, Asr, Maghrib, Isha, and the next morning\'s Fajr shortened (Qasr — 2 rak\'ahs for 4-rak\'ah prayers) on time, without combining.',
        obligation: 'Sunnah',
      },
      {
        name: 'Overnight in Mina',
        description: 'Resting and spending the night of the 9th in Mina preparing heart and mind for the Day of Arafah.',
        obligation: 'Sunnah',
      },
    ],
    duas: [
      {
        title: 'Niyyah for Hajj',
        arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا',
        transliteration: 'Labbayk Allahumma Hajjan',
        translation: 'Here I am, O Allah, for Hajj.',
        reference: 'Sahih Muslim 1251',
      },
      {
        title: 'The Talbiyah of Hajj',
        arabic:
          'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
        transliteration:
          'Labbayk Allahumma labbayk, labbayka la shareeka laka labbayk, innal-hamda wan-ni\'mata laka wal-mulk, la shareeka lak',
        translation:
          'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Truly all praise and blessings are Yours, and all sovereignty. You have no partner.',
        reference: 'Sahih al-Bukhari 1549',
      },
    ],
    practicalNotes: [
      'Drink plenty of fluids; the Mina valley can be dry and warm.',
      'Memorize your camp/zone number and street letter in Mina. Take a screenshot of your tent location in Nusuk.',
    ],
  },
  {
    id: 'day-9',
    dayNumber: 'Day 2',
    hijriDate: '9th Dhu al-Hijjah',
    title: 'Yawm Arafah (The Pinnacle of Hajj)',
    arabicTitle: 'يوم عرفة والمزدلفة',
    theme: 'Wuquf at Arafah & Night at Muzdalifah',
    location: 'Plains of Arafah → Muzdalifah',
    summary:
      'The supreme day of the entire pilgrimage. The Prophet ﷺ declared: "Hajj is Arafah." Pilgrims stand before Allah with open hands and weeping eyes, begging for forgiveness and mercy until the sun sets, then proceed peacefully to Muzdalifah.',
    rituals: [
      {
        name: 'Arrival at Arafah',
        description: 'Move to the plains of Arafah after sunrise. Settle into the camps before solar noon (Zawal).',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Khutbah & Combined Prayer',
        description: 'Listen to the Arafah sermon at Masjid Namirah (or broadcast in camp), then combine and shorten Dhuhr and Asr at Dhuhr time.',
        obligation: 'Sunnah',
      },
      {
        name: 'Wuquf (The Standing at Arafah)',
        description: 'Spend from midday until sunset standing or sitting facing the Qibla, raising hands continuously in supplication and repentance. Presence within Arafah boundaries is essential.',
        obligation: 'Pillar (Rukn)',
      },
      {
        name: 'Departure (Ifadah) to Muzdalifah',
        description: 'After the sun sets completely, leave Arafah for Muzdalifah with calmness and composure without praying Maghrib at Arafah.',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Maghrib & Isha at Muzdalifah',
        description: 'Upon arrival at Muzdalifah, combine Maghrib (3) and Isha (shortened to 2) with one adhan and two iqamahs.',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Pebble Collection & Night Rest',
        description: 'Collect pebble stones (chickpea-sized) for stoning the Jamarat (at least 7 for tomorrow, or 49/70 for all days). Rest under the open sky until Fajr.',
        obligation: 'Sunnah',
      },
    ],
    duas: [
      {
        title: 'The Best Supplication on the Day of Arafah',
        arabic:
          'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration:
          'La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa \'ala kulli shay\'in qadeer',
        translation:
          'There is no deity except Allah alone without partner, to Him belongs sovereignty and all praise, and He has power over all things.',
        reference: 'Jami\' at-Tirmidhi 3585',
      },
    ],
    practicalNotes: [
      'Ensure you remain strictly inside the boundary signs of Arafah until after sunset.',
      'Do not rush during the transit to Muzdalifah; practice patience amid heavy bus queues.',
    ],
  },
  {
    id: 'day-10',
    dayNumber: 'Day 3',
    hijriDate: '10th Dhu al-Hijjah',
    title: 'Yawm al-Nahr (Eid al-Adha & Major Rites)',
    arabicTitle: 'يوم النحر وعيد الأضحى',
    theme: 'Stoning, Sacrifice, Haircut & Tawaf al-Ifadah',
    location: 'Muzdalifah → Mina → Makkah Haram → Mina',
    summary:
      'The most action-packed day of Hajj. Pilgrims stone the Big Jamarah, perform animal sacrifice, shave or trim hair to achieve the first Tahallul, and travel to Makkah for the pivotal Tawaf al-Ifadah and Sa\'i.',
    rituals: [
      {
        name: 'Fajr & Mash\'ar al-Haram',
        description: 'Pray Fajr at dawn in Muzdalifah, stand facing Qibla making dua until just before sunrise, then proceed to Mina.',
        obligation: 'Sunnah',
      },
      {
        name: 'Ramy Jamarat al-Aqaba (Big Pillar)',
        description: 'Stone the largest pillar with 7 pebbles one by one, saying "Allahu Akbar" with each throw. Cease Talbiyah with the first pebble.',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Hady (Animal Sacrifice)',
        description: 'Slaughter sacrificial livestock (or purchase authorized official voucher via Adahi/Islamic Development Bank).',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Halq or Taqsir (First Tahallul)',
        description: 'Men shave head completely or trim evenly; women trim fingertip length. All Ihram prohibitions lifted EXCEPT marital relations.',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Tawaf al-Ifadah & Sa\'i in Makkah',
        description: 'Proceed to Al-Masjid Al-Haram to perform Tawaf al-Ifadah (major Hajj pillar) and Sa\'i. With this, Tahallul al-Akbar is achieved (all prohibitions lifted).',
        obligation: 'Pillar (Rukn)',
      },
      {
        name: 'Return to Mina',
        description: 'Return to Mina before midnight to spend the night in the tents.',
        obligation: 'Obligatory (Wajib)',
      },
    ],
    practicalNotes: [
      'The order of rites on the 10th (Stoning → Sacrifice → Haircut → Tawaf) is Sunnah, but if done out of sequence, the Prophet ﷺ permitted it with: "Do it, and there is no harm" (Bukhari).',
      'Wear regular clothes after shaving/trimming before proceeding to Makkah for Tawaf al-Ifadah.',
    ],
  },
  {
    id: 'days-11-12',
    dayNumber: 'Days 4–5',
    hijriDate: '11th & 12th Dhu al-Hijjah',
    title: 'Ayyam al-Tashreeq (Stoning the Three Pillars)',
    arabicTitle: 'أيام التشريق والتعجل',
    theme: 'Days of Eating, Drinking & Remembrance',
    location: 'Mina Jamarat Bridge',
    summary:
      'The Prophet ﷺ said: "The days of Tashreeq are days of eating, drinking, and remembrance of Allah." Pilgrims stone all three Jamarat after midday each day. Those wishing to depart early may leave Mina before sunset on the 12th.',
    rituals: [
      {
        name: 'Stoning after Solar Noon (Zawal)',
        description: 'Stone each of the 3 pillars in strict sequence: Small (Sughra) with 7 pebbles, Medium (Wusta) with 7 pebbles, and Large (Aqaba) with 7 pebbles (21 pebbles each day).',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Prolonged Supplication',
        description: 'After stoning the Small and Medium Jamarat, step to the side facing the Qibla and make long, heartfelt personal du\'a.',
        obligation: 'Sunnah',
      },
      {
        name: 'Overnight Stay in Mina',
        description: 'Spend the majority of the night within the boundaries of Mina.',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Early Departure (Ta\'ajjul)',
        description: 'Pilgrims choosing early departure may exit Mina before sunset on the 12th after completing the stoning.',
        obligation: 'Sunnah',
      },
    ],
    practicalNotes: [
      'Stoning before Zawal is not permitted according to the majority of scholars; wait until the call to Dhuhr prayer before proceeding.',
      'Organized schedules: Follow your group\'s assigned time slot on the multi-level Jamarat bridge to avoid peak crowd surges.',
    ],
  },
  {
    id: 'day-13',
    dayNumber: 'Day 6',
    hijriDate: '13th Dhu al-Hijjah',
    title: 'Final Tashreeq & Tawaf al-Wida\' (Farewell)',
    arabicTitle: 'طواف الوداع وخاتمة الحج',
    theme: 'Completion of Mina & Farewell to Makkah',
    location: 'Mina Jamarat → Al-Masjid Al-Haram',
    summary:
      'For pilgrims who stay the 13th (Ta\'akhkhur), they stone the three Jamarat one last time after midday. Before leaving Makkah to return home, all pilgrims perform the Farewell Tawaf (Tawaf al-Wida\') as their final act in the sacred city.',
    rituals: [
      {
        name: 'Stoning on the 13th',
        description: 'Stone all three pillars after Zawal (21 pebbles), gaining greater spiritual reward as mentioned in Quran (2:203).',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Departure from Mina',
        description: 'Pack belongings and leave Mina permanently for Makkah.',
        obligation: 'Obligatory (Wajib)',
      },
      {
        name: 'Tawaf al-Wida\' (The Farewell Tawaf)',
        description: 'Circumambulate the Kaaba 7 times immediately before departing Makkah. No Sa\'i is required. Women in menses or postpartum bleeding are exempt.',
        obligation: 'Obligatory (Wajib)',
      },
    ],
    duas: [
      {
        title: 'Farewell Supplication at the Kaaba',
        arabic:
          'اللَّهُمَّ هَذَا بَيْتُكَ وَأَنَا عَبْدُكَ، حَمَلْتَنِي عَلَىٰ مَا سَخَّرْتَ لِي مِنْ خَلْقِكَ، فَلَا تَجْعَلْ هَذَا آخِرَ الْعَهْدِ مِنْ بَيْتِكَ الْحَرَامِ',
        transliteration:
          'Allahumma hadha baytuka wa ana \'abduk, hamaltanee \'ala ma sakh-kharta lee min khalqik, fala taj\'al hadha aakhiral-\'ahdi min baytikal-haram',
        translation:
          'O Allah, this is Your House and I am Your servant. You carried me upon that which You subjected for me of Your creation, so do not let this be the last time I visit Your Sacred House.',
        reference: 'Classical Pilgrimage Supplications',
      },
    ],
    practicalNotes: [
      'Pack all bags and finalize hotel checkout before Tawaf al-Wida\' so you can depart directly to the airport or train station.',
      'Pray for acceptance: "Rabbana taqabbal minna innaka Antas-Sami\'ul-\'Aleem."',
    ],
  },
];

export default function HajjJourneyScreen({
  onBack,
  onOpenDuas,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  onOpenDuas?: () => void;
  backLabel?: string;
}) {
  const { t } = useTranslation();
  const { tokens } = useThemeTokens();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [selectedDayId, setSelectedDayId] = useState<string>('day-8');
  const scrollRef = useRef<ScrollView | null>(null);
  const dayOffsets = useRef<Record<string, number>>({});

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          eyebrow={t('Sacred Pilgrimage')}
          title={t('Hajj Journey')}
          subtitle={t('Day-by-day rites from Yawm al-Tarwiyah in Mina to the Farewell Tawaf at the Kaaba.')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[
          styles.content,
          { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
        ]}
      >
        {/* Quick Day Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.chipsScroll, hScrollRTLStyle()]}
        >
          {HAJJ_DAYS.map((d) => {
            const isActive = d.id === selectedDayId;
            return (
              <Chip
                key={d.id}
                label={`${t(d.dayNumber)} · ${t(d.hijriDate)}`}
                selected={isActive}
                onPress={() => {
                  setSelectedDayId(d.id);
                  const offset = dayOffsets.current[d.id];
                  if (offset !== undefined) {
                    scrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
                  }
                }}
                style={styles.dayChip}
              />
            );
          })}
        </ScrollView>

        {/* Hajj Pillars Summary Card */}
        <PremiumCard
          style={styles.pillarsCard}
          borderRadius={cardTokens.borderRadius}
          padded
        >
          <View style={styles.pillarsHeaderRow}>
            <View style={[styles.badge, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
              <Ionicons name="sparkles" size={13} color={tokens.goldText} />
              <AppText variant="eyebrow" highlight style={styles.badgeText}>
                {t('THE 4 PILLARS OF HAJJ (ARKAN)')}
              </AppText>
            </View>
          </View>
          <AppText variant="title" style={styles.pillarsTitle}>
            {t('Essential Foundations of the Pilgrimage')}
          </AppText>
          <AppText variant="body" tone="faint" style={styles.pillarsBody}>
            {t("1. Ihram (Intention) · 2. Wuquf at Arafah (Standing on 9th) · 3. Tawaf al-Ifadah (Circumambulation on 10th) · 4. Sa'i between Safa and Marwah. Missing any pillar invalidates Hajj.")}
          </AppText>
        </PremiumCard>

        {/* Days Details */}
        {HAJJ_DAYS.map((day, di) => {
          const isSelected = day.id === selectedDayId;
          const isLastDay = di === HAJJ_DAYS.length - 1;
          return (
            <View
              key={day.id}
              onLayout={(event) => { dayOffsets.current[day.id] = event.nativeEvent.layout.y; }}
            >
            <PremiumCard
              style={[
                styles.dayCard,
                isSelected && {
                  borderColor: tokens.gold,
                },
                !onOpenDuas && isLastDay && { marginBottom: 0 },
              ]}
              borderRadius={cardTokens.borderRadius}
              padded
              contentStyle={styles.readingContent}
            >
              {/* Header */}
              <View style={styles.dayTopRow}>
                <View
                  style={[
                    styles.dayTag,
                    {
                      backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                      borderColor: isSelected ? tokens.gold : tokens.cardBorder,
                    },
                  ]}
                >
                  <AppText
                    variant="eyebrow"
                    tone={isSelected ? 'onGold' : undefined}
                    highlight={!isSelected}
                    style={styles.dayTagText}
                  >
                    {t(day.dayNumber).toUpperCase()} · {t(day.hijriDate)}
                  </AppText>
                </View>
              </View>

              <AppText variant="title" style={styles.dayTitle}>
                {t(day.title)}
              </AppText>

              <ArabicText style={[styles.dayArabicTitle, { color: tokens.muted }]}>
                {day.arabicTitle}
              </ArabicText>

              {/* Location Banner */}
              <View
                style={[
                  styles.locationBanner,
                  {
                    backgroundColor: tokens.inset,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <Ionicons name="navigate-outline" size={14} color={tokens.goldText} />
                <AppText variant="caption" tone="faint" style={styles.locationBannerText}>
                  {t(day.location)}
                </AppText>
              </View>

              <AppText variant="body" tone="faint" style={styles.daySummary}>
                {t(day.summary)}
              </AppText>

              <Hairline style={{ marginVertical: 14 }} />

              {/* Key Rituals */}
              <AppText variant="sectionTitle" style={styles.sectionSubtitle}>
                {t('Day Rituals & Fiqh Obligations')}
              </AppText>
              {day.rituals.map((r, ri) => {
                const obligationColor =
                  r.obligation === 'Pillar (Rukn)'
                    ? tokens.danger
                    : r.obligation === 'Obligatory (Wajib)'
                    ? tokens.goldText
                    : tokens.success;

                return (
                  <View
                    key={ri}
                    style={[
                      styles.ritualCard,
                      {
                        backgroundColor: tokens.inset,
                        borderColor: tokens.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.ritualHeader}>
                      <AppText variant="rowTitle" style={styles.ritualName}>
                        {t(r.name)}
                      </AppText>
                      <View style={[styles.obligationBadge, { borderColor: obligationColor }]}>
                        <AppText variant="caption" style={[styles.obligationText, { color: obligationColor }]}>
                          {t(r.obligation)}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="body" tone="faint" style={styles.ritualDesc}>
                      {t(r.description)}
                    </AppText>
                  </View>
                );
              })}

              {/* Duas Section */}
              {day.duas && day.duas.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <AppText variant="sectionTitle" style={[styles.sectionSubtitle, { marginTop: 10 }]}>
                    {t('Pivotal Supplications')}
                  </AppText>
                  {day.duas.map((d, di) => (
                    <View
                      key={di}
                      style={[
                        styles.duaBox,
                        {
                          backgroundColor: tokens.inset,
                          borderColor: tokens.cardBorder,
                        },
                      ]}
                    >
                      <AppText variant="rowTitle" highlight style={styles.duaBoxTitle}>
                        {t(d.title)}
                      </AppText>
                      <ArabicText style={[styles.duaBoxArabic, { color: tokens.text }]}>
                        {d.arabic}
                      </ArabicText>
                      <AppText variant="subtitle" tone="faint" style={styles.duaBoxTranslit}>
                        {d.transliteration}
                      </AppText>
                      <AppText variant="body" tone="faint" style={styles.duaBoxTrans}>
                        &quot;{t(d.translation)}&quot;
                      </AppText>
                      <AppText variant="caption" tone="faint" style={styles.duaBoxRef}>
                        {t('Source')}: {d.reference}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}

              {/* Practical Notes */}
              <View
                style={[
                  styles.tipsBox,
                  {
                    backgroundColor: tokens.inset,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="compass-outline" size={15} color={tokens.goldText} />
                  <AppText variant="rowTitle" highlight style={styles.tipsBoxTitle}>
                    {t('Pilgrim Logistics & Advice')}
                  </AppText>
                </View>
                {day.practicalNotes.map((pn, pni) => (
                  <AppText key={pni} variant="body" tone="faint" style={styles.tipsBoxText}>
                    • {t(pn)}
                  </AppText>
                ))}
              </View>
            </PremiumCard>
            </View>
          );
        })}

        {/* Library link card */}
        {onOpenDuas && (
          <PremiumCard
            style={{ marginBottom: 0 }}
            borderRadius={cardTokens.borderRadius}
            contentStyle={{ padding: 16 }}
          >
            <View style={styles.footerRow}>
              <View style={{ minWidth: 0, gap: 4 }}>
                <AppText variant="sectionTitle" style={styles.footerCardTitle}>
                  {t('Full Supplications Repository')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.footerCardSub}>
                  {t('Explore the complete Hajj & Umrah Duas collection with audio and translations.')}
                </AppText>
              </View>
              <PrimaryButton
                title={t('Explore Duas')}
                onPress={onOpenDuas}
                accessibilityLabel={t('Open Hajj Duas')}
              />
            </View>
          </PremiumCard>
        )}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  readingContent: { padding: 20, gap: 4 },
  content: {},
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  dayChip: {
    minHeight: 44,
  },
  pillarsCard: {
    marginBottom: 18,
  },
  pillarsHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  pillarsLead: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  pillarsTitle: {
    fontSize: 20,
    marginBottom: 6,
  },
  pillarsBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  dayCard: {
    marginBottom: 18,
  },
  dayTopRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayTagText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  dayTitle: {
    fontSize: 22,
    marginTop: 4,
  },
  dayArabicTitle: {
    fontFamily: fontRoles.arabic,
    fontSize: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  footerRow: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  locationBannerText: {
    flexShrink: 1,
    fontSize: 12,
  },
  daySummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ritualCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ritualHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ritualName: {
    fontSize: 14,
    flex: 1,
    minWidth: 0,
  },
  obligationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginStart: 8,
  },
  obligationText: {
    fontSize: 12,
  },
  ritualDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  duaBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  duaBoxTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  duaBoxArabic: {
    fontFamily: fontRoles.arabic,
    fontSize: 18,
    lineHeight: 28,
    marginVertical: 4,
  },
  duaBoxTranslit: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 4,
  },
  duaBoxTrans: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  duaBoxRef: {
    fontSize: 12,
  },
  tipsBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  tipsBoxTitle: {
    fontSize: 14,
  },
  tipsBoxText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  footerCardTitle: {
    fontSize: 15,
  },
  footerCardSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },
});
