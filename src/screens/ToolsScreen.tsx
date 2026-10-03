import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';

export type ToolsItemKey = 'qibla' | 'tracker' | 'location' | 'cities' | 'notifications';

interface ToolsItem {
  key: ToolsItemKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ITEMS: ToolsItem[] = [
  {
    key: 'qibla',
    title: 'Qibla',
    subtitle: 'Direction to the Kaaba & distance',
    icon: 'compass',
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
];

export default function ToolsScreen({
  onOpen,
}: {
  onOpen: (key: ToolsItemKey) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView style={{ backgroundColor: colors.bgBase }} contentContainerStyle={styles.content}>
      <SectionHeader eyebrow="Tools" title="Utilities" subtitle="Essential calculators, compass, and daily trackers" />

      <View style={styles.list}>
        {ITEMS.map((item, i) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  list: { borderWidth: 1, borderColor: 'transparent' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
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
