import { isStatUnlocked, effectiveStatValue } from './stats';
import { CharacterStats, EvolutionStage } from './types';

/** 仕様書5章。バトル(ボス戦・VSレース共通)のコース定義。 */
export const BATTLE_MS = 15000;
export const BATTLE_DISTANCE_M = 3000;
export const MS_PER_METER = 5; // 15000ms / 3000m
export const OBSTACLE_POINTS_M = [500, 1000, 1500, 2000, 2500];
export const ATTACK_POINTS_M = [750, 1750];

const SPRINT_DRAIN_PER_SEC = 6;
const CRUISE_DRAIN_PER_SEC = 3;

/** バトルの片側(自分/ボス/VS相手)を表す共通プロファイル。ボスはsprintDurationMs=0にして
 * 「常に巡航ペース(=bossDrainPerSec)」として扱うことで、自分側と同じ式で計算できるようにしている。
 */
export interface CombatantProfile {
  maxStamina: number;
  sprintDurationMs: number;
  sprintDrainPerSec: number;
  cruiseDrainPerSec: number;
  obstacleLoss: number;
  attackUnlocked: boolean;
  skillBonus: number;
  /** 自分の速度が相手の消耗ペースに与えるプレッシャー(相手側の消費に加算される) */
  pressureToOpponentPerSec: number;
}

function speedPressure(speedEffective: number): number {
  return Math.max(0, speedEffective - 1) * 1.2;
}

/** 仕様書5章「スタミナ計算式(自分側)」。プレイヤーキャラ、VSレースの相手キャラの両方に使う。 */
export function selfCombatantProfile(
  stats: CharacterStats,
  evolutionStage: EvolutionStage
): CombatantProfile {
  const staminaEff = effectiveStatValue(stats, 'stamina', evolutionStage);
  const gutsEff = effectiveStatValue(stats, 'guts', evolutionStage);
  const techniqueEff = effectiveStatValue(stats, 'technique', evolutionStage);
  const damageEff = effectiveStatValue(stats, 'damage', evolutionStage);
  const speedEff = effectiveStatValue(stats, 'speed', evolutionStage);
  const attackUnlocked = isStatUnlocked('damage', evolutionStage);

  return {
    maxStamina: 50 + staminaEff * 20,
    sprintDurationMs: Math.min(11000, Math.round(gutsEff * 1600)),
    sprintDrainPerSec: SPRINT_DRAIN_PER_SEC,
    cruiseDrainPerSec: CRUISE_DRAIN_PER_SEC,
    obstacleLoss: Math.max(1, 4 - techniqueEff * 0.4),
    attackUnlocked,
    skillBonus: attackUnlocked ? 4 + damageEff * 2 : 0,
    pressureToOpponentPerSec: speedPressure(speedEff),
  };
}

/** 仕様書5章「スタミナ計算式(相手側=ボス)」。 */
export function bossCombatantProfile(stage: number, selfSpeedEffective: number): CombatantProfile {
  const baseDrain = 5 + (stage - 1) * 0.8;
  return {
    maxStamina: 60 + (stage - 1) * 10,
    sprintDurationMs: 0,
    sprintDrainPerSec: baseDrain,
    cruiseDrainPerSec: baseDrain,
    obstacleLoss: 0,
    attackUnlocked: false,
    skillBonus: 0,
    pressureToOpponentPerSec: 0,
  };
  // 備考: selfSpeedEffective によるプレッシャーは simulateBattle 側で
  // 「相手のpressureToOpponentPerSecを自分の消費レートに足す」形で対称的に処理するため、
  // ここでは使わない。引数はボス戦の呼び出し側で分かりやすくするために残している。
  void selfSpeedEffective;
}

export type BattleWinner = 'me' | 'opponent';

export interface BattleOutcome {
  winner: BattleWinner;
  /** KOなら実際に決着したタイミング(ms)、タイムアップならBATTLE_MS */
  endedAtMs: number;
  reason: 'ko' | 'timeout';
}

export interface BattleFrame {
  tMs: number;
  meStamina: number;
  opponentStamina: number;
}

