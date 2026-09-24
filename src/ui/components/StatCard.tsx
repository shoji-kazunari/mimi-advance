import { formatJP } from '../format';
import { colors, STAT_COLORS, STAT_LABELS } from '../theme';
import { TrainingCard } from './TrainingCard';

interface Props {
  statKey: string;
  level: number;
  cost: number | null;
  locked: boolean;
  lockedHint?: string;
  atCap: boolean;
  /** 所持ランナーpt。足りないときはボタンを暗くして押せなくする(試作版と同じ挙動)。 */
  runnerPt: number;
  onUpgrade: () => void;
}

export function StatCard({ statKey, level, cost, locked, lockedHint, atCap, runnerPt, onUpgrade }: Props) {
  const color = STAT_COLORS[statKey] ?? colors.primary;
  const affordable = cost !== null && runnerPt >= cost;
  const disabled = locked || atCap || !affordable;

  const buttonLabel = locked ? lockedHint ?? 'ロック中' : atCap ? '上限' : `${cost !== null ? formatJP(cost) : ''}pt`;

  return (
    <TrainingCard
      color={color}
      label={STAT_LABELS[statKey] ?? statKey}
      value={locked ? '🔒' : `Lv.${level.toFixed(1)}`}
      buttonLabel={buttonLabel}
      disabled={disabled}
      locked={locked}
      onPress={onUpgrade}
    />
  );
}
