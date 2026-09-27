import {
  isPlausibleStage,
  isPlausibleTotalLevel,
  isPlausibleWeeklyPt,
  vsWinRate,
  VS_WIN_RATE_MIN_ATTEMPTS,
  weekKey,
  resetWeeklyProgressIfNewWeek,
  initialWeeklyProgress,
} from '../ranking';

describe('isPlausibleStage / isPlausibleTotalLevel / isPlausibleWeeklyPt', () => {
  it('正常な範囲はtrue', () => {
    expect(isPlausibleStage(1)).toBe(true);
    expect(isPlausibleTotalLevel(0)).toBe(true);
    expect(isPlausibleWeeklyPt(0)).toBe(true);
  });

  it('明らかに異常な値はfalse', () => {
    expect(isPlausibleStage(0)).toBe(false);
    expect(isPlausibleStage(1e9)).toBe(false);
    expect(isPlausibleStage(NaN)).toBe(false);
    expect(isPlausibleTotalLevel(-1)).toBe(false);
    expect(isPlausibleWeeklyPt(-1)).toBe(false);
  });
});

describe('vsWinRate', () => {
  it('規定戦数未満はnull(1戦1勝のような外れ値を排除)', () => {
    expect(vsWinRate(1, 1)).toBeNull();
    expect(vsWinRate(19, 19)).toBeNull();
  });

  it('規定戦数以上なら勝率を返す', () => {
    expect(vsWinRate(10, VS_WIN_RATE_MIN_ATTEMPTS)).toBeCloseTo(0.5);
    expect(vsWinRate(0, VS_WIN_RATE_MIN_ATTEMPTS)).toBe(0);
  });
});

describe('weekKey', () => {
  it('同じ週内(月〜日)は同じキーになる', () => {
    // 2026-09-28は月曜、2026-10-04は日曜(同じISO週)
    const monday = weekKey(new Date(Date.UTC(2026, 8, 28)));
    const sunday = weekKey(new Date(Date.UTC(2026, 9, 4)));
    expect(monday).toBe(sunday);
  });

  it('週が変わるとキーも変わる', () => {
    const thisWeek = weekKey(new Date(Date.UTC(2026, 8, 28)));
    const nextWeek = weekKey(new Date(Date.UTC(2026, 9, 5)));
    expect(thisWeek).not.toBe(nextWeek);
  });

  it('年をまたぐ1月1日近辺でも正しいISO週になる(2025-01-01は2025-W01の水曜)', () => {
    expect(weekKey(new Date(Date.UTC(2025, 0, 1)))).toBe('2025-W01');
  });
});

describe('resetWeeklyProgressIfNewWeek', () => {
  it('同じ週なら変化しない', () => {
    const now = new Date(Date.UTC(2026, 8, 28));
    const progress = { weekKey: weekKey(now), earnedPt: 500 };
    expect(resetWeeklyProgressIfNewWeek(progress, now)).toEqual(progress);
  });

  it('週が変わっていたら0にリセットする(長期プレイヤーが積み上げ続けられないように)', () => {
    const lastWeek = { weekKey: weekKey(new Date(Date.UTC(2026, 8, 28))), earnedPt: 99999 };
    const result = resetWeeklyProgressIfNewWeek(lastWeek, new Date(Date.UTC(2026, 9, 5)));
    expect(result.earnedPt).toBe(0);
    expect(result.weekKey).not.toBe(lastWeek.weekKey);
  });
});

describe('initialWeeklyProgress', () => {
  it('現在時刻の週キーでearnedPt=0を返す', () => {
    const now = new Date(Date.UTC(2026, 8, 28));
    expect(initialWeeklyProgress(now)).toEqual({ weekKey: weekKey(now), earnedPt: 0 });
  });
});
