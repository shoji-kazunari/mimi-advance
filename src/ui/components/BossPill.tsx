import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { GaugeBar } from './GaugeBar';

interface Props {
  ratio: number;
  ready: boolean;
  current: number;
  required: number;
  onPress: () => void;
}

const HEIGHT = 52;
// BossBattleControls(バトル中のゲージパネル)と高さを揃える。バトル開始/終了で
// 枠の高さがカクッと変わらないようにするため。
const PANEL_HEIGHT = 72;

/**
 * 追い抜きゲージと「バトル開始」ボタンを左右に並べたバー(プロトタイプ準拠)。
 * ボタンはゲージの右側に独立して置き、ボスが出現する(ready)までは押せない見た目にする。
 */
export function BossPill({ ratio, ready, current, required, onPress }: Props) {
  const gradientColors: [string, string] = ready
    ? [colors.gaugeReadyStart, colors.gaugeReadyEnd]
    : [colors.gaugeStart, colors.gaugeEnd];

  return (
    <View style={[styles.row, ready && styles.rowReady]}>
      <View style={styles.gaugeArea}>
        <Text style={styles.label} numberOfLines={1}>
          {ready ? 'ボス出現中' : `追い抜き ${current}/${required}`}
        </Text>
        <GaugeBar ratio={ratio} gradient={gradientColors} height={HEIGHT / 3} />
      </View>
      <Pressable
        disabled={!ready}
        onPress={onPress}
        style={[styles.button, ready ? styles.buttonReady : styles.buttonInactive]}
      >
        <Text style={[styles.buttonText, ready && styles.buttonTextReady]} numberOfLines={1}>
          バトル開始
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: PANEL_HEIGHT,
    backgroundColor: colors.cardInset,
    borderRadius: 26,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowReady: {
    borderColor: colors.gaugeReadyStart,
  },
  gaugeArea: { flex: 0.73, gap: 6 },
  label: { color: colors.text, fontWeight: '700', fontSize: 13 },
  button: {
    flex: 0.27,
    height: HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInactive: { backgroundColor: colors.locked },
  buttonReady: { backgroundColor: colors.gaugeReadyStart },
  buttonText: { fontSize: 13, fontWeight: '800', color: colors.lockedText },
  buttonTextReady: { color: '#1a0f00' },
});
