import { colors, STAT_COLORS, STAT_LABELS } from '../theme';
import { TrainingCard } from './TrainingCard';

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
    <TrainingCard
      color={color}
      title={`${locked ? '🔒 ' : ''}${STAT_LABELS[statKey] ?? statKey}`}
      subtitle={locked ? lockedHint ?? 'ロック中' : `Lv. ${level.toFixed(1)}`}
      buttonLabel={locked ? 'ロック中' : atCap ? '上限' : `+0.1 (${cost}pt)`}
      disabled={disabled}
      onPress={onUpgrade}
    />
  );
}
