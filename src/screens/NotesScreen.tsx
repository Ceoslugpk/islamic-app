import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { getNotes, addNote, deleteNote, Note } from '../lib/study';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { useUndoToast, withUndoToast } from '../lib/undoToast';

interface NotesScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenVerse?: (surah: number, ayah: number) => void;
}

function NotesScreen({
  onBack,
  backLabel = 'Quran',
  onOpenVerse,
}: NotesScreenProps) {
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;
  const [input, setInput] = useState<string>('');
  const [refInput, setRefInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>(() => getNotes());
  const [justSaved, setJustSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { saveUndoState } = useUndoToast();

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const onSave = () => {
    const refPattern = /^\d+:\d+$/;
    if (!refPattern.test(refInput.trim())) {
      setError(t('Invalid reference format. Use Surah:Ayah (e.g. 2:255)'));
      return;
    }
    if (!input.trim()) {
      setError(t('Note content cannot be empty'));
      return;
    }
    const [surahStr, ayahStr] = refInput.trim().split(':');
    const note = addNote(
      parseInt(surahStr, 10),
      parseInt(ayahStr, 10),
      input.trim()
    );
    if (note === false) {
      setError(t('Failed to save note'));
      return;
    }
    setError(null);
    setInput('');
    setRefInput('');
    setNotes(getNotes());
    setJustSaved(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setJustSaved(false), 1500);
  };

  const [justDeleted, setJustDeleted] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleDelete = (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    deleteNote(id);
    setNotes(getNotes());
    setJustDeleted(id);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => {
      setJustDeleted(null);
    }, 1200);
    saveUndoState({
      id,
      action: t('Note deleted'),
      revert: () => {
        addNote(target.surah, target.ayah, target.body);
        setNotes(getNotes());
      },
    });
  };

  const renderNote = ({ item }: { item: Note }) => {
    return (
      <Card
        style={[
          styles.noteCard,
          {
            opacity: justDeleted === item.id ? 0.45 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={[styles.badge, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, borderWidth: 1 }]}
            onPress={() => onOpenVerse?.(item.surah, item.ayah)}
          >
            <AppText variant="caption" highlight style={styles.badgeText}>
              {t('Surah')} {item.surah}:{item.ayah} →
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel={justDeleted === item.id ? t('Note deleted') : t('Delete note')}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons
              name={justDeleted === item.id ? 'checkmark' : 'trash-outline'}
              size={17}
              color={justDeleted === item.id ? tokens.success : tokens.muted}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.noteBodyWrap, { borderLeftColor: tokens.goldBorder, borderLeftWidth: 3, paddingStart: 12, paddingVertical: 8, paddingEnd: 8, marginVertical: 6, borderRadius: 10, backgroundColor: tokens.ringFill }]}>
          <AppText variant="body" style={styles.noteBody}>
            {item.body}
          </AppText>
        </View>

        <View style={styles.noteFooter}>
          <View style={styles.noteDateRow}>
            <Ionicons name="time-outline" size={13} color={tokens.muted} />
            <AppText variant="caption" tone="faint" style={styles.noteDate}>
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </AppText>
          </View>
          <TouchableOpacity
            style={[styles.openVerseLink, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, borderWidth: 1 }]}
            onPress={() => onOpenVerse?.(item.surah, item.ayah)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Read')} ${t('Surah')} ${item.surah}:${item.ayah}`}
          >
            <AppText variant="link" style={styles.openVerseLinkText}>
              {t('Read in Quran')} ↗
            </AppText>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Card style={styles.inputCard}>
        <View style={styles.inputHeaderRow}>
          <View style={[styles.inputHeaderIconWrap, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, borderWidth: 1 }]}>
            <Ionicons name="book-outline" size={16} color={tokens.goldText} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="sectionTitle" style={styles.inputLabel}>
              {t('Add New Reflection')}
            </AppText>
            <AppText variant="caption" tone="faint" style={styles.inputHint}>
              {t('Capture your insights, questions, and personal dua')}
            </AppText>
          </View>
        </View>
        <TextInput
          placeholder={t('Write your thoughts or lessons from this verse...')}
          placeholderTextColor={tokens.muted}
          accessibilityLabel={t('Write your thoughts or lessons from this verse...')}
          multiline
          numberOfLines={3}
          value={input}
          onChangeText={setInput}
          style={[
            styles.textArea,
            {
              color: tokens.text,
              borderColor: tokens.cardBorder,
              backgroundColor: tokens.inset,
            },
          ]}
        />
        <View style={styles.inputRow}>
          <TextInput
            placeholder={t('Verse: e.g. 2:255')}
            placeholderTextColor={tokens.muted}
            accessibilityLabel={t('Verse: e.g. 2:255')}
            value={refInput}
            onChangeText={setRefInput}
            style={[
              styles.refInput,
              {
                color: tokens.text,
                borderColor: tokens.cardBorder,
                backgroundColor: tokens.inset,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              getPillShadow(mode),
              { backgroundColor: tokens.gold },
            ]}
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel={justSaved ? t('Reflection saved') : t('Save reflection')}
          >
            <AppText variant="rowTitle" tone="onGold" style={styles.saveBtnText}>
              {justSaved ? t('Saved ✓') : t('Save')}
            </AppText>
          </TouchableOpacity>
        </View>
        {error && (
          <AppText variant="caption" tone="danger" style={styles.errorText}>
            {error}
          </AppText>
        )}
      </Card>
    </View>
  );

  const renderFooter = () => {
    if (notes.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <Card style={[styles.studyTipCard, getCardShadow(mode)]}>
          <View style={styles.studyTipHeader}>
            <View style={[styles.studyTipIconWrap, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder, borderWidth: 1 }]}>
              <Ionicons name="sparkles" size={15} color={tokens.goldText} />
            </View>
            <AppText variant="title" style={styles.studyTipTitle}>
              {t('Reflecting on the Quran (Tadabbur)')}
            </AppText>
          </View>
          <AppText variant="body" tone="faint" style={styles.studyTipQuote}>
            {t('“Do they not then reflect upon the Quran, or are there locks upon their hearts?” (Surah Muhammad 47:24)')}
          </AppText>
          <View style={[styles.studyTipDivider, { backgroundColor: tokens.cardBorder }]} />
          <AppText variant="caption" tone="faint" style={styles.studyTipHint}>
            {t('Notes are saved privately on your device. Review your reflections periodically to deepen your understanding.')}
          </AppText>
        </Card>
      </View>
    );
  };

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          title={t('Notes & Reflections')}
          eyebrow={t('Personal Study')}
          subtitle={t('Record thoughts and reflections on verses as you read')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <View style={styles.contentWrap}>
        <DetailScreen.FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Card style={styles.emptyCard} padded={false}>
              <EmptyState
                icon="create-outline"
                title={t('No reflections yet')}
                subtitle={t('Add thoughts and reflections on verses as you read the Quran — or write your first one above.')}
              />
            </Card>
          }
        />
      </View>
    </DetailScreen>
  );
}

