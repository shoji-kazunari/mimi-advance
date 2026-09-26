import { BattleTimeline, staminaAtTime } from '../../../domain/battle';

// トラック上の横位置(%)の計算。画面部品(react-native)に依存しない純粋な計算だけを置く。

export const RUNNER_LEFT_PERCENT = 20;
export const OPPONENT_LEFT_PERCENT = 78;
/** 決着間際に自キャラとボスが重なる位置。両者が互いに歩み寄る形にするため、定位置の中間にする。 */
export const MEET_LEFT_PERCENT = (RUNNER_LEFT_PERCENT + OPPONENT_LEFT_PERCENT) / 2;

// 障害物は右から左へトラック全体を横切る(ザコと同じ動き)。
export const OBSTACLE_START_PERCENT = 100;
export const OBSTACLE_END_PERCENT = -15;
export const OBSTACLE_TRAVEL_MS = 1600;

/** 障害物が画面右端(OBSTACLE_START_PERCENT)から指定の左位置(%)へ到達するまでの所要時間。 */
export function obstacleTravelMsTo(leftPercent: number): number {
  const span = OBSTACLE_START_PERCENT - OBSTACLE_END_PERCENT;
  return ((OBSTACLE_START_PERCENT - leftPercent) / span) * OBSTACLE_TRAVEL_MS;
}

/**
 * 仕様書5章「ボスの横位置はボス自身の残スタミナ比率で自キャラに詰め寄る
 * (スタミナ0で完全に重なる)。自分が劣勢な時だけ遠のく」の、詰め寄り具合(0〜1)。
 * 0=互いに定位置、1=中間地点で重なる。
 * 線形(1-opponentRatio)のままだと、スタミナがまだ半分以上残っている段階から
 * 見た目上どんどん詰め寄ってしまい「抜き去るタイミングが早すぎる」ため、
 * 3乗のイーズインをかけて、本当にスタミナが尽きる直前までは大きく動かず、
 * 終盤だけ一気に詰め寄る(=完全に重なるのはスタミナがほぼ0の瞬間)ようにする。
 */
export function battleApproach(meRatio: number, opponentRatio: number): number {
  const disadvantage = Math.max(0, opponentRatio - meRatio);
  const base = Math.min(1, Math.max(0, 1 - opponentRatio - disadvantage));
  return base ** 3;
}

/** ボスは右の定位置から中間地点へ下がってくる。 */
export function opponentLeftPercentForRatios(meRatio: number, opponentRatio: number): number {
  const approach = battleApproach(meRatio, opponentRatio);
  return OPPONENT_LEFT_PERCENT - (OPPONENT_LEFT_PERCENT - MEET_LEFT_PERCENT) * approach;
}

/**
 * 自キャラは勝ちが見えてくると、左の定位置から中間地点へ前に出ていく
 * (以前は定位置から動かず、ボスだけが長い距離を詰めてきていた)。
 */
export function runnerLeftPercentForRatios(meRatio: number, opponentRatio: number): number {
  const approach = battleApproach(meRatio, opponentRatio);
  return RUNNER_LEFT_PERCENT + (MEET_LEFT_PERCENT - RUNNER_LEFT_PERCENT) * approach;
}

function ratiosAt(timeline: BattleTimeline, tMs: number): [number, number] {
  const frame = staminaAtTime(timeline, tMs);
  return [frame.meStamina / timeline.meMaxStamina, frame.opponentStamina / timeline.opponentMaxStamina];
}

/**
 * 各障害物のイベント時刻に、ボスと自キャラが実際に居るはずの位置(%)を事前計算する。
 * 二人とも動くため、固定位置を前提にすると障害物の出現・ジャンプのタイミングがずれる。
 * - ボス: 障害物がボスの位置に届く時刻(=イベント時刻)での位置
 * - 自キャラ: 同じ障害物が自キャラの位置まで進んで届く時刻での位置。
 *   届く時刻は自キャラの位置に依存するので、数回の反復で収束させる
 *   (自キャラの移動は障害物の速さに比べて十分小さいため、少ない回数で足りる)。
 */
export function jumpLayoutForTimeline(timeline: BattleTimeline): {
  opponentLeftPercentAtJump: number[];
  runnerLeftPercentAtJump: number[];
} {
  const opponentLeftPercentAtJump: number[] = [];
  const runnerLeftPercentAtJump: number[] = [];

  for (const tAtOpponent of timeline.obstacleTimesMs) {
    const [meRatio, opponentRatio] = ratiosAt(timeline, tAtOpponent);
    const opponentLeft = opponentLeftPercentForRatios(meRatio, opponentRatio);
    const spawnMs = tAtOpponent - obstacleTravelMsTo(opponentLeft);

    let runnerLeft = runnerLeftPercentForRatios(meRatio, opponentRatio);
    for (let i = 0; i < 4; i++) {
      const arrivalMs = spawnMs + obstacleTravelMsTo(runnerLeft);
      const [meAtArrival, opponentAtArrival] = ratiosAt(timeline, arrivalMs);
      runnerLeft = runnerLeftPercentForRatios(meAtArrival, opponentAtArrival);
    }

    opponentLeftPercentAtJump.push(opponentLeft);
    runnerLeftPercentAtJump.push(runnerLeft);
  }

  return { opponentLeftPercentAtJump, runnerLeftPercentAtJump };
}
