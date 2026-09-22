/** 「耳アド UI手触り仕様書」3章。ステータスごとのカード色(固定値)。 */
export const STAT_COLORS: Record<string, string> = {
  speed: '#4d7cff',
  stamina: '#ffb84d',
  guts: '#b27bff',
  technique: '#3fe0b0',
  damage: '#ff5d5d',
  shoe: '#ffd23f',
};

export const STAT_LABELS: Record<string, string> = {
  speed: 'スピード',
  stamina: 'スタミナ',
  guts: 'ガッツ',
  technique: 'テクニック',
  damage: 'アタック',
};

/** 「耳アド UI手触り仕様書」3章の配色に合わせたダークテーマ。 */
export const colors = {
  background: '#1a1533',
  backgroundGradient: ['#1a1533', '#241a44'] as [string, string],
  card: '#241d47',
  cardInset: '#1c1638',
  border: '#3a2c66',
  text: '#f2f0fb',
  subtext: '#9d97ba',
  primary: '#4d7cff',
  accent: '#ff5d9e',
  danger: '#ff5d5d',
  locked: '#3a2c66',
  lockedText: '#726c93',
  gold: '#ffd23f',
  mint: '#3fe0b0',
  gaugeStart: '#3fe0b0',
  gaugeEnd: '#ff5d9e',
  gaugeReadyStart: '#ffb84d',
  gaugeReadyEnd: '#ff5d5d',
};