export default withUndoToast(NotesScreen);

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
  headerContainer: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  listContent: {
    paddingTop: 4,
    gap: 12,
  },
  inputCard: {
    borderRadius: 20,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 2,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 70,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  refInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 40,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } as any : {}),
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
    flexShrink: 0,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontFamily: 'Manrope_700Bold',
    paddingVertical: 2,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'Manrope_500Medium',
    paddingVertical: 2,
  },
  emptyCard: {
    borderRadius: 20,
    marginTop: 8,
  },
  noteCard: {
    borderRadius: 20,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12.5,
    fontFamily: 'Manrope_700Bold',
    paddingVertical: 2,
  },
  deleteBtn: {
    padding: 6,
    margin: -6,
  },
  noteBody: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  inputHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    marginTop: 1,
  },
  noteBodyWrap: {
    marginVertical: 4,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(160, 140, 90, 0.2)',
  },
  noteDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openVerseLink: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
    borderRadius: 8,
  },
  openVerseLinkText: {
    fontSize: 11.5,
    fontFamily: 'Manrope_600SemiBold',
    paddingVertical: 2,
  },
  noteDate: {
    fontSize: 11.5,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 2,
  },
  footerContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  studyTipCard: {
    borderRadius: 20,
    marginBottom: 8,
  },
  studyTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  studyTipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studyTipTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  studyTipQuote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  studyTipDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  studyTipHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
  },
});
