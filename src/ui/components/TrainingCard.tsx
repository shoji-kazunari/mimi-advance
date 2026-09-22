import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useHoldRepeat } from '../hooks/useHoldRepeat';
import { colors } from '../theme';

interface Props {
  color: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  disabled: boolean;
  /**
   * ロック中かどうか(atCap/資金不足などの一時的なdisabledとは区別する)。
   * 仕様書3章: 「ロック中は上のLv.表示とボタン両方を暗くする」— 片方だけだと中途半端に見えるため。
   */
  locked?: boolean;
  onPress: () => void;
}

// タップ操作でのブラウザ標準の挙動(テキスト選択・長押しコールアウトメニュー)を止める。
// RNのスタイル型には無いプロパティなのでキャストする(RN Web/一部ネイティマイズで有効)。
const noTextSelect = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
} as unknown as StyleProp<ViewStyle>;

const SQUISH_MS = 160;
const POP_MS = 600;

interface PopToken {
  id: number;
}

/** トレーニングカードの3列グリッドに並ぶカードの共通シェル(StatCard/ShoeCardで共用)。 */
export function TrainingCard({ color, title, subtitle, buttonLabel, disabled, locked = disabled, onPress }: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const [pops, setPops] = useState<PopToken[]>([]);
  const popIdRef = useRef(0);

  const fire = () => {
    // squish: scale(1) → scale(0.86)(45%地点) → scale(1)、0.16秒
    scale.stopAnimation();
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.86,
        duration: Math.round(SQUISH_MS * 0.45),
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: Math.round(SQUISH_MS * 0.55),
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();

    const id = popIdRef.current++;
    setPops((prev) => [...prev, { id }]);
    onPress();
  };

  const removePop = (id: number) => {
    setPops((prev) => prev.filter((p) => p.id !== id));
  };

  const panHandlers = useHoldRepeat({ onFire: fire, disabled });

  return (
    <View style={styles.card}>
      <Text style={[styles.name, { color }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.level, locked && styles.levelDisabled]} numberOfLines={1}>
        {subtitle}
      </Text>
      <View style={styles.buttonTouchArea} {...(disabled ? {} : panHandlers)}>
        <Animated.View
          style={[
            styles.button,
            noTextSelect,
            { backgroundColor: disabled ? colors.locked : color, transform: [{ scale }] },
          ]}
        >
          <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]} numberOfLines={1}>
            {buttonLabel}
          </Text>
        </Animated.View>
      </View>
      <View style={styles.popLayer} pointerEvents="none">
        {pops.map((p) => (
          <PopText key={p.id} onDone={() => removePop(p.id)} />
        ))}
      </View>
    </View>
  );
}

/** ボタン右上からふわっと浮かんで消える「+0.1」のポップテキスト。 */
function PopText({ onDone }: { onDone: () => void }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: POP_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.Text style={[styles.pop, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      +0.1
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '30%',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardInset,
  },
  name: { fontWeight: '700', fontSize: 12, textAlign: 'center' },
  level: { fontSize: 13, color: colors.text },
  levelDisabled: { color: colors.lockedText },
  buttonTouchArea: { width: '100%' },
  button: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 6, width: '100%' },
  buttonText: { color: colors.text, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  buttonTextDisabled: { color: colors.lockedText },
  // カード全体の右上に独立したレイヤーとして浮かせる(ボタンの子にすると、真上のLv.表示と
  // 重なって表示されてしまうため)。
  popLayer: {
    position: 'absolute',
    top: -6,
    right: 2,
    zIndex: 10,
    elevation: 10,
  },
  pop: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
});
