import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nextLockedCharacter } from '../../domain/characters';
import { useGameStore } from '../../state/gameStore';
import { EarAvatar } from '../components/EarAvatar';
import { ModalCard } from '../components/ModalCard';
import { useNotifications } from '../Notifications';
import { colors } from '../theme';

interface Props {
  onOpenDetail: (defId: string) => void;
  onBack: () => void;
}

type Row =
  | { kind: 'owned'; defId: string; name: string; stage: number }
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
    stage: c.stage,
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
    <>
      <ModalCard title="キャラ一覧" onClose={onBack} closeLabel="閉じる">
        <View style={styles.grid}>
          {rows.map((item) =>
            item.kind === 'owned' ? (
              <Pressable key={item.defId} style={[styles.card, styles.ownedCard]} onPress={() => onOpenDetail(item.defId)}>
                <EarAvatar size={64} />
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>ステージ {item.stage}</Text>
              </Pressable>
            ) : (
              <Pressable key={item.defId} style={styles.card} onPress={() => setConfirmTarget(item)}>
                <View style={styles.lockedCircle} />
                <Text style={styles.name}>🔒 {item.name}</Text>
                <Text style={styles.sub}>Vicマネー {item.cost}で解放</Text>
              </Pressable>
            )
          )}
        </View>
      </ModalCard>

      {confirmTarget && (
        <ModalCard title="新キャラを解放" onClose={() => setConfirmTarget(null)} closeLabel="やめる">
          <Text style={styles.modalQuestion}>「{confirmTarget.name}」を解放しますか？</Text>
          <View style={styles.walletCol}>
            <View style={styles.walletBox}>
              <Text style={styles.walletLabel}>所持Vicマネー</Text>
              <Text style={styles.walletValue}>{Math.floor(state.vicMoney)}</Text>
            </View>
            <View style={styles.walletBox}>
              <Text style={styles.walletLabel}>消費Vicマネー</Text>
              <Text style={styles.walletValue}>{confirmTarget.cost}</Text>
            </View>
          </View>
          <Text style={styles.modalNote}>キャラを解放するとランナーとして使用できます。</Text>
          <Pressable
            disabled={state.vicMoney < confirmTarget.cost}
            style={[
              styles.confirmButton,
              { backgroundColor: state.vicMoney >= confirmTarget.cost ? colors.primary : colors.locked },
            ]}
            onPress={handleConfirmUnlock}
          >
            <Text style={styles.confirmButtonText}>解放する</Text>
          </Pressable>
        </ModalCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12, width: '100%' },
  card: {
    flex: 1,
    backgroundColor: colors.cardInset,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  ownedCard: { borderColor: colors.accent },
  lockedCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.border },
  name: { fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.subtext },
  modalQuestion: { fontSize: 14, color: colors.text, textAlign: 'center' },
  walletCol: { width: '100%', gap: 10 },
  walletBox: { backgroundColor: colors.cardInset, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  walletLabel: { fontSize: 12, color: colors.subtext },
  walletValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalNote: { fontSize: 12, color: colors.subtext, textAlign: 'center' },
  confirmButton: { width: '100%', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
});
