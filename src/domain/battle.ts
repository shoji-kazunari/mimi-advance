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

/**
 * ボスから自分への圧力(仕様書5章のバランス見直し)。
 * 元の式ではボスはattackUnlocked=false・pressureToOpponentPerSec=0固定で、自分に一切
 * ダメージを与えられなかった。maxStamina/消費速度をステージに比例して伸ばしても、両者の
 * 比率がほぼ一定なため「ボスはどのステージでもだいたい12〜12.5秒で自滅する」だけで、
 * 自分側の消費(=自分のステータスのみで決まる)はステージに一切依存しなかった。
 * つまり一定ライン(約12.5秒生存)さえ超えれば、それ以降は何ステージ進んでも
 * 難易度が変わらず、育成を続ける意味が薄れていた。
 * ここでステージに比例した圧力を自分側の消費に足すことで、ステージが上がるほど
 * 自分の消費ペースも上がり、育成でそれに追いつき続ける必要がある形にする。
 * stage=1では0(初回のボス戦の手触りは変えない)。
 */
function bossPressurePerSec(stage: number): number {
  return (stage - 1) * 0.4;
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
    // ガッツはスプリント延長で消費が増える一方だった(延ばすほど高消費な6/秒の時間が
    // 延びるだけで、相殺する効果が無かった)。障害物ダメージ軽減はテクニックの役割と
    // 被るため、ガッツ自身が伸ばしている「スプリントの消費レート」自体を下げる形にした
    // (延長した分は、その分効率も上がる)。巡航ペース(3/秒)まで下がったら頭打ち。
    sprintDrainPerSec: Math.max(CRUISE_DRAIN_PER_SEC, SPRINT_DRAIN_PER_SEC - gutsEff * 0.44),
    cruiseDrainPerSec: CRUISE_DRAIN_PER_SEC,
    obstacleLoss: Math.max(1, 4 - techniqueEff * 0.4),
    attackUnlocked,
    skillBonus: attackUnlocked ? 4 + damageEff * 2 : 0,
    pressureToOpponentPerSec: speedPressure(speedEff),
  };
}

/**
 * 仕様書5章「スタミナ計算式(相手側=ボス)」。
 * 自分の速度によるプレッシャーはここでは含めない。simulateBattle側で
 * 「相手(自分)のpressureToOpponentPerSecをボスの消費レートに足す」形で処理される。
 * ボス自身のmaxStamina/消費速度は比率がほぼ一定(約12〜12.5秒で自滅)なため、
 * 自分側への脅威はbossPressurePerSec(ステージに比例)だけで持たせている。
 */
export function bossCombatantProfile(stage: number): CombatantProfile {
  const baseDrain = 5 + (stage - 1) * 0.8;
  return {
    maxStamina: 60 + (stage - 1) * 10,
    sprintDurationMs: 0,
    sprintDrainPerSec: baseDrain,
    cruiseDrainPerSec: baseDrain,
    obstacleLoss: 0,
    attackUnlocked: false,
    skillBonus: 0,
    pressureToOpponentPerSec: bossPressurePerSec(stage),
  };
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
