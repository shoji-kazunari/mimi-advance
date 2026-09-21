import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BattleTimeline, CombatantProfile, simulateBattle, staminaAtTime } from '../../domain/battle';
import { BlackFade } from '../components/BlackFade';
import { GaugeBar } from '../components/GaugeBar';
import { colors } from '../theme';

interface Props {
  /** 'boss'は勝利時のみ黒フェードで戻る。'vsRace'は開始演出+終了時に必ず黒フェードで戻る(仕様書5-6章)。 */
  mode: 'boss' | 'vsRace';
  title: string;
  opponentName: string;
  me: CombatantProfile;
  opponent: CombatantProfile;
  onFinished: (won: boolean) => void;
}

const PLAYBACK_TICK_MS = 50;
const INTRO_MS = 2000;
const RESULT_HOLD_MS = 2000;

type Phase = 'intro' | 'battle' | 'result' | 'outro';

export function BattleScreen({ mode, title, opponentName, me, opponent, onFinished }: Props) {
  const timeline: BattleTimeline = useMemo(() => simulateBattle(me, opponent), [me, opponent]);
  const [phase, setPhase] = useState<Phase>(mode === 'vsRace' ? 'intro' : 'battle');
  const [elapsed, setElapsed] = useState(0);
  const resultTimerStarted = useRef(false);

  // onFinishedは親(Root)の再レンダーのたびに新しい関数参照になり得る(JSX内でインライン定義
  // されているため)。それをそのままuseEffectの依存配列に入れると、無関係な再レンダー
  // (例: バックグラウンドで進むザコ追い抜き)のたびにこの後のresultタイマーのeffectが
  // クリーンアップ→再実行され、resultTimerStartedのガードのせいでタイマーが二度と
  // 再登録されずに演出が止まってしまう。それを避けるため常に最新のonFinishedをrefで持つ。
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = setTimeout(() => setPhase('battle'), INTRO_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'battle') return;
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + PLAYBACK_TICK_MS;
        if (next >= timeline.outcome.endedAtMs) {
          clearInterval(id);
          setPhase('result');
          return timeline.outcome.endedAtMs;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);
    return () => clearInterval(id);
  }, [phase, timeline]);

  const won = timeline.outcome.winner === 'me';
  // ボス戦は勝利時だけ黒フェードで戻る。VSレースは勝敗によらず黒フェードで戻る(仕様書5-6章)。
  const needsOutro = mode === 'vsRace' || won;

  useEffect(() => {
    if (phase !== 'result' || resultTimerStarted.current) return;
    resultTimerStarted.current = true;
    const timer = setTimeout(() => {
      if (needsOutro) {
        setPhase('outro');
      } else {
        onFinishedRef.current(won);
      }
    }, RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, needsOutro, won]);

  const handleSkip = () => {
    setElapsed(timeline.outcome.endedAtMs);
    setPhase('result');
  };

  if (phase === 'intro') {
    return <BlackFade label="VSレース スタート" />;
  }

  if (phase === 'outro') {
    return <BlackFade label={won ? 'WIN' : 'LOSE'} onDone={() => onFinishedRef.current(won)} />;
  }

  const frame = staminaAtTime(timeline, elapsed);
  const sprinting = elapsed < me.sprintDurationMs;

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

      {phase === 'battle' ? (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>スキップ</Text>
        </Pressable>
      ) : (
        <Text style={styles.resultBanner}>
          {mode === 'vsRace'
            ? won
              ? 'WIN'
              : 'LOSE'
            : won
              ? '勝利！'
              : timeline.outcome.reason === 'timeout'
                ? '判定負け…'
                : '逃げられた…'}
        </Text>
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
