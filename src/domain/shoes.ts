/** 仕様書7章。シューズの解放コスト(固定、Vicマネーのみ)。 */
export const SHOE_UNLOCK_COST = 1000;

/** shoeCostFor(level)。stat育成コストと同じ+0.1刻みの式を踏襲(base 15, growth 1.03)。 */
export const SHOE_COST_CONFIG = { base: 15, growth: 1.03 };

export function shoeCostFor(currentLevel: number): number {
  const steps = Math.round((currentLevel - 1) * 10);
  return Math.max(2, Math.round(SHOE_COST_CONFIG.base * Math.pow(SHOE_COST_CONFIG.growth, steps)));
}
