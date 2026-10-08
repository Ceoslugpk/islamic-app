import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { iconSizes } from '../lib/iconMap';
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width <= 360;
  const isTablet = width >= 640;
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
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.sheet,
            isTablet && styles.sheetTablet,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          {/* Drag Pill */}
          <View style={[styles.dragPill, { backgroundColor: colors.borderSubtle }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerTitles}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>
                TRANSLATIONS ({QURAN_LANGUAGE_EDITIONS.length})
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
              ]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close language selector"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.textPrimary, fontSize: isCompact ? 13 : 14 },
                ]}
                placeholder="Search language or translator..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="never"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.clearSearchBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={iconSizes.inlineLg} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {search.trim().length > 0 && (
              <View style={styles.searchMetaRow}>
                <Text style={[styles.searchMetaText, { color: colors.textSecondary }]}>
                  Found {filtered.length} of {QURAN_LANGUAGE_EDITIONS.length} translations
                </Text>
              </View>
            )}
          </View>

          {/* Language List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.editionIdentifier}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
            ItemSeparatorComponent={() => <Hairline />}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            windowSize={10}
            removeClippedSubviews={Platform.OS !== 'web'}
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
                  accessibilityLabel={`${item.language} - ${item.name}${isSelected ? ', currently selected' : ''}`}
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
                          {
                            backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                            borderColor: isSelected ? colors.accent : colors.borderSubtle,
                          },
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
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                  No translations match &ldquo;{search}&rdquo;
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Try searching by language name, country, or translator
                </Text>
                <TouchableOpacity
                  style={[styles.resetSearchBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim }]}
                  onPress={() => setSearch('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Text style={[styles.resetSearchText, { color: colors.accent }]}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  sheetTablet: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 40,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 12,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchMetaRow: {
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  searchMetaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 3,
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
    borderWidth: 1,
  },
  codeBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  editionNameText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    marginTop: 2,
  },
  rightAction: {
    marginStart: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  resetSearchBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetSearchText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
});
