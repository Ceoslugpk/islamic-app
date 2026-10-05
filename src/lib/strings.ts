// Centralized common user-facing strings so they aren't scattered as hardcoded
// literals across components and can be localized in one place later.

// Actions
export const retry = 'Retry';
export const cancel = 'Cancel';
export const save = 'Save';
export const remove = 'Remove';
export const copy = 'Copy';
export const share = 'Share';
export const play = 'Play';
export const bookmark = 'Bookmark';
export const search = 'Search';
export const close = 'Close';
export const offline = 'Offline';

// Loading / status
export const loadingEllipsis = 'Loading…';
export const gettingPrayerTimes = 'Getting your prayer times…';
export const preparingDashboard = 'Preparing your dashboard';
export const offlineUsingSavedData = 'Offline · using saved data';

// Errors / fallbacks
export const prayerTimesOfflineError = "Can't load prayer times right now.";
export const prayerTimesNeedsConnection = "Connect to the internet to get today's prayer schedule.";
export const surahLoadFailed = `Couldn't load this surah — check your connection.`;
export const tafsirLoadFailed = `Couldn't load this tafsir — check your connection.`;
export const downloadFailedTitle = `Couldn't download`;
export const downloadFailedBody = `We couldn't fetch that audio. Check your connection and try again.`;

// Permissions
export const notificationPermissionDenied =
  'Enable notifications in your device settings to get reminders.';
export const testAlertPermission = 'Allow notifications to receive test alerts.';
export const allowNotifications = 'Allow notifications to continue.';

// Location
export const latitudeInvalid = 'Latitude must be a number between -90 and 90.';
export const longitudeInvalid = 'Longitude must be a number between -180 and 180.';
export const locationSaved = 'Location saved.';

// Prayer reminders
export const notificationsRescheduled = 'Alarms rescheduled.';
export const notificationsRescheduleFailed = "Couldn't reschedule notifications.";
export const snoozedTenMinutes = 'Snoozed for 10 minutes — you\'ll be alerted then.';
export const testAlertSent = 'Test alert sent — check your notifications.';
export const dailyGoalDone = 'Daily goal done — reminder paused for today.';
export const dailyGoalReopened = 'Daily goal reopened.';