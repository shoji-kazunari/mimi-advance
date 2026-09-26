import { effectiveStatValue } from './stats';
import { zakoPtGained, zakoRequiredCount, zakoSpawnIntervalMs } from './stage';
import { OwnedCharacter } from './types';

/** 放置報酬の対象になる経過時間の上限(8時間)。これを超えた分は無視する。 */
export const OFFLINE_MAX_MS = 8 * 60 * 60 * 1000;
/** 放置中は、遊んでいるときの半分のペースでザコを追い抜いたものとして計算する。 */
export const OFFLINE_EFFICIENCY = 0.5;
/** これより短い離席は報酬にしない(タブの切り替えなどで毎回ポップアップが出ないように)。 */
export const OFFLINE_MIN_MS = 60 * 1000;

export interface OfflineProgress {
  /** 報酬の対象にした経過時間(上限適用後) */
  countedMs: number;
  /** 上限(8時間)を超えていて、超過分を切り捨てたか */
  capped: boolean;
  /** 追い抜いたザコの数 */
  passes: number;
  runnerPt: number;
  /** ボスに到達して止まったか(ボス戦は自分で始める) */
  reachedBoss: boolean;
}

const NO_PROGRESS: OfflineProgress = { countedMs: 0, capped: false, passes: 0, runnerPt: 0, reachedBoss: false };

/**
 * 閉じている間(elapsedMs)に、操作中のキャラが稼いだ分を計算する。
 * - 経過時間は最大8時間、ペースは通常の50%
 * - ザコの追い抜きはボスが出現する手前で止める(ボスには自動で挑まない)
 * ブラウザは閉じている間は動かせないため、戻ってきたときにまとめて計算する前提。
 */
export function calcOfflineProgress(character: OwnedCharacter, elapsedMs: number): OfflineProgress {
  if (!(elapsedMs >= OFFLINE_MIN_MS)) return NO_PROGRESS; // 時計が戻った(負)・NaNも含めて弾く

  const countedMs = Math.min(elapsedMs, OFFLINE_MAX_MS);
  const gutsEff = effectiveStatValue(character.stats, 'guts', character.evolutionStage);
  const techniqueEff = effectiveStatValue(character.stats, 'technique', character.evolutionStage);

  const intervalMs = zakoSpawnIntervalMs(gutsEff);
  const remaining = Math.max(0, zakoRequiredCount(character.stage) - character.zakoDefeated);
  const passes = Math.min(remaining, Math.floor((countedMs * OFFLINE_EFFICIENCY) / intervalMs));

  return {
    countedMs,
    capped: elapsedMs > OFFLINE_MAX_MS,
    passes,
    runnerPt: passes * zakoPtGained(character.stage, techniqueEff),
    reachedBoss: passes > 0 && character.zakoDefeated + passes >= zakoRequiredCount(character.stage),
  };
}
