import { Animated, StyleSheet } from 'react-native';
import { useObstacleMarker } from '../../hooks/useObstacleMarker';
import { colors } from '../../theme';

interface Props {
  elapsedMs: number;
  jumpTimesMs: number[];
  /** キャラの位置(left指定と同じ値、marginLeftも合わせる)。 */
  leftPercent: number;
}

/**
 * ジャンプの理由が画面上でわかるよう、跳ぶタイミングに合わせて足元の右から
 * 小さな障害物が近づいてきて通り過ぎる演出。useObstacleJump(縦ジャンプ)と
 * 同じjumpTimesMsを渡すことで、ジャンプの頂点と障害物の通過タイミングを揃えている。
 */
export function ObstacleMarker({ elapsedMs, jumpTimesMs, leftPercent }: Props) {
  const { translateX, opacity } = useObstacleMarker(elapsedMs, jumpTimesMs);

  return (
    <Animated.View
      style={[styles.marker, { left: `${leftPercent}%`, opacity, transform: [{ translateX }] }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    bottom: '11%',
    width: 12,
    height: 16,
    marginLeft: -6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
});
