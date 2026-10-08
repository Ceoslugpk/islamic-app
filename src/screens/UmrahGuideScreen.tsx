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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';

interface UmrahStep {
  id: string;
  stepNumber: number;
  title: string;
  arabicTitle: string;
  stageName: string;
  description: string;
  location: string;
  keyActions: string[];
  duas?: {
    title: string;
    arabic: string;
    transliteration: string;
    translation: string;
    reference: string;
  }[];
  criticalNotes?: string[];
}

const UMRAH_STEPS: UmrahStep[] = [
  {
    id: 'ihram',
    stepNumber: 1,
    title: 'Ihram & Niyyah',
    arabicTitle: 'الإحرام والنية',
    stageName: 'At the Miqat boundary',
    location: 'Designated Miqat boundary (or flight entry point)',
    description:
      'Entering the sacred state of consecration (Ihram) before crossing the Miqat. It involves physical purification, donning the prescribed garments, formulating the sincere intention for Umrah, and reciting the Talbiyah.',
    keyActions: [
      'Perform Ghusl (ritual bath) and trim nails/mustache before entering Ihram.',
      'Men wear two seamless white sheets (Izar wrapped around waist, Rida draped over shoulders). Head must remain uncovered.',
      'Women wear modest, loose regular clothing of any color, leaving the face and hands uncovered (no niqab or gloves in Ihram).',
      'Formulate the Niyyah (intention): "Labbayk Allahumma Umrah" (لَبَّيْكَ اللَّهُمَّ عُمْرَةً).',
      'Begin reciting the Talbiyah aloud (men) or softly (women) continuously until seeing the Kaaba.',
    ],
    duas: [
      {
        title: 'Niyyah for Umrah (The Intention)',
        arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً',
        transliteration: 'Labbayk Allahumma \'Umrah',
        translation: 'Here I am, O Allah, for an Umrah.',
        reference: 'Sahih Muslim 1251',
      },
      {
        title: 'The Talbiyah',
        arabic:
          'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
        transliteration:
          'Labbayk Allahumma labbayk, labbayka la shareeka laka labbayk, innal-hamda wan-ni\'mata laka wal-mulk, la shareeka lak',
        translation:
          'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Truly all praise and blessings are Yours, and all sovereignty. You have no partner.',
        reference: 'Sahih al-Bukhari 1549',
      },
    ],
    criticalNotes: [
      'Crossing the Miqat without Ihram requires expiation (Dam - sacrificing a sheep in Makkah).',
      'Prohibitions in Ihram: No perfume, no cutting hair or nails, no marital intimacy, no hunting, no stitched clothing conforming to limbs for men.',
    ],
  },
  {
    id: 'entering-haram',
    stepNumber: 2,
    title: 'Entering Al-Masjid Al-Haram',
    arabicTitle: 'دخول المسجد الحرام',
    stageName: 'Arrival in Makkah',
    location: 'Gates of Al-Masjid Al-Haram',
    description:
      'Arriving at the Grand Mosque in Makkah with humility, awe, and reverence. Step in with the right foot and supplicate for Allah\'s infinite mercy.',
    keyActions: [
      'Stop reciting the Talbiyah upon reaching the Kaaba.',
      'Enter the Mosque with the right foot first and say the standard mosque entrance dua.',
      'When gazing upon the Kaaba for the first time, raise hands and make heartfelt du\'a — this is a moment when supplications are answered.',
    ],
    duas: [
      {
        title: 'Entering Makkah and Al-Masjid Al-Haram',
        arabic:
          'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، فَحَيِّنَا رَبَّنَا بِالسَّلَامِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
        transliteration:
          'Allahumma Antas-Salamu wa minkas-salam, fa-hayyina Rabbana bis-salam, Allahummaf-tah lee abwaba rahmatik',
        translation:
          'O Allah, You are Peace and from You is peace, so greet us our Lord with peace. O Allah, open for me the doors of Your mercy.',
        reference: 'Sunan al-Bayhaqi 5/73 / Sahih Muslim 713',
      },
    ],
  },
  {
    id: 'tawaf',
    stepNumber: 3,
    title: 'Tawaf Around the Kaaba',
    arabicTitle: 'طواف القدوم',
    stageName: '7 Anti-Clockwise Circuits',
    location: 'Mataf (Courtyard of the Kaaba)',
    description:
      'Circumambulating the Holy Kaaba seven complete times in a state of ritual purity (Wudu), beginning and ending at the Black Stone (Hajar al-Aswad) with the Kaaba on your left.',
    keyActions: [
      'Purity (Wudu) is an obligatory condition for Tawaf according to majority of scholars.',
      'Men perform Idtiba\' (اضطباع): Uncover the right shoulder by passing the upper garment under the right armpit and draped over the left shoulder (for Tawaf only).',
      'Start in line with the Black Stone (marked by green light on the Haram wall). Point the right hand towards it and recite: "Bismillahi Allahu Akbar" (بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ).',
      'Men perform Ramal (رَمَل): A brisk walk with short quick paces during the first 3 circuits, followed by normal walking in the remaining 4 circuits.',
      'Supplicate freely during circumambulation; there are no fixed words except between the Yemeni Corner and the Black Stone.',
      'Touch the Yemeni Corner (Rukn al-Yamani) with the right hand without kissing if accessible, otherwise pass without pointing.',
      'After the 7th circuit: Cover both shoulders (end Idtiba\'). Pray 2 Rak\'ahs behind Maqam Ibrahim (or anywhere in the Haram), reciting Surah al-Kafirun in the 1st rak\'ah and Surah al-Ikhlas in the 2nd.',
      'Drink Zamzam water from the dispensers, make du\'a, and pour some over your head.',
    ],
    duas: [
      {
        title: 'Between Yemeni Corner & Black Stone',
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        transliteration:
          'Rabbana aatina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina \'adhaban-nar',
        translation:
          'Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.',
        reference: 'Quran 2:201 / Sunan Abi Dawood 1892',
      },
    ],
    criticalNotes: [
      'Hijr Ismail (Al-Hateem): The semi-circular walled area is part of the interior Kaaba. Walking INSIDE it invalidates that circuit. You must walk OUTSIDE the wall.',
      'Avoid pushing, shoving, or attempting to kiss the Black Stone if it causes harm to fellow worshippers.',
    ],
  },
  {
    id: 'sai',
    stepNumber: 4,
    title: 'Sa\'i between Safa and Marwah',
    arabicTitle: 'السعي بين الصفا والمروة',
    stageName: '7 Laps across the Mas\'a',
    location: 'Mas\'a gallery inside the Haram complex',
    description:
      'Walking seven laps between the hillocks of Safa and Marwah, commemorating the devotion of Lady Hajar (peace be upon her) as she sought water for infant Ismail.',
    keyActions: [
      'Approach Mount Safa. As you near it, recite the Quranic verse (2:158) and declare: "Abda\'u bima bada\'allahu bih" (I begin with that which Allah began with).',
      'Ascend Safa, face the Kaaba, raise your hands, and recite the prophetic takbir and declaration of tawheed 3 times with personal du\'a in between.',
      'Walk towards Marwah. When reaching the green fluorescent markers, men run at a brisk jog, while women maintain their normal walking pace.',
      'Upon reaching Marwah, face the Kaaba and repeat the same remembrance and supplication as on Safa.',
      'Lap count: Safa to Marwah is Lap 1; Marwah to Safa is Lap 2. Lap 7 concludes at Marwah.',
      'Ritual purity (Wudu) is highly recommended for Sa\'i, but unlike Tawaf, it remains valid if broken.',
    ],
    duas: [
      {
        title: 'Supplication at Safa & Marwah',
        arabic:
          'إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ ۖ أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، أَنْجَزَ وَعْدَهُ وَنَصَرَ عَبْدَهُ وَهَزَمَ الْأَحْزَابَ وَحْدَهُ',
        transliteration:
          'Innas-Safa wal-Marwata min sha\'a\'irillah. Abda\'u bima bada\'allahu bih. La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa \'ala kulli shay\'in qadeer, anjaza wa\'dahu wa nasara \'abdahu wa hazamal-ahzaba wahdah',
        translation:
          'Indeed, As-Safa and Al-Marwah are among the symbols of Allah. I begin with that which Allah began with. There is no deity except Allah alone without partner, His is the sovereignty and His is praise, and He has power over all things; He fulfilled His promise, granted victory to His servant, and defeated the confederates alone.',
        reference: 'Quran 2:158 / Sahih Muslim 1218',
      },
    ],
  },
  {
    id: 'halq-taqsir',
    stepNumber: 5,
    title: 'Halq or Taqsir (Exit from Ihram)',
    arabicTitle: 'الحلق أو التقصير والتحلل',
    stageName: 'Conclusion & Tahallul',
    location: 'Licensed barber shops outside the Haram',
    description:
      'Shaving the head or trimming the hair to conclude the Umrah and officially exit the state of Ihram. All prior restrictions are now fully lifted.',
    keyActions: [
      'Men have two options: Halq (shaving head completely) or Taqsir (trimming hair evenly from all sides). Halq is superior: the Prophet ﷺ prayed thrice for those who shave and once for those who trim.',
      'If trimming (men), hair must be cut from all areas of the head, not merely a single snip from one side.',
      'Women perform Taqsir only: gather the hair and trim the length of a fingertip (approx. 1 to 2 cm) from the ends. Shaving is prohibited for women.',
      'Upon completion of Halq or Taqsir, your Umrah is complete (Al-Tahallul) and all ordinary clothing and activities become lawful again.',
    ],
    criticalNotes: [
      'Use licensed, hygienic barber shops located across the clock tower and hotels surrounding the Haram that use sterilized single-use blades.',
      'Do not exit Ihram or wear regular clothes until hair has been shaved or trimmed.',
    ],
  },
];

