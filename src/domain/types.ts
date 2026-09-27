export type StatKey = 'speed' | 'stamina' | 'guts' | 'technique' | 'damage';

export const STAT_KEYS: StatKey[] = ['speed', 'stamina', 'guts', 'technique', 'damage'];

export type EvolutionStage = 0 | 1 | 2;

export type CharacterStats = Record<StatKey, number>;

export interface EvolutionStep {
  requiredCharLv: number;
  toName: string;
}

/** マスターデータ。ロジックを持たない純粋なデータ(パチンコ機種データと同じ思想)。 */
export interface CharacterDef {
  id: string;
  name: string;
  unlockCost: number;
  evolutions: [EvolutionStep, EvolutionStep];
}

export interface OwnedCharacter {
  defId: string;
  name: string;
  evolutionStage: EvolutionStage;
  costumeStage: EvolutionStage;
  stats: CharacterStats;
  shoeUnlocked: boolean;
  shoeLevel: number;
  stage: number;
  zakoDefeated: number;
  totalZakoDefeated: number;
}

export interface VsRaceState {
  remaining: number;
  lastResetDate: string;
}

export interface GameState {
  username: string;
  runnerPt: number;
  vicMoney: number;
  characters: OwnedCharacter[];
  activeCharacterId: string;
  vsRace: VsRaceState;
  /** 最後に状態が更新された時刻(epoch ms)。放置報酬の経過時間の基準。古いセーブには無い。 */
  lastActiveAt?: number;
}

export function baseStats(): CharacterStats {
  return { speed: 1, stamina: 1, guts: 1, technique: 1, damage: 1 };
}
