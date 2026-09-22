import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  ratio: number; // 0..1
  color?: string;
  /** 指定すると単色の代わりに左→右のグラデーションで塗る(プロトタイプのゲージ表現)。 */
  gradient?: [string, string];
  height?: number;
  /** 値が変わったときのアニメーション時間。バトル中の細かい更新では短めにするとよい。 */
  animationMs?: number;
  /** 全力疾走中の明滅グロー(仕様書1章: 0.6秒周期でbrightness 1→1.6→1)。 */
  glowing?: boolean;
}

// 通常のプログレスバー/ザコ進捗ゲージ: 「耳アド UI手触り仕様書」1章「0.35秒, ease」。
const DEFAULT_ANIMATION_MS = 350;
const GLOW_PERIOD_MS = 600;

export function GaugeBar({
  ratio,
  color = colors.primary,
  gradient,
  height = 14,
  animationMs = DEFAULT_ANIMATION_MS,
  glowing = false,
}: Props) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const [anim] = useState(() => new Animated.Value(clamped * 100));
  const [glow] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped * 100,
      duration: animationMs,
      easing: Easing.ease,
      useNativeDriver: false, // widthはネイティブドライバー非対応
    }).start();
  }, [clamped, animationMs, anim]);

  useEffect(() => {
    if (!glowing) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: GLOW_PERIOD_MS / 2, easing: Easing.ease, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: GLOW_PERIOD_MS / 2, easing: Easing.ease, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowing, glow]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
  const brightness = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fillWrapper,
          { width, borderRadius: height / 2 },
          glowing && {
            opacity: brightness,
            shadowColor: color,
            shadowOpacity,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
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
