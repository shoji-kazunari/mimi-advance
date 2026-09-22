import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CombatantProfile } from '../../domain/battle';
import { useBattlePlayback } from '../hooks/useBattlePlayback';
import { colors } from '../theme';
import { GaugeBar } from './GaugeBar';

interface Props {
  me: CombatantProfile;
  boss: CombatantProfile;
  /** 決着してから少し間を置いた後に呼ばれる(勝敗を見せる時間を作るため)。 */
  onSettled: (won: boolean) => void;
}

const RESULT_HOLD_MS = 1200;

/**
 * 仕様書10章「ボスパネル(常設・レイアウトシフトしない)…バトル中はこのパネルの中身が
 * スタミナゲージ表示に切り替わる」を実現するための、ボスパネル内で完結する簡易バトル表示。
 * ヘッダーやトレーニングカードなど画面の他の部分は表示されたまま。
 */
export function BossPanelBattle({ me, boss, onSettled }: Props) {
  const { timeline, frame, finished, skip, won } = useBattlePlayback(me, boss);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  useEffect(() => {
    if (!finished || settledRef.current) return;
    settledRef.current = true;
    const timer = setTimeout(() => onSettledRef.current(won), RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [finished, won]);

  return (
    <View style={styles.container}>
      <View style={styles.gaugeArea}>
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>自分</Text>
          <View style={styles.gaugeWrapper}>
            <GaugeBar ratio={frame.meStamina / timeline.meMaxStamina} color={colors.primary} height={10} />
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>ボス</Text>
          <View style={styles.gaugeWrapper}>
            <GaugeBar ratio={frame.opponentStamina / timeline.opponentMaxStamina} color={colors.danger} height={10} />
          </View>
        </View>
      </View>
      {!finished ? (
        <Pressable style={styles.actionButton} onPress={skip}>
          <Text style={styles.actionButtonText} numberOfLines={1}>スキップ</Text>
        </Pressable>
      ) : (
        <View style={[styles.actionButton, { backgroundColor: won ? colors.primary : colors.locked }]}>
          <Text style={styles.actionButtonText} numberOfLines={1}>{won ? '勝利！' : '…'}</Text>
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
    backgroundColor: colors.cardInset,
    borderRadius: 26,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  gaugeArea: { flex: 0.73, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, color: colors.subtext, width: 26 },
  gaugeWrapper: { flex: 1 },
  actionButton: {
    flex: 0.27,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  actionButtonText: { fontSize: 12, fontWeight: '700', color: colors.text },
});
