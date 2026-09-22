import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions } from 'react-native';

interface Props {
  label?: string;
  /** 帯が右から左へ画面を覆い切るまでの時間。仕様書6章: 0.4秒。 */
  durationMs?: number;
  /**
   * true: 覆い切った後も止まらず、そのまま左へ抜けきるまで続ける単発のワイプにする
   * (仕様書6章「黒い帯が右から左へ高速で画面を横切るワイプ」)。純粋な状態切り替え用の
   * 一瞬のワイプに使う。false(既定): 覆い切ったところで止まり、呼び出し側が
   * (WINなどのラベルを見せてから)明示的にアンマウントするまで保持する。
   */
  exitAfterCovered?: boolean;
  /** 画面が完全に覆われた瞬間(約190ms後)に呼ばれる。裏側の状態切り替えはここで行う。 */
  onCovered?: () => void;
  /** exitAfterCovered時は左へ抜けきった瞬間、そうでなければ覆い切った瞬間に呼ばれる。 */
  onDone?: () => void;
}

const DEFAULT_DURATION_MS = 400;
// 覆い切るタイミングの割合(仕様書6章: 0.4秒中、約190ms後に覆い切る)。
const COVERED_AT_RATIO = 190 / 400;

/**
 * 「耳アド UI手触り仕様書」6章の画面ワイプ。黒い帯が右から左へ高速でスライドしてくる
 * (単純なopacityフェードではなく、方向性のあるワイプにする)。
 */
export function BlackFade({ label, durationMs = DEFAULT_DURATION_MS, exitAfterCovered = false, onCovered, onDone }: Props) {
  const { width } = useWindowDimensions();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const coveredAtMs = Math.round(durationMs * COVERED_AT_RATIO);
    const coveredTimer = exitAfterCovered ? setTimeout(() => onCovered?.(), coveredAtMs) : null;

    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: durationMs,
      easing: exitAfterCovered ? Easing.linear : Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      if (exitAfterCovered) {
        onDone?.();
      } else {
        // 覆い切った瞬間(=このアニメーションの終端)がonCovered/onDone両方を兼ねる。
        onCovered?.();
        onDone?.();
      }
    });
    return () => {
      animation.stop();
      if (coveredTimer) clearTimeout(coveredTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = exitAfterCovered
    ? anim.interpolate({ inputRange: [0, COVERED_AT_RATIO, 1], outputRange: [width, 0, -width] })
    : anim.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });

  return (
    <Animated.View style={[styles.fade, { transform: [{ translateX }] }]}>
      {label && <Text style={styles.label}>{label}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#fff', fontSize: 22, fontWeight: '800' },
});
