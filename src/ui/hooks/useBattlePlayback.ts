import { useEffect, useMemo, useState } from 'react';
import { BattleTimeline, CombatantProfile, simulateBattle, staminaAtTime } from '../../domain/battle';

const PLAYBACK_TICK_MS = 50;

/**
 * 開始時に全結果を計算済みのタイムライン(simulateBattle)を、実時間で少しずつ再生する。
 * ボス戦(メイン画面のパネル内で完結)・VSレース(全画面演出)の両方から共通で使う。
 */
export function useBattlePlayback(me: CombatantProfile, opponent: CombatantProfile) {
  const timeline: BattleTimeline = useMemo(() => simulateBattle(me, opponent), [me, opponent]);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + PLAYBACK_TICK_MS;
        if (next >= timeline.outcome.endedAtMs) {
          clearInterval(id);
          setFinished(true);
          return timeline.outcome.endedAtMs;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);
    return () => clearInterval(id);
  }, [timeline]);

  const skip = () => {
    setElapsed(timeline.outcome.endedAtMs);
    setFinished(true);
  };

  const frame = staminaAtTime(timeline, elapsed);
  const sprinting = elapsed < me.sprintDurationMs;
  const won = timeline.outcome.winner === 'me';

  return { timeline, frame, elapsed, finished, skip, sprinting, won };
}
