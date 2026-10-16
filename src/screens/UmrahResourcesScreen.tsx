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
import { useThemeTokens } from '../theme/tokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, Chip, PrimaryButton } from '../components/ui';
import { fontRoles } from '../theme/tokens';
import { Hairline } from '../components/Hairline';
import { hScrollRTLStyle } from '../lib/rtl';

interface PackingItem {
  id: string;
  category: string;
  item: string;
  note: string;
}

const PACKING_ITEMS: PackingItem[] = [
  { id: 'p1', category: 'Ihram & Clothing', item: 'Two sets of white Ihram towels', note: '100% cotton or bamboo, absorbent and durable for men' },
  { id: 'p2', category: 'Ihram & Clothing', item: 'Ihram belt with secure pouch', note: 'For keeping passport, cash, hotel key card, and phone' },
  { id: 'p3', category: 'Ihram & Clothing', item: 'Safety pins / heavy-duty clips', note: 'To secure the upper sheet (Rida) in place against strong winds' },
  { id: 'p4', category: 'Ihram & Clothing', item: 'Slippers / Sandals with exposed ankles', note: 'Footwear for men must leave the ankle bones and top instep bare' },
  { id: 'p5', category: 'Ihram & Clothing', item: 'Modest comfortable regular clothes', note: 'Loose thobes, abayas, breathable cotton undergarments' },
  { id: 'p6', category: 'Toiletries & Hygiene', item: 'Fragrance-free soap & body wash', note: 'Mandatory in Ihram; scented soaps violate Ihram rules' },
  { id: 'p7', category: 'Toiletries & Hygiene', item: 'Fragrance-free petroleum jelly / Vaseline', note: 'Essential to prevent inner-thigh chafing from extensive walking' },
  { id: 'p8', category: 'Toiletries & Hygiene', item: 'Unscented sunscreen & lip balm', note: 'Protection against intense Makkah and Madinah heat' },
  { id: 'p9', category: 'Toiletries & Hygiene', item: 'Toothbrush & Miswak', note: 'Sunnah hygiene item easily kept in pouch' },
  { id: 'p10', category: 'Toiletries & Hygiene', item: 'Small scissors / nail clippers', note: 'Store in checked luggage for Halq/Taqsir haircut' },
  { id: 'p11', category: 'Health & Essentials', item: 'Blister plasters & tape', note: 'Cushions feet against hard marble floors and long walking laps' },
  { id: 'p12', category: 'Health & Essentials', item: 'Electrolyte hydration sachets', note: 'Combat dehydration during hot daytime hours' },
  { id: 'p13', category: 'Health & Essentials', item: 'Personal prescription medications', note: 'In original packaging with doctor prescription copy' },
  { id: 'p14', category: 'Health & Essentials', item: 'Throat lozenges & pain relief', note: 'Air conditioning and dust often cause common viral colds' },
  { id: 'p15', category: 'Travel & Utilities', item: 'Drawstring shoe bag', note: 'To carry your sandals inside the Haram without misplacing them' },
  { id: 'p16', category: 'Travel & Utilities', item: 'Compact pocket prayer mat', note: 'For praying on courtyard marble or transit platforms' },
  { id: 'p17', category: 'Travel & Utilities', item: 'High-capacity power bank & cables', note: 'Preserves phone battery for navigation and Nusuk app permits' },
  { id: 'p18', category: 'Travel & Utilities', item: 'Universal travel plug adapter', note: 'Type G (UK 3-pin standard in Saudi Arabia)' },
];

interface RecommendedBook {
  title: string;
  author: string;
  focus: string;
  description: string;
}

