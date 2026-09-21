import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, STAT_COLORS, STAT_LABELS } from '../theme';

interface Props {
  statKey: string;
  level: number;
  cost: number | null;
  locked: boolean;
  lockedHint?: string;
  atCap: boolean;
  onUpgrade: () => void;
}

export function StatCard({ statKey, level, cost, locked, lockedHint, atCap, onUpgrade }: Props) {
  const color = STAT_COLORS[statKey] ?? colors.primary;
  const disabled = locked || atCap || cost === null;

  return (
    <View style={[styles.card, { borderColor: color }]}>
      <Text style={[styles.name, { color }]}>{locked ? '🔒 ' : ''}{STAT_LABELS[statKey] ?? statKey}</Text>
      <Text style={styles.level}>{locked ? lockedHint ?? 'ロック中' : `Lv. ${level.toFixed(1)}`}</Text>
      <Pressable
        disabled={disabled}
        onPress={onUpgrade}
        style={[styles.button, { backgroundColor: disabled ? colors.locked : color }]}
      >
        <Text style={styles.buttonText}>
          {locked ? 'ロック中' : atCap ? '上限' : `+0.1 (${cost}pt)`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '30%',
    borderWidth: 2,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
  },
  name: { fontWeight: '700', fontSize: 13 },
  level: { fontSize: 13, color: colors.text },
  button: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, width: '100%' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
