import { bossCombatantProfile, selfCombatantProfile, simulateBattle } from '../../domain/battle';
import { baseStats } from '../../domain/types';
import {
  battleApproach,
  jumpLayoutForTimeline,
  MEET_LEFT_PERCENT,
  obstacleTravelMsTo,
  OPPONENT_LEFT_PERCENT,
  opponentLeftPercentForRatios,
  RUNNER_LEFT_PERCENT,
  runnerLeftPercentForRatios,
} from '../components/track/trackLayout';

describe('battleApproach', () => {
  it('お互いスタミナ満タンなら0(定位置)', () => {
    expect(battleApproach(1, 1)).toBe(0);
  });

  it('ボスのスタミナが尽きて自分が残っていれば1(重なる)', () => {
    expect(battleApproach(0.8, 0)).toBe(1);
  });

  it('自分が劣勢(ボスより残量が少ない)なら詰め寄らない', () => {
    expect(battleApproach(0.2, 0.9)).toBe(0);
  });

  it('ボスの残量が減るほど単調に増える(3乗のイーズインで終盤に一気に寄る)', () => {
    const early = battleApproach(1, 0.6);
    const mid = battleApproach(1, 0.3);
    const late = battleApproach(1, 0.05);
    expect(early).toBeLessThan(mid);
    expect(mid).toBeLessThan(late);
    expect(early).toBeLessThan(0.1); // 半分以上残っている間は、ほとんど動かない
  });
});

describe('位置(%)', () => {
  it('定位置: 自キャラは左、ボスは右', () => {
    expect(runnerLeftPercentForRatios(1, 1)).toBe(RUNNER_LEFT_PERCENT);
    expect(opponentLeftPercentForRatios(1, 1)).toBe(OPPONENT_LEFT_PERCENT);
  });

  it('勝ちが見えると、ボスは下がり自キャラは前に出て、中間地点で重なる', () => {
    expect(runnerLeftPercentForRatios(0.8, 0)).toBeCloseTo(MEET_LEFT_PERCENT);
    expect(opponentLeftPercentForRatios(0.8, 0)).toBeCloseTo(MEET_LEFT_PERCENT);

    // 途中の段階でも、自キャラは右へ(定位置より前)、ボスは左へ(定位置より手前)動いている
    expect(runnerLeftPercentForRatios(1, 0.2)).toBeGreaterThan(RUNNER_LEFT_PERCENT);
    expect(opponentLeftPercentForRatios(1, 0.2)).toBeLessThan(OPPONENT_LEFT_PERCENT);
  });

  it('自キャラの移動が、定位置〜中間地点の範囲を外れない', () => {
    for (const me of [0, 0.3, 0.7, 1]) {
      for (const opponent of [0, 0.25, 0.5, 0.75, 1]) {
        const runner = runnerLeftPercentForRatios(me, opponent);
        expect(runner).toBeGreaterThanOrEqual(RUNNER_LEFT_PERCENT);
        expect(runner).toBeLessThanOrEqual(MEET_LEFT_PERCENT);
      }
    }
  });

  it('劣勢になると、二人とも定位置へ戻る', () => {
    expect(runnerLeftPercentForRatios(0.1, 0.9)).toBe(RUNNER_LEFT_PERCENT);
    expect(opponentLeftPercentForRatios(0.1, 0.9)).toBe(OPPONENT_LEFT_PERCENT);
  });
});

describe('jumpLayoutForTimeline', () => {
  const trained = { ...baseStats(), stamina: 16, guts: 12, speed: 16, technique: 12, damage: 12 };
  const timeline = simulateBattle(selfCombatantProfile(trained, 2), bossCombatantProfile(5));
  const layout = jumpLayoutForTimeline(timeline);

  it('障害物の数だけ、ボスと自キャラの位置が返る', () => {
    expect(layout.opponentLeftPercentAtJump).toHaveLength(timeline.obstacleTimesMs.length);
    expect(layout.runnerLeftPercentAtJump).toHaveLength(timeline.obstacleTimesMs.length);
  });

  it('自キャラの位置は定位置〜中間地点の範囲に収まる', () => {
    for (const left of layout.runnerLeftPercentAtJump) {
      expect(left).toBeGreaterThanOrEqual(RUNNER_LEFT_PERCENT);
      expect(left).toBeLessThanOrEqual(MEET_LEFT_PERCENT);
    }
  });

  it('自キャラが前に出るほど、障害物が届くのが早くなる(届く時刻の計算が位置に追従している)', () => {
    expect(obstacleTravelMsTo(MEET_LEFT_PERCENT)).toBeLessThan(obstacleTravelMsTo(RUNNER_LEFT_PERCENT));
  });

  it('序盤の障害物では、まだほとんど動いていない(定位置に近い)', () => {
    // 育成前のステータスでステージ1のボスと戦うと、最初の障害物(500m=2500ms)の時点では
    // どちらもまだ半分以上スタミナが残っていて、ほぼ定位置のまま。
    const early = jumpLayoutForTimeline(
      simulateBattle(selfCombatantProfile(baseStats(), 2), bossCombatantProfile(1))
    );
    expect(early.runnerLeftPercentAtJump[0] - RUNNER_LEFT_PERCENT).toBeLessThan(2);
    expect(OPPONENT_LEFT_PERCENT - early.opponentLeftPercentAtJump[0]).toBeLessThan(2);
  });
});
