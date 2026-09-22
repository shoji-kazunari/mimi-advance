import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions } from 'react-native';

interface Props {
  label?: string;
  /** 帯が右から左へ画面を覆い切るまでの時間。仕様書6章: 0.4秒。 */
  durationMs?: number;
  onDone?: () => void;
}

const DEFAULT_DURATION_MS = 400;

/**
 * 「耳アド UI手触り仕様書」6章の画面ワイプ。黒い帯が右から左へ高速でスライドしてきて
 * 画面全体を覆う(単純なopacityフェードではなく、方向性のあるワイプにする)。
 * 覆い切った後はそのまま保持する(呼び出し側がlabelを見せてから明示的にアンマウントする)。
 */
export function BlackFade({ label, durationMs = DEFAULT_DURATION_MS, onDone }: Props) {
  const { width } = useWindowDimensions();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDone?.();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [width, 0] });

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
