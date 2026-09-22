import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CombatantProfile } from '../../domain/battle';
import { useBattlePlayback } from '../hooks/useBattlePlayback';
import { useShake } from '../hooks/useShake';
import { useNotifications } from '../Notifications';
import { colors } from '../theme';
import { GaugeBar } from './GaugeBar';

interface Props {
  me: CombatantProfile;
  boss: CombatantProfile;
  /** 決着してから少し間を置いた後に呼ばれる(勝敗を見せる時間を作るため)。 */
  onSettled: (won: boolean) => void;
}

const RESULT_HOLD_MS = 1200;
// アタック発動直後だけ、スタミナゲージの減少を0.35秒かけてイーズアウトさせる(仕様書6章)。
const ATTACK_GAUGE_EASE_MS = 350;
const NORMAL_GAUGE_MS = 50;

/**
 * 仕様書10章「ボスパネル(常設・レイアウトシフトしない)…バトル中はこのパネルの中身が
 * スタミナゲージ表示に切り替わる」を実現するための、ボスパネル内で完結する簡易バトル表示。
 * ヘッダーやトレーニングカードなど画面の他の部分は表示されたまま。
 */
export function BossPanelBattle({ me, boss, onSettled }: Props) {
  const { showToast } = useNotifications();
  const { translateX, trigger: triggerShake } = useShake();
  const [meGaugeMs, setMeGaugeMs] = useState(NORMAL_GAUGE_MS);
  const [bossGaugeMs, setBossGaugeMs] = useState(NORMAL_GAUGE_MS);
  const meBoostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bossBoostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boostGauge = (setter: (ms: number) => void, timerRef: { current: ReturnType<typeof setTimeout> | null }) => {
    setter(ATTACK_GAUGE_EASE_MS);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setter(NORMAL_GAUGE_MS), ATTACK_GAUGE_EASE_MS);
  };

  const { timeline, frame, finished, skip, won, sprinting } = useBattlePlayback(me, boss, {
    onMyAttack: () => {
      showToast('アタック発動！スタミナを削った！');
      triggerShake();
      boostGauge(setBossGaugeMs, bossBoostTimer);
    },
    onOpponentAttack: () => {
      triggerShake();
      boostGauge(setMeGaugeMs, meBoostTimer);
    },
  });

  useEffect(
    () => () => {
      if (meBoostTimer.current) clearTimeout(meBoostTimer.current);
      if (bossBoostTimer.current) clearTimeout(bossBoostTimer.current);
    },
    []
  );

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
    <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
      <View style={styles.gaugeArea}>
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>自分</Text>
          <View style={styles.gaugeWrapper}>
            <GaugeBar
              ratio={frame.meStamina / timeline.meMaxStamina}
              color={colors.primary}
              height={10}
              animationMs={meGaugeMs}
              glowing={sprinting}
            />
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>ボス</Text>
          <View style={styles.gaugeWrapper}>
            <GaugeBar
              ratio={frame.opponentStamina / timeline.opponentMaxStamina}
              color={colors.danger}
              height={10}
              animationMs={bossGaugeMs}
            />
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
    </Animated.View>
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
