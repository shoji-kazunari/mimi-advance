import {
  isVsRaceUnlocked,
  todayDateString,
  resetVsRaceIfNewDay,
  generateVsOpponents,
  vsRaceVicReward,
  VS_RACE_DAILY_LIMIT,
} from '../vsRace';
import { baseStats, OwnedCharacter } from '../types';

function makeCharacter(overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return {
    defId: 'c1',
    name: 'ミミ',
    evolutionStage: 0,
    costumeStage: 0,
    stats: baseStats(),
    shoeUnlocked: false,
    shoeLevel: 0,
    stage: 1,
    zakoDefeated: 0,
    totalZakoDefeated: 0,
    ...overrides,
  };
}

describe('isVsRaceUnlocked', () => {
  it('誰か1体でもステージ100以上なら解放', () => {
    expect(isVsRaceUnlocked([makeCharacter({ stage: 99 })])).toBe(false);
    expect(isVsRaceUnlocked([makeCharacter({ stage: 100 })])).toBe(true);
  });
});

describe('todayDateString', () => {
  it('UTCではなくローカル日付を使う(UTC日付が変わっていてもローカルではまだ前日ならその日付)', () => {
    // JSTで2026-01-01 08:00 = UTCでは2025-12-31 23:00
    const localMidnightNextDay = new Date(2026, 0, 1, 8, 0, 0);
    expect(todayDateString(localMidnightNextDay)).toBe('2026-01-01');
  });
});

describe('resetVsRaceIfNewDay', () => {
  it('同じ日付ならそのまま', () => {
    const state = { remaining: 2, lastResetDate: '2026-01-01' };
    expect(resetVsRaceIfNewDay(state, '2026-01-01')).toEqual(state);
  });

  it('日付が変わっていれば残り回数をリセット', () => {
    const state = { remaining: 0, lastResetDate: '2026-01-01' };
    expect(resetVsRaceIfNewDay(state, '2026-01-02')).toEqual({
      remaining: VS_RACE_DAILY_LIMIT,
      lastResetDate: '2026-01-02',
    });
  });
});

describe('generateVsOpponents', () => {
  it('総合Lv.の±15%の範囲で5人生成し、各ステータスは総合Lv.の5等分', () => {
    const opponents = generateVsOpponents(100, () => 1); // rng=1 -> variance = +15%
    expect(opponents).toHaveLength(5);
    for (const o of opponents) {
      expect(o.totalLv).toBeCloseTo(115);
      expect(o.stats.speed).toBeCloseTo(23);
      expect(o.stats.damage).toBeCloseTo(23);
    }
  });
});

describe('vsRaceVicReward', () => {
  it('max(10, round(相手の総合Lv. × 0.6))', () => {
    expect(vsRaceVicReward(1)).toBe(10);
    expect(vsRaceVicReward(100)).toBe(60);
  });
});
