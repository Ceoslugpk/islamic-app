import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy'; // require('expo-file-system/legacy')
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard, PrimaryButton, Chip } from '../components/ui';
import {
  buildBackupPayload,
  backupIncludesSensitiveWomenData,
  backupOmitsSensitiveWomenData,
  assertBackupSize,
  getUtf8ByteLength,
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
  const { t } = useTranslation();
  const { tokens } = useThemeTokens();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [lastInfo, setLastInfo] = useState<BackupActivityInfo | null>(null);
  const [includeSensitiveWomenData, setIncludeSensitiveWomenData] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const payload = await buildBackupPayload({ includeSensitiveWomenData });
      const fileName = `islamic-backup-${payload.exportedAt.slice(0, 10)}.json`;
      const desc = describeBackup(payload);
      const summaryText = desc.tables;
      const serializedPayload = JSON.stringify(payload, null, 2);
      assertBackupSize(getUtf8ByteLength(serializedPayload));
      const sensitiveNotice = backupIncludesSensitiveWomenData(payload)
        ? `\n\n${t("Women's Worship records are included in a user-created backup via Backup & Restore. The exported backup file is not automatically uploaded by the app; if you choose to share it using your device's share or document tools, you control where it goes. Because the exported file itself is not encrypted by the app, store any backup that contains Women's Worship data securely.")}`
        : '';
      let destinationPath: string | undefined;

      if (Platform.OS === 'web') {
        // Web: download as a JSON file.
        const blob = new Blob([serializedPayload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        Alert.alert(
          t('Backup exported'),
          `${t('File')}: ${fileName}\n\n${t('Included in backup')}:\n${summaryText}${sensitiveNotice}`
        );
      } else {
        const isSharingAvailable = Sharing?.isAvailableAsync ? await Sharing.isAvailableAsync().catch(() => false) : false;

        if (isSharingAvailable && Sharing?.shareAsync) {
          const cacheDir = (FileSystem?.cacheDirectory || FileSystem?.documentDirectory || '') + 'islamic-backup/';
          await FileSystem?.makeDirectoryAsync?.(cacheDir, { intermediates: true })?.catch?.(() => {});
          const path = cacheDir + fileName;
          await FileSystem?.writeAsStringAsync?.(path, serializedPayload);
          destinationPath = path;

          await Sharing.shareAsync(path, {
            mimeType: 'application/json',
            dialogTitle: 'Export Islamic Backup',
          });

          Alert.alert(
            t('Backup exported'),
            `${t('File')}: ${fileName}\n\n${t('Included in backup')}:\n${summaryText}${sensitiveNotice}`
          );
        } else {
          // Native when sharing unavailable: write to user-visible Documents directory
          const docDir = (FileSystem.documentDirectory || FileSystem.cacheDirectory || '') + 'islamic-backup/';
          await FileSystem.makeDirectoryAsync(docDir, { intermediates: true }).catch(() => {});
          const path = docDir + fileName;
          await FileSystem.writeAsStringAsync(path, serializedPayload);
          destinationPath = path;

          Alert.alert(
            t('Backup saved to Documents'),
            `${t('Sharing is unavailable on this device.')}\n\n${t('File saved to')}:\n${path}\n\n${t('Included in backup')}:\n${summaryText}${sensitiveNotice}`
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
      Alert.alert(t('Export failed'), e instanceof Error ? e.message : t('Could not create backup.'));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy('import');
    let awaitingConfirmation = false;
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
        assertBackupSize(picked.size);
        text = await picked.text();
      } else {
        if (!DocumentPicker?.getDocumentAsync) {
          throw new Error(t('Document picker is unavailable on this device.'));
        }
        const res = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/json', '*/*'],
          copyToCacheDirectory: true,
        });
        if (res.canceled || !res.assets?.length) {
          setBusy(null);
          return;
        }
        const uri = res.assets[0].uri;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        assertBackupSize(fileInfo.exists && typeof fileInfo.size === 'number' ? fileInfo.size : Number.NaN);
        text = await FileSystem.readAsStringAsync(uri);
      }

      const payload: unknown = JSON.parse(text);
      validateBackup(payload); // throws on invalid or corrupt payloads

      const p = payload as BackupPayload;
      const info = describeBackup(p);
      const currentVersion = await getAppVersion();
      const isNewer = isNewerVersion(p.appVersion, currentVersion);
      const sensitiveNotice = [
        backupIncludesSensitiveWomenData(p)
          ? t("Women's Worship records are included in this backup. Store the file securely because it is not encrypted by the app.")
          : '',
        backupOmitsSensitiveWomenData(p)
          ? t("This backup omits Women's Worship data (cycle, postnatal, and sensitive missed-fast records). Restoring it will leave existing records in those categories on this device unchanged; other tables present in the backup may be overwritten.")
          : '',
      ].filter(Boolean).map((notice) => `\n\n${notice}`).join('');

      const confirmRestore = () => {
        Alert.alert(
          t('Confirm restore'),
          `${t('Backup from')}: ${info.exportedAt}\n${t('App version')}: ${info.appVersion}\n\n${t('Includes')}:\n${info.tables}${sensitiveNotice}\n\n${t("Note: For your privacy, Women's Worship PIN is never included in backups and must be configured on this device.")}\n\n${t('This will OVERWRITE your current local data. This cannot be undone.')}`,
          [
            { text: t('Cancel'), style: 'cancel', onPress: () => setBusy(null) },
            {
              text: t('Restore data'),
              style: 'destructive',
              onPress: async () => {
                setBusy('import');
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
                    t('Restore complete'),
                    t('Your data has been restored successfully. Please restart the app to apply all changes.')
                  );
                } catch (e2) {
                  Alert.alert(t('Restore failed'), e2 instanceof Error ? e2.message : t('Could not restore backup.'));
                } finally {
                  setBusy(null);
                }
              },
            },
          ]
        );
      };

      awaitingConfirmation = true;
      if (isNewer) {
        Alert.alert(
          t('Newer App Version Detected'),
          `This backup was created on a newer app version (v${p.appVersion}, current version is v${currentVersion}).\n\n${t('Some newer fields or settings may not be recognized by this version of Islamic.')}\n\n${t('Restore anyway')}?`,
          [
            { text: t('Cancel'), style: 'cancel', onPress: () => setBusy(null) },
            {
              text: t('Restore anyway'),
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
        t('Restore failed'),
        e instanceof Error
          ? e.message
          : t('This file could not be restored (it may be corrupted or not an Islamic backup).')
      );
    } finally {
      if (!awaitingConfirmation) {
        setBusy(null);
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={styles.detailScreen}
        includeTopInset
        header={
          <SubHeader
            title={t('Backup & Restore')}
            subtitle={t('Local only — no account needed')}
            eyebrow={t('Preferences')}
            onBack={onBack}
            backLabel={t('Settings')}
            borderBottom
          />
        }
      >
      <DetailScreen.ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contentWrap}>
        {/* Export Card */}
        <PremiumCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
              <Ionicons name="cloud-upload-outline" size={22} color={tokens.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="rowTitle" style={styles.cardTitle}>{t('Export backup')}</AppText>
              <AppText variant="subtitle" style={styles.cardSub}>
                {t('Saves your prayer history, Quran bookmarks, notes, study tags, reading plans, Hifz, settings, and more to a file.')}
              </AppText>
            </View>
          </View>
          <PrimaryButton
            title={busy === 'export' ? t('Exporting backup...') : t('Export to file')}
            icon={busy === 'export' ? undefined : 'share-outline'}
            loading={busy === 'export'}
            onPress={handleExport}
            disabled={busy !== null}
            accessibilityLabel={t('Export backup')}
            accessibilityHint={t('Creates a JSON backup file with your prayers, bookmarks, notes, and settings')}
          />
          <View style={styles.sensitiveOption}>
            <View style={styles.sensitiveCopy}>
              <AppText variant="rowTitle" style={styles.sensitiveTitle}>
                {t("Women's Worship Data")}
              </AppText>
              <AppText variant="caption" style={styles.sensitiveDescription}>
                {t('Cycle & purity information is sensitive. Your data:\n• Stays on this device by default\n• Needs no account or sign-in\n• Is never uploaded or included in analytics or logs\n• Can be deleted anytime')}
              </AppText>
              {includeSensitiveWomenData ? (
                <AppText variant="caption" style={[styles.sensitiveDescription, { color: tokens.danger }]}>
                  {t("Women's Worship records are included in a user-created backup via Backup & Restore. The exported backup file is not automatically uploaded by the app; if you choose to share it using your device's share or document tools, you control where it goes. Because the exported file itself is not encrypted by the app, store any backup that contains Women's Worship data securely.")}
                </AppText>
              ) : null}
            </View>
            <Pressable
              onPress={() => setIncludeSensitiveWomenData((current) => !current)}
              accessibilityRole="switch"
              accessibilityState={{ checked: includeSensitiveWomenData }}
              accessibilityLabel={t("Include Women's Worship data in backup")}
              style={({ pressed }) => [styles.sensitiveToggle, pressed && styles.sensitiveTogglePressed]}
            >
              <Ionicons
                name={includeSensitiveWomenData ? 'checkbox' : 'square-outline'}
                size={26}
                color={includeSensitiveWomenData ? tokens.danger : tokens.muted}
              />
            </Pressable>
          </View>
        </PremiumCard>

        {/* Restore Card */}
        <PremiumCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
              <Ionicons name="cloud-download-outline" size={22} color={tokens.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="rowTitle" style={styles.cardTitle}>{t('Restore backup')}</AppText>
              <AppText variant="subtitle" style={styles.cardSub}>
                {t('Pick a backup file. It is validated before restoring, and your current data is overwritten only after you review and confirm.')}
              </AppText>
            </View>
          </View>
          <PrimaryButton
            title={busy === 'import' ? t('Reading backup...') : t('Choose backup file')}
            icon={busy === 'import' ? undefined : 'folder-open-outline'}
            loading={busy === 'import'}
            onPress={handleRestore}
            disabled={busy !== null}
            accessibilityLabel={t('Restore backup')}
            accessibilityHint={t('Pick a JSON backup file to validate and restore')}
          />
        </PremiumCard>

        {/* Included Data Categories */}
        <PremiumCard style={styles.card}>
          <AppText variant="rowTitle" style={[styles.cardTitle, { marginBottom: 8 }]}>
            {t('Included in Backup')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label={t('Prayer History')} selected={false} interactive={false} />
            <Chip label={t('Quran Bookmarks')} selected={false} interactive={false} />
            <Chip label={t('Notes & Reflections')} selected={false} interactive={false} />
            <Chip label={t('Fasting Logs')} selected={false} interactive={false} />
            <Chip label={t('Hifz Progress')} selected={false} interactive={false} />
            <Chip label={t('App Settings')} selected={false} interactive={false} />
          </View>
        </PremiumCard>

        {/* Session Activity or Empty State */}
        {lastInfo ? (
          <PremiumCard style={styles.infoCard} contentStyle={styles.infoCardContent}>
            <View style={styles.infoHeader}>
              <View style={[styles.infoBadge, { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, borderWidth: 1 }]}>
                <Ionicons
                  name={lastInfo.type === 'export' ? 'cloud-upload' : 'cloud-download'}
                  size={14}
                  color={tokens.success}
                />
                <AppText variant="caption" style={[styles.infoBadgeText, { color: tokens.success }]}>
                  {lastInfo.type === 'export' ? t('Recent Export') : t('Recent Restore')}
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoMeta}>
                v{lastInfo.version} · format v{BACKUP_FORMAT_VERSION}
              </AppText>
            </View>

            {lastInfo.fileName ? (
              <AppText variant="rowTitle" style={styles.infoFileName}>
                {lastInfo.fileName}
              </AppText>
            ) : null}

            <AppText variant="subtitle" style={styles.infoDetail}>
              {lastInfo.summary}
            </AppText>

            <View style={styles.infoFooter}>
              <Ionicons name="time-outline" size={13} color={tokens.muted} />
              <AppText variant="caption" style={styles.infoTimestamp}>
                {lastInfo.at}
              </AppText>
            </View>
          </PremiumCard>
        ) : (
          <PremiumCard style={styles.emptyCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={tokens.accent} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="rowTitle" style={styles.emptyTitle}>
                  {t('Ready for on-device backup')}
                </AppText>
                <AppText variant="subtitle" style={styles.emptySub}>
                  {t('No backup activity yet in this session. Export a file anytime to keep your prayer history, bookmarks, and notes secure.')}
                </AppText>
              </View>
            </View>
          </PremiumCard>
        )}

        <AppText variant="caption" style={styles.footnote}>
          {t('Backups are stored on your device only. No data is uploaded to any server. Audio files, prayer caches, and downloads are never included.')}
        </AppText>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  content: { padding: 20, paddingTop: 10 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
  cardSub: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  sensitiveOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.25)',
  },
  sensitiveCopy: { flex: 1, minWidth: 0, gap: 4 },
  sensitiveTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  sensitiveDescription: { fontFamily: 'Manrope_400Regular', fontSize: 11, lineHeight: 16 },
  sensitiveToggle: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sensitiveTogglePressed: { opacity: 0.7 },
  infoCard: {
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minHeight: 24,
  },
  infoBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  infoMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    paddingVertical: 2,
  },
  infoFileName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  infoDetail: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  infoTimestamp: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    paddingVertical: 2,
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  emptySub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  footnote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingVertical: 2,
  },

  infoCardContent: {
    gap: 8,
  },
});
