import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CombatantProfile } from '../../domain/battle';
import { BlackFade } from '../components/BlackFade';
import { GaugeBar } from '../components/GaugeBar';
import { useBattlePlayback } from '../hooks/useBattlePlayback';
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

type Phase = 'intro' | 'battle' | 'outro';

/**
 * VSレース専用の全画面バトル演出。仕様書6章: 黒フェード→「VSレース スタート」2秒→
 * バトル→「WIN」/「LOSE」2秒→黒フェード→通常表示。
 * ボス戦はメイン画面のボスパネル内で完結するため、このコンポーネントは使わない
 * (MainScreen内のBossPanelBattleを参照)。
 */
export function BattleScreen({ title, opponentName, me, opponent, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const { timeline, frame, finished, skip, sprinting, won } = useBattlePlayback(me, opponent);
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
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.combatantBlock}>
        <Text style={styles.name}>自分{sprinting ? ' ⚡全力疾走' : ''}</Text>
        <GaugeBar ratio={frame.meStamina / timeline.meMaxStamina} color={colors.primary} height={20} />
        <Text style={styles.staminaText}>
          {Math.max(0, Math.round(frame.meStamina))} / {Math.round(timeline.meMaxStamina)}
        </Text>
      </View>

      <View style={styles.combatantBlock}>
        <Text style={styles.name}>{opponentName}</Text>
        <GaugeBar ratio={frame.opponentStamina / timeline.opponentMaxStamina} color={colors.danger} height={20} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  combatantBlock: { gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  staminaText: { color: colors.subtext, textAlign: 'right' },
  skipButton: { alignSelf: 'center', backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  skipButtonText: { color: colors.subtext },
  resultBanner: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.text },
});
