import { selfCombatantProfile, bossCombatantProfile, simulateBattle, BATTLE_MS } from '../battle';
import { baseStats } from '../types';

describe('selfCombatantProfile', () => {
  it('進化0(technique/damage未解放)ではattackUnlockedがfalse', () => {
    const profile = selfCombatantProfile(baseStats(), 0);
    expect(profile.attackUnlocked).toBe(false);
    expect(profile.skillBonus).toBe(0);
    // technique未解放なのでobstacleLoss = max(1, 4 - 0*0.4) = 4
    expect(profile.obstacleLoss).toBe(4);
  });

  it('進化2では全ステータスが効く', () => {
    const profile = selfCombatantProfile(baseStats(), 2);
    expect(profile.attackUnlocked).toBe(true);
    expect(profile.skillBonus).toBe(4 + 1 * 2);
    expect(profile.obstacleLoss).toBeCloseTo(4 - 0.4);
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
    // bossMax/bossDrainPerSecは仕様の式上どのステージでも約12〜12.5秒に収まるため、
    // 「ボスを強くする」より「自分の消費ペースを崩す」方が負けを再現しやすい。
    const badBuildMe = selfCombatantProfile(
      { speed: 1, stamina: 1, guts: 10, technique: 1, damage: 1 },
      0
    );
    const easyBoss = bossCombatantProfile(1);
    const result = simulateBattle(badBuildMe, easyBoss);
    expect(result.outcome.winner).toBe('opponent');
  });

  it('タイムラインはBATTLE_MSを超えない', () => {
    const me = selfCombatantProfile(baseStats(), 2);
    const boss = bossCombatantProfile(1);
    const result = simulateBattle(me, boss);
    const lastFrame = result.frames[result.frames.length - 1];
    expect(lastFrame.tMs).toBeLessThanOrEqual(BATTLE_MS);
  });
});
