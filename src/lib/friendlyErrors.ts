/**
 * Human-readable error messages and contextual action mappings.
 * Replaces technical errors (HTTP 500, Network request failed, etc.) with user-facing guidance.
 */

import { t } from './i18n';

export type ErrorActionType =
  | 'retry'
  | 'open_settings'
  | 'choose_city'
  | 'check_connection'
  | 'dismiss';

export interface FriendlyError {
  title: string;
  message: string;
  actionLabel?: string;
  actionType?: ErrorActionType;
}

export interface ErrorContext {
  scope?:
    | 'prayer_times'
    | 'mosque_finder'
    | 'location'
    | 'audio'
    | 'quran'
    | 'network'
    | 'general';
  fallbackCity?: string;
  query?: string;
}

/**
 * Maps any caught error and context into a user-friendly title, message, and recommended action.
 */
export function errorToUserMessage(err: unknown, context?: ErrorContext): FriendlyError {
  const scope = context?.scope || 'general';
  const rawMsg = (err instanceof Error ? err.message : typeof err === 'string' ? err : '').trim();
  const lowerMsg = rawMsg.toLowerCase();

  // 1. Network & Offline errors
  const isNetworkError =
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('aborted') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('offline');

  if (isNetworkError) {
    if (scope === 'prayer_times') {
      return {
        title: t('Offline Schedule Active'),
        message: t('Unable to connect to the prayer times server. Displaying your saved prayer schedule.'),
        actionLabel: t('Retry'),
        actionType: 'retry',
      };
    }
    if (scope === 'mosque_finder') {
      return {
        title: t('Network Connection Needed'),
        message: t('Mosque search requires an active internet connection to load map data.'),
        actionLabel: t('Retry Search'),
        actionType: 'retry',
      };
    }
    if (scope === 'audio') {
      return {
        title: t('Audio Stream Unavailable'),
        message: t('Unable to connect to the audio server. Check your connection or play downloaded recitations.'),
        actionLabel: t('Try Again'),
        actionType: 'retry',
      };
    }
    return {
      title: t('Connection Unavailable'),
      message: t('Please check your internet connection. Saved content remains accessible offline.'),
      actionLabel: t('Retry'),
      actionType: 'retry',
    };
  }

  // 2. HTTP Server status codes (5xx, 4xx)
  const isServerError =
    lowerMsg.includes('500') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('504') ||
    lowerMsg.includes('server error');

  if (isServerError) {
    return {
      title: t('Service Temporarily Busy'),
      message: t('The Islamic data service is experiencing high traffic or brief maintenance. Please try again shortly.'),
      actionLabel: t('Retry'),
      actionType: 'retry',
    };
  }

  const isNotFound = lowerMsg.includes('404') || lowerMsg.includes('not found');
  if (isNotFound) {
    if (scope === 'mosque_finder') {
      return {
        title: t('Area Not Found'),
        message: context?.query
          ? t('No geographic results found for "{{query}}". Try a different city or landmark.', { query: context.query })
          : t('Could not find mosques in this area. Try searching by city name.'),
        actionLabel: t('Choose City'),
        actionType: 'choose_city',
      };
    }
    return {
      title: t('Resource Not Found'),
      message: t('The requested Islamic content could not be located. It may have been updated.'),
      actionLabel: t('Dismiss'),
      actionType: 'dismiss',
    };
  }

  // 3. Location / GPS errors
  const isLocationPermission =
    lowerMsg.includes('permission') ||
    lowerMsg.includes('denied') ||
    lowerMsg.includes('location');

  if (scope === 'location' || isLocationPermission) {
    return {
      title: t('Location Permission Needed'),
      message: context?.fallbackCity
        ? t('Location access is disabled. Currently using your saved location ({{city}}).', { city: context.fallbackCity })
        : t('Enable location in device settings or choose a city manually for accurate prayer times and Qibla.'),
      actionLabel: t('Choose City'),
      actionType: 'choose_city',
    };
  }

  // 4. Scope-specific fallbacks
  if (scope === 'mosque_finder') {
    return {
      title: t('Unable to Load Mosques'),
      message: t('We encountered an issue retrieving nearby mosques. Please try again or search by area.'),
      actionLabel: t('Retry Search'),
      actionType: 'retry',
    };
  }

  if (scope === 'prayer_times') {
    return {
      title: t('Prayer Times Unavailable'),
      message: t('Could not update prayer timings for this location. Using cached timings where available.'),
      actionLabel: t('Retry'),
      actionType: 'retry',
    };
  }

  // 5. Generic friendly fallback (never show raw code/stack)
  return {
    title: t('Unable to Complete Request'),
    message: rawMsg.length > 0 && rawMsg.length < 120 && !rawMsg.includes('HTTP') && !rawMsg.includes('{')
      ? rawMsg
      : t('An unexpected issue occurred. Please try again.'),
    actionLabel: t('Retry'),
    actionType: 'retry',
  };
}
