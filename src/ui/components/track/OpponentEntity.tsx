import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

interface Props {
  label: string;
  color?: string;
  /**
   * true: 右からスライドインして定位置(トラック幅の78%)に止まる(仕様書6章、ボス出現時)。
   * false: 最初から定位置に表示済み(バトル開始時、ワイプの裏で既に配置済みの想定)。
   */
  slideIn: boolean;
  /** trueにすると、敗北時の演出として右へ加速しながら退場する(仕様書6章)。 */
  exit?: boolean;
  /** バトル中の障害物ジャンプ(useObstacleJump)。通常時は指定しない。 */
  jump?: Animated.AnimatedInterpolation<number>;
}

const SETTLE_LEFT_PERCENT = 78;
const EXIT_LEFT_PERCENT = 140;
const SLIDE_IN_MS = 1100;
const EXIT_MS = 450;

/** ボス/VS対戦相手の共通表示。「耳アド UI手触り仕様書」6章のボス出現スライドイン・敗北退場。 */
export function OpponentEntity({ label, color = '#ff9d3d', slideIn, exit = false, jump }: Props) {
  // anim: 0=画面右外、1=定位置(78%)、2=退場しきった状態(140%)。
  const [anim] = useState(() => new Animated.Value(slideIn ? 0 : 1));
  const [zero] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!slideIn) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: SLIDE_IN_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // leftはネイティブドライバー非対応
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!exit) return;
    Animated.timing(anim, {
      toValue: 2,
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic), // 加速して退場
      useNativeDriver: false,
    }).start();
  }, [exit, anim]);

  const left = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['100%', `${SETTLE_LEFT_PERCENT}%`, `${EXIT_LEFT_PERCENT}%`],
  });
  const translateY = jump ?? zero;

  return (
    <Animated.View style={[styles.wrap, { left }]} pointerEvents="none">
      {/* 名前ラベルとアバターをまとめてtranslateYさせる。ジャンプ中もラベルが
          アバターに追従しないと、名前だけ取り残されて障害物が名前の位置を
          素通りしているように見えてしまうため。 */}
      <Animated.View style={[styles.body, { transform: [{ translateY }] }]}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.avatar, { backgroundColor: color }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 地面ライン(TrackBackgroundのgroundLayer)と同じbottom:10%を使うことで、
  // トラックの高さが変わっても常にアバターの足元が地面に一致する
  // (bodyがこのwrap内の唯一の子で、アバターが列の最後の要素なので、
  // wrapのbottomがそのままアバターのbottomになる)。
  wrap: { position: 'absolute', bottom: '10%', width: 90, marginLeft: -45 },
  body: { alignItems: 'center', gap: 6 },
  avatar: { width: 56, height: 56, borderRadius: 16 },
  label: { color: colors.subtext, fontSize: 11 },
});
