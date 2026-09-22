import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  text: string;
  onDone: () => void;
}

const DURATION_MS = 900;

/**
 * 「耳アド UI手触り仕様書」0-2章: ザコ追い抜き時のptは、トラック中央に大きく出す
 * トーストではなく、キャラの頭上に小さく浮かぶポップテキスト(15px程度、0.9秒で
 * フェードアウトしながら上に移動)。表示位置は呼び出し側(MainScreen)が
 * 自キャラの位置に合わせて配置する。
 */
export function FloatingPoint({ text, onDone }: Props) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -24] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.Text style={[styles.text, { transform: [{ translateY }], opacity }]}>{text}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.mint,
    fontSize: 15,
    fontWeight: '800',
  },
});
