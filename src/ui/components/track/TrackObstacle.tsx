import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface Props {
  /** 画面外まで抜けきって消えるタイミングで呼ばれる(呼び出し側でリストから外す)。 */
  onExit: () => void;
}

// ザコと同じく右から左へトラック全体を横切る。自キャラ・ボスはこの障害物が
// それぞれの位置(TrackSceneのOPPONENT_LEFT_PERCENT→RUNNER_LEFT_PERCENT)を
// 通過するタイミングに合わせてジャンプする(useObstacleJump側でスケジュールをずらして対応)。
export const OBSTACLE_START_PERCENT = 100;
export const OBSTACLE_END_PERCENT = -15;
export const OBSTACLE_TRAVEL_MS = 1600;

/** 障害物が画面右端(OBSTACLE_START_PERCENT)から指定の左位置(%)へ到達するまでの所要時間。 */
export function obstacleTravelMsTo(leftPercent: number): number {
  const span = OBSTACLE_START_PERCENT - OBSTACLE_END_PERCENT;
  return ((OBSTACLE_START_PERCENT - leftPercent) / span) * OBSTACLE_TRAVEL_MS;
}

/** バトル中、ジャンプの理由になる障害物本体。右から出て左へ抜けていく。 */
export function TrackObstacle({ onExit }: Props) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: OBSTACLE_TRAVEL_MS,
      easing: Easing.linear,
      useNativeDriver: false, // leftはネイティブドライバー非対応
    });
    animation.start(({ finished }) => {
      if (finished) onExit();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${OBSTACLE_START_PERCENT}%`, `${OBSTACLE_END_PERCENT}%`],
  });

  return <Animated.View style={[styles.obstacle, { left }]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  obstacle: {
    position: 'absolute',
    bottom: '11%',
    width: 12,
    height: 16,
    marginLeft: -6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
});
