import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleTimeline, CombatantProfile, simulateBattle, staminaAtTime } from '../../domain/battle';

/**
 * 開始時に全結果を計算済みのタイムライン(simulateBattle)を、実時間で少しずつ再生する。
 * ボス戦(メイン画面のパネル内で完結)・VSレース(全画面演出)の両方から共通で使う。
 *
 * 「耳アド UI手触り仕様書」1章: バトル中のスタミナゲージはCSSトランジションではなく
 * requestAnimationFrameで毎フレーム値を補間する(固定tickのsetIntervalだとガクつく)。
 */
interface AttackHandlers {
  /** 自分のアタックが発動した(相手のスタミナを削った)瞬間に呼ばれる。 */
  onMyAttack?: () => void;
  /** 相手のアタックが発動した(自分のスタミナを削られた)瞬間に呼ばれる。 */
  onOpponentAttack?: () => void;
  /** falseの間は再生を開始しない(呼び出し元がまだバトル画面に入っていない場合など)。 */
  active?: boolean;
}

export function useBattlePlayback(
  me: CombatantProfile,
  opponent: CombatantProfile,
  { onMyAttack, onOpponentAttack, active = true }: AttackHandlers = {}
) {
  const timeline: BattleTimeline = useMemo(() => simulateBattle(me, opponent), [me, opponent]);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const startAtRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const attackIdxRef = useRef(0);
  const onMyAttackRef = useRef(onMyAttack);
  const onOpponentAttackRef = useRef(onOpponentAttack);
  useEffect(() => {
    onMyAttackRef.current = onMyAttack;
    onOpponentAttackRef.current = onOpponentAttack;
  });

  // タイムラインが変わったら(新しいバトルが始まったら)アタック検知のカーソルもリセットする。
  useEffect(() => {
    attackIdxRef.current = 0;
  }, [timeline]);

  // 「耳アド UI手触り仕様書」6章: アタック発動の瞬間にシェイク等の演出を出すため、
  // 再生カーソル(elapsed)がタイムライン上のアタック発生時刻を通過した瞬間を検知する。
  useEffect(() => {
    while (attackIdxRef.current < timeline.attackTimesMs.length && timeline.attackTimesMs[attackIdxRef.current] <= elapsed) {
      if (me.attackUnlocked) onMyAttackRef.current?.();
      if (opponent.attackUnlocked) onOpponentAttackRef.current?.();
      attackIdxRef.current += 1;
    }
  }, [elapsed, timeline, me.attackUnlocked, opponent.attackUnlocked]);

  useEffect(() => {
    if (!active) return;
    startAtRef.current = null;

    const tick = (now: number) => {
      if (startAtRef.current === null) startAtRef.current = now;
      const next = now - startAtRef.current;
      if (next >= timeline.outcome.endedAtMs) {
        setElapsed(timeline.outcome.endedAtMs);
        setFinished(true);
        rafIdRef.current = null;
        return;
      }
      setElapsed(next);
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [timeline, active]);

  const skip = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setElapsed(timeline.outcome.endedAtMs);
    setFinished(true);
  };

  const frame = staminaAtTime(timeline, elapsed);
  const sprinting = elapsed < me.sprintDurationMs;
  const won = timeline.outcome.winner === 'me';

  return { timeline, frame, elapsed, finished, skip, sprinting, won };
}
