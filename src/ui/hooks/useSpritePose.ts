import { useEffect, useRef, useState } from 'react';

const RUN_FRAME_MS = 160;
// 走り1→2→3→2→(繰り返し)のピンポン。3枚の絵だけで自然な往復の走行ループにする。
const RUN_SEQUENCE = [0, 1, 2, 1] as const;

// useObstacleJumpと同じジャンプの尺(仕様書5章)。
const JUMP_DURATION_MS = 1050;
const JUMP_LEAD_MS = 400;
const ATTACK_DURATION_MS = 700;
const ATTACK_LEAD_MS = 200;

export type SpritePhase = 'run' | 'jump' | 'attack';

interface ActiveEvent {
  phase: 'jump' | 'attack';
  startMs: number;
  durationMs: number;
}

/**
 * 走り(3枚をピンポンでループ)・ジャンプ(3枚を跳躍に合わせて)・アタック(3枚を発動に
 * 合わせて)のうち、今どのフレームを表示すべきかを返す。ジャンプ・アタックは
 * useObstacleJumpと同じ「elapsedMsがスケジュール表の時刻をリード時間分早く通過したら
 * 1回だけ再生する」方式。jumpTimesMs/attackTimesMsが空の間は常にrunを返す
 * (アイドル中のループ走行にそのまま使える)。
 */
export function useSpritePose(
  elapsedMs: number,
  jumpTimesMs: number[],
  attackTimesMs: number[],
  /**
   * trueの間は、ジャンプ/アタックの途中であっても常に走りループを返す。
   * 勝敗後の退場演出はバトルのelapsedMsが決着時刻で止まったままスライドするため、
   * ちょうどジャンプの着地フレームで決着すると、退場中ずっとそのまま固まって見える
   * (仕様書6章の退場は「走って去る」動きのはずなので、そこだけ強制的に上書きする)。
   */
  forceRun = false
) {
  const [runTick, setRunTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRunTick((t) => (t + 1) % RUN_SEQUENCE.length), RUN_FRAME_MS);
    return () => clearInterval(id);
  }, []);

  const jumpIdxRef = useRef(0);
  const attackIdxRef = useRef(0);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const jumpKey = jumpTimesMs.join(',');
  const attackKey = attackTimesMs.join(',');

  useEffect(() => {
    jumpIdxRef.current = 0;
  }, [jumpKey]);
  useEffect(() => {
    attackIdxRef.current = 0;
  }, [attackKey]);

  useEffect(() => {
    while (jumpIdxRef.current < jumpTimesMs.length && jumpTimesMs[jumpIdxRef.current] - JUMP_LEAD_MS <= elapsedMs) {
      setActiveEvent({ phase: 'jump', startMs: jumpTimesMs[jumpIdxRef.current] - JUMP_LEAD_MS, durationMs: JUMP_DURATION_MS });
      jumpIdxRef.current += 1;
    }
    while (
      attackIdxRef.current < attackTimesMs.length &&
      attackTimesMs[attackIdxRef.current] - ATTACK_LEAD_MS <= elapsedMs
    ) {
      setActiveEvent({
        phase: 'attack',
        startMs: attackTimesMs[attackIdxRef.current] - ATTACK_LEAD_MS,
        durationMs: ATTACK_DURATION_MS,
      });
      attackIdxRef.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, jumpKey, attackKey]);

  if (!forceRun && activeEvent) {
    const t = elapsedMs - activeEvent.startMs;
    if (t >= 0 && t < activeEvent.durationMs) {
      const frameIndex = t < activeEvent.durationMs * 0.35 ? 0 : t < activeEvent.durationMs * 0.65 ? 1 : 2;
      return { phase: activeEvent.phase, frameIndex };
    }
  }
  return { phase: 'run' as const, frameIndex: RUN_SEQUENCE[runTick] };
}
