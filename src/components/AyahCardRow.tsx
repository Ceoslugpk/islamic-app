import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ayah } from '../lib/quran';
import { QuranScript } from '../lib/quranScripts';
import { AyahText } from './ArabicText';
import { TajweedText } from './TajweedText';
import { iconSizes } from '../lib/iconMap';
import { t } from '../lib/i18n';
import { isRtlScript } from '../lib/rtl';
import { AppText } from './ui/AppText';
import { useAutoProbe } from '../lib/diagnostic';
import { InteractiveSurface } from './InteractiveSurface';

export interface AyahBookmarkButtonProps {
  isBookmarked: boolean;
  onPress: () => void;
  accentColor: string;
  inactiveColor: string;
  ayahNumber: number;
}

export function AyahBookmarkButton({
  isBookmarked,
  onPress,
  accentColor,
  inactiveColor,
  ayahNumber,
}: AyahBookmarkButtonProps) {
  const [bounceAnim] = useState(() => new Animated.Value(1));

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.actionBtn}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={
        isBookmarked
          ? `${t('Remove bookmark for ayah')} ${ayahNumber}`
          : `${t('Bookmark ayah')} ${ayahNumber}`
      }
    >
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <Ionicons
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={iconSizes.inlineLg}
          color={isBookmarked ? accentColor : inactiveColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export interface AyahCardRowProps {
  ayah: Ayah;
  surahNumber: number;
  isBookmarked: boolean;
  isPlaying: boolean;
  isTafsirOpen: boolean;
  isCopied: boolean;
  isMarked: boolean;
  isNoteComposerActive: boolean;
  showTranslation: boolean;
  fontSize: number;
  ayahLineHeight: number;
  arabicFontFamily: string;
  currentScript: QuranScript;
  scriptText?: string;
  displayedText: string;
  translationEditionName?: string;
  translationFlag?: string;
  appLanguage: string;
  tafsirEdition?: string | null;
  tafsirText?: string | null;
  tafsirLoading?: boolean;
  // Theme colors
  accentColor: string;
  accentDimColor: string;
  textMutedColor: string;
  textSecondaryColor: string;
  textPrimaryColor: string;
  bgBaseColor: string;
  borderSubtleColor: string;
  // Callbacks
  onLayout?: (ayahNumber: number, height: number, y: number) => void;
  onAyahLayout?: (ayahNumber: number, height: number, y: number) => void;
  onPlayToggle: (ayahNumber: number) => void;
  onSetReadingMarker: (ayahNumber: number) => void;
  onOpenTafsir: (ayahNumber: number) => void;
  onCloseTafsir: () => void;
  onToggleBookmark: (ayah: Ayah) => void;
  onShare: (ayah: Ayah) => void;
  onCopy: (ayah: Ayah) => void;
  onLongPress: (ayahNumber: number) => void;
}

function arePropsEqual(prev: AyahCardRowProps, next: AyahCardRowProps): boolean {
  return (
    prev.ayah.numberInSurah === next.ayah.numberInSurah &&
    prev.ayah.text === next.ayah.text &&
    prev.ayah.translation === next.ayah.translation &&
    prev.surahNumber === next.surahNumber &&
    prev.isBookmarked === next.isBookmarked &&
    prev.isPlaying === next.isPlaying &&
    prev.isTafsirOpen === next.isTafsirOpen &&
    prev.isCopied === next.isCopied &&
    prev.isMarked === next.isMarked &&
    prev.isNoteComposerActive === next.isNoteComposerActive &&
    prev.showTranslation === next.showTranslation &&
    prev.fontSize === next.fontSize &&
    prev.ayahLineHeight === next.ayahLineHeight &&
    prev.arabicFontFamily === next.arabicFontFamily &&
    prev.currentScript === next.currentScript &&
    prev.scriptText === next.scriptText &&
    prev.displayedText === next.displayedText &&
    prev.translationEditionName === next.translationEditionName &&
    prev.translationFlag === next.translationFlag &&
    prev.appLanguage === next.appLanguage &&
    prev.tafsirEdition === next.tafsirEdition &&
    prev.tafsirText === next.tafsirText &&
    prev.tafsirLoading === next.tafsirLoading &&
    prev.accentColor === next.accentColor &&
    prev.accentDimColor === next.accentDimColor &&
    prev.textMutedColor === next.textMutedColor &&
    prev.textSecondaryColor === next.textSecondaryColor &&
    prev.textPrimaryColor === next.textPrimaryColor &&
    prev.bgBaseColor === next.bgBaseColor &&
    prev.borderSubtleColor === next.borderSubtleColor &&
    prev.onLayout === next.onLayout &&
    prev.onAyahLayout === next.onAyahLayout &&
    prev.onPlayToggle === next.onPlayToggle &&
    prev.onSetReadingMarker === next.onSetReadingMarker &&
    prev.onOpenTafsir === next.onOpenTafsir &&
    prev.onCloseTafsir === next.onCloseTafsir &&
    prev.onToggleBookmark === next.onToggleBookmark &&
    prev.onShare === next.onShare &&
    prev.onCopy === next.onCopy &&
    prev.onLongPress === next.onLongPress
  );
}

const AyahCardRowComponent = ({
  ayah,
  surahNumber,
  isBookmarked,
  isPlaying,
  isTafsirOpen,
  isCopied,
  isMarked,
  isNoteComposerActive,
  showTranslation,
  fontSize,
  ayahLineHeight,
  arabicFontFamily,
  currentScript,
  scriptText,
  displayedText,
  translationEditionName,
  translationFlag,
  appLanguage,
  tafsirEdition,
  tafsirText,
  tafsirLoading,
  accentColor,
  accentDimColor,
  textMutedColor,
  textSecondaryColor,
  textPrimaryColor,
  bgBaseColor,
  borderSubtleColor,
  onLayout,
  onAyahLayout,
  onPlayToggle,
  onSetReadingMarker,
  onOpenTafsir,
  onCloseTafsir,
  onToggleBookmark,
  onShare,
  onCopy,
  onLongPress,
}: AyahCardRowProps) => {
  const ayahNumber = ayah.numberInSurah;
  const isActiveAyah = isPlaying || isTafsirOpen || isCopied;
  const actionColor = isActiveAyah ? accentColor : textMutedColor;

  const autoProbe = useAutoProbe(`ayah-row-${ayahNumber}`, 'AyahCardRow', {
    isInteractive: true,
  });

  const handleCardLayout = (e: LayoutChangeEvent) => {
    autoProbe.onLayout?.(e);
    const { height, y } = e.nativeEvent.layout;
    if (onAyahLayout && height > 0) {
      onAyahLayout(ayahNumber, height, y);
    } else if (onLayout && height > 0) {
      onLayout(ayahNumber, height, y);
    }
  };

  return (
    <InteractiveSurface
      style={[
        styles.ayahCard,
        {
          backgroundColor: isPlaying
            ? accentDimColor
            : isNoteComposerActive
            ? accentDimColor
            : 'transparent',
          borderColor: isPlaying
            ? accentColor
            : isNoteComposerActive
            ? accentColor
            : 'transparent',
          borderStartWidth: isNoteComposerActive ? 3 : 1,
        },
      ]}
      onLayout={handleCardLayout}
      onLongPress={() => onLongPress(ayahNumber)}
      delayLongPress={1000}
      accessibilityRole="button"
      accessibilityLabel={`${t('Ayah')} ${ayahNumber}. ${t('Long press to add note')}`}
      accessibilityHint={t('Long press ~1 second to add a reflection note')}
    >
      {/* Action Header */}
      <View style={styles.ayahActionBar}>
        <View style={[styles.ayahBadge, { backgroundColor: accentDimColor }]}>
          <AppText
            variant="numeral"
            highlight
            style={styles.ayahBadgeText}
          >
            {ayahNumber}
          </AppText>
        </View>

        <View style={styles.actionsGroup}>
          {/* Play Ayah */}
          <TouchableOpacity
            onPress={() => onPlayToggle(ayahNumber)}
            style={styles.actionBtn}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${t('Play')} ${t('Ayah')} ${ayahNumber}`}
          >
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
              size={isPlaying ? 22 : iconSizes.inlineLg}
              color={isPlaying ? accentColor : actionColor}
            />
          </TouchableOpacity>

          {/* Reading Marker */}
          <TouchableOpacity
            onPress={() => onSetReadingMarker(ayahNumber)}
            style={styles.actionBtn}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={
              isMarked ? t('Reading marker set') : t('Set reading marker')
            }
          >
            <Ionicons
              name={isMarked ? 'flag' : 'flag-outline'}
              size={iconSizes.inlineLg}
              color={isMarked ? accentColor : actionColor}
            />
          </TouchableOpacity>

          {/* Tafsir */}
          <TouchableOpacity
            onPress={() => onOpenTafsir(ayahNumber)}
            style={styles.actionBtn}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${t('Tafsir for')} ${t('Ayah')} ${ayahNumber}`}
          >
            <Ionicons
              name={isTafsirOpen ? 'book' : 'book-outline'}
              size={iconSizes.inlineLg}
              color={isTafsirOpen ? accentColor : actionColor}
            />
          </TouchableOpacity>

          {/* Bookmark */}
          <AyahBookmarkButton
            isBookmarked={isBookmarked}
            onPress={() => onToggleBookmark(ayah)}
            accentColor={accentColor}
            inactiveColor={actionColor}
            ayahNumber={ayahNumber}
          />

          {/* Share */}
          <TouchableOpacity
            onPress={() => onShare(ayah)}
            style={styles.actionBtn}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Share Ayah ${ayahNumber}`}
          >
            <Ionicons name="share-social-outline" size={iconSizes.inlineLg} color={actionColor} />
          </TouchableOpacity>

          {/* Copy */}
          <TouchableOpacity
            onPress={() => onCopy(ayah)}
            style={styles.actionBtn}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Copy Ayah ${ayahNumber}`}
          >
            <Ionicons
              name={isCopied ? 'checkmark' : 'copy-outline'}
              size={iconSizes.inlineLg}
              color={isCopied ? accentColor : actionColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Arabic Text */}
      {currentScript === 'tajweed' && scriptText ? (
        <TajweedText
          text={scriptText}
          size={fontSize}
          fontFamily={arabicFontFamily}
          lineHeight={ayahLineHeight}
          numberInSurah={ayahNumber}
        />
      ) : (
        <AyahText
          text={displayedText}
          numberInSurah={ayahNumber}
          size={fontSize}
          fontFamily={arabicFontFamily}
          lineHeight={ayahLineHeight}
        />
      )}

      {/* Translation */}
      {showTranslation && Boolean(ayah.translation) && (
        <View style={styles.translationWrap}>
          <AppText variant="caption" style={styles.translationTag}>
            {translationFlag ? `${translationFlag} ` : ''}{translationEditionName || ''}
          </AppText>
          <AppText
            variant="body"
            style={[
              styles.translationText,
              isRtlScript(appLanguage) ? { textAlign: 'right', writingDirection: 'rtl' } : null,
            ]}
          >
            {ayah.translation}
          </AppText>
        </View>
      )}

      {/* Inline Tafsir Panel */}
      {isTafsirOpen && (
        <View
          style={[
            styles.inlineTafsirBox,
            { backgroundColor: bgBaseColor, borderColor: borderSubtleColor },
          ]}
        >
          <View style={styles.tafsirHeader}>
            <AppText variant="eyebrow" style={styles.tafsirTitle}>
              {tafsirEdition || 'Tafsir'}
            </AppText>
            <TouchableOpacity onPress={onCloseTafsir}>
              <Ionicons name="close" size={16} color={textMutedColor} />
            </TouchableOpacity>
          </View>
          {tafsirLoading ? (
            <ActivityIndicator size="small" color={accentColor} style={{ marginVertical: 8 }} />
          ) : (
            <AppText
              variant="body"
              style={styles.inlineTafsirText}
            >
              {tafsirText || ''}
            </AppText>
          )}
        </View>
      )}
    </InteractiveSurface>
  );
};

export const AyahCardRow = React.memo(AyahCardRowComponent, arePropsEqual);

const styles = StyleSheet.create({
  ayahCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ayahActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ayahBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ayahBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  translationWrap: {
    marginTop: 8,
  },
  translationTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  translationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  inlineTafsirBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tafsirHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tafsirTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  inlineTafsirText: {
    lineHeight: 22,
  },
});
