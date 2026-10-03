import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
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
  | 'fasting'
  | 'zakat'
  | 'calendar'
  | 'mosque'
  | 'women';

interface ToolsItem {
  key: ToolsItemKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
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
        icon: 'map',
      },
      {
        key: 'tracker',
        title: 'Salah Tracker',
        subtitle: 'Daily 5 prayers checklist & streaks',
        icon: 'checkmark-circle',
      },
      {
        key: 'location',
        title: 'Location',
        subtitle: 'GPS auto vs manual coordinates',
        icon: 'navigate',
      },
      {
        key: 'cities',
        title: 'Cities',
        subtitle: '68 world cities directory & selector',
        icon: 'business',
      },
      {
        key: 'notifications',
        title: 'Notifications',
        subtitle: 'Prayer reminders & adhan test',
        icon: 'notifications',
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
            key: 'women',
            title: "Women's Worship",
            subtitle: 'Cycle, purity & fiqh guidance',
            icon: 'flower',
          },
        ],
      },
    ];
  }, [settings.womenWorshipEnabled]);

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.content}>
      <SectionHeader
        eyebrow="Tools"
        title="Utilities"
        subtitle="Essential calculators, compass, daily trackers & mosque finder"
      />

      {groups.map((group, gi) => (
        <View key={group.label} style={gi > 0 ? styles.groupGap : undefined}>
          <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{group.label}</Text>
          <View style={styles.list}>
            {group.items.map((item, i) => (
              <View key={item.key}>
                {i > 0 && <Hairline />}
                <TouchableOpacity
                  style={styles.row}
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
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{item.subtitle}</Text>
                  </View>
                  <Text style={[styles.arrow, { color: colors.accent }]}>›</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
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
  list: { borderWidth: 1, borderColor: 'transparent' },
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
