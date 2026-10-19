import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  Platform,
  PixelRatio,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { fontRoles } from '../../theme/tokens';
import { getCurrentLanguage } from '../../lib/i18n';
import {
  TypographyScript,
  detectScriptFromContent,
  calculateScriptLineHeight,
} from '../../lib/typography';

export type AppTextVariant =
  | 'screenTitle'
  | 'headerTitle'
  | 'title'
  | 'sectionTitle'
  | 'numeral'
  | 'rowTitle'
  | 'body'
  | 'subtitle'
  | 'caption'
  | 'eyebrow'
  | 'link'
  | 'onHeroTitle'
  | 'onHeroSubtitle';

export type AppTextTone = 'danger' | 'faint' | 'onGold';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  tone?: AppTextTone;
  highlight?: boolean;
  onHero?: boolean;
  children?: React.ReactNode;
}

interface VariantConfig {
  fontSize: number;
  category: 'ui' | 'title' | 'numeral';
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none';
}

const VARIANT_CONFIGS: Record<AppTextVariant, VariantConfig> = {
  screenTitle: { fontSize: 33.5, category: 'title', letterSpacing: -0.2 },
  headerTitle: { fontSize: 24, category: 'title', letterSpacing: -0.1 },
  onHeroTitle: { fontSize: 24, category: 'title', letterSpacing: -0.1 },
  title: { fontSize: 20, category: 'title' },
  sectionTitle: { fontSize: 17, category: 'title' },
  numeral: { fontSize: 20, category: 'numeral', letterSpacing: 0.2 },
  rowTitle: { fontSize: 12, category: 'ui' },
  body: { fontSize: 12, category: 'ui' },
  link: { fontSize: 12, category: 'ui' },
  subtitle: { fontSize: 11, category: 'ui' },
  caption: { fontSize: 11, category: 'ui' },
  onHeroSubtitle: { fontSize: 11, category: 'ui' },
  eyebrow: { fontSize: 11, category: 'ui', letterSpacing: 1.8, textTransform: 'uppercase' },
};