export interface BattleTimeline {
  frames: BattleFrame[];
  outcome: BattleOutcome;
  meMaxStamina: number;
  opponentMaxStamina: number;
  obstacleTimesMs: number[];
  attackTimesMs: number[];
}

const DT_MS = 20;

/**
 * 開始時に全結果を計算する決定論的シミュレーション。乱数を使わないため、
 * 同じ2つのプロファイルからは常に同じ結果になる(演出のスキップで結果が変わらない、仕様書5章)。
 *
 * 仕様書に明記がなく、ここで判断した2点:
 * - 15秒間どちらもKOしなかった場合は、残りスタミナの割合(残/最大)が高い側を勝者とする
 * - 同一フレームで両者が同時に0以下になった場合は自分側の勝ちとする
 * どちらも要確認・要調整。
 */
export function simulateBattle(me: CombatantProfile, opponent: CombatantProfile): BattleTimeline {
  const obstacleTimesMs = OBSTACLE_POINTS_M.map((m) => m * MS_PER_METER);
  const attackTimesMs = ATTACK_POINTS_M.map((m) => m * MS_PER_METER);

  let meStamina = me.maxStamina;
  let opponentStamina = opponent.maxStamina;
  const frames: BattleFrame[] = [{ tMs: 0, meStamina, opponentStamina }];
  let outcome: BattleOutcome | null = null;

  for (let tMs = DT_MS; tMs <= BATTLE_MS; tMs += DT_MS) {
    const prevT = tMs - DT_MS;

    const meRate =
      (prevT < me.sprintDurationMs ? me.sprintDrainPerSec : me.cruiseDrainPerSec) +
      opponent.pressureToOpponentPerSec;
    const opponentRate =
      (prevT < opponent.sprintDurationMs ? opponent.sprintDrainPerSec : opponent.cruiseDrainPerSec) +
      me.pressureToOpponentPerSec;

    meStamina -= (meRate * DT_MS) / 1000;
    opponentStamina -= (opponentRate * DT_MS) / 1000;

    for (const obT of obstacleTimesMs) {
      if (obT > prevT && obT <= tMs) {
        meStamina -= me.obstacleLoss;
        opponentStamina -= opponent.obstacleLoss;
      }
    }
    for (const atT of attackTimesMs) {
      if (atT > prevT && atT <= tMs) {
        if (me.attackUnlocked) opponentStamina -= me.skillBonus;
        if (opponent.attackUnlocked) meStamina -= opponent.skillBonus;
      }
    }

    meStamina = Math.max(0, meStamina);
    opponentStamina = Math.max(0, opponentStamina);
    frames.push({ tMs, meStamina, opponentStamina });

    if (!outcome && (meStamina <= 0 || opponentStamina <= 0)) {
      const meDown = meStamina <= 0;
      const opponentDown = opponentStamina <= 0;
      outcome = {
        winner: meDown && opponentDown ? 'me' : opponentDown ? 'me' : 'opponent',
        endedAtMs: tMs,
        reason: 'ko',
      };
      break;
    }
  }

  if (!outcome) {
    const meRatio = meStamina / me.maxStamina;
    const opponentRatio = opponentStamina / opponent.maxStamina;
    outcome = {
      winner: meRatio >= opponentRatio ? 'me' : 'opponent',
      endedAtMs: BATTLE_MS,
      reason: 'timeout',
    };
  }

  return {
    frames,
    outcome,
    meMaxStamina: me.maxStamina,
    opponentMaxStamina: opponent.maxStamina,
    obstacleTimesMs,
    attackTimesMs,
  };
}

/** 再生中、任意の時刻でのスタミナをフレームから取り出す(ジャンプ演出やスキップに使う)。 */
export function staminaAtTime(timeline: BattleTimeline, tMs: number): BattleFrame {
  const clamped = Math.max(0, Math.min(BATTLE_MS, tMs));
  let result = timeline.frames[0];
  for (const frame of timeline.frames) {
    if (frame.tMs > clamped) break;
    result = frame;
  }
  return result;
}
