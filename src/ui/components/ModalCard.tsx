import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  title?: string;
  description?: string;
  onClose: () => void;
  closeLabel?: string;
  children?: ReactNode;
}

/**
 * 「キャラ一覧・進化・着せ替え」系ポップアップ共通の枠(ピンクの縁取り+黄色い見出し)。
 * 完了ポップアップ(Notifications.tsx)と同じ配色に揃え、末尾に必ず戻る/閉じるボタンを置く。
 */
export function ModalCard({ title, description, onClose, closeLabel = '戻る', children }: Props) {
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {title && <Text style={styles.title}>{title}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
          {children}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{closeLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 24,
    gap: 14,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.gold, textAlign: 'center' },
  description: { fontSize: 13, color: colors.subtext, textAlign: 'center' },
  closeButton: { backgroundColor: colors.locked, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 },
  closeButtonText: { color: colors.text, fontWeight: '700' },
});
