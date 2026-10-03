import React, { useState, useEffect } from 'react';
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
import { getNotes, addNote, deleteNote, Note } from '../lib/study';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';

interface NotesScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenVerse?: (surah: number, ayah: number) => void;
}

export default function NotesScreen({
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

  useEffect(() => {
    setNotes(getNotes());
  }, []);

  const onSave = () => {
    const refPattern = /^\d+:\d+$/;
    if (!refPattern.test(refInput.trim())) {
      setError('Invalid reference format. Use Surah:Ayah (e.g. 2:255)');
      return;
    }
    if (!input.trim()) {
      setError('Note content cannot be empty');
      return;
    }
    const [surahStr, ayahStr] = refInput.trim().split(':');
    const note = addNote(
      parseInt(surahStr, 10),
      parseInt(ayahStr, 10),
      input.trim()
    );
    if (note === false) {
      setError('Failed to save note');
      return;
    }
    setError(null);
    setInput('');
    setRefInput('');
    setNotes(getNotes());
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    setNotes(getNotes());
  };

  const renderNote = ({ item }: { item: Note }) => {
    return (
      <View
        style={[
          styles.noteCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={[styles.badge, { backgroundColor: colors.accentDim }]}
            onPress={() => onOpenVerse?.(item.surah, item.ayah)}
          >
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              Surah {item.surah}:{item.ayah} →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete note"
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
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
        <View style={[styles.header, { paddingHorizontal: paddingH }]}>
          {onBack && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Back to ${backLabel}`}
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>
                ← {backLabel}
              </Text>
            </TouchableOpacity>
          )}
          <SectionHeader eyebrow="Personal Study" title="Notes & Reflections" />
        </View>

        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: paddingH }]}
        ListHeaderComponent={
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Add New Reflection
            </Text>
            <TextInput
              placeholder="Write your thoughts or lessons from this verse..."
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
                placeholder="Verse: e.g. 2:255"
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
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={onSave}
                accessibilityRole="button"
                accessibilityLabel="Save reflection"
              >
                <Text style={[styles.saveBtnText, { color: colors.onAccent }]}>Save</Text>
              </TouchableOpacity>
            </View>
            {error && (
              <Text style={[styles.errorText, { color: colors.accent }]}>
                {error}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="create-outline"
            title="No reflections yet"
            subtitle="Add thoughts and reflections on verses as you read the Quran."
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingTop: 4,
    gap: 12,
  },
  inputCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginBottom: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
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
    borderRadius: 8,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
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
    borderRadius: 12,
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
    borderRadius: 6,
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