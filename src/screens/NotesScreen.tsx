import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  TextInput,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { getNotes, addNote, deleteNote, Note } from '../lib/study';
import { EmptyState } from '../components/EmptyState';
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
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;
  const [input, setInput] = useState<string>('');
  const [refInput, setRefInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { saveUndoState } = useUndoToast();

  useEffect(() => {
    setNotes(getNotes());
  }, []);

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
      <View
        style={[
          styles.noteCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
            opacity: justDeleted === item.id ? 0.45 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={[styles.badge, { backgroundColor: colors.sagePill || '#DBE7E1' }]}
            onPress={() => onOpenVerse?.(item.surah, item.ayah)}
          >
            <Text style={[styles.badgeText, { color: colors.forestDark || colors.forestGreen || colors.accent }]}>
              {t('Surah')} {item.surah}:{item.ayah} →
            </Text>
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
              color={justDeleted === item.id ? colors.accent : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.noteBody, { color: colors.textPrimary }]}>
          {item.body}
        </Text>

        <Text style={[styles.noteDate, { color: colors.textMuted }]}>
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={styles.contentWrap}>
        <ScreenHeader
          title={t('Notes & Reflections')}
          eyebrow={t('Personal Study')}
          onBack={onBack}
          backLabel={t(backLabel)}
        />

        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              marginHorizontal: paddingH,
              marginBottom: 12,
            },
          ]}
        >
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            {t('Add New Reflection')}
          </Text>
          <TextInput
            placeholder={t('Write your thoughts or lessons from this verse...')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={input}
            onChangeText={setInput}
            style={[
              styles.textArea,
              {
                color: colors.textPrimary,
                borderColor: colors.borderSubtle,
                backgroundColor: colors.bgBase,
              },
            ]}
          />
          <View style={styles.inputRow}>
            <TextInput
              placeholder={t('Verse: e.g. 2:255')}
              placeholderTextColor={colors.textMuted}
              value={refInput}
              onChangeText={setRefInput}
              style={[
                styles.refInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.bgBase,
                },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.forestGreen || colors.accent },
              ]}
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={justSaved ? t('Reflection saved') : t('Save reflection')}
            >
              <Text style={[styles.saveBtnText, { color: colors.onAccent }]}>
                {justSaved ? t('Saved ✓') : t('Save')}
              </Text>
            </TouchableOpacity>
          </View>
          {error && (
            <Text style={[styles.errorText, { color: colors.accent }]}>
              {error}
            </Text>
          )}
        </View>

        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: paddingH }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <EmptyState
              icon="create-outline"
              title={t('No reflections yet')}
              subtitle={t('Add thoughts and reflections on verses as you read the Quran — or write your first one above.')}
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
    paddingTop: 4,
    gap: 12,
  },
  inputCard: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginBottom: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  refInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 8,
  },
  noteCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  noteBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 4,
  },
  noteDate: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 6,
  },
});

export default withUndoToast(NotesScreen);
