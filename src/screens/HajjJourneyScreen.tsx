import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';

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

const HAJJ_DAYS: HajjDay[] = [
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
}: {
  onBack?: () => void;
  onOpenDuas?: () => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [selectedDayId, setSelectedDayId] = useState<string>('day-8');

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[
        styles.content,
        { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH },
      ]}
    >
      <ScreenHeader
        eyebrow="Hajj & Umrah"
        title="Hajj Journey"
        subtitle="The day-by-day pilgrimage chronicle: from Yawm al-Tarwiyah to the Farewell Tawaf."
        onBack={onBack}
        backLabel="Tools"
      />

      {/* Quick Day Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {HAJJ_DAYS.map((d) => {
          const isActive = d.id === selectedDayId;
          return (
            <TouchableOpacity
              key={d.id}
              style={[
                styles.dayChip,
                {
                  backgroundColor: isActive ? colors.accent : colors.bgSurface,
                  borderColor: isActive ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setSelectedDayId(d.id)}
            >
              <Text
                style={[
                  styles.dayChipNum,
                  { color: isActive ? '#FFFFFF' : colors.accent },
                ]}
              >
                {d.dayNumber}
              </Text>
              <Text
                style={[
                  styles.dayChipDate,
                  { color: isActive ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {d.hijriDate.split(' ')[0]} {d.hijriDate.split(' ')[1]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hajj Pillars Summary Card */}
      <Card style={{ marginBottom: 18, padding: 16 }}>
        <Text style={[styles.pillarsLead, { color: colors.accent }]}>
          THE 4 PILLARS OF HAJJ (ARKAN)
        </Text>
        <Text style={[styles.pillarsTitle, { color: colors.textPrimary }]}>
          Essential Foundations of the Pilgrimage
        </Text>
        <Text style={[styles.pillarsBody, { color: colors.textSecondary }]}>
          1. Ihram (Intention) · 2. Wuquf at Arafah (Standing on 9th) · 3. Tawaf al-Ifadah (Circumambulation on 10th) · 4. Sa&apos;i between Safa and Marwah. Missing any pillar invalidates Hajj.
        </Text>
      </Card>

      {/* Days Details */}
      {HAJJ_DAYS.map((day) => {
        const isSelected = day.id === selectedDayId;
        return (
          <Card
            key={day.id}
            style={{
              marginBottom: 18,
              padding: 18,
              borderWidth: isSelected ? 1.5 : 1,
              borderColor: isSelected ? colors.accent : colors.borderSubtle,
            }}
          >
            {/* Header */}
            <View style={styles.dayTopRow}>
              <View
                style={[
                  styles.dayTag,
                  { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                ]}
              >
                <Text style={[styles.dayTagText, { color: colors.accent }]}>
                  {day.dayNumber.toUpperCase()} · {day.hijriDate}
                </Text>
              </View>
            </View>

            <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
              {day.title}
            </Text>

            <ArabicText style={[styles.dayArabicTitle, { color: colors.textSecondary }]}>
              {day.arabicTitle}
            </ArabicText>

            {/* Location Banner */}
            <View
              style={[
                styles.locationBanner,
                { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="navigate-outline" size={14} color={colors.accent} />
              <Text style={[styles.locationBannerText, { color: colors.textSecondary }]}>
                {day.location}
              </Text>
            </View>

            <Text style={[styles.daySummary, { color: colors.textSecondary }]}>
              {day.summary}
            </Text>

            <Hairline style={{ marginVertical: 14 }} />

            {/* Key Rituals */}
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary }]}>
              Day Rituals &amp; Fiqh Obligations
            </Text>
            {day.rituals.map((r, ri) => {
              const obligationColor =
                r.obligation === 'Pillar (Rukn)'
                  ? '#EF4444'
                  : r.obligation === 'Obligatory (Wajib)'
                  ? colors.accent
                  : '#10B981';

              return (
                <View key={ri} style={styles.ritualCard}>
                  <View style={styles.ritualHeader}>
                    <Text style={[styles.ritualName, { color: colors.textPrimary }]}>
                      {r.name}
                    </Text>
                    <View style={[styles.obligationBadge, { borderColor: obligationColor }]}>
                      <Text style={[styles.obligationText, { color: obligationColor }]}>
                        {r.obligation}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.ritualDesc, { color: colors.textSecondary }]}>
                    {r.description}
                  </Text>
                </View>
              );
            })}

            {/* Duas Section */}
            {day.duas && day.duas.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, marginTop: 10 }]}>
                  Pivotal Supplications
                </Text>
                {day.duas.map((d, di) => (
                  <View
                    key={di}
                    style={[
                      styles.duaBox,
                      { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.duaBoxTitle, { color: colors.accent }]}>
                      {d.title}
                    </Text>
                    <ArabicText style={[styles.duaBoxArabic, { color: colors.textPrimary }]}>
                      {d.arabic}
                    </ArabicText>
                    <Text style={[styles.duaBoxTranslit, { color: colors.textSecondary }]}>
                      {d.transliteration}
                    </Text>
                    <Text style={[styles.duaBoxTrans, { color: colors.textMuted }]}>
                      &quot;{d.translation}&quot;
                    </Text>
                    <Text style={[styles.duaBoxRef, { color: colors.textMuted }]}>
                      {d.reference}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Practical Notes */}
            <View
              style={[
                styles.tipsBox,
                { backgroundColor: colors.bgBase, borderColor: colors.accent + '30' },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="compass-outline" size={15} color={colors.accent} />
                <Text style={[styles.tipsBoxTitle, { color: colors.accent }]}>
                  Pilgrim Logistics &amp; Advice
                </Text>
              </View>
              {day.practicalNotes.map((pn, pni) => (
                <Text key={pni} style={[styles.tipsBoxText, { color: colors.textSecondary }]}>
                  • {pn}
                </Text>
              ))}
            </View>
          </Card>
        );
      })}

      {/* Library link card */}
      {onOpenDuas && (
        <Card style={{ marginBottom: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.footerCardTitle, { color: colors.textPrimary }]}>
                Full Supplications Repository
              </Text>
              <Text style={[styles.footerCardSub, { color: colors.textMuted }]}>
                Explore the complete Hajj &amp; Umrah Duas collection with audio and translations.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.footerCardBtn, { backgroundColor: colors.accent }]}
              onPress={onOpenDuas}
              accessibilityRole="button"
              accessibilityLabel="Open Hajj Duas"
            >
              <Text style={styles.footerCardBtnText}>Explore Duas</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 10, paddingBottom: 40 },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
  },
  dayChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dayChipNum: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  dayChipDate: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  pillarsLead: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  pillarsTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 21,
    marginBottom: 4,
  },
  pillarsBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  dayTopRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  dayTagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  dayTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    marginTop: 4,
  },
  dayArabicTitle: {
    fontSize: 16,
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 8,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  locationBannerText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  daySummary: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ritualCard: {
    marginBottom: 10,
    paddingVertical: 2,
  },
  ritualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  ritualName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
    flex: 1,
  },
  obligationBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 8,
  },
  obligationText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  ritualDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  duaBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  duaBoxTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  duaBoxArabic: {
    fontSize: 17,
    lineHeight: 26,
    marginVertical: 4,
  },
  duaBoxTranslit: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 4,
  },
  duaBoxTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  duaBoxRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
  },
  tipsBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  tipsBoxTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  tipsBoxText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  footerCardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  footerCardSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  footerCardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  footerCardBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
});
