/**
 * 非同期ランキング(Firestoreに送る値)まわりの純粋関数。
 * サーバーを持たないため、送信値の正当性はここでの上限チェック+Firestoreルール側の
 * ミラーでしか担保できない(「本当にゲームが計算した値か」はクライアントだけでは検証不能)。
 * ここでの上限は不正対策というより「明らかにおかしい値」を弾く程度のものと割り切る。
 */

export type RankingCategory = 'stage' | 'totalLevel' | 'weeklyPt' | 'vsWinRate';

export const RANKING_CATEGORIES: { key: RankingCategory; label: string; unit: string }[] = [
  { key: 'stage', label: '到達ステージ', unit: '' },
  { key: 'totalLevel', label: '総合Lv.', unit: '' },
  { key: 'weeklyPt', label: '今週の獲得pt', unit: 'pt' },
  { key: 'vsWinRate', label: 'VSレース勝率', unit: '%' },
];

/** 明らかに不正な値を弾くための上限(不正対策ではなく異常値フィルタ)。 */
export const MAX_PLAUSIBLE_STAGE = 100_000;
export const MAX_PLAUSIBLE_TOTAL_LEVEL = 1_000_000;
export const MAX_PLAUSIBLE_WEEKLY_PT = 100_000_000;

export function isPlausibleStage(stage: number): boolean {
  return Number.isFinite(stage) && stage >= 1 && stage <= MAX_PLAUSIBLE_STAGE;
}

export function isPlausibleTotalLevel(level: number): boolean {
  return Number.isFinite(level) && level >= 0 && level <= MAX_PLAUSIBLE_TOTAL_LEVEL;
}

export function isPlausibleWeeklyPt(pt: number): boolean {
  return Number.isFinite(pt) && pt >= 0 && pt <= MAX_PLAUSIBLE_WEEKLY_PT;
}

/**
 * 「ただ長く遊んでいるだけ」で勝てないよう、VSレース勝率は最低戦績を満たすまで
 * ランキング対象にしない(1戦1勝=100%のような外れ値を防ぐ)。
 */
export const VS_WIN_RATE_MIN_ATTEMPTS = 20;

/** nullは「まだ対象外(規定戦数未満)」。 */
export function vsWinRate(wins: number, attempts: number): number | null {
  if (attempts < VS_WIN_RATE_MIN_ATTEMPTS) return null;
  return wins / attempts;
}

/**
 * ISO8601週番号ベースのキー(例: "2026-W39")。「今週の獲得pt」の集計単位。
 * 月曜始まり。長期プレイヤーが有利になり続けないよう、週が変わったら0から再スタートする。
 */
export function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // 月曜=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // その週の木曜へ(ISO週番号の定義)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const weekNum = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export interface WeeklyProgress {
  weekKey: string;
  earnedPt: number;
}

export function initialWeeklyProgress(now: Date = new Date()): WeeklyProgress {
  return { weekKey: weekKey(now), earnedPt: 0 };
}

/** 週が変わっていたら0にリセットする(resetVsRaceIfNewDayの週版)。 */
export function resetWeeklyProgressIfNewWeek(progress: WeeklyProgress, now: Date = new Date()): WeeklyProgress {
  const current = weekKey(now);
  if (progress.weekKey === current) return progress;
  return { weekKey: current, earnedPt: 0 };
}
