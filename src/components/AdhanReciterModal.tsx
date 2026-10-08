import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hairline } from './Hairline';
import {
  ADHAN_RECITERS,
  AdhanReciter,
  playAdhan,
  stopAdhan,
  addAdhanPlaybackListener,
} from '../lib/audio';

interface AdhanReciterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedReciterId: string;
  onSelectReciter: (id: string) => void;
}

export function AdhanReciterModal({
  visible,
  onClose,
  selectedReciterId,
  onSelectReciter,
}: AdhanReciterModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 640;
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = addAdhanPlaybackListener((id) => {
      setPlayingId(id);
      if (id === null) {
        setLoadingId(null);
      }
    });
    return () => unsub();
  }, []);

  const handleSelect = (item: AdhanReciter) => {
    onSelectReciter(item.id);
    onClose();
  };

  const handleTogglePreview = async (item: AdhanReciter) => {
    if (playingId === item.id) {
      await stopAdhan();
    } else {
      setLoadingId(item.id);
      try {
        await playAdhan(item.id);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const handleClose = async () => {
    await stopAdhan();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
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
              <Text style={[styles.eyebrow, { color: colors.accent }]}>PRAYER CALL</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Adhan Reciters</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose who calls the prayer
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.bgBase }]}
              onPress={handleClose}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Close reciter selector"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Notice Card */}
          <View style={[styles.infoBanner, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
            <Ionicons name="volume-medium-outline" size={18} color={colors.accent} />
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              Preview adhans with the play button. The chosen reciter will sound when prayer time arrives in-app.
            </Text>
          </View>

          {/* Reciters List */}
          <FlatList
            data={ADHAN_RECITERS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
            ItemSeparatorComponent={() => <Hairline />}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedReciterId;
              const isPlayingThis = playingId === item.id;
              const isLoadingThis = loadingId === item.id;

              return (
                <TouchableOpacity
                  style={[
                    styles.reciterRow,
                    {
                      backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      borderColor: isSelected ? colors.accent : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.location}. ${isSelected ? 'Selected' : 'Tap to select'}`}
                >
                  {/* Play / Preview Button */}
                  <TouchableOpacity
                    style={[
                      styles.previewBtn,
                      {
                        backgroundColor: isPlayingThis ? colors.accent : colors.bgSurface,
                        borderColor: isPlayingThis ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => handleTogglePreview(item)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={isPlayingThis ? `Stop ${item.name}` : `Preview ${item.name}`}
                  >
                    {isLoadingThis ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons
                        name={isPlayingThis ? 'stop' : 'play'}
                        size={18}
                        color={isPlayingThis ? colors.bgBase : colors.accent}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Reciter Details */}
                  <View style={styles.textWrap}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.nameText,
                          { color: isSelected ? colors.accent : colors.textPrimary },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: isSelected ? colors.accent : colors.bgBase },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: isSelected ? colors.onAccent : colors.textMuted },
                          ]}
                        >
                          {item.location}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.arabicText, { color: colors.accent }]}>
                      {item.arabicName}
                    </Text>

                    <Text
                      style={[
                        styles.descText,
                        { color: isSelected ? colors.textPrimary : colors.textSecondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>

                  {/* Selected Checkmark Indicator */}
                  <View style={styles.rightAction}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
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
    maxWidth: 640,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  previewBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nameText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  arabicText: {
    fontFamily: 'NotoNaskhArabic_700Bold',
    fontSize: 13,
    marginTop: 2,
  },
  descText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  rightAction: {
    marginStart: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
