import { CharacterStats, OwnedCharacter, VsRaceState } from './types';
import { characterLevel } from './stats';

export const VS_RACE_UNLOCK_STAGE = 100;
export const VS_RACE_DAILY_LIMIT = 5;

/** 仕様書6章。所持キャラの誰か1体がステージ100に到達で解放。 */
export function isVsRaceUnlocked(characters: OwnedCharacter[]): boolean {
  return characters.some((c) => c.stage >= VS_RACE_UNLOCK_STAGE);
}

export function highestCharacterLevel(characters: OwnedCharacter[]): number {
  return characters.reduce((max, c) => Math.max(max, characterLevel(c)), 0);
}

export function todayDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** 日付が変わっていたら1日5回にリセットする。 */
export function resetVsRaceIfNewDay(vsRace: VsRaceState, today: string = todayDateString()): VsRaceState {
  if (vsRace.lastResetDate === today) return vsRace;
  return { remaining: VS_RACE_DAILY_LIMIT, lastResetDate: today };
}

export interface VsOpponent {
  id: string;
  totalLv: number;
  stats: CharacterStats;
}

/**
 * 仕様書6章。自分の最高キャラLv.の±15%の範囲でランダムな総合Lv.を持つ5名。
 * ステータスは総合Lv.を5等分した仮想ステータス(進化制限なし、全ステータス解放扱い)。
 */
export function generateVsOpponents(
  highestCharLv: number,
  rng: () => number = Math.random
): VsOpponent[] {
  return Array.from({ length: 5 }, (_, i) => {
    const variance = (rng() * 2 - 1) * 0.15;
    const totalLv = Math.max(1, highestCharLv * (1 + variance));
    const perStat = totalLv / 5;
    return {
      id: `dummy-${i}`,
      totalLv,
      stats: { speed: perStat, stamina: perStat, guts: perStat, technique: perStat, damage: perStat },
    };
  });
}

/** 仕様書6章。勝利報酬 = max(10, round(相手の総合Lv. × 0.6))。 */
export function vsRaceVicReward(opponentTotalLv: number): number {
  return Math.max(10, Math.round(opponentTotalLv * 0.6));
}
