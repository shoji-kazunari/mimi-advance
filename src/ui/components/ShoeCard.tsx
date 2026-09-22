import { shoeCostFor, SHOE_UNLOCK_COST } from '../../domain/shoes';
import { shoeMultiplier } from '../../domain/stats';
import { STAT_COLORS } from '../theme';
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
    const affordable = vicMoney >= SHOE_UNLOCK_COST;
    return (
      <TrainingCard
        color={color}
        title="🔒 シューズ"
        subtitle={`${SHOE_UNLOCK_COST} Vicで解放`}
        buttonLabel="解放する"
        disabled={!affordable}
        onPress={onUnlock}
      />
    );
  }

  const multiplier = shoeMultiplier(shoeLevel, shoeUnlocked);
  const cost = shoeCostFor(shoeLevel);
  const affordable = vicMoney >= cost;
  return (
    <TrainingCard
      color={color}
      title="シューズ"
      subtitle={`Lv. ${shoeLevel.toFixed(1)} (×${multiplier.toFixed(2)})`}
      buttonLabel={`${cost} Vic`}
      disabled={!affordable}
      onPress={onUpgrade}
    />
  );
}
