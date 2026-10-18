/**
 * Authoritative Theme Tokens for Premium Home Redesign
 * Defines exact color tokens for Dark ('ink') and Light ('paper') modes,
 * plus Hero and Gold gradients.
 */
import { Platform } from 'react-native';

export const HOME_THEME_TOKENS = {
  ink: {
    bgTop: '#12121C',
    bgBottom: '#0C0C14',
    cardTop: '#2A2933',
    cardBottom: '#201F28',
    cardBorder: '#8C7747',
    text: '#F3EEDD',
    muted: '#A8A6AE',
    accent: '#E6BE6C',
    gold: '#E6BE6C',
    onGold: '#1A1408',
    ringFill: '#201F28',
    ringBorder: '#8C7747',
    trackColor: '#8C7747',
    arabicName: '#E6BE6C',
  },
  paper: {
    bgTop: '#F8F4EA',
    bgBottom: '#F0EBDE',
    cardTop: '#FEFCF7',
    cardBottom: '#FAF6ED',
    cardBorder: '#E2CC9C',
    text: '#14221E',
    muted: '#647068',
    accent: '#105A4B',
    gold: '#EECA80',
    onGold: '#092C25',
    ringFill: '#F0F6F2',
    ringBorder: '#E2CC9C',
    trackColor: '#E2CC9C',
    arabicName: '#8A6420',
  },
  hero: {
    darkGradient: ['#145648', '#082A23'] as const,
    lightGradient: ['#0E4D3E', '#083228'] as const,
    outerBorder: '#C4A056',
    innerBorder: '#786234',
    ivory: '#F6F0E1',
    mintDark: '#A0C8BA',
    mintLight: '#8EB3A5',
    deep: '#062821',
  },
  goldGradient: ['#DCB16A', '#BA8A3E'] as const,
} as const;

export type HomeMode = 'ink' | 'paper';


export interface CardShadowTokens {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  boxShadow?: string;
}

export const CARD_SHADOW: Record<HomeMode, CardShadowTokens> = {
  paper:
    Platform.OS === 'web'
      ? { boxShadow: '0 5px 14px rgba(40,35,24,0.14)' }
      : {
          shadowColor: '#282318',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.14,
          shadowRadius: 14,
          elevation: 3,
        },
  ink:
    Platform.OS === 'web'
      ? { boxShadow: '0 8px 20px rgba(0,0,0,0.65)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.60,
          shadowRadius: 12,
          elevation: 5,
        },
};

export const FLOATING_CARD_SHADOW: Record<HomeMode, CardShadowTokens> = {
  paper:
    Platform.OS === 'web'
      ? { boxShadow: '0 10px 28px rgba(40,68,58,0.08)' }
      : {
          shadowColor: '#28443A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 3,
        },
  ink:
    Platform.OS === 'web'
      ? { boxShadow: '0 10px 28px rgba(0,0,0,0.65)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.60,
          shadowRadius: 24,
          elevation: 3,
        },
};

export const HERO_CARD_SHADOW: Record<HomeMode, CardShadowTokens> = {
  paper:
    Platform.OS === 'web'
      ? { boxShadow: '0 6px 16px rgba(14,54,44,0.16)' }
      : {
          shadowColor: '#0E362C',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 4,
        },
  ink:
    Platform.OS === 'web'
      ? { boxShadow: '0 10px 24px rgba(0,0,0,0.72)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.68,
          shadowRadius: 16,
          elevation: 6,
        },
};

export const ACTIVE_PRAYER_CARD_SHADOW: Record<HomeMode, CardShadowTokens> = {
  paper:
    Platform.OS === 'web'
      ? { boxShadow: '0 4px 12px rgba(122,84,24,0.16)' }
      : {
          shadowColor: '#7A5418',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 4,
        },
  ink:
    Platform.OS === 'web'
      ? { boxShadow: '0 6px 16px rgba(0,0,0,0.65)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.60,
          shadowRadius: 10,
          elevation: 5,
        },
};

export const PILL_SHADOW: Record<HomeMode, CardShadowTokens> = {
  paper:
    Platform.OS === 'web'
      ? { boxShadow: '0 4px 14px rgba(40,35,24,0.14)' }
      : {
          shadowColor: '#282318',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 14,
          elevation: 3,
        },
  ink:
    Platform.OS === 'web'
      ? { boxShadow: '0 4px 14px rgba(0,0,0,0.50)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.50,
          shadowRadius: 14,
          elevation: 3,
        },
};

export function getCardShadow(mode: HomeMode): CardShadowTokens {
  return CARD_SHADOW[mode];
}

export function getFloatingCardShadow(mode: HomeMode): CardShadowTokens {
  return FLOATING_CARD_SHADOW[mode];
}

export function getHeroCardShadow(mode: HomeMode): CardShadowTokens {
  return HERO_CARD_SHADOW[mode];
}

export function getActivePrayerShadow(mode: HomeMode): CardShadowTokens {
  return ACTIVE_PRAYER_CARD_SHADOW[mode];
}

export function getPillShadow(mode: HomeMode): CardShadowTokens {
  return PILL_SHADOW[mode];
}

export function getHomeTokens(mode: HomeMode) {
  return HOME_THEME_TOKENS[mode];
}
