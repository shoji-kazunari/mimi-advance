import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * 「耳アド UI手触り仕様書」7章。地面(手前のレーン線)と遠景(奥の模様)を別レイヤーでスクロールする。
 * 地面の方が体感2倍以上速い。
 *
 * Web: RN Animated(Animated.loop + useNativeDriver:true)で作ったところ、地面の0.15秒という
 * 極端に短いループで完全に静止してしまった。実測すると transform が最終値
 * (translateX(-358px)相当)に固定されたまま動いておらず、`setValue(0)`で0に戻してから
 * 即座に次のtiming().start()を呼ぶ「同一フレーム内でのリセット→再開」を、ブラウザの
 * CSSトランジション(RN Web の useNativeDriver はCSS transitionとして実装される)が
 * 検知できず、トランジション自体が無効化されてしまうため(反映されるのは最終値のみ)。
 * この問題を避けるため、Web版だけは生のCSS @keyframes を直接注入して動かす
 * (RN Animatedを経由しない。webTouchFix.tsと同じ「必要な箇所だけ生CSSを流し込む」手法)。
 */
function ensureScrollKeyframes() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('mimi-track-scroll-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'mimi-track-scroll-keyframes';
  style.textContent = `
    @keyframes mimi-track-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
  `;
  document.head.appendChild(style);
}

function webScrollStyle(periodMs: number): StyleProp<ViewStyle> {
  return {
    animationName: 'mimi-track-scroll',
    animationDuration: `${periodMs}ms`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  } as unknown as StyleProp<ViewStyle>;
}

/** ネイティブ(iOS/Android)向けのフォールバック。RN Animatedのleft(%指定)をJS駆動で回す。 */
function useNativeScrollLoop(periodMs: number) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, periodMs]);
  return anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '-50%'] });
}

const GROUND_LOOP_MS = 150;
const FAR_LOOP_MS = 10000;
const IS_WEB = Platform.OS === 'web';

// AI下絵(シームレスにタイル可能な横長画像)。resizeMode="repeat"で、パターン1つ分の
// 幅(=画面の実横幅、200%レイヤーの50%)いっぱいに自然なタイルサイズで繰り返し描画する。
const FAR_IMAGE = require('../../../../assets/backgrounds/far.png');
const GROUND_IMAGE = require('../../../../assets/backgrounds/ground.png');

export function TrackBackground() {
  ensureScrollKeyframes();
  // ネイティブ用フックは条件分岐なしで常に呼ぶ(未使用でも無害、フック順序を保つため)。
  const nativeGroundLeft = useNativeScrollLoop(GROUND_LOOP_MS);
  const nativeFarLeft = useNativeScrollLoop(FAR_LOOP_MS);

  const farAnimatedStyle = IS_WEB ? webScrollStyle(FAR_LOOP_MS) : { left: nativeFarLeft };
  const groundAnimatedStyle = IS_WEB ? webScrollStyle(GROUND_LOOP_MS) : { left: nativeGroundLeft };
  const Layer = IS_WEB ? View : Animated.View;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Layer style={[styles.farLayer, farAnimatedStyle]}>
        {[0, 1].map((set) => (
          <Image key={set} source={FAR_IMAGE} resizeMode="repeat" style={styles.patternImage} />
        ))}
      </Layer>
      <Layer style={[styles.groundLayer, groundAnimatedStyle]}>
        {[0, 1].map((set) => (
          <Image key={set} source={GROUND_IMAGE} resizeMode="repeat" style={styles.patternImage} />
        ))}
      </Layer>
    </View>
  );
}

const styles = StyleSheet.create({
  // プレースホルダー時代の24px/4pxでは実素材を入れる余地が無かったため、絵に合わせて広げた。
  // 「思ったより遠い」というフィードバックを受けて、さらに拡大・不透明度を上げて近さを出した。
  farLayer: {
    position: 'absolute',
    top: '4%',
    width: '200%',
    height: 120,
    flexDirection: 'row',
    opacity: 0.65,
  },
  groundLayer: {
    position: 'absolute',
    bottom: '10%',
    width: '200%',
    height: 66,
    flexDirection: 'row',
  },
  patternImage: {
    width: '50%',
    height: '100%',
  },
});
