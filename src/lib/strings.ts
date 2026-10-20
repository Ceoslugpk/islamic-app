import { t } from './i18n';

// Actions
export const retry = () => t('Retry');
export const cancel = () => t('Cancel');
export const save = () => t('Save');
export const remove = () => t('Remove');
export const copy = () => t('Copy');
export const share = () => t('Share');
export const play = () => t('Play');
export const bookmark = () => t('Bookmark');
export const search = () => t('Search');
export const close = () => t('Close');
export const offline = () => t('Offline');

// Loading / status
export const loadingEllipsis = () => t('Loading…');
export const gettingPrayerTimes = () => t('Getting your prayer times…');
export const preparingDashboard = () => t('Preparing your dashboard');
export const offlineUsingSavedData = () => t('Offline · using saved data');

// Errors / fallbacks
export const prayerTimesOfflineError = () => t("Can't load prayer times right now.");
export const prayerTimesNeedsConnection = () => t("Connect to the internet to get today's prayer schedule.");
export const surahLoadFailed = () => t("Couldn't load this surah — check your connection.");
export const tafsirLoadFailed = () => t("Couldn't load this tafsir — check your connection.");
export const downloadFailedTitle = () => t("Couldn't download");
export const downloadFailedBody = () => t("We couldn't fetch that audio. Check your connection and try again.");

// Permissions
export const notificationPermissionDenied = () =>
  t('Enable notifications in your device settings to get reminders.');
export const testAlertPermission = () => t('Allow notifications to receive test alerts.');
export const allowNotifications = () => t('Allow notifications to continue.');

// Location
export const latitudeInvalid = () => t('Latitude must be a number between -90 and 90.');
export const longitudeInvalid = () => t('Longitude must be a number between -180 and 180.');
export const locationSaved = () => t('Location saved.');

// Prayer reminders
export const notificationsRescheduled = () => t('Alarms rescheduled.');
export const notificationsRescheduleFailed = () => t("Couldn't reschedule notifications.");
export const snoozedTenMinutes = () => t("Snoozed for 10 minutes — you'll be alerted then.");
export const testAlertSent = () => t('Test alert sent — check your notifications.');
export const dailyGoalDone = () => t('Daily goal done — reminder paused for today.');
export const dailyGoalReopened = () => t('Daily goal reopened.');
