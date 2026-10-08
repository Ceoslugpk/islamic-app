import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { SHAHADA_SECTIONS, SHAHADA_VERSE } from '../lib/shahada';

export default function ShahadaScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={{ width: '100%', maxWidth: maxW, alignSelf: 'center', paddingHorizontal: paddingH }}>
        <ScreenHeader
          eyebrow={t('Library · Knowledge')}
          title={t('The Shahada')}
          backLabel={t('Library')}
          onBack={onBack}
        />

        {/* Hero verse */}
        <Card style={styles.heroCard}>
          <ArabicText style={[styles.heroArabic, { color: colors.textPrimary }]}>
            {SHAHADA_VERSE.arabic}
          </ArabicText>
          <Text style={[styles.heroTranslation, { color: colors.textSecondary }]}>
            {t(SHAHADA_VERSE.translation)}
          </Text>
          <Text style={[styles.source, { color: colors.textMuted }]}>{t(SHAHADA_VERSE.source)}</Text>
        </Card>

        {/* The declaration */}
        <Card style={styles.declarationCard}>
          <Text style={[styles.cardTitle, { color: colors.accent }]}>
            أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ
          </Text>
          <ArabicText style={[styles.declarationArabic, { color: colors.textPrimary }]}>
            وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ
          </ArabicText>
          <Text style={[styles.declarationTranslation, { color: colors.textPrimary }]}>
            {t('"I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah."')}
          </Text>
          <Text style={[styles.source, { color: colors.textMuted }]}>
            {t('The declaration of faith — the first pillar of Islam')}
          </Text>
        </Card>

        {/* Sections */}
        {SHAHADA_SECTIONS.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <Hairline />}
            <Card style={styles.itemCard}>
              <Text style={[styles.itemTitle, { color: colors.accent }]}>{t(s.title)}</Text>
              {s.arabic ? (
                <ArabicText style={[styles.itemArabic, { color: colors.textPrimary }]}>
                  {s.arabic}
                </ArabicText>
              ) : null}
              <Text style={[styles.itemTranslation, { color: colors.textPrimary }]}>
                {t(s.translation)}
              </Text>
              <Text style={[styles.source, { color: colors.textMuted }]}>{t(s.source)}</Text>
              {s.note ? (
                <Text style={[styles.note, { color: colors.textSecondary }]}>{t(s.note)}</Text>
              ) : null}
            </Card>
          </View>
        ))}

        {/* Closing note */}
        <View style={styles.closingWrap}>
          <Text style={[styles.closing, { color: colors.textSecondary }]}>
            {t("Every source above is drawn from the Qur'an and authentic hadith (Sahih al-Bukhari, Sahih Muslim). The classical conditions summary is an educational overview — for detailed study, consult a qualified scholar.")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginTop: 16,
    padding: 20,
  },
  heroArabic: {
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'center',
  },
  heroTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  declarationCard: {
    marginTop: 12,
    padding: 20,
  },
  cardTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  declarationArabic: {
    fontSize: 24,
    lineHeight: 40,
    textAlign: 'center',
  },
  declarationTranslation: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  itemCard: {
    marginTop: 12,
    padding: 18,
  },
  itemTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  itemArabic: {
    fontSize: 20,
    lineHeight: 36,
    marginBottom: 6,
  },
  itemTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  source: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  note: {
    fontFamily: 'Manrope_400Regular',
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
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 20,
    textAlign: 'center',
  },
});
