import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { QURAN_LANGUAGE_EDITIONS, QuranLanguageEdition } from '../lib/quranLanguages';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { Hairline } from './Hairline';

interface QuranLanguageModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguage?: string;
  onSelectLanguage?: (langCode: string) => void;
  title?: string;
  subtitle?: string;
}

export function QuranLanguageModal({
  visible,
  onClose,
  selectedLanguage,
  onSelectLanguage,
  title = 'Quran Translation',
  subtitle = 'Choose translation edition & language',
}: QuranLanguageModalProps) {
  const { colors } = useTheme();
  const { language: currentGlobalLang, setLanguage: setGlobalLang } = useQuranLanguage();
  const [search, setSearch] = useState('');

  const activeLang = selectedLanguage || currentGlobalLang;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return QURAN_LANGUAGE_EDITIONS;
    return QURAN_LANGUAGE_EDITIONS.filter(
      (item) =>
        item.language.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.languageCode.toLowerCase().includes(q) ||
        item.flag.includes(q)
    );
  }, [search]);

  const handleSelect = (item: QuranLanguageEdition) => {
    if (onSelectLanguage) {
      onSelectLanguage(item.languageCode);
    } else {
      setGlobalLang(item.languageCode);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerTitles}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>TRANSLATIONS</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close language selector"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search language or translator..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Language List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.editionIdentifier}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Hairline />}
          renderItem={({ item }) => {
            const isSelected = item.languageCode === activeLang;
            return (
              <TouchableOpacity
                style={[
                  styles.languageRow,
                  {
                    backgroundColor: isSelected ? colors.accentDim : 'transparent',
                    borderColor: isSelected ? colors.accent : 'transparent',
                  },
                ]}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.language} - ${item.name}`}
              >
                {/* Country Flag */}
                <View style={styles.flagWrap}>
                  <Text style={styles.flagEmoji}>{item.flag}</Text>
                </View>

                {/* Language & Translator info */}
                <View style={styles.textWrap}>
                  <View style={styles.langNameRow}>
                    <Text
                      style={[
                        styles.languageText,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {item.language}
                    </Text>
                    <View
                      style={[
                        styles.codeBadge,
                        { backgroundColor: isSelected ? colors.accent : colors.bgSurface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.codeBadgeText,
                          { color: isSelected ? colors.onAccent : colors.textMuted },
                        ]}
                      >
                        {item.languageCode.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.editionNameText,
                      { color: isSelected ? colors.textPrimary : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>

                {/* Checkmark indicator */}
                <View style={styles.rightAction}>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No translations match &ldquo;{search}&rdquo;
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitles: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 2,
  },
  flagWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flagEmoji: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  langNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  editionNameText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    marginTop: 3,
  },
  rightAction: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },
});
