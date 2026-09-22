/** 仕様書10章。ステータスごとのカード色。プロトタイプの配色に合わせている。 */
export const STAT_COLORS: Record<string, string> = {
  speed: '#3b82f6',
  stamina: '#f0a020',
  guts: '#9d5ce8',
  technique: '#2fd193',
  damage: '#ef4a6e',
  shoe: '#e0b23a',
};

export const STAT_LABELS: Record<string, string> = {
  speed: 'スピード',
  stamina: 'スタミナ',
  guts: 'ガッツ',
  technique: 'テクニック',
  damage: 'アタック',
};

/** プロトタイプに合わせたダークテーマ。 */
export const colors = {
  background: '#0a0a12',
  card: '#201c3d',
  cardInset: '#181430',
  border: '#332b5c',
  text: '#f2f0fb',
  subtext: '#9d97ba',
  primary: '#3b82f6',
  accent: '#ff4d94',
  danger: '#ef4a6e',
  locked: '#3a3460',
  lockedText: '#726c93',
  gaugeStart: '#2fd193',
  gaugeEnd: '#ff4d94',
  gaugeReadyStart: '#ffb020',
  gaugeReadyEnd: '#ef4a6e',
};
