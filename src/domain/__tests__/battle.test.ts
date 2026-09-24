import { selfCombatantProfile, bossCombatantProfile, simulateBattle, BATTLE_MS } from '../battle';
import { baseStats, CharacterStats } from '../types';

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

  it('ガッツが上がるほどスプリントの消費レートが下がる(巡航ペースが下限)', () => {
    // スプリントを延ばすほど高負荷な時間が延びるだけ、という一方的な不利にならないよう、
    // ガッツ自身が延ばしているスプリントの消費レートを下げる(テクニックの役割=障害物
    // ダメージ軽減とは被らない)。
    const low = selfCombatantProfile({ speed: 1, stamina: 1, guts: 1, technique: 1, damage: 1 }, 2);
    const high = selfCombatantProfile({ speed: 1, stamina: 1, guts: 20, technique: 1, damage: 1 }, 2);
    expect(high.sprintDrainPerSec).toBeLessThan(low.sprintDrainPerSec);
    expect(high.sprintDrainPerSec).toBeGreaterThanOrEqual(high.cruiseDrainPerSec);
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

  it('スタミナを育てないまま進むと、いずれ格下に感じるステージでも負ける', () => {
    // 進化0(technique未解放)・スタミナLv.1のまま(=育成が完全に追いついていない)だと、
    // ボスの圧力(stageに比例)がまだ小さい段階でも力尽きるようになる。
    const badBuildMe = selfCombatantProfile(
      { speed: 1, stamina: 1, guts: 1, technique: 1, damage: 1 },
      0
    );
    const result = simulateBattle(badBuildMe, bossCombatantProfile(15));
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

  it('スタミナ一点特化だけでは、いずれ育成の必要な差に追いつかれる(圧力の伸びを強めた再調整)', () => {
    // 全ステータスの育成コストを統一したことで、スタミナだけに全振りしても以前ほど
    // 損はしなくなった。その状態でスタミナ一点特化がどのステージでも勝ち続けてしまうと
    // 「スタミナ以外を育てる意味がない」ことになるため、bossPressurePerSecの係数を
    // 0.09->0.4に強め、スタミナ一点特化にも通用しない範囲を作った(stage130で逆転)。
    // 一方、5ステータスに均等に育てたバランス型はより長く(stage160まで)通用する。
    const monoStamina: CharacterStats = { speed: 1, stamina: 30, guts: 1, technique: 1, damage: 1 };
    const balanced: CharacterStats = { speed: 30, stamina: 30, guts: 30, technique: 30, damage: 30 };

    const monoAt120 = simulateBattle(selfCombatantProfile(monoStamina, 2), bossCombatantProfile(120));
    const monoAt130 = simulateBattle(selfCombatantProfile(monoStamina, 2), bossCombatantProfile(130));
    expect(monoAt120.outcome.winner).toBe('me');
    expect(monoAt130.outcome.winner).toBe('opponent');

    const balancedAt160 = simulateBattle(selfCombatantProfile(balanced, 2), bossCombatantProfile(160));
    expect(balancedAt160.outcome.winner).toBe('me');
  });

  it('タイムラインはBATTLE_MSを超えない', () => {
    const me = selfCombatantProfile(baseStats(), 2);
    const boss = bossCombatantProfile(1);
    const result = simulateBattle(me, boss);
    const lastFrame = result.frames[result.frames.length - 1];
    expect(lastFrame.tMs).toBeLessThanOrEqual(BATTLE_MS);
  });
});