const RECOMMENDED_BOOKS: RecommendedBook[] = [
  {
    title: 'The Prophet\'s Hajj (Hajjat al-Nabi ﷺ)',
    author: 'Shaykh Muhammad Nasiruddin al-Albani',
    focus: 'Hadith & Fiqh Authenticity',
    description: 'The definitive scholarly study tracing the Prophet\'s farewell pilgrimage narrated step-by-step from Jabir ibn Abdillah with rigorous authentication.',
  },
  {
    title: 'Getting the Best out of Hajj & Umrah',
    author: 'Ismail Adam Patel',
    focus: 'Practical & Spiritual Preparation',
    description: 'Comprehensive guidebook packed with packing strategies, logistical timetables, health tips, and spiritual contemplation for contemporary pilgrims.',
  },
  {
    title: 'Hajj & Umrah Made Easy',
    author: 'Dr. Taqi Hashmi & Muhammad Farooq',
    focus: 'Quick Reference & Pocket Diagrams',
    description: 'Extremely popular pocket guide with visual flowcharts, step-by-step check boxes, and essential transliterated duas for each sacred site.',
  },
  {
    title: 'A Guide to Hajj, Umrah & Visiting the Prophet\'s Mosque',
    author: 'Ministry of Islamic Affairs, KSA',
    focus: 'Official Kingdom Guidelines',
    description: 'Official authoritative reference published by the Kingdom of Saudi Arabia covering fiqh regulations, safety protocols, and proper etiquette.',
  },
];

interface CommonMistake {
  topic: string;
  mistake: string;
  correctAction: string;
}

const COMMON_MISTAKES: CommonMistake[] = [
  {
    topic: 'Tawaf Boundary',
    mistake: 'Walking inside the semi-circular wall (Hijr Ismail / Hateem) during Tawaf circuits.',
    correctAction: 'The Hateem is part of the interior Kaaba. You must circumambulate OUTSIDE the curved wall, otherwise the circuit is invalid.',
  },
  {
    topic: 'Tawaf Garment (Idtiba\')',
    mistake: 'Leaving the right shoulder uncovered throughout the entire trip, including during Salah and Sa\'i.',
    correctAction: 'Idtiba\' (uncovering the right shoulder) is Sunnah ONLY during the 7 circuits of Tawaf. Cover both shoulders before praying 2 rak\'ahs and during Sa\'i.',
  },
  {
    topic: 'Touching the Kaaba',
    mistake: 'Rubbing the cloth of the Kaaba (Kiswah), the door, or the walls believing they transmit barakah.',
    correctAction: 'Only the Black Stone (kiss or point) and the Yemeni Corner (touch if possible) are Sunnah to touch. The cloth and walls should not be rubbed.',
  },
  {
    topic: 'Haircut (Taqsir)',
    mistake: 'Snipping a tiny lock of hair from one side of the head with small scissors and declaring Umrah complete.',
    correctAction: 'For men, hair must be shortened evenly across the ENTIRE head. For women, trim the length of a fingertip (1–2 cm) from all hair ends.',
  },
  {
    topic: 'Crowd Conduct',
    mistake: 'Pushing, jostling, or aggressively forcing a path towards the Black Stone or Maqam Ibrahim.',
    correctAction: 'Preserving the physical safety and tranquility of fellow believers is an obligation (Wajib), whereas kissing the Stone is Sunnah. Prioritize safety.',
  },
  {
    topic: 'Photography & Filming',
    mistake: 'Holding phones aloft to livestream or record oneself during Tawaf, distracting oneself and other worshippers.',
    correctAction: 'Maintain presence of heart and reverence. Focus on du\'a, istighfar, and reflection rather than social media updates.',
  },
];

const FIRST_TIMER_TIPS = [
  {
    title: 'Hydration & Nutrition',
    detail: 'Cold and room-temperature Zamzam barrels are situated throughout the Haram. Drink regularly in small amounts. Carry dates or dry nuts in your pouch for steady sustained energy.',
    icon: 'water-outline' as const,
  },
  {
    title: 'Gate Memorization',
    detail: 'Al-Masjid Al-Haram has hundreds of gates. Always note your entrance gate name and number (e.g. King Abdulaziz Gate 1, King Fahd Gate 79, Bab al-Salam). Take a photo of the entrance sign outside before entering.',
    icon: 'business-outline' as const,
  },
  {
    title: 'Optimal Tawaf Timing',
    detail: 'The coolest and least congested hours for Tawaf are typically late night (1:00 AM – 3:30 AM) and mid-morning (8:30 AM – 10:30 AM) after Fajr rush clears. Avoid immediately after Fard prayers.',
    icon: 'time-outline' as const,
  },
  {
    title: 'Multiple Mataf Floors',
    detail: 'If the ground-level courtyard is crowded, use the 1st floor or the roof. The distance per circuit is longer, but the walking is continuous, unobstructed, and significantly calmer.',
    icon: 'layers-outline' as const,
  },
  {
    title: 'Shoe Management',
    detail: 'Never leave your sandals in random corners where they can be collected by cleaners. Always carry a small drawstring shoe bag and keep your footwear with you.',
    icon: 'bag-handle-outline' as const,
  },
  {
    title: 'Nusuk App Appointments',
    detail: 'Ensure you reserve your Rawdah ash-Sharifah visit permit in Madinah well in advance via the official Nusuk app, as slots are strictly controlled.',
    icon: 'phone-portrait-outline' as const,
  },
];

