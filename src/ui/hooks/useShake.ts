import { useState } from 'react';
import { Animated, Easing } from 'react-native';

const SHAKE_MS = 300;
const SHAKE_PX = 5;

/**
 * 「耳アド UI手触り仕様書」6章: アタック発動時の画面シェイク(±5px、0.3秒)。
 * trigger()を呼ぶたびに左右に揺れて中央へ戻る。transformにそのまま渡せるAnimated.Valueを返す。
 */
export function useShake() {
  const [shake] = useState(() => new Animated.Value(0));

  const trigger = () => {
    shake.stopAnimation();
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -1, duration: SHAKE_MS / 6, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: SHAKE_MS / 3, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: SHAKE_MS / 3, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: SHAKE_MS / 6, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-SHAKE_PX, SHAKE_PX] });

  return { translateX, trigger };
}
