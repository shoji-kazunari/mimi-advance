import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  ratio: number; // 0..1
  color?: string;
  /** 指定すると単色の代わりに左→右のグラデーションで塗る(プロトタイプのゲージ表現)。 */
  gradient?: [string, string];
  height?: number;
  /** 値が変わったときのアニメーション時間。バトル中の細かい更新では短めにするとよい。 */
  animationMs?: number;
}

export function GaugeBar({ ratio, color = colors.primary, gradient, height = 14, animationMs = 280 }: Props) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const [anim] = useState(() => new Animated.Value(clamped * 100));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped * 100,
      duration: animationMs,
      useNativeDriver: false, // widthはネイティブドライバー非対応
    }).start();
  }, [clamped, animationMs, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fillWrapper, { width, borderRadius: height / 2 }]}>
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        ) : (
          <View style={[styles.fill, { backgroundColor: color }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.cardInset,
    overflow: 'hidden',
  },
  fillWrapper: {
    height: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    width: '100%',
  },
});
