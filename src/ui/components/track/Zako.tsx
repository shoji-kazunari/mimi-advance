import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme';

interface Props {
  color: string;
  name: string;
  /** 画面を横切りきるまでの時間。 */
  travelMs?: number;
  /** 自キャラの位置(RUNNER_LEFT_PERCENT)を通過した瞬間に呼ばれる(追い抜き判定)。 */
  onPass: () => void;
  /** 画面外まで抜けきって消えるタイミングで呼ばれる(呼び出し側でリストから外す)。 */
  onExit: () => void;
}

const TRAVEL_MS = 1800;
const EXIT_LEFT_PERCENT = -15;
// RUNNER_LEFT_PERCENT(12%)を、100%→EXIT_LEFT_PERCENTの旅程のどの割合で通過するか。
const PASS_RATIO = (100 - 12) / (100 - EXIT_LEFT_PERCENT);

/**
 * 「耳アド UI手触り仕様書」0章: ザコは右から左へ流れて自キャラの位置で追い抜き判定→
 * そのまま画面外まで通過して消える(自キャラの位置で止まって消えない)。
 */
export function Zako({ color, name, travelMs = TRAVEL_MS, onPass, onExit }: Props) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const passTimer = setTimeout(onPass, travelMs * PASS_RATIO);
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: travelMs,
      easing: Easing.linear,
      useNativeDriver: false, // leftはネイティブドライバー非対応
    });
    animation.start(({ finished }) => {
      if (finished) onExit();
    });
    return () => {
      animation.stop();
      clearTimeout(passTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = anim.interpolate({ inputRange: [0, 1], outputRange: ['100%', `${EXIT_LEFT_PERCENT}%`] });

  return (
    <Animated.View style={[styles.wrap, { left }]} pointerEvents="none">
      <Animated.View style={[styles.avatar, { backgroundColor: color }]} />
      <Text style={styles.label} numberOfLines={1}>
        {name}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: '30%', alignItems: 'center', gap: 4, width: 70, marginLeft: -35 },
  avatar: { width: 28, height: 40, borderRadius: 14 },
  label: { color: colors.subtext, fontSize: 10 },
});
