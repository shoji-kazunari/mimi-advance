import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { generateVsOpponents, highestCharacterLevel, VsOpponent } from '../../domain/vsRace';
import { useGameStore } from '../../state/gameStore';
import { colors } from '../theme';

interface Props {
  onSelect: (opponent: VsOpponent) => void;
  onBack: () => void;
}

export function VsOpponentSelectScreen({ onSelect, onBack }: Props) {
  const characters = useGameStore((s) => s.state.characters);
  const highestLv = useMemo(() => highestCharacterLevel(characters), [characters]);
  const opponents = useMemo(() => generateVsOpponents(highestLv), [highestLv]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← 戻る</Text>
        </Pressable>
        <Text style={styles.title}>対戦相手を選ぶ</Text>
        <View style={{ width: 48 }} />
      </View>
      <FlatList
        data={opponents}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item, index }) => (
          <Pressable style={styles.row} onPress={() => onSelect(item)}>
            <Text style={styles.name}>対戦相手 {index + 1}</Text>
            <Text style={styles.lv}>総合Lv. {item.totalLv.toFixed(1)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { color: colors.primary, width: 48 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
  },
  name: { fontWeight: '700', color: colors.text },
  lv: { color: colors.subtext },
});