export default function UmrahResourcesScreen({
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

  const [packedIds, setPackedIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'checklist' | 'etiquette' | 'mistakes' | 'books' | 'tips'>('checklist');

  const togglePacked = (id: string) => {
    setPackedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const packedCount = Object.values(packedIds).filter(Boolean).length;

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          eyebrow={t('Hajj & Umrah')}
          title={t('Umrah Resources')}
          subtitle={t('Essential packing checklist, etiquette, common errors, tips & scholarly references.')}
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
          {
            alignSelf: 'center',
            width: '100%',
            maxWidth: maxW,
            paddingHorizontal: paddingH,
          },
        ]}
      >
        {/* Tab Selectors */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabScroll, hScrollRTLStyle()]}
        >
          {[
            { key: 'checklist', label: 'Packing Checklist' },
            { key: 'tips', label: 'First-Timer Tips' },
            { key: 'etiquette', label: 'Sacred Etiquette' },
            { key: 'mistakes', label: 'Common Errors' },
            { key: 'books', label: 'Books & Guides' },
          ].map((item) => (
            <Chip
              key={item.key}
              label={t(item.label)}
              selected={activeTab === item.key}
              onPress={() => setActiveTab(item.key as any)}
              accessibilityLabel={t(item.label)}
            />
          ))}
        </ScrollView>

        {/* Duas Quick Jump Card */}
        {onOpenDuas && (
          <PremiumCard style={styles.quickDuaCard} padded>
            <View style={styles.quickDuaRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.cardLead, { color: tokens.goldText }]}>{t('SUPPLICATIONS READY')}</Text>
                <Text style={[styles.cardTitleSm, { color: tokens.text }]}>
                  {t('Need Key Duas in Your Hand?')}
                </Text>
                <Text style={[styles.cardDescSm, { color: tokens.muted }]}>
                  {t('Talbiyah, Tawaf, Safa & Marwah duas with Arabic text and audio in the Library tab.')}
                </Text>
              </View>
              <PrimaryButton
                title={t('Open Duas')}
                onPress={onOpenDuas}
                accessibilityLabel={t('Open Duas Screen')}
              />
            </View>
          </PremiumCard>
        )}

        {/* TAB 1: PACKING CHECKLIST */}
        {activeTab === 'checklist' && (
          <View>
            <View style={styles.progressHeader}>
              <Text style={[styles.sectionHeading, { color: tokens.text }]}>
                {t('Pilgrim Packing Checklist')}
              </Text>
              <Text style={[styles.progressBadge, { color: tokens.goldText }]}>
                {packedCount} {t('of')} {PACKING_ITEMS.length} {t('packed')}
              </Text>
            </View>
            <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
              {t('Tap items to mark as packed. Everything curated for comfort, compliance with Ihram rules, and ease.')}
            </Text>

            {['Ihram & Clothing', 'Toiletries & Hygiene', 'Health & Essentials', 'Travel & Utilities'].map((cat) => {
              const items = PACKING_ITEMS.filter((i) => i.category === cat);
              return (
                <PremiumCard key={cat} style={styles.catCard} padded>
                  <Text style={[styles.catHeader, { color: tokens.goldText }]}>
                    {t(cat).toUpperCase()}
                  </Text>
                  {items.map((item, idx) => {
                    const isChecked = !!packedIds[item.id];
                    return (
                      <View key={item.id}>
                        {idx > 0 && <Hairline style={{ marginVertical: 8 }} />}
                        <TouchableOpacity
                          style={styles.checkRow}
                          onPress={() => togglePacked(item.id)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.checkBox,
                              {
                                backgroundColor: isChecked ? tokens.gold : 'transparent',
                                borderColor: isChecked ? tokens.gold : tokens.cardBorder,
                              },
                            ]}
                          >
                            {isChecked && <Ionicons name="checkmark" size={14} color={tokens.onGold} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.checkItemTitle,
                                {
                                  color: isChecked ? tokens.muted : tokens.text,
                                  textDecorationLine: isChecked ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {t(item.item)}
                            </Text>
                            <Text style={[styles.checkItemNote, { color: tokens.muted }]}>
                              {t(item.note)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </PremiumCard>
              );
            })}
          </View>
        )}

        {/* TAB 2: FIRST-TIMER TIPS */}
        {activeTab === 'tips' && (
          <View>
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>
              {t('Practical Tips for First-Time Pilgrims')}
            </Text>
            <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
              {t('Field-tested insights to make your pilgrimage smooth, spiritually focused, and safe.')}
            </Text>

            {FIRST_TIMER_TIPS.map((tip, idx) => (
              <PremiumCard key={idx} style={styles.tipCard} padded>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: tokens.inset, borderColor: tokens.cardBorder },
                    ]}
                  >
                    <Ionicons name={tip.icon} size={20} color={tokens.goldText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tipTitle, { color: tokens.text }]}>
                      {t(tip.title)}
                    </Text>
                    <Text style={[styles.tipDetail, { color: tokens.muted }]}>
                      {t(tip.detail)}
                    </Text>
                  </View>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* TAB 3: SACRED ETIQUETTE */}
        {activeTab === 'etiquette' && (
          <View>
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>
              {t('Etiquette in the Two Holy Sanctuaries')}
            </Text>
            <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
              {t('Adab (spiritual courtesy) transforms physical travel into an accepted, beloved act of devotion.')}
            </Text>

            <PremiumCard style={styles.etiquetteCard} padded>
              <Text style={[styles.etiquetteTitle, { color: tokens.text }]}>
                {t('Inner State & Spiritual Presence')}
              </Text>
              <Text style={[styles.etiquetteBody, { color: tokens.muted }]}>
                {t('Remember that you are an invited guest (Dhayf ar-Rahman) of the Lord of the worlds. Cultivate gratitude, humility, and patience when experiencing exhaustion, delays, or dense crowds.')}
              </Text>
            </PremiumCard>

            <PremiumCard style={styles.etiquetteCard} padded>
              <Text style={[styles.etiquetteTitle, { color: tokens.text }]}>
                {t('Patience with Fellow Pilgrims')}
              </Text>
              <Text style={[styles.etiquetteBody, { color: tokens.muted }]}>
                {t('Pilgrims arrive from every nation, language, and culture. Treat the elderly, women, and children with gentleness. Forgive accidental bumps or steps on your heels; responding with warmth earns monumental reward.')}
              </Text>
            </PremiumCard>

            <PremiumCard style={styles.etiquetteCard} padded>
              <Text style={[styles.etiquetteTitle, { color: tokens.text }]}>
                {t('Protecting the Tranquility of the Sanctuary')}
              </Text>
              <Text style={[styles.etiquetteBody, { color: tokens.muted }]}>
                {t('Lower your voice and avoid loud personal arguments or commercial conversations. Refrain from taking selfie videos during circuits, which detracts from personal khushu and blocks the flow of pilgrims.')}
              </Text>
            </PremiumCard>

            <PremiumCard style={styles.etiquetteCard} padded>
              <Text style={[styles.etiquetteTitle, { color: tokens.text }]}>
                {t('Cleanliness and Civic Care')}
              </Text>
              <Text style={[styles.etiquetteBody, { color: tokens.muted }]}>
                {t('Throw all tissues, empty cups, and bottles in designated recycling bins. Never leave spilled water on marble pathways where it poses an immediate slip hazard to elderly worshippers.')}
              </Text>
            </PremiumCard>
          </View>
        )}

        {/* TAB 4: COMMON MISTAKES */}
        {activeTab === 'mistakes' && (
          <View>
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>
              {t('Common Errors & Misconceptions')}
            </Text>
            <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
              {t('Review these frequent pitfalls to ensure your Umrah adheres faithfully to the authentic prophetic Sunnah.')}
            </Text>

            {COMMON_MISTAKES.map((item, idx) => (
              <PremiumCard key={idx} style={styles.mistakeCard} padded>
                <View style={styles.mistakeHeader}>
                  <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
                  <Text style={[styles.mistakeTopic, { color: tokens.danger }]}>
                    {t(item.topic)}
                  </Text>
                </View>

                <Text style={[styles.mistakeText, { color: tokens.text }]}>
                  {t('Mistake')}: {item.mistake}
                </Text>

                <Hairline style={{ marginVertical: 8 }} />

                <View style={styles.correctHeader}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={tokens.success} />
                  <Text style={[styles.correctText, { color: tokens.muted }]}>
                    {t('Correct Practice')}: {item.correctAction}
                  </Text>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* TAB 5: RECOMMENDED BOOKS */}
        {activeTab === 'books' && (
          <View>
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>
              {t('Recommended Books & Study Guides')}
            </Text>
            <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
              {t('Classic and contemporary scholarly publications providing in-depth analysis of pilgrimage rites.')}
            </Text>

            {RECOMMENDED_BOOKS.map((book, idx) => (
              <PremiumCard key={idx} style={styles.bookCard} padded>
                <Text style={[styles.bookFocus, { color: tokens.goldText }]}>
                  {t(book.focus).toUpperCase()}
                </Text>
                <Text style={[styles.bookTitle, { color: tokens.text }]}>
                  {book.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: tokens.muted }]}>
                  {t('By')} {book.author}
                </Text>
                <Text style={[styles.bookDesc, { color: tokens.muted }]}>
                  {t(book.description)}
                </Text>
              </PremiumCard>
            ))}
          </View>
        )}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14 },
  tabScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: fontRoles.title,
    fontSize: 16,
  },
  progressBadge: {
    fontFamily: fontRoles.uiBold,
    fontSize: 12,
  },
  sectionDesc: {
    fontFamily: fontRoles.ui,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  catCard: {
    marginBottom: 14,
  },
  catHeader: {
    fontFamily: fontRoles.eyebrow,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkItemTitle: {
    fontFamily: fontRoles.uiBold,
    fontSize: 13.5,
  },
  checkItemNote: {
    fontFamily: fontRoles.ui,
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  quickDuaCard: {
    marginBottom: 16,
  },
  quickDuaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLead: {
    fontFamily: fontRoles.eyebrow,
    fontSize: 10,
    letterSpacing: 1,
  },
  cardTitleSm: {
    fontFamily: fontRoles.title,
    fontSize: 15,
    marginTop: 2,
  },
  cardDescSm: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  tipCard: {
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontFamily: fontRoles.uiBold,
    fontSize: 14,
    marginBottom: 3,
  },
  tipDetail: {
    fontFamily: fontRoles.ui,
    fontSize: 12.5,
    lineHeight: 18,
  },
  etiquetteCard: {
    marginBottom: 12,
  },
  etiquetteTitle: {
    fontFamily: fontRoles.title,
    fontSize: 15,
    marginBottom: 6,
  },
  etiquetteBody: {
    fontFamily: fontRoles.ui,
    fontSize: 13,
    lineHeight: 19,
  },
  mistakeCard: {
    marginBottom: 12,
  },
  mistakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  mistakeTopic: {
    fontFamily: fontRoles.eyebrow,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mistakeText: {
    fontFamily: fontRoles.uiBold,
    fontSize: 13,
    lineHeight: 19,
  },
  correctHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  correctText: {
    flex: 1,
    fontFamily: fontRoles.ui,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bookCard: {
    marginBottom: 12,
  },
  bookFocus: {
    fontFamily: fontRoles.eyebrow,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  bookTitle: {
    fontFamily: fontRoles.title,
    fontSize: 18,
    marginBottom: 2,
  },
  bookAuthor: {
    fontFamily: fontRoles.uiBold,
    fontSize: 12.5,
    marginBottom: 6,
  },
  bookDesc: {
    fontFamily: fontRoles.ui,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
