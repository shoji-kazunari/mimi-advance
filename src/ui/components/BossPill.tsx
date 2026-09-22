import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  ratio: number;
  ready: boolean;
  current: number;
  required: number;
  onPress: () => void;
}

const HEIGHT = 52;

/**
 * 追い抜きゲージとボスバトルボタンが1本の帯として一体化したピル型UI(プロトタイプ準拠)。
 * ゲージの塗り自体がボタンの背景を兼ねていて、たまるとオレンジ〜赤に変わり枠が光る。
 */
export function BossPill({ ratio, ready, current, required, onPress }: Props) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const gradientColors: [string, string] = ready
    ? [colors.gaugeReadyStart, colors.gaugeReadyEnd]
    : [colors.gaugeStart, colors.gaugeEnd];

  return (
    <Pressable disabled={!ready} onPress={onPress} style={[styles.pill, ready && styles.pillReady]}>
      <View style={[styles.fillWrapper, { width: `${clamped * 100}%` }]}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fill} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>
          {ready ? 'ボス出現中' : `追い抜き ${current}/${required}`}
        </Text>
        <Text style={[styles.button, ready && styles.buttonReady]} numberOfLines={1}>
          バトル開始
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: colors.cardInset,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillReady: {
    borderColor: colors.gaugeReadyStart,
  },
  fillWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  button: { color: colors.text, fontWeight: '800', fontSize: 13, opacity: 0.6 },
  buttonReady: { color: '#1a0f00', opacity: 1 },
});
