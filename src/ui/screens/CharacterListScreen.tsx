import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { nextLockedCharacter } from '../../domain/characters';
import { characterLevel } from '../../domain/stats';
import { useGameStore } from '../../state/gameStore';
import { useNotifications } from '../Notifications';
import { colors } from '../theme';

interface Props {
  onOpenDetail: (defId: string) => void;
  onBack: () => void;
}

type Row =
  | { kind: 'owned'; defId: string; name: string; charLv: number; evolutionStage: number }
  | { kind: 'locked'; defId: string; name: string; cost: number };

export function CharacterListScreen({ onOpenDetail, onBack }: Props) {
  const state = useGameStore((s) => s.state);
  const unlockCharacter = useGameStore((s) => s.unlockCharacter);
  const { showPopup } = useNotifications();
  const [confirmTarget, setConfirmTarget] = useState<{ defId: string; name: string; cost: number } | null>(
    null
  );

  const ownedRows: Row[] = state.characters.map((c) => ({
    kind: 'owned',
    defId: c.defId,
    name: c.name,
    charLv: characterLevel(c),
    evolutionStage: c.evolutionStage,
  }));

  const locked = nextLockedCharacter(state.characters.map((c) => c.defId));
  const rows: Row[] = locked
    ? [...ownedRows, { kind: 'locked', defId: locked.id, name: locked.name, cost: locked.unlockCost }]
    : ownedRows;

  const handleConfirmUnlock = () => {
    if (!confirmTarget) return;
    if (state.vicMoney < confirmTarget.cost) return;
    unlockCharacter(confirmTarget.defId);
    setConfirmTarget(null);
    showPopup('新キャラを解放', `${confirmTarget.name} が解放されました！`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← 戻る</Text>
        </Pressable>
        <Text style={styles.title}>キャラ一覧・進化</Text>
        <View style={{ width: 48 }} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.defId}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item }) =>
          item.kind === 'owned' ? (
            <Pressable style={styles.card} onPress={() => onOpenDetail(item.defId)}>
              <Text style={styles.avatar}>🐾</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>キャラLv. {item.charLv.toFixed(1)}</Text>
              <Text style={styles.sub}>進化段階 {item.evolutionStage}</Text>
            </Pressable>
          ) : (
            <View style={[styles.card, styles.lockedCard]}>
              <Text style={styles.avatar}>🔒</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.cost} Vicで解放</Text>
              <Pressable
                style={styles.unlockButton}
                onPress={() => setConfirmTarget({ defId: item.defId, name: item.name, cost: item.cost })}
              >
                <Text style={styles.unlockButtonText}>解放する</Text>
              </Pressable>
            </View>
          )
        }
      />

      <Modal visible={!!confirmTarget} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>新キャラを解放</Text>
            <Text style={styles.modalQuestion}>{confirmTarget?.name} を解放しますか？</Text>
            <View style={styles.walletRow}>
              <View style={styles.walletChip}>
                <Text style={styles.walletLabel}>所持Vicマネー</Text>
                <Text style={styles.walletValue}>{Math.floor(state.vicMoney)}</Text>
              </View>
              <View style={styles.walletChip}>
                <Text style={styles.walletLabel}>消費Vicマネー</Text>
                <Text style={styles.walletValue}>{confirmTarget?.cost}</Text>
              </View>
            </View>
            <Text style={styles.modalNote}>キャラを解放するとランナーとして使用できます。</Text>
            <View style={styles.modalButtonRow}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmTarget(null)}>
                <Text>キャンセル</Text>
              </Pressable>
              <Pressable
                disabled={!confirmTarget || state.vicMoney < confirmTarget.cost}
                style={[
                  styles.modalConfirm,
                  {
                    backgroundColor:
                      confirmTarget && state.vicMoney >= confirmTarget.cost ? colors.primary : colors.locked,
                  },
                ]}
                onPress={handleConfirmUnlock}
              >
                <Text style={styles.modalConfirmText}>解放する</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { color: colors.primary, width: 48 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  lockedCard: { opacity: 0.85 },
  avatar: { fontSize: 32 },
  name: { fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.subtext },
  unlockButton: { marginTop: 6, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.primary },
  unlockButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalQuestion: { fontSize: 14, color: colors.text },
  walletRow: { flexDirection: 'row', gap: 10 },
  walletChip: { flex: 1, backgroundColor: '#f1efe8', borderRadius: 12, padding: 10, alignItems: 'center' },
  walletLabel: { fontSize: 12, color: colors.subtext },
  walletValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalNote: { fontSize: 12, color: colors.subtext },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 8, paddingHorizontal: 14 },
  modalConfirm: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
