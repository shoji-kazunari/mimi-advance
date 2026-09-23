import { StyleSheet, Pressable, Text, View } from 'react-native';
import { colors } from '../theme';
import { GaugeBar } from './GaugeBar';

// BossPill(通常時の追い抜きバー)と高さを揃える。バトル開始/終了で枠の高さが
// カクッと変わらないようにするため。
const PANEL_HEIGHT = 72;
const BUTTON_HEIGHT = 52;

interface Props {
  meRatio: number;
  bossRatio: number;
  meGaugeMs: number;
  bossGaugeMs: number;
  sprinting: boolean;
  finished: boolean;
  won: boolean;
  onSkip: () => void;
}

/**
 * 仕様書10章「ボスパネル(常設・レイアウトシフトしない)…バトル中はこのパネルの中身が
 * スタミナゲージ表示に切り替わる」のゲージ+ボタン部分。キャラ・背景の表示は
 * TrackScene(battleモード)が担当し、このパネルは数値まわりだけに専念する。
 * アタック時の画面シェイクは呼び出し元がTrackSceneと合わせて外側から掛ける。
 */
export function BossBattleControls({
  meRatio,
  bossRatio,
  meGaugeMs,
  bossGaugeMs,
  sprinting,
  finished,
  won,
  onSkip,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.gaugeArea}>
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>自分</Text>
          <View style={styles.gaugeWrapper}>
            <GaugeBar ratio={meRatio} color={colors.primary} height={10} animationMs={meGaugeMs} glowing={sprinting} />
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>ボス</Text>
          <View style={styles.gaugeWrapper}>
            <GaugeBar ratio={bossRatio} color={colors.danger} height={10} animationMs={bossGaugeMs} />
          </View>
        </View>
      </View>
      {!finished ? (
        <Pressable style={styles.actionButton} onPress={onSkip}>
          <Text style={styles.actionButtonText} numberOfLines={1}>スキップ</Text>
        </Pressable>
      ) : (
        <View style={[styles.actionButton, { backgroundColor: won ? colors.primary : colors.locked }]}>
          <Text style={styles.actionButtonText} numberOfLines={1}>…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  gaugeArea: { flex: 0.73, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, color: colors.subtext, width: 26 },
  gaugeWrapper: { flex: 1 },
  actionButton: {
    flex: 0.27,
    height: BUTTON_HEIGHT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  actionButtonText: { fontSize: 12, fontWeight: '700', color: colors.text },
});
