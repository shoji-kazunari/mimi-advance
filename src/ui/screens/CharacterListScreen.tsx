import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

  const handleUnlock = (defId: string, name: string, cost: number) => {
    if (state.vicMoney < cost) return;
    unlockCharacter(defId);
    showPopup('新キャラを解放', `${name} が解放されました！`);
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
                disabled={state.vicMoney < item.cost}
                style={[
                  styles.unlockButton,
                  { backgroundColor: state.vicMoney >= item.cost ? colors.primary : colors.locked },
                ]}
                onPress={() => handleUnlock(item.defId, item.name, item.cost)}
              >
                <Text style={styles.unlockButtonText}>解放する</Text>
              </Pressable>
            </View>
          )
        }
      />
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
  unlockButton: { marginTop: 6, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  unlockButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
