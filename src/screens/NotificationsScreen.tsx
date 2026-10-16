import React from 'react';
import PrayerRemindersScreen from './PrayerRemindersScreen';

export default function NotificationsScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  return <PrayerRemindersScreen onBack={onBack} backLabel={backLabel} />;
}
