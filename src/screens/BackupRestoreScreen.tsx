import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  buildBackupPayload,
  validateBackup,
  applyRestore,
  describeBackup,
  getAppVersion,
  isNewerVersion,
  BackupPayload,
  BACKUP_FORMAT_VERSION,
} from '../lib/backup';

interface Props {
  onBack: () => void;
}

interface BackupActivityInfo {
  type: 'export' | 'import';
  at: string;
  version: string;
  fileName?: string;
  summary: string;
  tableCounts: Record<string, number>;
  totalRecords: number;
  destinationPath?: string;
}

export function BackupRestoreScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [lastInfo, setLastInfo] = useState<BackupActivityInfo | null>(null);

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const payload = await buildBackupPayload();
      const fileName = `islamic-backup-${payload.exportedAt.slice(0, 10)}.json`;
      const desc = describeBackup(payload);
      const summaryText = desc.tables;
      let destinationPath: string | undefined;

      if (Platform.OS === 'web') {
        // Web: download as a JSON file.
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        Alert.alert(
          'Backup exported',
          `File: ${fileName}\n\nIncluded in backup:\n${summaryText}`
        );
      } else {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);

        if (isSharingAvailable) {
          const cacheDir = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + 'islamic-backup/';
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
          const path = cacheDir + fileName;
          await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
          destinationPath = path;

          await Sharing.shareAsync(path, {
            mimeType: 'application/json',
            dialogTitle: 'Export Islamic Backup',
          });

          Alert.alert(
            'Backup exported',
            `File: ${fileName}\n\nIncluded in backup:\n${summaryText}`
          );
        } else {
          // Native when sharing unavailable: write to user-visible Documents directory
          const docDir = (FileSystem.documentDirectory || FileSystem.cacheDirectory || '') + 'islamic-backup/';
          await FileSystem.makeDirectoryAsync(docDir, { intermediates: true }).catch(() => {});
          const path = docDir + fileName;
          await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
          destinationPath = path;

          Alert.alert(
            'Backup saved to Documents',
            `Sharing is unavailable on this device.\n\nFile saved to:\n${path}\n\nIncluded in backup:\n${summaryText}`
          );
        }
      }

      setLastInfo({
        type: 'export',
        at: new Date(payload.exportedAt).toLocaleString(),
        version: payload.appVersion,
        fileName,
        summary: summaryText,
        tableCounts: desc.tableCounts,
        totalRecords: desc.totalRecords,
        destinationPath,
      });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not create backup.');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy('import');
    try {
      let text: string;
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        const picked = await new Promise<File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] || null);
          input.oncancel = () => resolve(null);
          input.click();
        });
        if (!picked) {
          setBusy(null);
          return;
        }
        text = await picked.text();
      } else {
        const DocumentPicker = require('expo-document-picker');
        const FileSystem = require('expo-file-system');
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/json', '*/*'],
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.length) {
          setBusy(null);
          return;
        }
        const uri = res.assets[0].uri;
        text = await FileSystem.readAsStringAsync(uri);
      }

      const payload: unknown = JSON.parse(text);
      validateBackup(payload); // throws on invalid or corrupt payloads

      const p = payload as BackupPayload;
      const info = describeBackup(p);
      const currentVersion = await getAppVersion();
      const isNewer = isNewerVersion(p.appVersion, currentVersion);

      const confirmRestore = () => {
        Alert.alert(
          'Confirm restore',
          `Backup from: ${info.exportedAt}\nApp version: ${info.appVersion}\n\nIncludes:\n${info.tables}\n\nNote: For your privacy, Women's Worship PIN is never included in backups and must be configured on this device.\n\nThis will OVERWRITE your current local data. This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore data',
              style: 'destructive',
              onPress: async () => {
                try {
                  await applyRestore(p);
                  setLastInfo({
                    type: 'import',
                    at: new Date(p.exportedAt).toLocaleString(),
                    version: p.appVersion,
                    summary: info.tables,
                    tableCounts: info.tableCounts,
                    totalRecords: info.totalRecords,
                  });
                  Alert.alert(
                    'Restore complete',
                    'Your data has been restored successfully. Please restart the app to apply all changes.'
                  );
                } catch (e2) {
                  Alert.alert('Restore failed', e2 instanceof Error ? e2.message : 'Could not restore backup.');
                }
              },
            },
          ]
        );
      };

      if (isNewer) {
        Alert.alert(
          'Newer App Version Detected',
          `This backup was created on a newer app version (v${p.appVersion}, current version is v${currentVersion}).\n\nSome newer fields or settings may not be recognized by this version of Islamic.\n\nRestore anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore anyway',
              style: 'destructive',
              onPress: confirmRestore,
            },
          ]
        );
      } else {
        confirmRestore();
      }
    } catch (e) {
      Alert.alert(
        'Restore failed',
        e instanceof Error
          ? e.message
          : 'This file could not be restored (it may be corrupted or not an Islamic backup).'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title="Backup & Restore"
        subtitle="Local only — no account needed"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
        {/* Export Card */}
        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="cloud-upload-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Export backup</Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Saves your prayer history, Quran bookmarks, notes, study tags, reading plans, Hifz, settings, and more to a file.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.accent },
              busy !== null && { opacity: 0.6 },
            ]}
            onPress={handleExport}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Export backup"
            accessibilityHint="Creates a JSON backup file with your prayers, bookmarks, notes, and settings"
          >
            {busy === 'export' ? (
              <>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.actionText}>Exporting backup...</Text>
              </>
            ) : (
              <>
                <Ionicons name="share-outline" size={16} color="#FFF" />
                <Text style={styles.actionText}>Export to file</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Restore Card */}
        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="cloud-download-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Restore backup</Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Pick a backup file. It is validated before restoring, and your current data is overwritten only after you review and confirm.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.accent },
              busy !== null && { opacity: 0.6 },
            ]}
            onPress={handleRestore}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Restore backup"
            accessibilityHint="Pick a JSON backup file to validate and restore"
          >
            {busy === 'import' ? (
              <>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.actionText}>Reading backup...</Text>
              </>
            ) : (
              <>
                <Ionicons name="folder-open-outline" size={16} color="#FFF" />
                <Text style={styles.actionText}>Choose backup file</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Session Activity or Empty State */}
        {lastInfo ? (
          <View style={[styles.infoCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={styles.infoHeader}>
              <View style={[styles.infoBadge, { backgroundColor: colors.accentDim }]}>
                <Ionicons
                  name={lastInfo.type === 'export' ? 'cloud-upload' : 'cloud-download'}
                  size={14}
                  color={colors.accent}
                />
                <Text style={[styles.infoBadgeText, { color: colors.accent }]}>
                  {lastInfo.type === 'export' ? 'Recent Export' : 'Recent Restore'}
                </Text>
              </View>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                v{lastInfo.version} · format v{BACKUP_FORMAT_VERSION}
              </Text>
            </View>

            {lastInfo.fileName ? (
              <Text style={[styles.infoFileName, { color: colors.textPrimary }]}>
                {lastInfo.fileName}
              </Text>
            ) : null}

            <Text style={[styles.infoDetail, { color: colors.textSecondary }]}>
              {lastInfo.summary}
            </Text>

            <View style={styles.infoFooter}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.infoTimestamp, { color: colors.textMuted }]}>
                {lastInfo.at}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Ready for on-device backup
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                No backup activity yet in this session. Export a file anytime to keep your prayer history, bookmarks, and notes secure.
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Backups are stored on your device only. No data is uploaded to any server. Audio files, prayer caches, and downloads are never included.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
  cardSub: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 12,
  },
  actionText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#FFF' },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  infoBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  infoMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  infoFileName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  infoDetail: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  infoTimestamp: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  emptySub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  footnote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
});
