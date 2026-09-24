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
