import React from 'react';
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
import { getBackIcon } from '../lib/iconMap';
import { touchTargetTokens } from '../lib/buttonTokens';
import {
  WORSHIP_GUIDELINES,
  BLEEDING_TYPES,
  WOMENS_FIQH_RESOURCES,
} from '../lib/womensFiqh';

interface WomenGuidanceScreenProps {
  onBack?: () => void;
  onOpenPurity?: () => void;
}

export default function WomenGuidanceScreen({ onBack, onOpenPurity }: WomenGuidanceScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH }]}
    >
      <ScreenHeader
        eyebrow={t("Women's Worship")}
        title={t('Worship Guidance')}
        subtitle={t('Authentic fiqh on exemptions, permitted worship, bleeding types & scholarly references.')}
        onBack={onBack}
        backLabel={t('Tools')}
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          {t('Private & verified · Mainstream classical and contemporary fiqh')}
        </Text>
      </View>

      {/* Rulings During Menses & Postpartum */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('Rulings During Menses & Postpartum')}
      </Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        {t('Authentic guidance on exemptions, permitted devotional acts, and divine mercy.')}
      </Text>

      {WORSHIP_GUIDELINES.map((item) => {
        const statusConfig = {
          restricted: { color: colors.destructive, icon: 'close-circle', label: 'Exempt / Restricted' },
          permitted: { color: '#3B82F6', icon: 'checkmark-circle', label: 'Permitted' },
          recommended: { color: '#10B981', icon: 'star', label: 'Highly Encouraged' },
        }[item.status];

        return (
          <Card key={item.id} style={{ marginBottom: 12, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.worshipTopic, { color: colors.textPrimary }]}>{item.topic}</Text>
              <View style={[styles.worshipBadge, { borderColor: statusConfig.color }]}>
                <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                <Text style={[styles.worshipBadgeText, { color: statusConfig.color }]}>
                  {t(statusConfig.label)}
                </Text>
              </View>
            </View>
            <Text style={[styles.worshipRuling, { color: colors.accent }]}>{item.ruling}</Text>
            <Text style={[styles.worshipDetails, { color: colors.textSecondary }]}>{item.details}</Text>
            <Text style={[styles.worshipEvidence, { color: colors.textMuted }]}>
              {t('Source')}: {item.evidence}
            </Text>
          </Card>
        );
      })}

      {/* Hayd vs Nifas vs Istihadha */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 18 }]}>
        {t('Hayd, Nifas & Istihadha (Irregular Bleeding)')}
      </Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        {t('Definitions, standard durations, and jurisprudence across bleeding types.')}
      </Text>

      {BLEEDING_TYPES.map((b) => (
        <Card key={b.name} style={{ marginBottom: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.bleedingName, { color: colors.textPrimary }]}>{b.name}</Text>
            <ArabicText size={18} style={{ lineHeight: 26 }}>{b.arabic}</ArabicText>
          </View>
          <Text style={[styles.bleedingDef, { color: colors.textSecondary }]}>{b.definition}</Text>
          <View style={styles.bleedingRow}>
            <Text style={[styles.bleedingLabel, { color: colors.accent }]}>{t('Duration: ')}</Text>
            <Text style={[styles.bleedingVal, { color: colors.textPrimary }]}>{b.duration}</Text>
          </View>
          <View style={styles.bleedingRow}>
            <Text style={[styles.bleedingLabel, { color: colors.accent }]}>{t('Rulings: ')}</Text>
            <Text style={[styles.bleedingVal, { color: colors.textPrimary }]}>{b.rulings}</Text>
          </View>
        </Card>
      ))}

      {/* Recommended Reading List */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 18 }]}>
        {t('Recommended Fiqh References')}
      </Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        {t("Classical and contemporary authoritative works on women's jurisprudence.")}
      </Text>

      {WOMENS_FIQH_RESOURCES.map((res) => (
        <Card key={res.id} style={{ marginBottom: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.resourceTitle, { color: colors.textPrimary }]}>{res.title}</Text>
            <View style={[styles.catBadge, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.catBadgeText, { color: colors.accent }]}>{res.category}</Text>
            </View>
          </View>
          <Text style={[styles.resourceAuthor, { color: colors.accent }]}>{res.author}</Text>
          <Text style={[styles.resourceDesc, { color: colors.textSecondary }]}>{res.description}</Text>
        </Card>
      ))}

      {/* Scholar Consultation Disclaimer */}
      <Card style={{ ...styles.disclaimerCard, borderColor: colors.borderSubtle }}>
        <Ionicons name="medical-outline" size={20} color={colors.accent} />
        <Text style={[styles.disclaimerCardText, { color: colors.textSecondary }]}>
          {t('Rulings on bleeding duration and irregularities vary according to individual circumstances and classical legal schools (Madhhabs). If you encounter irregular bleeding exceeding 15 days, or medical complications, please consult both a qualified Islamic scholar and a physician.')}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 60,
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
