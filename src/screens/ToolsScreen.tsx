import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';

export type ToolsItemKey =
  | 'qibla'
  | 'tracker'
  | 'location'
  | 'cities'
  | 'notifications'
  | 'prayer-reminders'
  | 'fasting'
  | 'zakat'
  | 'calendar'
  | 'mosque'
  | 'women-cycle'
  | 'women-purity'
  | 'women-guidance'
  | 'women-qada'
  | 'umrah-guide'
  | 'umrah-resources'
  | 'hajj-journey'
  | 'makkah-live'
  | 'madinah-live'
  | 'hajj-live';

interface ToolsItem {
  key: ToolsItemKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  sectionHeader?: string;
}

interface ToolsGroup {
  label: string;
  items: ToolsItem[];
}

const BASE_GROUPS: ToolsGroup[] = [
  {
    label: 'Prayer & Location',
    items: [
      {
        key: 'qibla',
        title: 'Qibla',
        subtitle: 'Direction to the Kaaba & distance',
        icon: 'compass',
      },
      {
        key: 'mosque',
        title: 'Mosque Finder',
        subtitle: 'Nearby mosques & directions',
        icon: 'location',
      },
      {
        key: 'tracker',
        title: 'Salah Tracker',
        subtitle: 'Daily 5 prayers checklist & streaks',
        icon: 'checkmark-circle',
      },
      {
        key: 'prayer-reminders',
        title: 'Prayer Reminders',
        subtitle: 'Adhan alerts, per-prayer toggles & test',
        icon: 'notifications',
      },
      {
        key: 'location',
        title: 'Location',
        subtitle: 'GPS auto vs manual coordinates · choose a city',
        icon: 'navigate',
      },
    ],
  },
  {
    label: 'Worship & Calculations',
    items: [
      {
        key: 'fasting',
        title: 'Fasting',
        subtitle: 'Tracker · Ramadan · voluntary & missed fasts',
        icon: 'moon',
      },
      {
        key: 'zakat',
        title: 'Zakat',
        subtitle: 'Calculator · gold/silver, cash, investments',
        icon: 'wallet',
      },
      {
        key: 'calendar',
        title: 'Hijri Calendar',
        subtitle: 'Islamic dates · month grid',
        icon: 'calendar',
      },
    ],
  },
  {
    label: 'Hajj & Umrah',
    items: [
      {
        key: 'umrah-guide',
        title: 'Umrah Guide',
        subtitle: 'Step-by-step rituals · Ihram, Tawaf, Sa\'i & Halq',
        icon: 'walk',
      },
      {
        key: 'umrah-resources',
        title: 'Umrah Resources',
        subtitle: 'Packing checklist, duas, etiquette & tips',
        icon: 'list',
      },
      {
        key: 'hajj-journey',
        title: 'Hajj Journey',
        subtitle: 'Day-by-day timeline · Tarwiyah, Arafah to Tashreeq',
        icon: 'map',
      },
      {
        key: 'makkah-live',
        title: 'Makkah Live TV',
        subtitle: 'Masjid al-Haram · 24/7 official live broadcast',
        icon: 'videocam',
      },
      {
        key: 'madinah-live',
        title: 'Madinah Live',
        subtitle: 'Masjid an-Nabawi · 24/7 official Sunnah TV stream',
        icon: 'tv',
      },
      {
        key: 'hajj-live',
        title: 'Hajj Live',
        subtitle: 'Holy sites broadcast · Arafah, Mina & Muzdalifah',
        icon: 'radio',
      },
    ],
  },
];

export default function ToolsScreen({
  onOpen,
}: {
  onOpen: (key: ToolsItemKey) => void;
}) {
  const { colors } = useTheme();
  const { settings } = useSettings();

  const groups: ToolsGroup[] = useMemo(() => {
    if (!settings.womenWorshipEnabled) {
      return BASE_GROUPS;
    }
    return [
      BASE_GROUPS[0],
      {
        label: 'Worship & Calculations',
        items: [
          ...BASE_GROUPS[1].items,
          {
            key: 'women-cycle',
            title: 'Cycle Tracker',
            subtitle: 'Period logging, cycle duration & predictions',
            icon: 'flower',
            sectionHeader: "Women's Worship",
          },
          {
            key: 'women-purity',
            title: 'Purity & Ghusl',
            subtitle: 'Step-by-step ghusl, signs of tuhr & nifas',
            icon: 'water',
          },
          {
            key: 'women-guidance',
            title: 'Worship Guidance',
            subtitle: 'Exemptions, istihadha rulings & fiqh references',
            icon: 'book',
          },
          {
            key: 'women-qada',
            title: 'Qada Fasts',
            subtitle: 'Missed fasts tracker & makeup scorecard',
            icon: 'checkbox',
          },
        ],
      },
      BASE_GROUPS[2],
    ];
  }, [settings.womenWorshipEnabled]);

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isWide = width >= 600;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      <View style={styles.contentWrap}>
        <SectionHeader
          compact
          eyebrow="Tools"
          title="Utilities"
          subtitle="Essential calculators, compass, daily trackers & mosque finder"
        />

        {groups.map((group, gi) => (
          <View key={group.label} style={gi > 0 ? styles.groupGap : undefined}>
            <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{group.label}</Text>
            <View style={[styles.list, isWide && styles.listWide]}>
              {group.items.map((item, i) => (
                <View
                  key={item.key}
                  style={isWide ? (item.sectionHeader ? styles.subHeaderFull : styles.itemCell) : undefined}
                >
                  {item.sectionHeader ? (
                    <View style={[styles.subHeaderWrap, { borderTopColor: colors.borderSubtle }]}>
                      <Text style={[styles.subHeaderLabel, { color: colors.accent }]}>
                        {item.sectionHeader}
                      </Text>
                    </View>
                  ) : (
                    i > 0 && !isWide && <Hairline />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.row,
                      isWide && [
                        styles.rowCard,
                        { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                      ],
                    ]}
                    onPress={() => onOpen(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color={colors.accent} />
                    </View>
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <Text style={[styles.arrow, { color: colors.accent }]}>›</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 12, paddingBottom: 40 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  groupLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupGap: {
    marginTop: 24,
  },
  subHeaderWrap: {
    paddingTop: 16,
    paddingBottom: 6,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subHeaderLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  list: {},
  listWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCell: {
    flexBasis: '48%',
    minWidth: 0,
  },
  subHeaderFull: {
    flexBasis: '100%',
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1 },
  rowTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  rowSub: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  arrow: { fontFamily: 'Manrope_600SemiBold', fontSize: 22, lineHeight: 24 },
});
