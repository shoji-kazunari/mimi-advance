import { calcOfflineProgress, OFFLINE_MAX_MS, OFFLINE_MIN_MS } from '../offline';
import { baseStats, OwnedCharacter } from '../types';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function makeCharacter(overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return {
    defId: 'c1',
    name: 'ミミ',
    evolutionStage: 0,
    costumeStage: 0,
    stats: baseStats(),
    shoeUnlocked: false,
    shoeLevel: 0,
    stage: 100, // ボス手前までのザコが28体と多く、途中で止まらない時間帯を試しやすい
    zakoDefeated: 0,
    totalZakoDefeated: 0,
    ...overrides,
  };
}

describe('calcOfflineProgress', () => {
  it('短すぎる離席(1分未満)は報酬なし', () => {
    const result = calcOfflineProgress(makeCharacter(), OFFLINE_MIN_MS - 1);
    expect(result.passes).toBe(0);
    expect(result.runnerPt).toBe(0);
  });

  it('時計が巻き戻って経過時間が負になっても報酬なし', () => {
    expect(calcOfflineProgress(makeCharacter(), -5 * HOUR).passes).toBe(0);
    expect(calcOfflineProgress(makeCharacter(), NaN).passes).toBe(0);
  });

  it('効率は50%: 3分離れると、通常の1.5分ぶん(ザコ出現間隔5秒)=18体', () => {
    const result = calcOfflineProgress(makeCharacter(), 3 * MIN);
    expect(result.passes).toBe(18);
    expect(result.runnerPt).toBe(18 * 20); // ステージ100の基礎pt=20
    expect(result.reachedBoss).toBe(false);
  });

  it('テクニックが高いほどザコ1体のptが増える', () => {
    const character = makeCharacter({ evolutionStage: 1, stats: { ...baseStats(), technique: 10 } });
    // 20 + 10*3 = 50pt/体
    expect(calcOfflineProgress(character, 3 * MIN).runnerPt).toBe(18 * 50);
  });

  it('ガッツが高いほどザコの出現間隔が縮み、体数が増える', () => {
    const low = calcOfflineProgress(makeCharacter(), 2 * MIN);
    const high = calcOfflineProgress(makeCharacter({ stats: { ...baseStats(), guts: 26 } }), 2 * MIN);
    expect(low.passes).toBe(12);
    expect(high.passes).toBe(24); // 間隔が半分(guts-1 x 2% = 50%短縮)
  });

  it('ボスが出現する手前で止まる(残りのザコ数までしか進まない)', () => {
    const result = calcOfflineProgress(makeCharacter({ stage: 1 }), 8 * HOUR); // ステージ1は3体でボス
    expect(result.passes).toBe(3);
    expect(result.runnerPt).toBe(3 * 10);
    expect(result.reachedBoss).toBe(true);
  });

  it('すでに途中まで倒していれば、残りの体数ぶんだけ', () => {
    const result = calcOfflineProgress(makeCharacter({ zakoDefeated: 20 }), 3 * MIN); // 残り8体
    expect(result.passes).toBe(8);
    expect(result.reachedBoss).toBe(true);
  });

  it('すでにボスが出現中なら何も進まない', () => {
    const result = calcOfflineProgress(makeCharacter({ zakoDefeated: 28 }), 5 * HOUR);
    expect(result.passes).toBe(0);
    expect(result.reachedBoss).toBe(false);
  });

  it('経過時間は最大8時間まで(超過分は切り捨て)', () => {
    const over = calcOfflineProgress(makeCharacter(), 20 * HOUR);
    expect(over.countedMs).toBe(OFFLINE_MAX_MS);
    expect(over.capped).toBe(true);

    const exactly = calcOfflineProgress(makeCharacter(), OFFLINE_MAX_MS);
    expect(exactly.countedMs).toBe(OFFLINE_MAX_MS);
    expect(exactly.capped).toBe(false);
  });
});
