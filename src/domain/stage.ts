/** 仕様書2章。ボス到達時間(秒)。5ステージごとに階段状に増加。 */
export function timeToBossSec(stage: number): number {
  if (stage <= 30) return 15 + Math.floor((stage - 1) / 5) * 3;
  if (stage <= 60) return 35 + Math.floor((stage - 31) / 5) * 5;
  if (stage <= 100) return 70 + Math.floor((stage - 61) / 5) * 10;
  return 155 + Math.floor((stage - 101) / 5) * 15;
}

/** ザコは5秒に1体の固定ペースで出現する。そのステージに必要な数(最低1)。 */
export const ZAKO_SPAWN_INTERVAL_SEC = 5;

export function zakoRequiredCount(stage: number): number {
  return Math.max(1, Math.round(timeToBossSec(stage) / ZAKO_SPAWN_INTERVAL_SEC));
}

/** 仕様書2章。ザコ1体あたりの基礎ランナーpt(ステージ帯で階段状)。 */
export function zakoBasePt(stage: number): number {
  if (stage <= 30) return 10;
  if (stage <= 60) return 15;
  if (stage <= 100) return 20;
  return 25;
}

/** 実際の獲得pt = round(基礎pt + テクニック実効値 × 3)。 */
export function zakoPtGained(stage: number, techniqueEffective: number): number {
  return Math.round(zakoBasePt(stage) + techniqueEffective * 3);
}

/**
 * ザコ出現間隔(ms)。ガッツ実効値でわずかに短縮: guts-1 × 2%。
 * 進化3(無制限Lv.)でガッツが極端に伸びる可能性があるため、間隔が0以下にならない
 * ように下限を設けている(仕様書に明記はないが、実行上の安全のための最小限のガード)。
 */
export function zakoSpawnIntervalMs(gutsEffective: number): number {
  const reduction = Math.max(0, gutsEffective - 1) * 0.02;
  const ms = ZAKO_SPAWN_INTERVAL_SEC * 1000 * (1 - reduction);
  return Math.max(500, Math.round(ms));
}

/** 仕様書5章。ボス撃破報酬。 */
export function bossRunnerPtReward(clearedStage: number): number {
  return 40 + clearedStage * 8;
}

export function bossVicMoneyReward(clearedStage: number): number {
  return Math.max(2, Math.round(clearedStage * 0.4));
}
