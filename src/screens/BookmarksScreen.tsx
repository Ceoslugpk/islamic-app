import React, { useState, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { getBookmarks, removeBookmark, VerseRef } from '../lib/study';
import { SectionHeader } from '../components/SectionHeader';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';

interface BookmarksScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenVerse?: (surah: number, ayah: number) => void;
}

export default function BookmarksScreen({
  onBack,
  backLabel = 'Quran',
  onOpenVerse,
}: BookmarksScreenProps) {
  const { colors } = useTheme();
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  const handleRemove = (surah: number, ayah: number) => {
    removeBookmark(surah, ayah);
    setBookmarks(getBookmarks());
  };

  const renderBookmark = ({ item }: { item: VerseRef }) => {
    const arabicText = item.text.replace(/<[^>]*>/g, '').trim();
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onOpenVerse?.(item.surah, item.ayah)}
        style={[
          styles.itemCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.badge, { backgroundColor: colors.accentDim }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              {item.surahName ? `${item.surahName} · ` : ''}Surah {item.surah}:{item.ayah}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete bookmark"
            onPress={() => handleRemove(item.surah, item.ayah)}
          >
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ArabicText size={22} style={styles.arabic}>
          {arabicText}
        </ArabicText>

        {item.translation ? (
          <Text style={[styles.translation, { color: colors.textSecondary }]}>
            {item.translation}
          </Text>
        ) : null}

        <View style={styles.itemFooter}>
          <Text style={[styles.readHint, { color: colors.accent }]}>
            Tap to open in Reader →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Back to ${backLabel}`}
            onPress={onBack}
            style={styles.backBtn}
          >
            <Text style={[styles.backText, { color: colors.accent }]}>
              ← {backLabel}
            </Text>
          </TouchableOpacity>
        )}
        <SectionHeader eyebrow="Saved Verses" title="Bookmarks" />
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => `${item.surah}:${item.ayah}`}
        renderItem={renderBookmark}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="bookmark-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No bookmarks yet
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Tap the bookmark icon on any ayah in the Quran reader to save it here for quick access.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  arabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
    lineHeight: 34,
  },
  translation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  itemFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  readHint: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    marginTop: 12,
  },
  emptyDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});