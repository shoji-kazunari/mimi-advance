import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  color: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  disabled: boolean;
  onPress: () => void;
}

/** トレーニングカードの3列グリッドに並ぶカードの共通シェル(StatCard/ShoeCardで共用)。 */
export function TrainingCard({ color, title, subtitle, buttonLabel, disabled, onPress }: Props) {
  return (
    <View style={[styles.card, { borderColor: color }]}>
      <Text style={[styles.name, { color }]}>{title}</Text>
      <Text style={styles.level}>{subtitle}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[styles.button, { backgroundColor: disabled ? colors.locked : color }]}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
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
