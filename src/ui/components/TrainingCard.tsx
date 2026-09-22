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
    <View style={styles.card}>
      <Text style={[styles.name, { color }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.level} numberOfLines={1}>
        {subtitle}
      </Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[styles.button, { backgroundColor: disabled ? colors.locked : color }]}
      >
        <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]} numberOfLines={1}>
          {buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '30%',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardInset,
  },
  name: { fontWeight: '700', fontSize: 12, textAlign: 'center' },
  level: { fontSize: 13, color: colors.text },
  button: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 6, width: '100%' },
  buttonText: { color: colors.text, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  buttonTextDisabled: { color: colors.lockedText },
});
