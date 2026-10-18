import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens } from '../theme/tokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { getBookmarks, removeBookmark, addBookmark, VerseRef } from '../lib/study';
import { ArabicText } from '../components/ArabicText';
import { EmptyState } from '../components/EmptyState';
import { PremiumCard } from '../components/ui';
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
  const { tokens } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;
  const [bookmarks, setBookmarks] = useState<VerseRef[]>(() => getBookmarks());
  const [justRemoved, setJustRemoved] = useState<string | null>(null);
  const removedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { saveUndoState } = useUndoToast();

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
      <PremiumCard
        onPress={() => onOpenVerse?.(item.surah, item.ayah)}
        style={[
          styles.itemCard,
          {
            opacity: justRemoved === `${item.surah}:${item.ayah}` ? 0.45 : 1,
          },
        ]}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.badge, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, borderWidth: 1 }]}>
            <AppText variant="caption" highlight style={styles.badgeText}>
              {item.surahName ? `${item.surahName} · ` : ''}{t('Surah')} {item.surah}:{item.ayah}
            </AppText>
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
              color={justRemoved === `${item.surah}:${item.ayah}` ? tokens.accent : tokens.muted}
            />
          </TouchableOpacity>
        </View>

        <ArabicText size={22} style={[styles.arabic, { color: tokens.text }]}>
          {arabicText}
        </ArabicText>

        {item.translation ? (
          <AppText variant="body" style={styles.translation}>
            {item.translation}
          </AppText>
        ) : null}

        <View style={styles.itemFooter}>
          <AppText variant="link" style={styles.readHint}>
            {t('Tap to open in Reader →')}
          </AppText>
        </View>
      </PremiumCard>
    );
  };

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          title={t('Bookmarks')}
          eyebrow={t('Saved Verses')}
          subtitle={t('Access your saved verses and reading bookmarks')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <View style={styles.contentWrap}>
        <DetailScreen.FlatList
          data={bookmarks}
          keyExtractor={(item) => `${item.surah}:${item.ayah}`}
          renderItem={renderBookmark}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          ListEmptyComponent={
            <PremiumCard padded={false} style={styles.emptyCard} contentStyle={styles.emptyCardContent}>
              <EmptyState
                icon="bookmark-outline"
                title={t('No bookmarks yet')}
                subtitle={t('Open the Quran and tap the bookmark icon on any ayah to save it here for quick access.')}
                actionLabel={t('Open the Quran')}
                onAction={onOpenVerse ? () => onOpenVerse(1, 1) : undefined}
              />
            </PremiumCard>
          }
        />
      </View>
    </DetailScreen>
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
  listContent: {
    paddingTop: 8,
    gap: 12,
  },
  emptyCard: {
    borderRadius: 14,
    marginTop: 20,
  },
  emptyCardContent: {
    padding: 20,
    paddingVertical: 32,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 0.75,
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
