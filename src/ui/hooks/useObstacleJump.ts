import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// 「耳アド UI手触り仕様書」5章: 縦に-34px跳ねる、1.05秒(頂点は40%地点)。
// 障害物が実際にそこへ到達する瞬間とズレないよう0.4秒早めに開始する。
const JUMP_HEIGHT = 34;
const JUMP_DURATION_MS = 1050;
const JUMP_APEX_RATIO = 0.4;
const JUMP_LEAD_MS = 400;

/**
 * バトルタイムライン上の障害物発生時刻(jumpTimesMs, 例: timeline.obstacleTimesMs)を、
 * 再生カーソル(elapsedMs)が通過するたびにジャンプのキーフレームを1回再生する。
 * 自キャラ・ボス双方の見た目に同じ仕組みを使う。
 */
export function useObstacleJump(elapsedMs: number, jumpTimesMs: number[]) {
  const [anim] = useState(() => new Animated.Value(0));
  const idxRef = useRef(0);
  const jumpTimesKey = jumpTimesMs.join(',');

  useEffect(() => {
    idxRef.current = 0;
    anim.stopAnimation();
    anim.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTimesKey]);

  useEffect(() => {
    while (idxRef.current < jumpTimesMs.length && jumpTimesMs[idxRef.current] - JUMP_LEAD_MS <= elapsedMs) {
      idxRef.current += 1;
      anim.stopAnimation();
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: Math.round(JUMP_DURATION_MS * JUMP_APEX_RATIO),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: Math.round(JUMP_DURATION_MS * (1 - JUMP_APEX_RATIO)),
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, jumpTimesKey]);

  return anim.interpolate({ inputRange: [0, 1], outputRange: [0, -JUMP_HEIGHT] });
}
