import { CharacterStats, EvolutionStage, OwnedCharacter, StatKey, STAT_KEYS } from './types';

/** 仕様書3章。育成コスト(ランナーpt消費、+0.1刻み)。 */
export const STAT_COST_CONFIG: Record<StatKey, { base: number; growth: number }> = {
  speed: { base: 6, growth: 1.05 },
  technique: { base: 4, growth: 1.035 },
  stamina: { base: 3, growth: 1.02 },
  guts: { base: 3, growth: 1.02 },
  damage: { base: 3, growth: 1.02 },
};

/** 仕様書3章。進化2(evolutionStage>=1)でテクニック、進化3(evolutionStage>=2)でアタックが解放される。 */
export function isStatUnlocked(stat: StatKey, evolutionStage: EvolutionStage): boolean {
  if (stat === 'technique') return evolutionStage >= 1;
  if (stat === 'damage') return evolutionStage >= 2;
  return true;
}

/** 仕様書3章。ステータスLv.上限(進化段階で解放)。 */
export function statLevelCap(evolutionStage: EvolutionStage): number {
  if (evolutionStage === 0) return 30;
  if (evolutionStage === 1) return 60;
  return Infinity;
}

/**
 * 次の1段(+0.1)を上げるのに必要なランナーpt。
 * cost = max(2, round(base * growth ^ steps)), steps = round((現在Lv - 1) * 10)
 */
export function statUpgradeCost(stat: StatKey, currentLv: number): number {
  const { base, growth } = STAT_COST_CONFIG[stat];
  const steps = Math.round((currentLv - 1) * 10);
  return Math.max(2, Math.round(base * Math.pow(growth, steps)));
}

/** 未解放ステータスはキャラLv.・仲間Lv.・バトル効果のすべてでゼロ扱い(仕様書3章)。 */
export function effectiveStatValue(
  stats: CharacterStats,
  stat: StatKey,
  evolutionStage: EvolutionStage
): number {
  return isStatUnlocked(stat, evolutionStage) ? stats[stat] : 0;
}

/** 仕様書7章。シューズの倍率(全ステータスに乗る)。 */
export function shoeMultiplier(shoeLevel: number, shoeUnlocked: boolean): number {
  if (!shoeUnlocked) return 1;
  return 1 + shoeLevel * 0.02;
}

/** キャラLv. = シューズ倍率込みの自キャラ実効ステータス合計(仲間の継承は含まない)。 */
export function characterLevel(character: OwnedCharacter): number {
  const multiplier = shoeMultiplier(character.shoeLevel, character.shoeUnlocked);
  return STAT_KEYS.reduce((sum, stat) => {
    const effective = effectiveStatValue(character.stats, stat, character.evolutionStage);
    return sum + effective * multiplier;
  }, 0);
}

/** 仲間Lv. = 操作中でない仲間キャラそれぞれの各ステータス×10%を合算(仕様書3章)。 */
export function companionLevel(allCharacters: OwnedCharacter[], activeCharacterId: string): number {
  return allCharacters
    .filter((c) => c.defId !== activeCharacterId)
    .reduce((sum, c) => sum + characterLevel(c) * 0.1, 0);
}

/** 総合Lv. = キャラLv. + 仲間Lv.(仕様書3章)。 */
export function totalLevel(allCharacters: OwnedCharacter[], activeCharacterId: string): number {
  const active = allCharacters.find((c) => c.defId === activeCharacterId);
  const charLv = active ? characterLevel(active) : 0;
  return charLv + companionLevel(allCharacters, activeCharacterId);
}
