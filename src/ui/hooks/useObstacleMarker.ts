import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// 「ジャンプする理由」が画面に見えるよう、跳ぶ地点の少し右に小さな障害物を出し、
// 右から近づいてきて足元を通り過ぎ、左へ抜けていく短いアニメーションを再生する。
// useObstacleJump(RunnerAvatar/OpponentEntityの縦ジャンプ)と同じjumpTimesMsを渡して使う。
const MARKER_LEAD_MS = 550;
const MARKER_VISIBLE_MS = 750;

export function useObstacleMarker(elapsedMs: number, jumpTimesMs: number[]) {
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
    while (idxRef.current < jumpTimesMs.length && jumpTimesMs[idxRef.current] - MARKER_LEAD_MS <= elapsedMs) {
      idxRef.current += 1;
      anim.stopAnimation();
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: MARKER_VISIBLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, jumpTimesKey]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [26, -26] });
  const opacity = anim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });
  return { translateX, opacity };
}
