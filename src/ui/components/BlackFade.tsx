import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface Props {
  label?: string;
  durationMs?: number;
  onDone?: () => void;
}

/** 全画面を覆う黒フェード。仕様書5-6章の「黒フェードで通常表示に復帰」演出用。 */
export function BlackFade({ label, durationMs = 400, onDone }: Props) {
  // レンダー中にref.currentを読まない(react-hooks/refs)ため、useState の遅延初期化で持つ。
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDone?.();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.fade, { opacity }]}>
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
