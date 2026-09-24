import { selfCombatantProfile, bossCombatantProfile, simulateBattle, BATTLE_MS } from '../battle';
import { baseStats } from '../types';

describe('selfCombatantProfile', () => {
  it('進化0(technique/damage未解放)ではattackUnlockedがfalse', () => {
    const profile = selfCombatantProfile(baseStats(), 0);
    expect(profile.attackUnlocked).toBe(false);
    expect(profile.skillBonus).toBe(0);
    // technique未解放・ガッツ(常時有効)はLv.1なのでobstacleLoss = max(1, 4 - 0*0.4 - 1*0.15) = 3.85
    expect(profile.obstacleLoss).toBeCloseTo(3.85);
  });

  it('進化2では全ステータスが効く', () => {
    const profile = selfCombatantProfile(baseStats(), 2);
    expect(profile.attackUnlocked).toBe(true);
    expect(profile.skillBonus).toBe(4 + 1 * 2);
    expect(profile.obstacleLoss).toBeCloseTo(4 - 0.4 - 0.15);
    expect(profile.maxStamina).toBe(50 + 1 * 20);
    expect(profile.sprintDurationMs).toBe(1600);
  });
});

describe('bossCombatantProfile', () => {
  it('ステージに応じてmaxStamina/drainが上がる', () => {
    const stage1 = bossCombatantProfile(1);
    expect(stage1.maxStamina).toBe(60);
    expect(stage1.cruiseDrainPerSec).toBe(5);

    const stage11 = bossCombatantProfile(11);
    expect(stage11.maxStamina).toBe(160);
    expect(stage11.cruiseDrainPerSec).toBeCloseTo(5 + 10 * 0.8);
  });

  it('自分への圧力(pressureToOpponentPerSec)はステージ1で0、以降ステージに比例して増える', () => {
    // ステージ1(初回のボス戦)の手触りは変えない。以前はこれが常に0固定だったため、
    // ボスがどれだけ強くなっても自分に一切ダメージを与えられず、難易度が頭打ちになっていた。
    expect(bossCombatantProfile(1).pressureToOpponentPerSec).toBe(0);
    const stage11 = bossCombatantProfile(11);
    const stage51 = bossCombatantProfile(51);
    expect(stage11.pressureToOpponentPerSec).toBeGreaterThan(0);
    expect(stage51.pressureToOpponentPerSec).toBeGreaterThan(stage11.pressureToOpponentPerSec);
  });
});

describe('simulateBattle', () => {
  it('決定論的: 同じ入力からは常に同じ結果', () => {
    const me = selfCombatantProfile(baseStats(), 2);
    const boss = bossCombatantProfile(1);
    const r1 = simulateBattle(me, boss);
    const r2 = simulateBattle(me, boss);
    expect(r1.outcome).toEqual(r2.outcome);
  });

  it('自分が圧倒的に強ければ勝つ', () => {
    const strongMe = selfCombatantProfile(
      { speed: 1, stamina: 20, guts: 10, technique: 10, damage: 10 },
      2
    );
    const weakBoss = bossCombatantProfile(1);
    const result = simulateBattle(strongMe, weakBoss);
    expect(result.outcome.winner).toBe('me');
  });

  it('自分の消費が早すぎるビルドだと格下ボスにも負ける', () => {
    // ガッツを盛って全力疾走(6/秒)を引き延ばしても、スタミナが低ければ
    // maxStamina(50+stamina*20)に対して消費が追いつかず先に力尽きる。
    const badBuildMe = selfCombatantProfile(
      { speed: 1, stamina: 1, guts: 10, technique: 1, damage: 1 },
      0
    );
    const easyBoss = bossCombatantProfile(1);
    const result = simulateBattle(badBuildMe, easyBoss);
    expect(result.outcome.winner).toBe('opponent');
  });

  it('育成せずに放置すると、進んだステージでは同じステータスでも負けるようになる', () => {
    // bossPressurePerSecの導入前は、ボス自身がmaxStamina/消費速度の比率上どのステージでも
    // 約12〜12.5秒で自滅するだけで、自分側の消費はステータスのみで決まりステージに
    // 依存しなかった。そのため一定ラインを超えたステータスなら何ステージでも勝ててしまい、
    // 育成を続ける意味が薄れていた。同じ低ステータスで、低ステージ(勝てる)と
    // 高ステージ(ボスの圧力が乗って負ける)を対比してこれを検証する。
    const flatStats = { speed: 1, stamina: 1, guts: 1, technique: 1, damage: 1 };
    const me = selfCombatantProfile(flatStats, 2);

    const earlyResult = simulateBattle(me, bossCombatantProfile(1));
    expect(earlyResult.outcome.winner).toBe('me');

    const lateResult = simulateBattle(me, bossCombatantProfile(30));
    expect(lateResult.outcome.winner).toBe('opponent');
  });

  it('ステージなりに育成していれば高ステージでも勝てる', () => {
    // 上のテストの裏返し。ステージに応じて多少なりとも育成を続けていれば、
    // 高ステージのボス圧力にもちゃんと対抗できる(育成が頭打ちにならない)ことを確認する。
    const stage = 50;
    const trainedStats = { speed: 16, stamina: 16, guts: 16, technique: 16, damage: 16 };
    const me = selfCombatantProfile(trainedStats, 2);
    const result = simulateBattle(me, bossCombatantProfile(stage));
    expect(result.outcome.winner).toBe('me');
  });

  it('タイムラインはBATTLE_MSを超えない', () => {
    const me = selfCombatantProfile(baseStats(), 2);
    const boss = bossCombatantProfile(1);
    const result = simulateBattle(me, boss);
    const lastFrame = result.frames[result.frames.length - 1];
    expect(lastFrame.tMs).toBeLessThanOrEqual(BATTLE_MS);
  });
});
