import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

/**
 * 「耳アド UI手触り仕様書」7章。地面(手前のレーン線)と遠景(奥の模様)を別レイヤーでスクロールする。
 * 地面の方が体感2倍以上速い。実ピクセル幅を測らずに済むよう、パターンを横に2セット並べて
 * `left` を0%→-100%へ無限ループさせる(GaugeBarと同様、widthやleftのような%指定レイアウト
 * プロパティはuseNativeDriverが使えないため手動でこの1プロパティだけJS駆動にする)。
 */
function useScrollLoop(periodMs: number) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, periodMs]);
  return anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '-100%'] });
}

const GROUND_LOOP_MS = 150;
const FAR_LOOP_MS = 10000;

const GROUND_DASHES = Array.from({ length: 24 }, (_, i) => i);
const FAR_BLOBS = Array.from({ length: 10 }, (_, i) => i);

export function TrackBackground() {
  const groundLeft = useScrollLoop(GROUND_LOOP_MS);
  const farLeft = useScrollLoop(FAR_LOOP_MS);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.farLayer, { left: farLeft }]}>
        {[0, 1].map((set) => (
          <View key={set} style={styles.patternSet}>
            {FAR_BLOBS.map((i) => (
              <View key={i} style={styles.farBlob} />
            ))}
          </View>
        ))}
      </Animated.View>
      <Animated.View style={[styles.groundLayer, { left: groundLeft }]}>
        {[0, 1].map((set) => (
          <View key={set} style={styles.patternSet}>
            {GROUND_DASHES.map((i) => (
              <View key={i} style={styles.groundDash} />
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  farLayer: {
    position: 'absolute',
    top: '18%',
    width: '200%',
    height: 24,
    flexDirection: 'row',
    opacity: 0.4,
  },
  patternSet: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  farBlob: {
    width: 22,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  groundLayer: {
    position: 'absolute',
    bottom: '10%',
    width: '200%',
    height: 4,
    flexDirection: 'row',
  },
  groundDash: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
});
