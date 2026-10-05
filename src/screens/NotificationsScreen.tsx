import React from 'react';
import PrayerRemindersScreen from './PrayerRemindersScreen';

export default function NotificationsScreen({ onBack }: { onBack?: () => void }) {
  return <PrayerRemindersScreen onBack={onBack} />;
}
