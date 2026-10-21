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
import { PremiumCard, Chip, PrimaryButton } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { hScrollRTLStyle } from '../lib/rtl';

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

export const UMRAH_STEPS: UmrahStep[] = [
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
  const [activeStepId, setActiveStepId] = useState<string>('ihram');
  const scrollRef = useRef<ScrollView | null>(null);
  const stepOffsets = useRef<Record<string, number>>({});

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          eyebrow={t('Hajj & Umrah')}
          title={t('Umrah Guide')}
          subtitle={t("Step-by-step rituals of the sacred pilgrimage: Ihram, Tawaf, Sa'i, and Halq.")}
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
          {
            alignSelf: 'center',
            width: '100%',
            maxWidth: maxW,
            paddingHorizontal: paddingH,
          },
        ]}
      >
        {/* Quick Stage Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.pillsContainer, hScrollRTLStyle()]}
        >
          {UMRAH_STEPS.map((s) => {
            const isActive = s.id === activeStepId;
            return (
              <Chip
                key={s.id}
                label={`0${s.stepNumber} · ${t(s.title)}`}
                selected={isActive}
                onPress={() => {
                  setActiveStepId(s.id);
                  const offset = stepOffsets.current[s.id];
                  if (offset !== undefined) {
                    scrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
                  }
                }}
                accessibilityLabel={`${t('Step')} ${s.stepNumber}: ${t(s.title)}`}
              />
            );
          })}
        </ScrollView>

        {/* Overview Card */}
        <PremiumCard
          style={styles.overviewCard}
          borderRadius={cardTokens.borderRadius}
          padded
        >
          <View style={styles.overviewHeader}>
            <View style={[styles.badge, { backgroundColor: tokens.inset, borderColor: tokens.cardBorder }]}>
              <Ionicons name="sparkles" size={13} color={tokens.goldText} />
              <AppText variant="eyebrow" highlight style={styles.badgeText}>{t('The 4 Pillars of Umrah')}</AppText>
            </View>
          </View>
          <AppText variant="title" style={styles.overviewTitle}>
            {t('A Journey of Spiritual Rebirth')}
          </AppText>
          <AppText variant="body" tone="faint" style={styles.overviewDesc}>
            {t('The Prophet ﷺ said: "From one Umrah to another is an expiation for whatever sins come between them, and an accepted Hajj brings no less a reward than Paradise." (Sahih al-Bukhari)')}
          </AppText>
        </PremiumCard>

        {/* Step by Step Cards */}
        {UMRAH_STEPS.map((step, si) => {
          const isHighlighted = step.id === activeStepId;
          const isLastStep = si === UMRAH_STEPS.length - 1;
          return (
            <View
              key={step.id}
              onLayout={(event) => { stepOffsets.current[step.id] = event.nativeEvent.layout.y; }}
            >
            <PremiumCard
              style={[
                styles.stepCard,
                isHighlighted && {
                  borderColor: tokens.gold,
                },
                !onOpenDuas && isLastStep && { marginBottom: 0 },
              ]}
              borderRadius={cardTokens.borderRadius}
              padded
              contentStyle={styles.readingContent}
            >
              {/* Header */}
              <View style={styles.stepHeaderRow}>
                <View
                  style={[
                    styles.stepNumCircle,
                    {
                      backgroundColor: isHighlighted ? tokens.gold : tokens.cardTop,
                      borderColor: isHighlighted ? tokens.gold : tokens.cardBorder,
                    },
                  ]}
                >
                  <AppText
                    variant="numeral"
                    tone={isHighlighted ? 'onGold' : undefined}
                    highlight={!isHighlighted}
                    style={styles.stepNumText}
                  >
                    {step.stepNumber}
                  </AppText>
                </View>
                <View style={styles.stepTitleCol}>
                  <AppText variant="eyebrow" highlight style={styles.stageName}>
                    {t(step.stageName).toUpperCase()}
                  </AppText>
                  <AppText variant="sectionTitle" style={styles.stepTitle}>
                    {t(step.title)}
                  </AppText>
                </View>
              </View>

              <View style={styles.arabicTitleWrap}>
                <ArabicText style={[styles.arabicTitle, { color: tokens.muted }]}>
                  {step.arabicTitle}
                </ArabicText>
              </View>

              <AppText variant="body" tone="faint" style={styles.stepDescription}>
                {t(step.description)}
              </AppText>

              {/* Location Pill */}
              <View
                style={[
                  styles.locationRow,
                  {
                    backgroundColor: tokens.inset,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <Ionicons name="location-outline" size={14} color={tokens.goldText} />
                <AppText variant="caption" tone="faint" style={styles.locationText}>
                  {t(step.location)}
                </AppText>
              </View>

              <Hairline style={{ marginVertical: 14 }} />

              {/* Actions list */}
              <AppText variant="sectionTitle" style={styles.subSectionTitle}>
                {t('Prescribed Actions')}
              </AppText>
              {step.keyActions.map((action, idx) => (
                <View key={idx} style={styles.actionRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={tokens.success} style={{ marginTop: 2 }} />
                  <AppText variant="body" tone="faint" style={styles.actionText}>
                    {t(action)}
                  </AppText>
                </View>
              ))}

              {/* Duas Section */}
              {step.duas && step.duas.length > 0 && (
                <View style={styles.duasBlock}>
                  <AppText variant="sectionTitle" style={[styles.subSectionTitle, { marginTop: 12 }]}>
                    {t("Key Supplications (Ad'iyah)")}
                  </AppText>
                  {step.duas.map((dua, di) => (
                    <View
                      key={di}
                      style={[
                        styles.duaCard,
                        {
                          backgroundColor: tokens.inset,
                          borderColor: tokens.cardBorder,
                        },
                      ]}
                    >
                      <AppText variant="rowTitle" highlight style={styles.duaTitle}>
                        {t(dua.title)}
                      </AppText>
                      <ArabicText style={[styles.duaArabic, { color: tokens.text }]}>
                        {dua.arabic}
                      </ArabicText>
                      <AppText variant="subtitle" tone="faint" style={styles.duaTranslit}>
                        {dua.transliteration}
                      </AppText>
                      <AppText variant="body" tone="faint" style={styles.duaTrans}>
                        &quot;{t(dua.translation)}&quot;
                      </AppText>
                      <AppText variant="caption" tone="faint" style={styles.duaRef}>
                        {t('Source')}: {dua.reference}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}

              {/* Critical Notes */}
              {step.criticalNotes && step.criticalNotes.length > 0 && (
                <View
                  style={[
                    styles.warningBlock,
                    {
                      backgroundColor: tokens.inset,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.warningHeader}>
                    <Ionicons name="information-circle" size={16} color={tokens.goldText} />
                    <AppText variant="rowTitle" highlight style={styles.warningTitle}>
                      {t('Important Notes & Cautions')}
                    </AppText>
                  </View>
                  {step.criticalNotes.map((note, ni) => (
                    <AppText key={ni} variant="body" tone="faint" style={styles.warningText}>
                      • {t(note)}
                    </AppText>
                  ))}
                </View>
              )}
            </PremiumCard>
            </View>
          );
        })}

        {/* Duas screen redirect affordance */}
        {onOpenDuas && (
          <PremiumCard
            style={styles.duaRedirectCard}
            borderRadius={cardTokens.borderRadius}
            padded
          >
            <View style={[styles.duaRedirectRow, isCompact && styles.duaRedirectRowCompact]}>
              <View style={[styles.duaRedirectTextCol, isCompact && styles.duaRedirectTextColCompact]}>
                <AppText variant="sectionTitle" style={styles.duaBannerTitle}>
                  {t('Hajj & Umrah Duas Library')}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.duaBannerSub}>
                  {t('Browse full authentic supplications with Arabic, transliteration and audio.')}
                </AppText>
              </View>
              <PrimaryButton
                title={t('Open Duas')}
                onPress={onOpenDuas}
                accessibilityLabel={t('Open Hajj and Umrah Duas')}
                style={isCompact ? styles.duaRedirectButtonCompact : undefined}
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
  pillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 4,
  },
  overviewCard: {
    marginBottom: 16,
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
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  overviewTitle: {
    fontSize: 20,
    marginBottom: 6,
  },
  overviewDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepCard: {
    marginBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 14,
  },
  stepTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  stageName: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  stepTitle: {
    fontSize: 22,
    marginTop: 2,
  },
  arabicTitleWrap: {
    marginTop: 6,
    marginBottom: 8,
  },
  arabicTitle: {
    fontFamily: fontRoles.arabic,
    fontSize: 18,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    maxWidth: '100%',
  },
  locationText: {
    fontSize: 12,
    flexShrink: 1,
  },
  subSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
  },
  duasBlock: {
    marginTop: 8,
  },
  duaCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  duaTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  duaArabic: {
    fontFamily: fontRoles.arabic,
    fontSize: 18,
    marginVertical: 4,
  },
  duaTranslit: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  duaTrans: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  duaRef: {
    fontSize: 12,
  },
  warningBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 14,
    flexShrink: 1,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  duaRedirectCard: {
    marginBottom: 0,
  },
  duaRedirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  duaRedirectRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  duaRedirectTextColCompact: {
    flex: 0,
    width: '100%',
  },
  duaRedirectButtonCompact: {
    alignSelf: 'stretch',
    minHeight: 44,
  },
  duaRedirectTextCol: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingEnd: 8,
  },
  duaBannerTitle: {
    fontSize: 15,
  },
  duaBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
