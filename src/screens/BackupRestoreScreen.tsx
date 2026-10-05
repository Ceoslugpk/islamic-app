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
  BackupPayload,
  BACKUP_FORMAT_VERSION,
} from '../lib/backup';

interface Props {
  onBack: () => void;
}

export function BackupRestoreScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [lastInfo, setLastInfo] = useState<{ at: string; version: string } | null>(null);

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const payload = await buildBackupPayload();
      if (Platform.OS === 'web') {
        // Web: download as a JSON file.
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `islamic-backup-${payload.exportedAt.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const dir = FileSystem.cacheDirectory + 'islamic-backup/';
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
        const path = dir + `islamic-backup-${payload.exportedAt.slice(0, 10)}.json`;
        await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: 'application/json' });
        } else {
          Alert.alert('Export ready', `Backup written to:\n${path}`);
        }
      }
      setLastInfo({ at: new Date(payload.exportedAt).toLocaleString(), version: payload.appVersion });
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
          type: 'application/json',
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
      validateBackup(payload); // throws on invalid/incompatible

      const p = payload as BackupPayload;
      const info = describeBackup(p);
      Alert.alert(
        'Restore this backup?',
        `Backup from: ${info.exportedAt}\nApp version: ${info.appVersion}\nContains: ${info.tables}\n\nThis will OVERWRITE your current local data. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                await applyRestore(p);
                setLastInfo({ at: new Date(p.exportedAt).toLocaleString(), version: p.appVersion });
                Alert.alert('Restore complete', 'Your data has been restored. Please restart the app to apply all changes.');
              } catch (e2) {
                Alert.alert('Restore failed', e2 instanceof Error ? e2.message : 'Could not restore backup.');
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert(
        'Restore failed',
        e instanceof Error ? e.message : 'This file could not be restored (it may be corrupted or not an Islamic backup).'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader title="Backup & Restore" subtitle="Local only — no account needed" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="cloud-upload-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Export backup</Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Saves your prayer history, Quran bookmarks, notes, plans, Hifz, settings and more to a file.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleExport}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Export backup"
          >
            {busy === 'export' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="share-outline" size={16} color="#FFF" />
                <Text style={styles.actionText}>Export to file</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="cloud-download-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Restore backup</Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Pick a backup file. It is validated before restoring, and your current data is overwritten only after you confirm.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleRestore}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Restore from backup"
          >
            {busy === 'import' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="folder-open-outline" size={16} color="#FFF" />
                <Text style={styles.actionText}>Choose backup file</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {lastInfo && (
          <View style={[styles.infoCard, { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle }]}>
            <Ionicons name="time-outline" size={16} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Last backup activity: {lastInfo.at} (app v{lastInfo.version}) · format v{BACKUP_FORMAT_VERSION}
            </Text>
          </View>
        )}

        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          Backups are stored on your device only. No data is uploaded. Download cache, prayer cache and audio files are never included.
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 2,
  },
  infoText: { fontFamily: 'Manrope_400Regular', fontSize: 12, flex: 1 },
  footnote: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 8 },
});
