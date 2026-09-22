import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { decodeSaveCode, encodeSaveCode } from '../../domain/save';
import { GameState } from '../../domain/types';
import { useGameStore } from '../../state/gameStore';
import { useNotifications } from '../Notifications';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * 仕様書10章: 「セーブコード」(base64エンコードしたJSON)による書き出し・読み込み。
 * 読み込みは既存データを丸ごと上書きするため、確認ステップを挟む。
 */
export function SaveCodeModal({ visible, onClose }: Props) {
  const state = useGameStore((s) => s.state);
  const loadState = useGameStore((s) => s.loadState);
  const { showPopup } = useNotifications();

  const [copyLabel, setCopyLabel] = useState('コピーする');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState<GameState | null>(null);

  const exportCode = useMemo(() => encodeSaveCode(state), [state]);

  const reset = () => {
    setImportText('');
    setImportError(null);
    setPendingState(null);
    setCopyLabel('コピーする');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(exportCode);
    setCopyLabel('コピーしました');
    setTimeout(() => setCopyLabel('コピーする'), 1500);
  };

  const handleVerify = () => {
    try {
      const decoded = decodeSaveCode(importText);
      setImportError(null);
      setPendingState(decoded);
    } catch {
      setImportError('セーブコードの形式が正しくありません');
      setPendingState(null);
    }
  };

  const handleConfirmImport = () => {
    if (!pendingState) return;
    loadState(pendingState);
    handleClose();
    showPopup('読み込み完了', 'セーブデータを読み込みました！');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>セーブコード</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.sectionTitle}>書き出す</Text>
            <View style={styles.codeBox}>
              <Text selectable style={styles.codeText}>
                {exportCode}
              </Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={handleCopy}>
              <Text style={styles.secondaryButtonText}>{copyLabel}</Text>
            </Pressable>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>読み込む</Text>
            {pendingState ? (
              <>
                <Text style={styles.warning}>
                  現在のデータを上書きします。よろしいですか？
                </Text>
                <View style={styles.confirmRow}>
                  <Pressable style={styles.secondaryButton} onPress={() => setPendingState(null)}>
                    <Text style={styles.secondaryButtonText}>キャンセル</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={handleConfirmImport}>
                    <Text style={styles.primaryButtonText}>上書きする</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={importText}
                  onChangeText={(t) => {
                    setImportText(t);
                    setImportError(null);
                  }}
                  placeholder="セーブコードを貼り付け"
                  placeholderTextColor={colors.subtext}
                  multiline
                />
                {importError && <Text style={styles.errorText}>{importError}</Text>}
                <Pressable
                  style={[styles.primaryButton, !importText.trim() && styles.disabledButton]}
                  disabled={!importText.trim()}
                  onPress={handleVerify}
                >
                  <Text style={styles.primaryButtonText}>読み込む</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
          <Pressable onPress={handleClose}>
            <Text style={styles.closeText}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '88%', maxHeight: '80%', backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 10 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  scroll: { flexGrow: 0 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.subtext },
  codeBox: { backgroundColor: colors.cardInset, borderRadius: 10, padding: 10, marginTop: 6 },
  codeText: { fontSize: 11, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.cardInset,
    color: colors.text,
  },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  warning: { color: colors.text, fontSize: 13, marginTop: 6 },
  confirmRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryButton: {
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabledButton: { backgroundColor: colors.locked },
  closeText: { color: colors.subtext, textAlign: 'center', marginTop: 10 },
});
