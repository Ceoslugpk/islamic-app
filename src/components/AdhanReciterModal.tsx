import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
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
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
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
            style={[styles.closeBtn, { backgroundColor: colors.bgSurface }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close reciter selector"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Notice Card */}
        <View style={[styles.infoBanner, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="volume-medium-outline" size={18} color={colors.accent} />
          <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
            Preview adhans with the play button. The chosen reciter will sound when prayer time arrives in-app.
          </Text>
        </View>

        {/* Reciters List */}
        <FlatList
          data={ADHAN_RECITERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
                        { backgroundColor: isSelected ? colors.accent : colors.bgSurface },
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
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
    paddingBottom: 40,
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
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
