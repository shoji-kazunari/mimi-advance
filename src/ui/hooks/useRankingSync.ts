import { useEffect, useRef } from 'react';
import { totalLevel } from '../../domain/stats';
import { weekKey } from '../../domain/ranking';
import { ensureSignedIn } from '../../firebase/auth';
import { submitPlayerStats, submitWeeklyScore } from '../../firebase/ranking';
import { useGameStore } from '../../state/gameStore';

const SYNC_INTERVAL_MS = 30_000;

/**
 * ランキング用のスコアをFirestoreへ定期的に送る。ゲーム自体の動作には一切影響しない
 * (送信に失敗しても握りつぶすだけで、UI・状態には何もフィードバックしない)。
 * App.tsxのRootで一度だけ呼ぶ想定。
 */
export function useRankingSync(): void {
  const state = useGameStore((s) => s.state);
  const hydrated = useGameStore((s) => s.hydrated);
  const lastSyncedAt = useRef(0);

  useEffect(() => {
    if (!hydrated) return;
    const now = Date.now();
    if (now - lastSyncedAt.current < SYNC_INTERVAL_MS) return;
    lastSyncedAt.current = now;

    const maxStage = Math.max(1, ...state.characters.map((c) => c.stage));
    const level = totalLevel(state.characters, state.activeCharacterId);
    const vsWins = state.vsRaceWins ?? 0;
    const vsAttempts = state.vsRaceAttempts ?? 0;
    const weekly = state.weeklyProgress;

    void ensureSignedIn()
      .then((uid) => {
        void submitPlayerStats(uid, {
          username: state.username,
          stage: maxStage,
          totalLevel: level,
          vsWins,
          vsAttempts,
        });
        if (weekly) {
          void submitWeeklyScore(uid, weekKey(new Date()), {
            username: state.username,
            earnedPt: weekly.earnedPt,
          });
        }
      })
      .catch(() => {
        // オフライン・匿名認証未有効などで失敗しても、ゲーム進行には影響させない
      });
  }, [hydrated, state]);
}
