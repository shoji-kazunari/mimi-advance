import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useHoldRepeat } from '../hooks/useHoldRepeat';
import { colors } from '../theme';

interface Props {
  /** ステータス色。ボタンの背景とLv.表示の文字色に使う。 */
  color: string;
  /** 上段の見出し(スピード / シューズ など)。 */
  label: string;
  /** 中段の大きい表示(Lv.11.0 / 🔒 / 未解放)。 */
  value: string;
  /** 中段の文字色。省略時はcolorを使う。 */
  valueColor?: string;
  /** 下段のボタン内の文字(789pt / 進化2で解放 など)。 */
  buttonLabel: string;
  disabled: boolean;
  /**
   * ロック中かどうか(ptが足りないだけの一時的なdisabledとは区別する)。
   * ロック中は中段・ボタンの両方を暗くする(片方だけだと中途半端に見えるため)。
   */
  locked?: boolean;
  onPress: () => void;
}

// タップ操作でのブラウザ/iOS標準の挙動(テキスト選択・長押しの拡大鏡・コールアウトメニュー)を
// 止める。RNのスタイル型には無いプロパティなのでキャストする。
const noTextSelect = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
} as unknown as StyleProp<ViewStyle>;

// 実際にタッチイベントを受け取る要素(panHandlersを持つView)にだけ付ける。
// touchAction: 'none'にすると縦スクロールまでブラウザに無視されてしまうため、
// 縦方向のスクロールは許可しつつ(pan-y)、動いたかどうかの判定自体はJS側
// (useHoldRepeatの8px判定+初回発火の保留)で行う。
const touchTarget = { ...noTextSelect, touchAction: 'pan-y' } as unknown as StyleProp<ViewStyle>;

/**
 * ボタン内の文字サイズ。「789pt」のような短い表示は大きく、「1,000Vicで解放」のような
 * 長い表示は収まるところまで小さくする(RN Webでは adjustsFontSizeToFit が効かないため自前で)。
 */
function buttonFontSize(text: string): number {
  const widthInEm = [...text].reduce((sum, ch) => sum + (/[ -~]/.test(ch) ? 0.55 : 1), 0);
  // 3列グリッドで一番狭くなるとき(主画面)のボタン内幅に合わせている。
  const availablePx = 72;
  return Math.max(10, Math.min(16, Math.floor(availablePx / widthInEm)));
}

/** 背景色に対して読みやすい文字色を選ぶ(黄色系のボタンに白文字だと読めないため)。 */
function readableTextOn(background: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(background)) return '#ffffff';
  const r = parseInt(background.slice(1, 3), 16);
  const g = parseInt(background.slice(3, 5), 16);
  const b = parseInt(background.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#2a1c4a' : '#ffffff';
}

/** トレーニングカードの3列グリッドに並ぶカードの共通シェル(StatCard/ShoeCardで共用)。 */
export function TrainingCard({
  color,
  label,
  value,
  valueColor,
  buttonLabel,
  disabled,
  locked = false,
  onPress,
}: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const [valuePop] = useState(() => new Animated.Value(0));

  // 押している間はへこませたまま、離したときにプニッと戻す。
  // 連打のたびに縮め直すと小刻みに震えるだけになり、しかも指の下に隠れて見えないので、
  // 「効いている」ことは指で隠れない中段のLv.表示側で見せる(下のvaluePop)。
  const setPressed = (pressed: boolean) => {
    Animated.spring(scale, {
      toValue: pressed ? 0.94 : 1,
      useNativeDriver: true,
      speed: pressed ? 40 : 12,
      bounciness: pressed ? 0 : 16,
    }).start();
  };

  // 値が実際に変わったときだけ、中段の表示をポンと跳ねさせる。
  // (ptが足りず上がらなかったときは何も起きない = 上がっていないことが伝わる)
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    valuePop.setValue(0);
    Animated.sequence([
      Animated.timing(valuePop, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(valuePop, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 14 }),
    ]).start();
  }, [value, valuePop]);

  const panHandlers = useHoldRepeat({ onFire: onPress, disabled, onPressStateChange: setPressed });

  const buttonColor = disabled ? colors.locked : color;
  const valueScale = valuePop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <View style={[styles.card, noTextSelect]}>
      <Text style={[styles.label, locked && styles.labelLocked]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.Text
        style={[
          styles.value,
          { color: locked ? colors.lockedText : valueColor ?? color, transform: [{ scale: valueScale }] },
        ]}
        numberOfLines={1}
      >
        {value}
      </Animated.Text>
      <View style={[styles.buttonTouchArea, touchTarget]} {...(disabled ? {} : panHandlers)}>
        <Animated.View
          style={[styles.button, noTextSelect, { backgroundColor: buttonColor, transform: [{ scale }] }]}
        >
          <Text
            style={[
              styles.buttonText,
              {
                color: disabled ? colors.lockedText : readableTextOn(buttonColor),
                fontSize: buttonFontSize(buttonLabel),
              },
            ]}
            numberOfLines={1}
          >
            {buttonLabel}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '28%',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardInset,
  },
  label: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  labelLocked: { color: colors.lockedText },
  value: { fontSize: 19, fontWeight: '800' },
  buttonTouchArea: { width: '100%' },
  button: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '800', textAlign: 'center' },
});
