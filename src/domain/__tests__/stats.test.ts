import { statUpgradeCost, isStatUnlocked, statLevelCap, shoeMultiplier, characterLevel, companionLevel, highestLevelCharacter } from '../stats';
import { baseStats, OwnedCharacter } from '../types';

describe('statUpgradeCost', () => {
  it('Lv1(steps=0)ではbaseそのまま', () => {
    expect(statUpgradeCost('stamina', 1)).toBe(3);
    expect(statUpgradeCost('speed', 1)).toBe(6);
  });

  it('Lv2(steps=10)でgrowthが10乗される', () => {
    expect(statUpgradeCost('stamina', 2)).toBe(Math.round(3 * Math.pow(1.02, 10)));
  });

  it('最低2', () => {
    expect(statUpgradeCost('stamina', 1)).toBeGreaterThanOrEqual(2);
  });
});

describe('isStatUnlocked', () => {
  it('スピード/スタミナ/ガッツは常に解放', () => {
    expect(isStatUnlocked('speed', 0)).toBe(true);
    expect(isStatUnlocked('stamina', 0)).toBe(true);
    expect(isStatUnlocked('guts', 0)).toBe(true);
  });

  it('テクニックは進化2(stage>=1)で解放', () => {
    expect(isStatUnlocked('technique', 0)).toBe(false);
    expect(isStatUnlocked('technique', 1)).toBe(true);
  });

  it('アタックは進化3(stage>=2)で解放', () => {
    expect(isStatUnlocked('damage', 1)).toBe(false);
    expect(isStatUnlocked('damage', 2)).toBe(true);
  });
});

describe('statLevelCap', () => {
  it('進化段階ごとの上限', () => {
    expect(statLevelCap(0)).toBe(30);
    expect(statLevelCap(1)).toBe(60);
    expect(statLevelCap(2)).toBe(Infinity);
  });
});

describe('shoeMultiplier', () => {
  it('未解放は1倍', () => {
    expect(shoeMultiplier(5, false)).toBe(1);
  });

  it('解放済みは1 + level*0.02', () => {
    expect(shoeMultiplier(10, true)).toBeCloseTo(1.2);
  });
});

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

describe('characterLevel', () => {
  it('進化0(どうぶつ)はtechnique/damageがゼロ扱いなのでspeed+stamina+gutsのみ合算', () => {
    const c = makeCharacter();
    // speed:1 + stamina:1 + guts:1 (technique/damageは未解放でゼロ) = 3
    expect(characterLevel(c)).toBeCloseTo(3);
  });

  it('シューズ倍率が乗る', () => {
    const c = makeCharacter({ shoeUnlocked: true, shoeLevel: 10 });
    expect(characterLevel(c)).toBeCloseTo(3 * 1.2);
  });

  it('進化2(ヒト型)なら5ステータス全て合算', () => {
    const c = makeCharacter({ evolutionStage: 2 });
    expect(characterLevel(c)).toBeCloseTo(5);
  });
});

describe('companionLevel', () => {
  it('操作中でない仲間の各ステータス×10%を合算', () => {
    const active = makeCharacter({ defId: 'c1' });
    const companion = makeCharacter({ defId: 'c2', evolutionStage: 2 }); // charLv=5
    expect(companionLevel([active, companion], 'c1')).toBeCloseTo(0.5);
  });
});

describe('highestLevelCharacter', () => {
  it('キャラLv.が最も高いキャラを返す(操作中かどうかは無関係)', () => {
    const active = makeCharacter({ defId: 'c1', evolutionStage: 0 }); // charLv=3
    const strongerBench = makeCharacter({ defId: 'c2', evolutionStage: 2 }); // charLv=5
    expect(highestLevelCharacter([active, strongerBench])?.defId).toBe('c2');
  });

  it('空配列ならundefined', () => {
    expect(highestLevelCharacter([])).toBeUndefined();
  });
});
