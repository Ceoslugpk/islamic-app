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
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';

export type LibraryItemKey =
  | 'hadith'
  | 'duas'
  | 'tasbih'
  | 'names'
  | 'names-prophet'
  | 'ramadan-guide'
  | 'prayer-guide';

/* ─── Item model ──────────────────────────────────────────────── */

interface LibraryItem {
  key: LibraryItemKey;
  title: string;
  subtitle: string;
}

const ICONS: Record<LibraryItemKey, keyof typeof Ionicons.glyphMap> = {
  hadith: 'library',
  duas: 'hand-left',
  tasbih: 'repeat',
  names: 'sparkles',
  'names-prophet': 'star',
  'ramadan-guide': 'moon',
  'prayer-guide': 'hand-left',
};

/* ─── Grouped layout ──────────────────────────────────────────── */

interface LibraryGroup {
  label: string;
  items: LibraryItem[];
}

const GROUPS: LibraryGroup[] = [
  {
    label: 'Knowledge',
    items: [
      { key: 'hadith', title: 'Hadith Library', subtitle: 'Collections, books & saved hadith' },
    ],
  },
  {
    label: 'Dhikr',
    items: [
      { key: 'duas', title: 'Duas & Adhkar', subtitle: 'Daily supplications' },
      { key: 'tasbih', title: 'Tasbih', subtitle: 'Digital dhikr counter' },
      { key: 'names', title: '99 Names of Allah', subtitle: 'Asma ul-Husna with meanings' },
      { key: 'names-prophet', title: '99 Names of the Prophet ﷺ', subtitle: 'His ﷺ noble names & attributes' },
    ],
  },
  {
    label: 'Guides',
    items: [
      { key: 'ramadan-guide', title: 'Ramadan & Eid Guide', subtitle: 'Fasting, Laylatul Qadr, Zakat al-Fitr, Eid Salah' },
      { key: 'prayer-guide', title: 'Prayer Guide (Fiqh)', subtitle: 'Wudu, Salah, Janazah, Eid, Istikhara, Taraweeh' },
    ],
  },
];

/* ─── Group header ─────────────────────────────────────────────── */

function GroupHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
      {label}
    </Text>
  );
}

/* ─── Single row ──────────────────────────────────────────────── */

function LibraryRow({
  item,
  onPress,
}: {
  item: LibraryItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <View
        style={[
          styles.iconTile,
          {
            backgroundColor: colors.accentDim,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Ionicons name={ICONS[item.key]} size={17} color={colors.accent} />
      </View>
      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.rowSub, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={14}
        color={colors.textMuted}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

/* ─── Main screen ─────────────────────────────────────────────── */

export default function LibraryScreen({
  onOpen,
}: {
  onOpen: (key: LibraryItemKey) => void;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.scroll, { paddingHorizontal: paddingH }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, { maxWidth: maxW }]}>
        <SectionHeader compact eyebrow="Library" title="Explore" />

        {/* Grouped items */}
        {GROUPS.map((group, gi) => (
          <View key={group.label} style={gi > 0 ? styles.groupGap : undefined}>
            <GroupHeader label={group.label} />
            <View
              style={[
                styles.groupCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              {group.items.map((item, i) => (
                <View key={item.key}>
                  {i > 0 && <Hairline style={styles.insetHairline} />}
                  <LibraryRow item={item} onPress={() => onOpen(item.key)} />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Bottom breathing room */}
        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 10,
  },

  /* Group headers */
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  groupGap: {
    marginTop: 24,
  },

  /* Group card wrapping rows */
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  /* Individual row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 52,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14.5,
    lineHeight: 19,
  },
  rowSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 4,
  },

  /* Inset hairline (doesn't span to card edges) */
  insetHairline: {
    marginLeft: 60,
    marginRight: 14,
  },

  bottomSpacer: {
    height: 20,
  },
});