export default function UmrahGuideScreen({
  onBack,
  onOpenDuas,
}: {
  onBack?: () => void;
  onOpenDuas?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [activeStepId, setActiveStepId] = useState<string>('ihram');

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
        title={t('Umrah Guide')}
        subtitle={t("Step-by-step rituals of the sacred pilgrimage: Ihram, Tawaf, Sa'i, and Halq.")}
        onBack={onBack}
        backLabel={t('Tools')}
      />

      {/* Quick Stage Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
      >
        {UMRAH_STEPS.map((s) => {
          const isActive = s.id === activeStepId;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.stepPill,
                {
                  backgroundColor: isActive ? colors.accent : colors.bgSurface,
                  borderColor: isActive ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setActiveStepId(s.id)}
            >
              <Text
                style={[
                  styles.stepPillNum,
                  { color: isActive ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                0{s.stepNumber}
              </Text>
              <Text
                style={[
                  styles.stepPillLabel,
                  { color: isActive ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {t(s.title)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Overview Card */}
      <Card style={{ marginBottom: 18, padding: 16 }}>
        <View style={styles.overviewHeader}>
          <View style={[styles.badge, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
            <Ionicons name="sparkles" size={13} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>{t('The 4 Pillars of Umrah')}</Text>
          </View>
        </View>
        <Text style={[styles.overviewTitle, { color: colors.textPrimary }]}>
          {t('A Journey of Spiritual Rebirth')}
        </Text>
        <Text style={[styles.overviewDesc, { color: colors.textSecondary }]}>
          {t('The Prophet ﷺ said: "From one Umrah to another is an expiation for whatever sins come between them, and an accepted Hajj brings no less a reward than Paradise." (Sahih al-Bukhari)')}
        </Text>
      </Card>

      {/* Step by Step Cards */}
      {UMRAH_STEPS.map((step) => {
        const isHighlighted = step.id === activeStepId;
        return (
          <Card
            key={step.id}
            style={{
              marginBottom: 18,
              padding: 18,
              borderWidth: isHighlighted ? 1.5 : 1,
              borderColor: isHighlighted ? colors.accent : colors.borderSubtle,
            }}
          >
            {/* Header */}
            <View style={styles.stepHeaderRow}>
              <View
                style={[
                  styles.stepNumCircle,
                  {
                    backgroundColor: isHighlighted ? colors.accent : colors.bgSurface,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepNumText,
                    { color: isHighlighted ? '#FFFFFF' : colors.accent },
                  ]}
                >
                  {step.stepNumber}
                </Text>
              </View>
              <View style={styles.stepTitleCol}>
                <Text style={[styles.stageName, { color: colors.accent }]}>
                  {t(step.stageName).toUpperCase()}
                </Text>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  {t(step.title)}
                </Text>
              </View>
            </View>

            <View style={styles.arabicTitleWrap}>
              <ArabicText style={[styles.arabicTitle, { color: colors.textSecondary }]}>
                {step.arabicTitle}
              </ArabicText>
            </View>

            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {step.description}
            </Text>

            {/* Location Pill */}
            <View
              style={[
                styles.locationRow,
                { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="location-outline" size={14} color={colors.accent} />
              <Text style={[styles.locationText, { color: colors.textMuted }]}>
                {t(step.location)}
              </Text>
            </View>

            <Hairline style={{ marginVertical: 14 }} />

            {/* Actions list */}
            <Text style={[styles.subSectionTitle, { color: colors.textPrimary }]}>
              {t('Prescribed Actions')}
            </Text>
            {step.keyActions.map((action, idx) => (
              <View key={idx} style={styles.actionRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} style={{ marginTop: 2 }} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                  {action}
                </Text>
              </View>
            ))}

            {/* Duas Section */}
            {step.duas && step.duas.length > 0 && (
              <View style={styles.duasBlock}>
                <Text style={[styles.subSectionTitle, { color: colors.textPrimary, marginTop: 12 }]}>
                  {t("Key Supplications (Ad'iyah)")}
                </Text>
                {step.duas.map((dua, di) => (
                  <View
                    key={di}
                    style={[
                      styles.duaCard,
                      { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.duaTitle, { color: colors.accent }]}>
                      {dua.title}
                    </Text>
                    <ArabicText style={[styles.duaArabic, { color: colors.textPrimary }]}>
                      {dua.arabic}
                    </ArabicText>
                    <Text style={[styles.duaTranslit, { color: colors.textSecondary }]}>
                      {dua.transliteration}
                    </Text>
                    <Text style={[styles.duaTrans, { color: colors.textMuted }]}>
                      &quot;{dua.translation}&quot;
                    </Text>
                    <Text style={[styles.duaRef, { color: colors.textMuted }]}>
                      {t('Source')}: {dua.reference}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Critical Notes */}
            {step.criticalNotes && step.criticalNotes.length > 0 && (
              <View
                style={[
                  styles.warningBlock,
                  { backgroundColor: colors.bgBase, borderColor: colors.accent + '40' },
                ]}
              >
                <View style={styles.warningHeader}>
                  <Ionicons name="information-circle" size={16} color={colors.accent} />
                  <Text style={[styles.warningTitle, { color: colors.accent }]}>
                    {t('Important Notes & Cautions')}
                  </Text>
                </View>
                {step.criticalNotes.map((note, ni) => (
                  <Text key={ni} style={[styles.warningText, { color: colors.textSecondary }]}>
                    • {note}
                  </Text>
                ))}
              </View>
            )}
          </Card>
        );
      })}

      {/* Duas screen redirect affordance */}
      {onOpenDuas && (
        <Card style={{ marginBottom: 24, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.duaBannerTitle, { color: colors.textPrimary }]}>
                {t('Hajj & Umrah Duas Library')}
              </Text>
              <Text style={[styles.duaBannerSub, { color: colors.textMuted }]}>
                {t('Browse full authentic supplications with Arabic, transliteration and audio.')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.duaBannerBtn, { backgroundColor: colors.accent }]}
              onPress={onOpenDuas}
              accessibilityRole="button"
              accessibilityLabel={t('Open Hajj and Umrah Duas')}
            >
              <Text style={styles.duaBannerBtnText}>{t('Open Duas')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
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
  pillsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
    marginBottom: 4,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  stepPillNum: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  stepPillLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  overviewHeader: {
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
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  overviewTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    marginBottom: 6,
  },
  overviewDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  stepTitleCol: {
    flex: 1,
  },
  stageName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  stepTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    marginTop: 2,
  },
  arabicTitleWrap: {
    marginTop: 6,
    marginBottom: 8,
  },
  arabicTitle: {
    fontSize: 17,
    textAlign: 'left',
  },
  stepDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 10,
  },
  locationText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  subSectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  actionText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  duasBlock: {
    marginTop: 8,
  },
  duaCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  duaTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  duaArabic: {
    fontSize: 18,
    lineHeight: 28,
    marginVertical: 4,
  },
  duaTranslit: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 4,
  },
  duaTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  duaRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
  },
  warningBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  warningTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  warningText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 4,
  },
  duaBannerTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  duaBannerSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  duaBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  duaBannerBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
});
