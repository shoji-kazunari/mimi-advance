import { timeToBossSec, zakoRequiredCount, zakoPtGained, bossRunnerPtReward, bossVicMoneyReward } from '../stage';

describe('timeToBossSec', () => {
  it('ステージ1〜30は15→30秒(5ステージごとに+3秒)', () => {
    expect(timeToBossSec(1)).toBe(15);
    expect(timeToBossSec(5)).toBe(15);
    expect(timeToBossSec(6)).toBe(18);
    expect(timeToBossSec(30)).toBe(30);
  });

  it('ステージ31〜60は35→60秒(5ステージごとに+5秒)', () => {
    expect(timeToBossSec(31)).toBe(35);
    expect(timeToBossSec(35)).toBe(35);
    expect(timeToBossSec(36)).toBe(40);
    expect(timeToBossSec(60)).toBe(60);
  });

  it('ステージ61〜100は70→140秒(5ステージごとに+10秒)', () => {
    expect(timeToBossSec(61)).toBe(70);
    expect(timeToBossSec(100)).toBe(140);
  });

  it('ステージ101〜は155秒から+15秒/5ステージで継続', () => {
    expect(timeToBossSec(101)).toBe(155);
    expect(timeToBossSec(106)).toBe(170);
    expect(timeToBossSec(151)).toBe(155 + 10 * 15);
  });
});

describe('zakoRequiredCount', () => {
  it('5秒に1体、最低1体', () => {
    expect(zakoRequiredCount(1)).toBe(3); // 15/5
    expect(zakoRequiredCount(31)).toBe(7); // 35/5
  });
});

describe('zakoPtGained', () => {
  it('基礎pt + テクニック実効値×3(四捨五入)', () => {
    expect(zakoPtGained(1, 0)).toBe(10);
    expect(zakoPtGained(1, 2)).toBe(16);
    expect(zakoPtGained(61, 1.5)).toBe(Math.round(20 + 1.5 * 3));
  });
});

describe('ボス撃破報酬', () => {
  it('runnerPt = 40 + stage*8', () => {
    expect(bossRunnerPtReward(1)).toBe(48);
    expect(bossRunnerPtReward(10)).toBe(120);
  });

  it('vicMoney = max(2, round(stage*0.4))', () => {
    expect(bossVicMoneyReward(1)).toBe(2);
    expect(bossVicMoneyReward(10)).toBe(4);
  });
});
