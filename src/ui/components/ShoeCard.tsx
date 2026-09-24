import { shoeCostFor, SHOE_UNLOCK_COST } from '../../domain/shoes';
import { formatJP } from '../format';
import { colors, STAT_COLORS } from '../theme';
import { TrainingCard } from './TrainingCard';

interface Props {
  shoeUnlocked: boolean;
  shoeLevel: number;
  vicMoney: number;
  onUnlock: () => void;
  onUpgrade: () => void;
}

export function ShoeCard({ shoeUnlocked, shoeLevel, vicMoney, onUnlock, onUpgrade }: Props) {
  const color = STAT_COLORS.shoe;

  if (!shoeUnlocked) {
    return (
      <TrainingCard
        color={color}
        label="シューズ"
        value="未解放"
        valueColor={colors.gold}
        buttonLabel={`${formatJP(SHOE_UNLOCK_COST)}Vicで解放`}
        disabled={vicMoney < SHOE_UNLOCK_COST}
        onPress={onUnlock}
      />
    );
  }

  const cost = shoeCostFor(shoeLevel);
  return (
    <TrainingCard
      color={color}
      label="シューズ"
      value={`Lv.${shoeLevel.toFixed(1)}`}
      buttonLabel={`${formatJP(cost)}Vic`}
      disabled={vicMoney < cost}
      onPress={onUpgrade}
    />
  );
}
