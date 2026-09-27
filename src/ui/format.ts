import { OfflineProgress } from '../domain/offline';

/**
 * 万/億/兆単位の表示用フォーマット。
 * 育成コストやランナーptは高レベル帯で桁数が伸びすぎて読みにくくなるため、
 * カンマ区切りの生数字ではなく日本語の位取りで丸めて表示する。
 */
export function formatJP(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs < 10000) return sign + Math.round(abs).toLocaleString();
  const units: [number, string][] = [
    [1e12, '兆'],
    [1e8, '億'],
    [1e4, '万'],
  ];
  for (const [threshold, unit] of units) {
    if (abs >= threshold) {
      const value = abs / threshold;
      const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
      return sign + value.toFixed(digits) + unit;
    }
  }
  return sign + Math.round(abs).toLocaleString();
}

/** 経過時間の表示用(例: 3時間20分、45分)。秒以下は切り捨てる。 */
export function formatDurationJP(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

/** 放置報酬の「おかえりなさい」ポップアップに出す本文。 */
export function offlineReportMessage(progress: OfflineProgress): string {
  const lines = [
    `留守の間(${formatDurationJP(progress.countedMs)})に、ザコを${progress.passes}体追い抜いて`,
    `${formatJP(progress.runnerPt)}pt 稼ぎました`,
  ];
  if (progress.capped) lines.push('※放置報酬は最大8時間分までです');
  if (progress.reachedBoss) lines.push('ボスが出現しています！');
  return lines.join('\n');
}
