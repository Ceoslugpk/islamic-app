import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { getBookmarks, removeBookmark, addBookmark, VerseRef } from '../lib/study';
import { ArabicText } from '../components/ArabicText';
import { Hairline } from '../components/Hairline';
import { EmptyState } from '../components/EmptyState';
import { useUndoToast, withUndoToast } from '../lib/undoToast';

interface BookmarksScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenVerse?: (surah: number, ayah: number) => void;
}

function BookmarksScreen({
  onBack,
  backLabel = 'Quran',
  onOpenVerse,
}: BookmarksScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);
  const [justRemoved, setJustRemoved] = useState<string | null>(null);
  const removedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { saveUndoState } = useUndoToast();

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, []);

  useEffect(() => {
    return () => {
      if (removedTimerRef.current) clearTimeout(removedTimerRef.current);
    };
  }, []);

  const handleRemove = (surah: number, ayah: number) => {
    const target = bookmarks.find((b) => b.surah === surah && b.ayah === ayah);
    if (!target) return;
    removeBookmark(surah, ayah);
    setBookmarks(getBookmarks());
    const key = `${surah}:${ayah}`;
    setJustRemoved(key);
    if (removedTimerRef.current) clearTimeout(removedTimerRef.current);
    removedTimerRef.current = setTimeout(() => {
      setJustRemoved(null);
    }, 1200);
    saveUndoState({
      id: key,
      action: t('Bookmark removed'),
      revert: () => {
        addBookmark(target);
        setBookmarks(getBookmarks());
      },
    });
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
            opacity: justRemoved === `${item.surah}:${item.ayah}` ? 0.45 : 1,
          },
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.badge, { backgroundColor: colors.sagePill }]}>
            <Text style={[styles.badgeText, { color: colors.forestGreen }]}>
              {item.surahName ? `${item.surahName} · ` : ''}{t('Surah')} {item.surah}:{item.ayah}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel={justRemoved === `${item.surah}:${item.ayah}` ? t('Bookmark removed') : t('Delete bookmark')}
            onPress={() => handleRemove(item.surah, item.ayah)}
          >
            <Ionicons
              name={justRemoved === `${item.surah}:${item.ayah}` ? 'checkmark' : 'trash-outline'}
              size={17}
              color={justRemoved === `${item.surah}:${item.ayah}` ? colors.accent : colors.textMuted}
            />
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
          <Text style={[styles.readHint, { color: colors.forestGreen }]}>
            {t('Tap to open in Reader →')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        <ScreenHeader
          title={t('Bookmarks')}
          eyebrow={t('Saved Verses')}
          onBack={onBack}
          backLabel={t(backLabel)}
        />

        <FlatList
          data={bookmarks}
          keyExtractor={(item) => `${item.surah}:${item.ayah}`}
          renderItem={renderBookmark}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: paddingH }]}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title={t('No bookmarks yet')}
              subtitle={t('Open the Quran and tap the bookmark icon on any ayah to save it here for quick access.')}
              actionLabel={t('Open the Quran')}
              onAction={onOpenVerse ? () => onOpenVerse(1, 1) : undefined}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 20,
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
    borderRadius: 12,
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
});

export default withUndoToast(BookmarksScreen);
