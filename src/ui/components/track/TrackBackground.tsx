import { useEffect, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

/**
 * 「耳アド UI手触り仕様書」7章。地面(手前のレーン線)と遠景(奥の模様)を別レイヤーでスクロールする。
 * 地面の方が体感2倍以上速い。
 *
 * `left`(%指定)をJS駆動(useNativeDriver:false)でアニメーションしていた最初の実装は、
 * 特に地面の0.15秒という高速ループでJSブリッジの更新が追いつかずガクつき、
 * 逆再生しているように見えてしまっていた。実際の幅をonLayoutで測って、
 * transform: translateX(px指定)をuseNativeDriver:trueで動かす形に変更し、
 * ネイティブ(GPU合成)側で滑らかに動くようにしている。
 */
function useScrollLoop(periodMs: number, widthPx: number) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (widthPx <= 0) return;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, periodMs, widthPx]);
  return anim.interpolate({ inputRange: [0, 1], outputRange: [0, -widthPx] });
}

const GROUND_LOOP_MS = 150;
const FAR_LOOP_MS = 10000;

const GROUND_DASHES = Array.from({ length: 24 }, (_, i) => i);
const FAR_BLOBS = Array.from({ length: 10 }, (_, i) => i);

export function TrackBackground() {
  const [width, setWidth] = useState(0);
  const groundX = useScrollLoop(GROUND_LOOP_MS, width);
  const farX = useScrollLoop(FAR_LOOP_MS, width);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <Animated.View style={[styles.farLayer, { width: width * 2, transform: [{ translateX: farX }] }]}>
        {[0, 1].map((set) => (
          <View key={set} style={styles.patternSet}>
            {FAR_BLOBS.map((i) => (
              <View key={i} style={styles.farBlob} />
            ))}
          </View>
        ))}
      </Animated.View>
      <Animated.View style={[styles.groundLayer, { width: width * 2, transform: [{ translateX: groundX }] }]}>
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
