import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  color?: string;
  /** 値が変わるたびに強化エフェクト(金色の光の輪+スパークル)を1回再生する。 */
  burstTrigger?: number;
  /** バトル中の障害物ジャンプ(useObstacleJump)。通常時は指定しない。 */
  jump?: Animated.AnimatedInterpolation<number>;
}

const BOB_PERIOD_MS = 320;

/**
 * 「耳アド UI手触り仕様書」5章のキャラモーション。
 * 通常時は常に小さく上下にバウンド(0.32秒周期)。強化した瞬間はburstTriggerを
 * インクリメントしてもらうことで、金色の光の輪+5個のスパークルを1回だけ再生する。
 */
export function RunnerAvatar({ color = colors.accent, burstTrigger = 0, jump }: Props) {
  const [bob] = useState(() => new Animated.Value(0));
  const [zero] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: BOB_PERIOD_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: BOB_PERIOD_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const bobTranslateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const translateY = Animated.add(bobTranslateY, jump ?? zero);
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] });

  return (
    <View style={styles.wrap}>
      {burstTrigger > 0 && <LevelUpBurst key={burstTrigger} />}
      <Animated.View style={[styles.avatar, { backgroundColor: color, transform: [{ translateY }, { rotate }] }]} />
    </View>
  );
}

const PARTICLE_COUNT = 5;

function LevelUpBurst() {
  const [ring] = useState(() => new Animated.Value(0));
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 18 + Math.random() * 14,
      anim: new Animated.Value(0),
    }))
  );

  useEffect(() => {
    Animated.timing(ring, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    particles.forEach((p) => {
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringOpacity = ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  const ringScale = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 1.4] });

  return (
    <View style={styles.burstWrap} pointerEvents="none">
      <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      {particles.map((p, i) => {
        const tx = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={[styles.particle, { opacity, transform: [{ translateX: tx }, { translateY: ty }] }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 40, height: 56, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 56, borderRadius: 20 },
  burstWrap: {
    position: 'absolute',
    width: 40,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.gold,
  },
  particle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
});
