import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { TAB_PAD_BOTTOM } from '../components/layout/layout.constants';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import {
  WORSHIP_GUIDELINES,
  BLEEDING_TYPES,
  WOMENS_FIQH_RESOURCES,
} from '../lib/womensFiqh';

interface WomenGuidanceScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenPurity?: () => void;
}

export default function WomenGuidanceScreen({
  onBack,
  backLabel = 'Tools',
  onOpenPurity,
}: WomenGuidanceScreenProps) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t("Women's Worship")}
          title={t('Worship Guidance')}
          subtitle={t('Authentic fiqh on exemptions, permitted worship, bleeding types & scholarly references.')}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Discreet Privacy Note */}
        <View style={[styles.privacyBadge, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
          <Ionicons name="shield-checkmark" size={14} color={tokens.goldText} />
          <Text style={[styles.privacyText, { color: tokens.muted }]}>
            {t('Private & verified · Mainstream classical and contemporary fiqh')}
          </Text>
        </View>

        {/* Rulings During Menses & Postpartum */}
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>
          {t('Rulings During Menses & Postpartum')}
        </Text>
        <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
          {t('Authentic guidance on exemptions, permitted devotional acts, and divine mercy.')}
        </Text>

        {WORSHIP_GUIDELINES.map((item) => {
          const statusConfig = {
            restricted: { color: tokens.danger, icon: 'close-circle', label: 'Exempt / Restricted' },
            permitted: { color: tokens.muted, icon: 'checkmark-circle', label: 'Permitted' },
            recommended: { color: tokens.goldText, icon: 'star', label: 'Highly Encouraged' },
          }[item.status];

          return (
            <PremiumCard key={item.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.worshipTopic, { color: tokens.text }]}>{item.topic}</Text>
                <View style={[styles.worshipBadge, { borderColor: statusConfig.color }]}>
                  <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                  <Text style={[styles.worshipBadgeText, { color: statusConfig.color }]}>
                    {t(statusConfig.label)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.worshipRuling, { color: tokens.goldText }]}>{item.ruling}</Text>
              <Text style={[styles.worshipDetails, { color: tokens.muted }]}>{item.details}</Text>
              <Text style={[styles.worshipEvidence, { color: tokens.muted }]}>
                {t('Source')}: {item.evidence}
              </Text>
            </PremiumCard>
          );
        })}

        {/* Hayd vs Nifas vs Istihadha */}
        <Text style={[styles.sectionTitle, { color: tokens.text, marginTop: 18 }]}>
          {t('Hayd, Nifas & Istihadha (Irregular Bleeding)')}
        </Text>
        <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
          {t('Definitions, standard durations, and jurisprudence across bleeding types.')}
        </Text>

        {BLEEDING_TYPES.map((b) => (
          <PremiumCard key={b.name} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.bleedingName, { color: tokens.text }]}>{b.name}</Text>
              <ArabicText size={18} style={{ lineHeight: 26 }}>{b.arabic}</ArabicText>
            </View>
            <Text style={[styles.bleedingDef, { color: tokens.muted }]}>{b.definition}</Text>
            <View style={styles.bleedingRow}>
              <Text style={[styles.bleedingLabel, { color: tokens.goldText }]}>{t('Duration: ')}</Text>
              <Text style={[styles.bleedingVal, { color: tokens.text }]}>{b.duration}</Text>
            </View>
            <View style={styles.bleedingRow}>
              <Text style={[styles.bleedingLabel, { color: tokens.goldText }]}>{t('Rulings: ')}</Text>
              <Text style={[styles.bleedingVal, { color: tokens.text }]}>{b.rulings}</Text>
            </View>
          </PremiumCard>
        ))}

        {/* Recommended Reading List */}
        <Text style={[styles.sectionTitle, { color: tokens.text, marginTop: 18 }]}>
          {t('Recommended Fiqh References')}
        </Text>
        <Text style={[styles.sectionDesc, { color: tokens.muted }]}>
          {t("Classical and contemporary authoritative works on women's jurisprudence.")}
        </Text>

        {WOMENS_FIQH_RESOURCES.map((res) => (
          <PremiumCard key={res.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.resourceTitle, { color: tokens.text }]}>{res.title}</Text>
              <View style={[styles.catBadge, { borderColor: tokens.cardBorder }]}>
                <Text style={[styles.catBadgeText, { color: tokens.goldText }]}>{res.category}</Text>
              </View>
            </View>
            <Text style={[styles.resourceAuthor, { color: tokens.goldText }]}>{res.author}</Text>
            <Text style={[styles.resourceDesc, { color: tokens.muted }]}>{res.description}</Text>
          </PremiumCard>
        ))}

        {/* Scholar Consultation Disclaimer */}
        <PremiumCard style={styles.disclaimerCard}>
          <Ionicons name="medical-outline" size={20} color={tokens.goldText} />
          <Text style={[styles.disclaimerCardText, { color: tokens.muted }]}>
            {t('Rulings on bleeding duration and irregularities vary according to individual circumstances and classical legal schools (Madhhabs). If you encounter irregular bleeding exceeding 15 days, or medical complications, please consult both a qualified Islamic scholar and a physician.')}
          </Text>
        </PremiumCard>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 10,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
  },
  privacyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
  },
  sectionDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
  },
  worshipTopic: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    flex: 1,
  },
  worshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  worshipBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  worshipRuling: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  worshipDetails: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  worshipEvidence: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    fontStyle: 'italic',
  },
  bleedingName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
  },
  bleedingDef: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  bleedingRow: {
    flexDirection: 'row',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  bleedingLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
  },
  bleedingVal: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    flex: 1,
  },
  resourceTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  catBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  resourceAuthor: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    marginBottom: 3,
  },
  resourceDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    marginTop: 12,
  },
  disclaimerCardText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
});
