import React from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { useThemeTokens, fontRoles } from '../theme/tokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { SHAHADA_SECTIONS, SHAHADA_VERSE } from '../lib/shahada';

export default function ShahadaScreen({
  onBack,
  backLabel = 'Library',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { tokens } = useThemeTokens();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          title={t('The Shahada')}
          eyebrow={t('Library · Knowledge')}
          subtitle={t('The declaration of faith and its foundational conditions in Islam')}
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
        {/* Hero verse */}
        <PremiumCard style={styles.heroCard} padded>
          <ArabicText style={[styles.heroArabic, { color: tokens.text }]}>
            {SHAHADA_VERSE.arabic}
          </ArabicText>
          <AppText variant="body" tone="faint" style={styles.heroTranslation}>
            {t(SHAHADA_VERSE.translation)}
          </AppText>
          <AppText variant="caption" tone="faint" style={styles.source}>{t(SHAHADA_VERSE.source)}</AppText>
        </PremiumCard>

        {/* The declaration */}
        <PremiumCard style={styles.declarationCard} padded>
          <AppText variant="title" highlight style={styles.cardTitle}>
            أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ
          </AppText>
          <ArabicText style={[styles.declarationArabic, { color: tokens.text }]}>
            وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ
          </ArabicText>
          <AppText variant="body" style={styles.declarationTranslation}>
            {t('"I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah."')}
          </AppText>
          <AppText variant="caption" tone="faint" style={styles.source}>
            {t('The declaration of faith — the first pillar of Islam')}
          </AppText>
        </PremiumCard>

        {/* Sections */}
        {SHAHADA_SECTIONS.filter((s) => s.id !== 'declaration').map((s, i) => (
          <View key={s.id}>
            {i > 0 && <Hairline style={styles.itemDivider} />}
            <PremiumCard style={styles.itemCard} padded>
              <AppText variant="sectionTitle" highlight style={styles.itemTitle}>{t(s.title)}</AppText>
              {s.arabic ? (
                <ArabicText style={[styles.itemArabic, { color: tokens.text }]}>
                  {s.arabic}
                </ArabicText>
              ) : null}
              <AppText variant="body" style={styles.itemTranslation}>
                {t(s.translation)}
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.source}>{t(s.source)}</AppText>
              {s.note ? (
                <AppText variant="caption" tone="faint" style={styles.note}>{t(s.note)}</AppText>
              ) : null}
            </PremiumCard>
          </View>
        ))}

        {/* Closing note */}
        <View style={styles.closingWrap}>
          <AppText variant="body" tone="faint" style={styles.closing}>
            {t("Every source above is drawn from the Qur'an and authentic hadith (Sahih al-Bukhari, Sahih Muslim). The classical conditions summary is an educational overview — for detailed study, consult a qualified scholar.")}
          </AppText>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: {
  },
  heroCard: {
    marginBottom: 14,
  },
  heroArabic: {
    fontFamily: fontRoles.arabic,
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'center',
  },
  heroTranslation: {
    fontFamily: fontRoles.ui,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  declarationCard: {
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: fontRoles.arabic,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 4,
  },
  declarationArabic: {
    fontFamily: fontRoles.arabic,
    fontSize: 24,
    lineHeight: 40,
    textAlign: 'center',
  },
  declarationTranslation: {
    fontFamily: fontRoles.uiBold,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  itemCard: {
    marginTop: 10,
    marginBottom: 10,
  },
  itemDivider: {
    marginVertical: 4,
  },
  itemTitle: {
    fontFamily: fontRoles.title,
    fontSize: 16,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  itemArabic: {
    fontFamily: fontRoles.arabic,
    fontSize: 20,
    lineHeight: 36,
    marginBottom: 6,
  },
  itemTranslation: {
    fontFamily: fontRoles.ui,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  source: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
  },
  note: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  closingWrap: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  closing: {
    fontFamily: fontRoles.ui,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
