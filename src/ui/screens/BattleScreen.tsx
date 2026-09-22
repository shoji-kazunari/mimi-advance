import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CombatantProfile } from '../../domain/battle';
import { BlackFade } from '../components/BlackFade';
import { GaugeBar } from '../components/GaugeBar';
import { TrackScene } from '../components/track/TrackScene';
import { TrackToastLayer } from '../components/track/TrackToastLayer';
import { useBattlePlayback } from '../hooks/useBattlePlayback';
import { useShake } from '../hooks/useShake';
import { useNotifications } from '../Notifications';
import { colors } from '../theme';

interface Props {
  title: string;
  opponentName: string;
  me: CombatantProfile;
  opponent: CombatantProfile;
  onFinished: (won: boolean) => void;
}

const INTRO_MS = 2000;
const RESULT_HOLD_MS = 2000;
// アタック発動直後だけ、スタミナゲージの減少を0.35秒かけてイーズアウトさせる(仕様書6章)。
const ATTACK_GAUGE_EASE_MS = 350;
const NORMAL_GAUGE_MS = 50;

type Phase = 'intro' | 'battle' | 'outro';

/**
 * VSレース専用の全画面バトル演出。仕様書6章: 黒フェード→「VSレース スタート」2秒→
 * バトル→「WIN」/「LOSE」2秒→黒フェード→通常表示。
 * ボス戦はメイン画面のボスパネル内で完結するため、このコンポーネントは使わない
 * (MainScreen内のBossPanelBattleを参照)。
 */
export function BattleScreen({ title, opponentName, me, opponent, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const { showToast } = useNotifications();
  const { translateX, trigger: triggerShake } = useShake();
  const [meGaugeMs, setMeGaugeMs] = useState(NORMAL_GAUGE_MS);
  const [opponentGaugeMs, setOpponentGaugeMs] = useState(NORMAL_GAUGE_MS);
  const meBoostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentBoostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boostGauge = (setter: (ms: number) => void, timerRef: { current: ReturnType<typeof setTimeout> | null }) => {
    setter(ATTACK_GAUGE_EASE_MS);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setter(NORMAL_GAUGE_MS), ATTACK_GAUGE_EASE_MS);
  };

  const { timeline, frame, elapsed, finished, skip, sprinting, won } = useBattlePlayback(me, opponent, {
    onMyAttack: () => {
      showToast('アタック発動！スタミナを削った！');
      triggerShake();
      boostGauge(setOpponentGaugeMs, opponentBoostTimer);
    },
    onOpponentAttack: () => {
      triggerShake();
      boostGauge(setMeGaugeMs, meBoostTimer);
    },
  });

  useEffect(
    () => () => {
      if (meBoostTimer.current) clearTimeout(meBoostTimer.current);
      if (opponentBoostTimer.current) clearTimeout(opponentBoostTimer.current);
    },
    []
  );

  const resultTimerStarted = useRef(false);

  // onFinishedは親の再レンダーのたびに新しい関数参照になり得るため、常に最新の値をrefで持つ
  // (依存配列に直接入れると、無関係な再レンダーのたびにresultタイマーのeffectが再実行され、
  // resultTimerStartedのガードのせいでタイマーが二度と再登録されなくなる)。
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  // 'result'は独立したstateではなく、battle中に決着したかどうかから導く派生値。
  // (以前はuseEffect内でsetPhase('result')していたが、それは「他のstateから導ける値を
  // わざわざstateにコピーするだけの同期エフェクト」というアンチパターンだった)
  const effectivePhase: Phase | 'result' = phase === 'battle' && finished ? 'result' : phase;

  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = setTimeout(() => setPhase('battle'), INTRO_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (effectivePhase !== 'result' || resultTimerStarted.current) return;
    resultTimerStarted.current = true;
    const timer = setTimeout(() => setPhase('outro'), RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [effectivePhase]);

  if (effectivePhase === 'intro') {
    return <BlackFade label="VSレース スタート" />;
  }

  if (effectivePhase === 'outro') {
    return <BlackFade label={won ? 'WIN' : 'LOSE'} onDone={() => onFinishedRef.current(won)} />;
  }

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateX }] }]}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.trackBox}>
        <TrackScene
          mode="battle"
          opponentLabel={opponentName}
          elapsedMs={elapsed}
          jumpTimesMs={timeline.obstacleTimesMs}
        />
        <TrackToastLayer />
      </View>

      <View style={styles.combatantBlock}>
        <Text style={styles.name}>自分{sprinting ? ' ⚡全力疾走' : ''}</Text>
        <GaugeBar
          ratio={frame.meStamina / timeline.meMaxStamina}
          color={colors.primary}
          height={20}
          animationMs={meGaugeMs}
          glowing={sprinting}
        />
        <Text style={styles.staminaText}>
          {Math.max(0, Math.round(frame.meStamina))} / {Math.round(timeline.meMaxStamina)}
        </Text>
      </View>

      <View style={styles.combatantBlock}>
        <Text style={styles.name}>{opponentName}</Text>
        <GaugeBar
          ratio={frame.opponentStamina / timeline.opponentMaxStamina}
          color={colors.danger}
          height={20}
          animationMs={opponentGaugeMs}
        />
        <Text style={styles.staminaText}>
          {Math.max(0, Math.round(frame.opponentStamina))} / {Math.round(timeline.opponentMaxStamina)}
        </Text>
      </View>

      {effectivePhase === 'battle' ? (
        <Pressable style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipButtonText}>スキップ</Text>
        </Pressable>
      ) : (
        <Text style={styles.resultBanner}>{won ? 'WIN' : 'LOSE'}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  trackBox: { height: 150, backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden' },
  combatantBlock: { gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  staminaText: { color: colors.subtext, textAlign: 'right' },
  skipButton: { alignSelf: 'center', backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  skipButtonText: { color: colors.subtext },
  resultBanner: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.text },
});
