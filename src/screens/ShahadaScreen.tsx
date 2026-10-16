import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useThemeTokens } from '../theme/tokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { fontRoles } from '../theme/tokens';
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
          <Text style={[styles.heroTranslation, { color: tokens.muted }]}>
            {t(SHAHADA_VERSE.translation)}
          </Text>
          <Text style={[styles.source, { color: tokens.muted }]}>{t(SHAHADA_VERSE.source)}</Text>
        </PremiumCard>

        {/* The declaration */}
        <PremiumCard style={styles.declarationCard} padded>
          <Text style={[styles.cardTitle, { color: tokens.goldText }]}>
            أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ
          </Text>
          <ArabicText style={[styles.declarationArabic, { color: tokens.text }]}>
            وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ
          </ArabicText>
          <Text style={[styles.declarationTranslation, { color: tokens.text }]}>
            {t('"I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah."')}
          </Text>
          <Text style={[styles.source, { color: tokens.muted }]}>
            {t('The declaration of faith — the first pillar of Islam')}
          </Text>
        </PremiumCard>

        {/* Sections */}
        {SHAHADA_SECTIONS.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <Hairline style={styles.itemDivider} />}
            <PremiumCard style={styles.itemCard} padded>
              <Text style={[styles.itemTitle, { color: tokens.goldText }]}>{t(s.title)}</Text>
              {s.arabic ? (
                <ArabicText style={[styles.itemArabic, { color: tokens.text }]}>
                  {s.arabic}
                </ArabicText>
              ) : null}
              <Text style={[styles.itemTranslation, { color: tokens.text }]}>
                {t(s.translation)}
              </Text>
              <Text style={[styles.source, { color: tokens.muted }]}>{t(s.source)}</Text>
              {s.note ? (
                <Text style={[styles.note, { color: tokens.muted }]}>{t(s.note)}</Text>
              ) : null}
            </PremiumCard>
          </View>
        ))}

        {/* Closing note */}
        <View style={styles.closingWrap}>
          <Text style={[styles.closing, { color: tokens.muted }]}>
            {t("Every source above is drawn from the Qur'an and authentic hadith (Sahih al-Bukhari, Sahih Muslim). The classical conditions summary is an educational overview — for detailed study, consult a qualified scholar.")}
          </Text>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 14,
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
    fontSize: 11,
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
    fontSize: 12.5,
    lineHeight: 20,
    textAlign: 'center',
  },
});