function extractString(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractString).join('');
  if (React.isValidElement(node) && node.props && (node.props as { children?: React.ReactNode }).children) {
    return extractString((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function getFontFamily(variant: AppTextVariant, script: TypographyScript): string {
  const isRtlScript = script === 'arabic' || script === 'urdu';
  switch (variant) {
    case 'screenTitle':
    case 'headerTitle':
    case 'onHeroTitle':
    case 'title':
    case 'sectionTitle':
      return isRtlScript ? fontRoles.titleRtl : fontRoles.title;
    case 'numeral':
      return isRtlScript ? fontRoles.titleRtl : fontRoles.title;
    case 'eyebrow':
      return isRtlScript ? fontRoles.arabic : fontRoles.eyebrow;
    case 'rowTitle':
    case 'link':
      return isRtlScript ? fontRoles.arabicNotoBold : fontRoles.uiMedium;
    case 'subtitle':
    case 'onHeroSubtitle':
      return isRtlScript ? fontRoles.arabicNoto : fontRoles.subtitle;
    case 'caption':
    case 'body':
    default:
      return isRtlScript ? fontRoles.arabicNoto : fontRoles.ui;
  }
}

export function getTypographyStyle(
  variant: AppTextVariant,
  scriptOrRtl: TypographyScript | boolean = 'latin',
): TextStyle {
  const script: TypographyScript =
    typeof scriptOrRtl === 'boolean'
      ? scriptOrRtl
        ? 'arabic'
        : 'latin'
      : scriptOrRtl;

  const cfg = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.body;
  const lineHeight = calculateScriptLineHeight(cfg.fontSize, script, cfg.category);
  const fontFamily = getFontFamily(variant, script);
  const isRtlScript = script === 'arabic' || script === 'urdu';

  const style: TextStyle = {
    fontFamily,
    fontSize: cfg.fontSize,
    lineHeight,
  };

  if (cfg.letterSpacing !== undefined) {
    style.letterSpacing = isRtlScript ? 0 : cfg.letterSpacing;
  }

  if (cfg.textTransform !== undefined) {
    style.textTransform = isRtlScript ? 'none' : cfg.textTransform;
  }

  return style;
}

export const AppText = forwardRef<Text, AppTextProps>(function AppText(
  {
    variant = 'body',
    tone,
    highlight = false,
    onHero = false,
    style,
    maxFontSizeMultiplier,
    children,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const tokens = theme.tokens || theme.textTokens;
  const currentLang = getCurrentLanguage();
  const textContent = extractString(children);
  const script = detectScriptFromContent(textContent, currentLang);

  let resolvedColor: string;
  if (tone === 'danger') {
    resolvedColor = tokens.danger;
  } else if (tone === 'faint') {
    resolvedColor = tokens.faint;
  } else if (tone === 'onGold') {
    resolvedColor = tokens.onGold;
  } else if (onHero) {
    resolvedColor =
      variant === 'onHeroSubtitle' || variant === 'subtitle' || variant === 'caption'
        ? tokens.onHeroMuted
        : tokens.onHeading;
  } else if (highlight) {
    resolvedColor = variant === 'numeral' ? tokens.numeralAccent : tokens.eyebrow;
  } else {
    switch (variant) {
      case 'screenTitle':
      case 'headerTitle':
      case 'title':
      case 'sectionTitle':
      case 'rowTitle':
      case 'numeral':
        resolvedColor = tokens.heading;
        break;
      case 'body':
        resolvedColor = tokens.body;
        break;
      case 'subtitle':
      case 'caption':
        resolvedColor = tokens.subtle;
        break;
      case 'eyebrow':
      case 'link':
        resolvedColor = tokens.eyebrow;
        break;
      case 'onHeroTitle':
        resolvedColor = tokens.onHeading;
        break;
      case 'onHeroSubtitle':
        resolvedColor = tokens.onHeroMuted;
        break;
      default:
        resolvedColor = tokens.body;
        break;
    }
  }

  const typographyStyle = getTypographyStyle(variant, script);

  const defaultMaxMultiplier = variant === 'numeral' ? 1.2 : 1.3;
  const resolvedMaxMultiplier = maxFontSizeMultiplier ?? defaultMaxMultiplier;
  const flattenedStyle = StyleSheet.flatten(style);
  const isTallScript = script === 'arabic' || script === 'urdu';
  const fontScale = Math.min(
    Math.max(PixelRatio.getFontScale() || 1, 1),
    resolvedMaxMultiplier,
  );
  const effectiveFontSize = typeof flattenedStyle?.fontSize === 'number'
    ? flattenedStyle.fontSize
    : typographyStyle.fontSize ?? VARIANT_CONFIGS[variant].fontSize;
  const requestedLineHeight = flattenedStyle?.lineHeight ?? typographyStyle.lineHeight;
  const safeLineHeight = isTallScript
    ? Math.max(
        requestedLineHeight ?? 0,
        calculateScriptLineHeight(effectiveFontSize, script, VARIANT_CONFIGS[variant].category),
      ) * fontScale
    : undefined;

  const isLetterSpacedEyebrow = variant === 'eyebrow';
  const needsSafeVerticalPadding = rest.numberOfLines === 1 || isLetterSpacedEyebrow;
  const glyphPaddingStyle: TextStyle | undefined = needsSafeVerticalPadding
    ? { paddingVertical: 2 }
    : variant === 'numeral'
    ? { paddingBottom: 2 }
    : undefined;

  const androidFontPadding: TextStyle | undefined =
    Platform.OS === 'android'
      ? {
          includeFontPadding: script !== 'latin',
        }
      : undefined;

  return (
    <Text
      ref={ref}
      style={[
        styles.base,
        typographyStyle,
        androidFontPadding,
        glyphPaddingStyle,
        { color: resolvedColor },
        style,
        safeLineHeight === undefined ? undefined : { lineHeight: safeLineHeight },
      ]}
      maxFontSizeMultiplier={resolvedMaxMultiplier}
      {...rest}
    >
      {children}
    </Text>
  );
});

const styles = StyleSheet.create({
  base: {},
});
