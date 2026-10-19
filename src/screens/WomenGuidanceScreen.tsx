import React from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { AppText } from '../components/ui/AppText';
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
          <AppText variant="caption" tone="faint" style={styles.privacyText}>
            {t('Private & verified · Mainstream classical and contemporary fiqh')}
          </AppText>
        </View>

        {/* Rulings During Menses & Postpartum */}
        <AppText variant="sectionTitle" style={styles.sectionTitle}>
          {t('Rulings During Menses & Postpartum')}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.sectionDesc}>
          {t('Authentic guidance on exemptions, permitted devotional acts, and divine mercy.')}
        </AppText>

        {WORSHIP_GUIDELINES.map((item) => {
          const statusConfig = {
            restricted: { color: tokens.danger, icon: 'close-circle', label: 'Exempt / Restricted' },
            permitted: { color: tokens.muted, icon: 'checkmark-circle', label: 'Permitted' },
            recommended: { color: tokens.goldText, icon: 'star', label: 'Highly Encouraged' },
          }[item.status];

          return (
            <PremiumCard key={item.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                <AppText variant="rowTitle" style={styles.worshipTopic}>{item.topic}</AppText>
                <View style={[styles.worshipBadge, { borderColor: statusConfig.color }]}>
                  <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                  <AppText variant="caption" style={[styles.worshipBadgeText, { color: statusConfig.color }]}>
                    {t(statusConfig.label)}
                  </AppText>
                </View>
              </View>
              <AppText variant="rowTitle" highlight style={styles.worshipRuling}>{item.ruling}</AppText>
              <AppText variant="body" tone="faint" style={styles.worshipDetails}>{item.details}</AppText>
              <AppText variant="caption" tone="faint" style={styles.worshipEvidence}>
                {t('Source')}: {item.evidence}
              </AppText>
            </PremiumCard>
          );
        })}

        {/* Hayd vs Nifas vs Istihadha */}
        <AppText variant="sectionTitle" style={[styles.sectionTitle, { marginTop: 18 }]}>
          {t('Hayd, Nifas & Istihadha (Irregular Bleeding)')}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.sectionDesc}>
          {t('Definitions, standard durations, and jurisprudence across bleeding types.')}
        </AppText>

        {BLEEDING_TYPES.map((b) => (
          <PremiumCard key={b.name} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AppText variant="rowTitle" style={styles.bleedingName}>{b.name}</AppText>
              <ArabicText size={18}>{b.arabic}</ArabicText>
            </View>
            <AppText variant="body" tone="faint" style={styles.bleedingDef}>{b.definition}</AppText>
            <View style={styles.bleedingRow}>
              <AppText variant="caption" highlight style={styles.bleedingLabel}>{t('Duration: ')}</AppText>
              <AppText variant="caption" style={styles.bleedingVal}>{b.duration}</AppText>
            </View>
            <View style={styles.bleedingRow}>
              <AppText variant="caption" highlight style={styles.bleedingLabel}>{t('Rulings: ')}</AppText>
              <AppText variant="caption" style={styles.bleedingVal}>{b.rulings}</AppText>
            </View>
          </PremiumCard>
        ))}

        {/* Recommended Reading List */}
        <AppText variant="sectionTitle" style={[styles.sectionTitle, { marginTop: 18 }]}>
          {t('Recommended Fiqh References')}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.sectionDesc}>
          {t("Classical and contemporary authoritative works on women's jurisprudence.")}
        </AppText>

        {WOMENS_FIQH_RESOURCES.map((res) => (
          <PremiumCard key={res.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <AppText variant="rowTitle" style={styles.resourceTitle}>{res.title}</AppText>
              <View style={[styles.catBadge, { borderColor: tokens.cardBorder }]}>
                <AppText variant="caption" highlight style={styles.catBadgeText}>{res.category}</AppText>
              </View>
            </View>
            <AppText variant="caption" highlight style={styles.resourceAuthor}>{res.author}</AppText>
            <AppText variant="body" tone="faint" style={styles.resourceDesc}>{res.description}</AppText>
          </PremiumCard>
        ))}

        {/* Scholar Consultation Disclaimer */}
        <PremiumCard style={styles.disclaimerCard} contentStyle={styles.disclaimerCardContent}>
          <Ionicons name="medical-outline" size={20} color={tokens.goldText} />
          <AppText variant="caption" tone="faint" style={styles.disclaimerCardText}>
            {t('Rulings on bleeding duration and irregularities vary according to individual circumstances and classical legal schools (Madhhabs). If you encounter irregular bleeding exceeding 15 days, or medical complications, please consult both a qualified Islamic scholar and a physician.')}
          </AppText>
        </PremiumCard>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
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
    paddingEnd: 10,
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
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 14.5,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 10,
  },
  worshipTopic: {
    fontSize: 14,
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  worshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  worshipBadgeText: {
    fontSize: 12,
  },
  worshipRuling: {
    fontSize: 14,
    marginBottom: 4,
  },
  worshipDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  worshipEvidence: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  bleedingName: {
    fontSize: 14,
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  bleedingDef: {
    fontSize: 14,
    marginBottom: 6,
  },
  bleedingRow: {
    flexDirection: 'row',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  bleedingLabel: {
    fontSize: 12,
  },
  bleedingVal: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  resourceTitle: {
    fontSize: 14,
    flex: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  catBadgeText: {
    fontSize: 12,
  },
  resourceAuthor: {
    fontSize: 12,
    marginBottom: 3,
  },
  resourceDesc: {
    fontSize: 14,
  },
  disclaimerCard: {
    marginTop: 12,
  },
  disclaimerCardText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },

  disclaimerCardContent: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
});
